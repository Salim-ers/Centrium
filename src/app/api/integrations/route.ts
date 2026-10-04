import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';
import { rateLimit } from '@/lib/security/rate-limit';
import {
  WEBHOOK_EVENTS,
  assertSafeWebhookUrl,
  deliverWebhook,
  generateWebhookSecret,
} from '@/lib/integrations/webhook';

export const runtime = 'nodejs';

const PROVIDERS = ['pennylane', 'sage', 'sellsy', 'approved_platform', 'webhook'] as const;

/** GET /api/integrations — état des intégrations de l'organisation. */
export async function GET() {
  const auth = await apiPermission('finance.view');
  if (auth instanceof NextResponse) return auth;
  const admin = createAdminClient('integrations');
  const { data, error } = await admin
    .from('integrations')
    .select('id, provider, status, config, last_event_at, last_error, updated_at')
    .eq('organization_id', auth.organizationId);
  if (error) return NextResponse.json({ error: 'load_failed', message: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('request'), provider: z.enum(['pennylane', 'sage', 'sellsy', 'approved_platform']) }),
  z.object({
    action: z.literal('configure_webhook'),
    url: z.string().trim().url().max(500),
    events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
  }),
  z.object({ action: z.literal('rotate_secret') }),
  z.object({ action: z.literal('test_webhook') }),
  z.object({ action: z.literal('disconnect'), provider: z.enum(PROVIDERS) }),
]);

/**
 * POST /api/integrations — actions sur les intégrations.
 *
 * Les connecteurs Pennylane, Sage, Sellsy et plateforme agréée ne sont pas
 * encore disponibles : « request » enregistre l'intérêt de l'organisation,
 * sans aucune transmission simulée. Le webhook est, lui, pleinement actif.
 */
export async function POST(req: NextRequest) {
  const auth = await apiPermission('settings.manage');
  if (auth instanceof NextResponse) return auth;

  const parsed = actionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  const admin = createAdminClient('integrations');
  const org = auth.organizationId;

  const upsert = async (provider: string, patch: Record<string, unknown>) => {
    const { data, error } = await admin
      .from('integrations')
      .upsert({ organization_id: org, provider, updated_by: auth.user.id, updated_at: new Date().toISOString(), ...patch }, { onConflict: 'organization_id,provider' })
      .select('id, provider, status, config, last_event_at, last_error')
      .single();
    if (error) throw new Error(error.message);
    return data;
  };

  try {
    switch (input.action) {
      case 'request': {
        const row = await upsert(input.provider, { status: 'requested' });
        await logAudit({ organizationId: org, userId: auth.user.id, entityType: 'integration', entityId: row.id, action: 'requested', details: { provider: input.provider } });
        return NextResponse.json({ data: row });
      }
      case 'configure_webhook': {
        try {
          await assertSafeWebhookUrl(input.url);
        } catch (e) {
          return NextResponse.json({ error: 'invalid_url', message: (e as Error).message }, { status: 400 });
        }
        const row = await upsert('webhook', { status: 'configured', config: { url: input.url, events: input.events }, last_error: null });
        const { data: existing } = await admin.from('integration_secrets').select('integration_id').eq('integration_id', row.id).maybeSingle();
        let secret: string | null = null;
        if (!existing) {
          secret = generateWebhookSecret();
          await admin.from('integration_secrets').insert({ integration_id: row.id, secret });
        }
        await logAudit({ organizationId: org, userId: auth.user.id, entityType: 'integration', entityId: row.id, action: 'configured', details: { provider: 'webhook', events: input.events } });
        // Le secret n'est renvoyé qu'une seule fois, à la création.
        return NextResponse.json({ data: row, secret });
      }
      case 'rotate_secret': {
        const { data: row } = await admin.from('integrations').select('id').eq('organization_id', org).eq('provider', 'webhook').maybeSingle();
        if (!row) return NextResponse.json({ error: 'not_configured' }, { status: 409 });
        const secret = generateWebhookSecret();
        await admin.from('integration_secrets').upsert({ integration_id: row.id, secret, created_at: new Date().toISOString() });
        await logAudit({ organizationId: org, userId: auth.user.id, entityType: 'integration', entityId: row.id, action: 'secret_rotated' });
        return NextResponse.json({ data: { rotated: true }, secret });
      }
      case 'test_webhook': {
        const rl = await rateLimit(`webhook-test:${org}`, { limit: 5, windowSec: 60 });
        if (!rl.ok) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
        const result = await deliverWebhook(org, 'ping', { message: 'Test de connexion Centrium' }, { force: true });
        if (result.skipped) return NextResponse.json({ error: 'not_configured', message: 'Configurez d’abord l’URL du webhook.' }, { status: 409 });
        if (result.delivered) await admin.from('integrations').update({ status: 'configured' }).eq('organization_id', org).eq('provider', 'webhook');
        return NextResponse.json({ data: result });
      }
      case 'disconnect': {
        const { data: row } = await admin.from('integrations').select('id').eq('organization_id', org).eq('provider', input.provider).maybeSingle();
        if (row) {
          await admin.from('integration_secrets').delete().eq('integration_id', row.id);
          await admin.from('integrations').update({ status: 'not_connected', config: {}, last_error: null, updated_by: auth.user.id }).eq('id', row.id);
          await logAudit({ organizationId: org, userId: auth.user.id, entityType: 'integration', entityId: row.id, action: 'disconnected', details: { provider: input.provider } });
        }
        return NextResponse.json({ data: { disconnected: true } });
      }
    }
  } catch (e) {
    return NextResponse.json({ error: 'integration_failed', message: (e as Error).message }, { status: 500 });
  }
}
