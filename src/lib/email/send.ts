import 'server-only';

import { logger } from '@/lib/logger';

// =========================================================================
// Envoi d'emails transactionnels via Resend — helper partagé
// -------------------------------------------------------------------------
// Avant : chaque sender (device-tracking, purge-archives) recodait son
// fetch('https://api.resend.com/emails') en texte brut. Ce module
// centralise :
//   - la clé API (RESEND_API_KEY) et la dégradation propre : sans clé,
//     on log en console et on retourne { sent: false } — jamais de throw.
//   - un template HTML brandé Centrium minimal (self-contained, aucune
//     ressource externe) + fallback texte automatique.
//
// Utilisé par : webhook Stripe (fin d'essai), provisionnement client
// (email de bienvenue / paiement), et tout futur email produit.
// =========================================================================

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Centrium <noreply@centrium-platform.com>';

export type EmailLocale = 'fr' | 'en';

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  /** Contenu principal en paragraphes (chaque item = un <p>). */
  paragraphs: string[];
  /** CTA optionnel — bouton central du mail. */
  cta?: { label: string; url: string };
  /** Ligne de contexte grisée sous le CTA (ex: "Lien valable 7 jours"). */
  footnote?: string;
  from?: string;
  /**
   * Langue du destinataire (migration 093 : profiles/consultants
   * .preferred_locale). Pilote la langue du template (lang HTML, footer) —
   * le CONTENU (subject/paragraphs) doit être fourni déjà traduit par
   * l'appelant. Défaut : 'fr'.
   */
  locale?: EmailLocale;
};

/** Petit helper pour les senders : choisit la branche selon la locale. */
export function pick<T>(locale: EmailLocale | undefined, fr: T, en: T): T {
  return locale === 'en' ? en : fr;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Template HTML brandé minimal — inline styles only (clients email). */
function renderHtml(input: SendEmailInput): string {
  const paragraphsHtml = input.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#2a2d3a;">${escapeHtml(p)}</p>`,
    )
    .join('\n');
  const ctaHtml = input.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;"><tr><td style="border-radius:10px;background:#C65F46;">
        <a href="${escapeHtml(input.cta.url)}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(input.cta.label)}</a>
      </td></tr></table>`
    : '';
  const footnoteHtml = input.footnote
    ? `<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#8a8d99;text-align:center;">${escapeHtml(input.footnote)}</p>`
    : '';

  const lang = input.locale === 'en' ? 'en' : 'fr';
  const footerLine =
    input.locale === 'en'
      ? 'Centrium — published by QuadCore SAS'
      : 'Centrium — édité par QuadCore SAS';

  return `<!doctype html>
<html lang="${lang}"><body style="margin:0;padding:0;background:#f6f3ee;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ee;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 8px 18px;text-align:center;">
          <span style="font-size:20px;font-weight:700;letter-spacing:0.04em;color:#2a2d3a;">CENTRIUM</span>
          <span style="display:block;font-size:10px;letter-spacing:0.24em;color:#9a3e2e;margin-top:2px;">BY QUADCORE</span>
        </td></tr>
        <tr><td style="background:#ffffff;border:1px solid #e8e2d8;border-radius:16px;padding:32px 32px 26px;">
          ${paragraphsHtml}
          ${ctaHtml}
          ${footnoteHtml}
        </td></tr>
        <tr><td style="padding:18px 8px 0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9a9daa;">${footerLine} · <a href="https://centrium-platform.com" style="color:#9a3e2e;text-decoration:none;">centrium-platform.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function renderText(input: SendEmailInput): string {
  const lines = [...input.paragraphs];
  if (input.cta) lines.push('', `${input.cta.label} : ${input.cta.url}`);
  if (input.footnote) lines.push('', input.footnote);
  lines.push('', '—', 'Centrium — centrium-platform.com');
  return lines.join('\n');
}

/**
 * Domaines réservés (RFC 2606 / 6761) : jamais délivrables. Les comptes et
 * fiches de l'espace de démonstration les utilisent ; on n'essaie même pas.
 */
export function isReservedEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1] ?? '';
  // Dernier libellé du domaine (TLD réservé) ou domaines d'exemple de l'IANA.
  const tld = domain.split('.').at(-1) ?? '';
  return ['invalid', 'example', 'test', 'localhost'].includes(tld) || ['example.com', 'example.net', 'example.org'].includes(domain);
}

/**
 * Envoie l'email. Ne throw JAMAIS : retourne { sent, error? }.
 * Sans RESEND_API_KEY : log console + { sent: false } (dev-friendly).
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<{ sent: boolean; error?: string }> {
  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).filter((to) => !isReservedEmail(to));
  if (recipients.length === 0) return { sent: false, error: 'reserved_recipient' };
  input = { ...input, to: recipients };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.info('[email] RESEND_API_KEY absente — email non envoyé.', {
      recipients: Array.isArray(input.to) ? input.to.length : 1,
      subject: input.subject,
      hasCta: Boolean(input.cta),
    });
    return { sent: false, error: 'missing_api_key' };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: input.from ?? DEFAULT_FROM,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: renderHtml(input),
        text: renderText(input),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.error(`[email] Resend ${res.status} — ${detail.slice(0, 300)}`);
      return { sent: false, error: `resend_${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    logger.error('[email] envoi échoué', e);
    return { sent: false, error: 'network' };
  }
}
