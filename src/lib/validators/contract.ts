import { z } from 'zod';

// '' (select vide) → null, sinon uuid valide.
const optionalUuid = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.string().uuid().nullable(),
);

// Règles croisées party ↔ contrepartie, partagées entre le schéma complet
// (formulaires) et les variantes .partial() des routes API.
export function refineContractParty(
  val: { party?: 'client' | 'consultant'; supplier_company_name?: string | null; client_name?: string | null },
  ctx: z.RefinementCtx,
) {
  // Sous-traitance : la société du freelance est la contrepartie signataire.
  if (val.party === 'consultant' && !val.supplier_company_name?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['supplier_company_name'],
      message: 'Nom société fournisseur requis',
    });
  }
  // Prestation client : l'entreprise cliente est la contrepartie signataire.
  if (val.party === 'client' && !val.client_name?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['client_name'],
      message: 'Entreprise cliente requise',
    });
  }
}

/** Schéma objet « nu » — à utiliser pour .partial()/.extend() côté API. */
export const contractBaseSchema = z
  .object({
    contract_number: z.string().min(1, 'Numéro requis').max(50),
    // Contrepartie : 'consultant' = sous-traitance freelance (défaut,
    // comportement historique) · 'client' = contrat de prestation entreprise.
    party: z.enum(['client', 'consultant']).default('consultant'),
    kind: z
      .enum([
        'assistance_technique',
        'apport_affaire',
        'sous_traitance',
        'freelance_mission',
        'prestation_client',
        'nda',
        'amendment',
      ])
      .default('assistance_technique'),
    title: z.string().min(1).max(200),

    // Parties
    company_id: optionalUuid.optional(),
    consultant_id: z.string().uuid().optional().nullable(),
    supplier_company_name: z.string().max(200).optional().nullable(),
    supplier_address: z.string().max(200).optional().nullable(),
    supplier_postal_code: z.string().max(20).optional().nullable(),
    supplier_city: z.string().max(100).optional().nullable(),
    supplier_rcs: z.string().max(100).optional().nullable(),
    supplier_representative: z.string().max(100).optional().nullable(),
    supplier_email: z.string().email().optional().nullable().or(z.literal('')),

    // Mission
    mission_id: z.string().uuid().optional().nullable(),
    mission_title: z.string().max(200).optional().nullable(),
    client_name: z.string().max(200).optional().nullable(),
    client_address: z.string().max(300).optional().nullable(),
    work_location: z.string().max(300).optional().nullable(),
    remote_days_per_week: z.coerce.number().int().min(0).max(5).default(0),

    // Période
    start_date: z.string().min(1, 'Date de début requise'),
    duration_months: z.coerce.number().int().min(1).max(60).default(3),
    end_date: z.string().optional().nullable(),

    // Financier
    daily_rate_eur: z.coerce.number().min(0).max(5000),
    payment_terms_days: z.coerce.number().int().min(0).max(120).default(30),
    billing_email: z.string().email().optional().nullable().or(z.literal('')),

    // Clauses
    non_compete_months: z.coerce.number().int().min(0).max(36).default(12),
    jurisdiction_city: z.string().max(100).default('Paris'),

    notes: z.string().max(5000).optional().nullable(),
  });

export const contractSchema = contractBaseSchema.superRefine(refineContractParty);

export type ContractInput = z.infer<typeof contractSchema>;
