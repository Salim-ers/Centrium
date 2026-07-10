import 'server-only';

import { logger } from '@/lib/logger';

// =========================================================================
// Envoi de SMS — abstraction multi-prestataires
// -------------------------------------------------------------------------
// Détection automatique du prestataire par variables d'environnement :
//   1. Twilio  : TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM
//   2. Brevo   : BREVO_API_KEY (+ BREVO_SMS_SENDER, défaut 'Centrium')
//   3. Aucun   : mode sandbox — log + { sent:false, error:'no_provider' }.
//      Le dispatcher bascule alors automatiquement sur l'email (fallback).
//
// Règles : ne throw JAMAIS ; corps courts (≤160 c.) construits par
// buildSmsBody() — jamais de donnée sensible (IBAN, pièce d'identité…).
// Changer de prestataire = ajouter un driver ici, zéro impact ailleurs.
// =========================================================================

export type SendSmsResult = {
  sent: boolean;
  provider: 'twilio' | 'brevo' | 'none';
  providerId?: string;
  error?: string;
};

/** Normalise un numéro FR en E.164 (+33…) ; laisse tel quel si déjà international. */
export function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s.\-()]/g, '');
  if (/^\+[1-9]\d{6,14}$/.test(cleaned)) return cleaned;
  if (/^0[1-9]\d{8}$/.test(cleaned)) return '+33' + cleaned.slice(1);
  if (/^33[1-9]\d{8}$/.test(cleaned)) return '+' + cleaned;
  return null;
}

async function sendViaTwilio(to: string, body: string): Promise<SendSmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM!;
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.error(`[sms] Twilio ${res.status} — ${detail.slice(0, 200)}`);
      return { sent: false, provider: 'twilio', error: `twilio_${res.status}` };
    }
    const json = (await res.json()) as { sid?: string };
    return { sent: true, provider: 'twilio', providerId: json.sid };
  } catch (e) {
    logger.error('[sms] Twilio network error', e);
    return { sent: false, provider: 'twilio', error: 'network' };
  }
}

async function sendViaBrevo(to: string, body: string): Promise<SendSmsResult> {
  const apiKey = process.env.BREVO_API_KEY!;
  const sender = process.env.BREVO_SMS_SENDER ?? 'Centrium';
  try {
    const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender, recipient: to, content: body, type: 'transactional' }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.error(`[sms] Brevo ${res.status} — ${detail.slice(0, 200)}`);
      return { sent: false, provider: 'brevo', error: `brevo_${res.status}` };
    }
    const json = (await res.json()) as { messageId?: number | string };
    return { sent: true, provider: 'brevo', providerId: String(json.messageId ?? '') };
  } catch (e) {
    logger.error('[sms] Brevo network error', e);
    return { sent: false, provider: 'brevo', error: 'network' };
  }
}

export async function sendSms(input: { to: string; body: string }): Promise<SendSmsResult> {
  const to = normalizePhone(input.to);
  if (!to) {
    return { sent: false, provider: 'none', error: 'invalid_phone' };
  }
  // Garde-fou longueur : un SMS métier ne doit jamais dépasser 320 c. (2 segments).
  const body = input.body.length > 320 ? input.body.slice(0, 319) + '…' : input.body;

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) {
    return sendViaTwilio(to, body);
  }
  if (process.env.BREVO_API_KEY) {
    return sendViaBrevo(to, body);
  }
  logger.info('[sms] aucun prestataire SMS configuré — SMS non envoyé (fallback email).', {
    bodyLength: body.length,
  });
  return { sent: false, provider: 'none', error: 'no_provider' };
}
