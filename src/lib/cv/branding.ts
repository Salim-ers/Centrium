import type { OrgBranding } from '@/lib/auth/context';

export type CVBrand = {
  logoUrl: string | null;
  brandName: string;
  footerTagline: string;
  primary: string;
  accent: string;
  /**
   * URL d'un QR code "carte de visite" affiché à côté du logo sur le CV.
   * Sert toujours le PNG statique embarqué dans /public/brand/. Pour le
   * remplacer : drop le nouveau PNG au même chemin (même nom de fichier).
   * Le `?v=` est un cache-buster que tu peux bump quand tu remplaces
   * l'image — sinon le CDN Vercel + le navigateur peuvent servir une
   * version périmée pendant plusieurs heures.
   */
  qrCodeUrl: string | null;
};

// Fallback NEUTRE : sans couleurs configurées, les dossiers sont en
// charbon / taupe ; sans nom de marque, on affiche la raison sociale.
// Jamais d'identité d'un autre éditeur.
const DEFAULT_PRIMARY = '#23201d';
const DEFAULT_ACCENT = '#8a7a66';
const DEFAULT_BRAND = '';
const DEFAULT_TAGLINE = '';

// Bump le `v=` quand tu remplaces le PNG → force navigateurs et CDN
// à recharger immédiatement la nouvelle image. Sinon ils servent
// pendant plusieurs heures la version cachée.
const QUADCORE_VCARD_QR = '/brand/quadcore-vcard-qr.png?v=3';

export function resolveBrand(b: OrgBranding | null | undefined): CVBrand {
  const brandName = b?.brandName?.trim() || b?.name?.trim() || DEFAULT_BRAND;
  return {
    logoUrl: b?.logoUrl ?? null,
    brandName,
    footerTagline: b?.footerTagline?.trim() || DEFAULT_TAGLINE,
    primary: b?.primaryColor?.trim() || DEFAULT_PRIMARY,
    accent: b?.accentColor?.trim() || DEFAULT_ACCENT,
    // QR vCard statique de l'éditeur : affiché uniquement pour le compte
    // fondateur (voir l'atelier), jamais sur les dossiers des autres ESN.
    qrCodeUrl: QUADCORE_VCARD_QR,
  };
}

/**
 * Branding de la fiche de poste : même fallback neutre que les dossiers
 * (conservé pour les appels existants).
 */
export function resolvePosterBrand(b: OrgBranding | null | undefined): CVBrand {
  return resolveBrand(b);
}
