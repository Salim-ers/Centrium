import QRCode from 'qrcode';

import type { Consultant } from '@/types';

/**
 * Construit la chaine encodée dans le QR code du CV.
 *
 *   - Si le consultant a un linkedin_url → on encode l'URL (1 scan
 *     emmène le recruteur sur son profil LinkedIn).
 *   - Sinon → vCard 3.0 minimaliste avec nom / titre / email / phone.
 *     Le scan ouvre la fiche contact native du téléphone.
 *
 * Ne renvoie jamais null : on a toujours un fallback vCard, même si
 * le consultant n'a aucune coordonnée (au pire, un vCard avec juste
 * son nom + intitulé).
 */
export function buildQrPayload(consultant: Consultant): string {
  if (consultant.linkedin_url && consultant.linkedin_url.trim()) {
    return consultant.linkedin_url.trim();
  }
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  lines.push(`N:${consultant.last_name};${consultant.first_name};;;`);
  lines.push(`FN:${consultant.first_name} ${consultant.last_name}`);
  if (consultant.job_title) lines.push(`TITLE:${consultant.job_title}`);
  if (consultant.email) lines.push(`EMAIL;TYPE=INTERNET:${consultant.email}`);
  if (consultant.phone) lines.push(`TEL;TYPE=CELL:${consultant.phone}`);
  if (consultant.city) lines.push(`ADR:;;;${consultant.city};;;${consultant.country ?? 'FR'}`);
  lines.push('END:VCARD');
  return lines.join('\n');
}

/**
 * Rend le QR code en data URL PNG. On utilise une marge minime (1) et
 * un haut niveau de correction (M) qui tolère les petites occlusions
 * sans casser le scan, même si le QR est imprimé en petit.
 */
export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

/**
 * Helper haut-niveau utilisé par la page cv-optimizer.
 */
export async function buildConsultantQr(consultant: Consultant): Promise<string> {
  return generateQrDataUrl(buildQrPayload(consultant));
}
