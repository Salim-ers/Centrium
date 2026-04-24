import type { OrgBranding } from '@/lib/auth/context';

export type CVBrand = {
  logoUrl: string | null;
  brandName: string;
  footerTagline: string;
  primary: string;
  accent: string;
};

const DEFAULT_PRIMARY = '#6d28d9';
const DEFAULT_ACCENT = '#e11d74';
const DEFAULT_BRAND = 'QuadCore';
const DEFAULT_TAGLINE = 'IT Services & Consulting';

export function resolveBrand(b: OrgBranding | null | undefined): CVBrand {
  return {
    logoUrl: b?.logoUrl ?? null,
    brandName: (b?.brandName?.trim() || b?.name?.trim()) ?? DEFAULT_BRAND,
    footerTagline: b?.footerTagline?.trim() || DEFAULT_TAGLINE,
    primary: b?.primaryColor?.trim() || DEFAULT_PRIMARY,
    accent: b?.accentColor?.trim() || DEFAULT_ACCENT,
  };
}
