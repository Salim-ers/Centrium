import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

/**
 * Détection de nouvelle device à la connexion.
 *
 * À chaque login réussi, on calcule un fingerprint déterministe de la device
 * (sha256 sur user-agent + accept-language + timezone-ish) et on regarde si
 * on l'a déjà vu pour ce user.
 *
 * Si NON → on insère un login_event marqué is_new_device=true et on envoie
 * un email d'alerte à l'utilisateur ("Nouvelle connexion sur Centrium").
 *
 * Si OUI → on insère sans alerte, juste pour l'historique.
 *
 * Le fingerprint n'est PAS un identifiant unique (deux users sur le même
 * Mac auront le même fingerprint si même UA/lang/tz). On le couple toujours
 * avec user_id pour la détection.
 */

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function deviceFingerprint(headers: Headers): Promise<string> {
  const ua = headers.get('user-agent') ?? '';
  const lang = headers.get('accept-language') ?? '';
  const ch = headers.get('sec-ch-ua') ?? ''; // hint Chromium
  return sha256Hex(`${ua}::${lang}::${ch}`);
}

export type LoginEventInput = {
  userId: string;
  ip: string;
  userAgent: string;
  deviceFp: string;
  country?: string | null;
  city?: string | null;
};

export async function trackLoginEvent(
  input: LoginEventInput,
): Promise<{ isNewDevice: boolean; eventId: string | null }> {
  const admin = createAdminClient('audit-log-write');

  // Cherche un login_event antérieur avec le même fingerprint
  const { data: previous } = await admin
    .from('login_events')
    .select('id')
    .eq('user_id', input.userId)
    .eq('device_fp', input.deviceFp)
    .limit(1)
    .maybeSingle();

  const isNewDevice = !previous;

  const { data: inserted, error } = await admin
    .from('login_events')
    .insert({
      user_id: input.userId,
      ip: input.ip,
      user_agent: input.userAgent.slice(0, 500),
      device_fp: input.deviceFp,
      country: input.country ?? null,
      city: input.city ?? null,
      is_new_device: isNewDevice,
    })
    .select('id')
    .single();

  if (error) {
    logger.warn('[device-tracking] insert failed', error.message);
    return { isNewDevice, eventId: null };
  }

  return { isNewDevice, eventId: inserted.id };
}

/**
 * Envoie l'email d'alerte "Nouvelle connexion détectée" à l'utilisateur
 * concerné si la device est nouvelle. Utilise Resend si RESEND_API_KEY
 * est défini, sinon log seulement (mode dev).
 */
export async function notifyNewDevice(args: {
  userId: string;
  email: string;
  ip: string;
  userAgent: string;
  occurredAt: Date;
  eventId: string | null;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const subject = 'Nouvelle connexion sur Centrium';
  const text = renderNewDeviceEmail(args);

  if (!apiKey) {
    logger.info(
      `[notify-new-device] (no RESEND_API_KEY) would email domain=${args.email.split('@')[1] ?? 'unknown'}`,
    );
    return;
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Centrium <security@centrium-platform.com>',
        to: args.email,
        subject,
        text,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (args.eventId) {
      const admin = createAdminClient('audit-log-write');
      await admin
        .from('login_events')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', args.eventId);
    }
  } catch (e) {
    logger.warn('[notify-new-device] resend error', (e as Error).message);
  }
}

function renderNewDeviceEmail(args: {
  ip: string;
  userAgent: string;
  occurredAt: Date;
}): string {
  return `Bonjour,

Nous avons détecté une nouvelle connexion à votre compte Centrium depuis un
appareil que vous n'aviez jamais utilisé auparavant.

Date et heure  : ${args.occurredAt.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })} (Europe/Paris)
Adresse IP     : ${args.ip}
Navigateur     : ${args.userAgent.slice(0, 200)}

Si c'est bien vous, vous pouvez ignorer cet email.

Si ce n'est PAS vous :
  1. Connectez-vous immédiatement sur centrium-platform.com
  2. Allez dans Paramètres > Sécurité > Changer le mot de passe
  3. Activez le MFA si ce n'est pas déjà fait
  4. Contactez security@centrium-platform.com

— L'équipe Sécurité Centrium`;
}
