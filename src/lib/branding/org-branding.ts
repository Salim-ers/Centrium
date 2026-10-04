// Identité visuelle et légale d'une organisation (documents, portails).
// Module partagé serveur / navigateur.

export type CVTemplatePref = 'standard' | 'dense' | 'executive';

export type OrgBranding = {
  id: string;
  /** Raison sociale légale (Centrium, QuadCore SAS, etc.) */
  name: string;
  // === Visuel ===
  logoUrl: string | null;
  brandName: string | null;
  footerTagline: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  defaultCvTemplate: CVTemplatePref | null;
  signatureUrl: string | null;
  // === Identité légale ===
  legalForm: string | null;
  capitalEur: number | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  siren: string | null;
  siret: string | null;
  vatNumber: string | null;
  rcs: string | null;
  representativeName: string | null;
  representativeTitle: string | null;
  // === Banking ===
  iban: string | null;
  bic: string | null;
  bankName: string | null;
  // === Terms ===
  paymentTermsDays: number | null;
  lateFeeRatePct: number | null;
  /** Compteur incrémenté à chaque reloadBranding/load — sert de dep pour
   *  les useMemo des consumers de docs PDF afin qu'ils se régénèrent
   *  immédiatement après une modif. */
  version: number;
};

/** Construit un OrgBranding à partir d'une ligne brute organizations. */
export function buildBranding(
  row: Record<string, unknown> | null,
  version: number,
): OrgBranding | null {
  if (!row) return null;
  return {
    id: row.id as string,
    name: (row.name as string) ?? '',
    logoUrl: (row.logo_url as string | null) ?? null,
    brandName: (row.brand_name as string | null) ?? null,
    footerTagline: (row.footer_tagline as string | null) ?? null,
    primaryColor: (row.brand_primary_color as string | null) ?? null,
    accentColor: (row.brand_accent_color as string | null) ?? null,
    defaultCvTemplate: (row.default_cv_template as CVTemplatePref | null) ?? null,
    signatureUrl: (row.signature_url as string | null) ?? null,
    legalForm: (row.legal_form as string | null) ?? null,
    capitalEur: row.capital_eur != null ? Number(row.capital_eur) : null,
    address: (row.address as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    postalCode: (row.postal_code as string | null) ?? null,
    country: (row.country as string | null) ?? null,
    siren: (row.siren as string | null) ?? null,
    siret: (row.siret as string | null) ?? null,
    vatNumber: (row.vat_number as string | null) ?? null,
    rcs: (row.rcs as string | null) ?? null,
    representativeName: (row.representative_name as string | null) ?? null,
    representativeTitle: (row.representative_title as string | null) ?? null,
    iban: (row.iban as string | null) ?? null,
    bic: (row.bic as string | null) ?? null,
    bankName: (row.bank_name as string | null) ?? null,
    paymentTermsDays:
      row.payment_terms_days != null ? Number(row.payment_terms_days) : null,
    lateFeeRatePct:
      row.late_fee_rate_pct != null ? Number(row.late_fee_rate_pct) : null,
    version,
  };
}

/** Liste exhaustive des colonnes à SELECT pour construire un OrgBranding. */
export const BRANDING_COLUMNS =
  'id, name, logo_url, brand_name, footer_tagline, brand_primary_color, brand_accent_color, default_cv_template, signature_url, legal_form, capital_eur, address, city, postal_code, country, siren, siret, vat_number, rcs, representative_name, representative_title, iban, bic, bank_name, payment_terms_days, late_fee_rate_pct';
