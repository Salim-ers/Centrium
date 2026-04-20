import { z } from 'zod';

export const contractSchema = z.object({
  contract_number: z.string().min(1, 'Numéro requis').max(50),
  kind: z
    .enum([
      'assistance_technique',
      'apport_affaire',
      'sous_traitance',
      'freelance_mission',
      'nda',
      'amendment',
    ])
    .default('assistance_technique'),
  title: z.string().min(1).max(200),

  // Parties
  consultant_id: z.string().uuid().optional().nullable(),
  supplier_company_name: z.string().min(1, 'Nom société fournisseur requis').max(200),
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

export type ContractInput = z.infer<typeof contractSchema>;
