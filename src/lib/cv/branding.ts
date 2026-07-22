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

const DEFAULT_PRIMARY = '#6d28d9';
const DEFAULT_ACCENT = '#e11d74';
const DEFAULT_BRAND = 'QuadCore';
const DEFAULT_TAGLINE = 'IT Services & Consulting';

// Bump le `v=` quand tu remplaces le PNG → force navigateurs et CDN
// à recharger immédiatement la nouvelle image. Sinon ils servent
// pendant plusieurs heures la version cachée.
const QUADCORE_VCARD_QR = '/brand/quadcore-vcard-qr.png?v=3';

export function resolveBrand(b: OrgBranding | null | undefined): CVBrand {
  const brandName = (b?.brandName?.trim() || b?.name?.trim()) ?? DEFAULT_BRAND;
  return {
    logoUrl: b?.logoUrl ?? null,
    brandName,
    footerTagline: b?.footerTagline?.trim() || DEFAULT_TAGLINE,
    primary: b?.primaryColor?.trim() || DEFAULT_PRIMARY,
    accent: b?.accentColor?.trim() || DEFAULT_ACCENT,
    // Le QR statique est utilisé pour TOUS les CV générés par la plateforme,
    // peu importe le nom de l'org. C'est le QR vCard de l'ESN éditeur.
    qrCodeUrl: QUADCORE_VCARD_QR,
  };
}

// Fallback NEUTRE pour la fiche de poste : quand l'organisation n'a PAS
// configuré ses couleurs, on n'impose aucune teinte QuadCore — on tombe sur
// un charbon/taupe éditorial. (Les CV, eux, gardent le fallback QuadCore via
// resolveBrand, comportement inchangé.)
const POSTER_FALLBACK_PRIMARY = '#23201d'; // charbon profond
const POSTER_FALLBACK_ACCENT = '#8a7a66'; // taupe neutre chaleureux

/**
 * Comme {@link resolveBrand} mais avec un fallback couleur NEUTRE (charbon /
 * taupe) au lieu des couleurs QuadCore, pour la fiche de poste. Le nom de
 * marque et le logo restent ceux de l'organisation (ou son nom).
 */
export function resolvePosterBrand(b: OrgBranding | null | undefined): CVBrand {
  const base = resolveBrand(b);
  const hasPrimary = Boolean(b?.primaryColor?.trim());
  const hasAccent = Boolean(b?.accentColor?.trim());
  return {
    ...base,
    primary: hasPrimary ? base.primary : POSTER_FALLBACK_PRIMARY,
    accent: hasAccent ? base.accent : POSTER_FALLBACK_ACCENT,
  };
}
