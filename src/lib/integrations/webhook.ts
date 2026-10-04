import 'server-only';

import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

// =========================================================================
// Webhooks sortants — seule « transmission » réelle de Centrium vers un
// système tiers configuré par l'ESN (ERP, outil comptable, plateforme
// agréée via un connecteur, automate type Make/Zapier).
//
// Sécurité :
//   - HTTPS uniquement, pas de redirection suivie ;
//   - refus des adresses privées / locales (protection SSRF), après
//     résolution DNS ;
//   - signature HMAC-SHA256 : en-tête `Centrium-Signature: t=<ts>,v1=<hex>`
//     calculée sur `${t}.${corps}` avec le secret de l'intégration ;
//   - délai maximal de 10 s.
// =========================================================================

export const WEBHOOK_EVENTS = [
  'prefacture.validated',
  'prefactures.exported',
  'timesheet.validated',
  'client_request.created',
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number] | 'ping';

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString('base64url')}`;
}

export function signPayload(secret: string, timestamp: number, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

function isPrivateAddress(ip: string): boolean {
  if (ip.includes(':')) {
    const v = ip.toLowerCase();
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:127.') || v.startsWith('::ffff:10.') || v.startsWith('::ffff:192.168.');
  }
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b! >= 16 && b! <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b! >= 64 && b! <= 127) ||
    a! >= 224
  );
}

/** Valide une URL de webhook (format + résolution DNS publique). */
export async function assertSafeWebhookUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('URL invalide');
  }
  if (url.protocol !== 'https:') throw new Error('Le webhook doit utiliser HTTPS');
  if (url.username || url.password) throw new Error('Identifiants interdits dans l’URL');
  const host = url.hostname;
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Adresse locale refusée');
  }
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error('Adresse privée ou non résolue refusée');
  }
  return url;
}

export type DeliveryResult = { delivered: boolean; status?: number; error?: string; skipped?: boolean };

/**
 * Envoie un événement au webhook configuré de l'organisation, s'il est
 * actif et abonné à cet événement. Ne lève jamais : renvoie le résultat
 * et le consigne sur l'intégration (dernier envoi, dernière erreur).
 */
export async function deliverWebhook(
  organizationId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
  options: { force?: boolean } = {},
): Promise<DeliveryResult> {
  const admin = createAdminClient('integrations');
  const { data: integration } = await admin
    .from('integrations')
    .select('id, status, config')
    .eq('organization_id', organizationId)
    .eq('provider', 'webhook')
    .maybeSingle();
  if (!integration || (integration.status !== 'configured' && !options.force)) return { delivered: false, skipped: true };
  const config = (integration.config ?? {}) as { url?: string; events?: string[] };
  if (!config.url) return { delivered: false, skipped: true };
  if (event !== 'ping' && !(config.events ?? []).includes(event)) return { delivered: false, skipped: true };

  const { data: secretRow } = await admin.from('integration_secrets').select('secret').eq('integration_id', integration.id).maybeSingle();
  if (!secretRow?.secret) return { delivered: false, error: 'Secret de signature absent' };

  const body = JSON.stringify({ id: randomUUID(), type: event, created_at: new Date().toISOString(), data });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPayload(secretRow.secret, timestamp, body);

  let result: DeliveryResult;
  try {
    const url = await assertSafeWebhookUrl(config.url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      method: 'POST',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Centrium-Webhooks/1.0',
        'Centrium-Signature': `t=${timestamp},v1=${signature}`,
        'Centrium-Event': event,
      },
      body,
    });
    clearTimeout(timer);
    result = res.ok ? { delivered: true, status: res.status } : { delivered: false, status: res.status, error: `HTTP ${res.status}` };
  } catch (e) {
    result = { delivered: false, error: (e as Error).name === 'AbortError' ? 'Délai dépassé (10 s)' : (e as Error).message };
  }

  await admin
    .from('integrations')
    .update({
      last_event_at: new Date().toISOString(),
      last_error: result.delivered ? null : (result.error ?? 'Échec'),
      ...(result.delivered ? {} : integration.status === 'configured' ? { status: 'error' } : {}),
    })
    .eq('id', integration.id);
  if (!result.delivered) logger.warn('[webhook] delivery failed', { organizationId, event, error: result.error });
  return result;
}
