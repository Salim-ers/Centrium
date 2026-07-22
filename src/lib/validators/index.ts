import { z } from 'zod';

// ========== Consultant ==========

export const consultantSchema = z.object({
  first_name: z.string().min(1, 'Prénom requis').max(100),
  last_name: z.string().min(1, 'Nom requis').max(100),
  initials: z.string().max(10).optional().nullable(),
  email: z.string().email('Email invalide').optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable(),
  linkedin_url: z.string().url('URL invalide').optional().nullable().or(z.literal('')),
  job_title: z.string().min(1, 'Intitulé requis').max(200),
  sub_title: z.string().max(200).optional().nullable(),
  seniority: z.enum([
    'junior',
    'confirmed',
    'senior',
    'expert',
    'lead',
    'architect',
  ]),
  years_experience: z.coerce.number().int().min(0).max(50),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(3).default('FR'),
  mobility: z.string().max(200).optional().nullable(),
  daily_rate_eur: z.coerce.number().min(0).max(5000).optional().nullable(),
  contract_type: z
    .enum(['freelance', 'cdi', 'cdd', 'portage', 'partner_esn'])
    .optional()
    .nullable(),
  status: z
    .enum(['available', 'on_mission', 'soon_available', 'unavailable', 'archived'])
    .default('available'),
  available_from: z.string().optional().nullable(),
  summary: z.string().max(2000).optional().nullable(),
  internal_notes: z.string().max(5000).optional().nullable(),
});

export type ConsultantInput = z.infer<typeof consultantSchema>;

// ========== Contact ==========

export const contactSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  contact_type: z.enum([
    'recruiter',
    'sales',
    'manager',
    'client_final',
    'esn_partner',
    'buyer',
    'hr',
    'consultant',
    'other',
  ]),
  job_title: z.string().max(200).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable(),
  linkedin_url: z.string().url().optional().nullable().or(z.literal('')),
  company_id: z.string().uuid().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export type ContactInput = z.infer<typeof contactSchema>;

// ========== Opportunity ==========

export const opportunitySchema = z.object({
  title: z.string().min(1).max(200),
  company_id: z.string().uuid().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  job_offer_id: z.string().uuid().optional().nullable(),
  status: z
    .enum([
      'new',
      'contacted',
      'discussion',
      'cv_sent',
      'client_interview',
      'negotiation',
      'won',
      'lost',
      'on_hold',
    ])
    .default('new'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  expected_revenue: z.coerce.number().min(0).optional().nullable(),
  probability: z.coerce.number().int().min(0).max(100).optional().nullable(),
  daily_rate_eur: z.coerce.number().min(0).optional().nullable(),
  duration_months: z.coerce.number().int().min(0).max(120).optional().nullable(),
  expected_close: z.string().optional().nullable(),
  next_follow_up: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export type OpportunityInput = z.infer<typeof opportunitySchema>;

// ========== Job Offer ==========

export const jobOfferSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional().nullable(),
  required_skills: z.array(z.string()).default([]),
  nice_to_have: z.array(z.string()).default([]),
  seniority: z
    .enum(['junior', 'confirmed', 'senior', 'expert', 'lead', 'architect'])
    .optional()
    .nullable(),
  daily_rate_min: z.coerce.number().min(0).optional().nullable(),
  daily_rate_max: z.coerce.number().min(0).optional().nullable(),
  /** TJM unique — quand renseigné, on stocke aussi en min=max pour
   * rester compatible avec le matching qui lit une plage. */
  daily_rate_eur: z.coerce.number().min(0).optional().nullable(),
  source_kind: z.enum(['client', 'esn']).optional().nullable(),
  source: z.string().max(200).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  remote_days: z.coerce.number().int().min(0).max(5).optional().nullable(),
  start_date: z.string().optional().nullable(),
  duration_months: z.coerce.number().int().min(0).max(60).optional().nullable(),
  deadline: z.string().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  // Champs Fiche de poste — utilisés pour générer le PDF envoyé aux
  // consultants. Tous optionnels : si non remplis, on tombe sur des
  // sections vides ou cachées.
  context: z.string().max(5000).optional().nullable(),
  mission_purpose: z.string().max(2000).optional().nullable(),
  tasks: z.array(z.string()).default([]),
  tech_stack: z.array(z.string()).default([]),
  profile_requirements: z.array(z.string()).default([]),
  working_conditions: z.array(z.string()).default([]),
  contract_kind: z.string().max(80).optional().nullable(),
  // Fiche de poste v2 — additifs, tous optionnels (rétro-compatibilité).
  show_rate: z.coerce.boolean().optional().nullable(),
  work_mode: z.enum(['onsite', 'hybrid', 'remote', 'custom']).optional().nullable(),
  work_mode_detail: z.string().max(120).optional().nullable(),
  start_type: z.enum(['date', 'asap', 'immediate', 'tbd', 'custom']).optional().nullable(),
  start_label: z.string().max(120).optional().nullable(),
  experience_label: z.string().max(120).optional().nullable(),
});

export type JobOfferInput = z.infer<typeof jobOfferSchema>;

// ========== Invoice ==========

// `'' → null` pour les UUIDs optionnels : les <select> rendus avec
// `<option value="">— Aucun —</option>` envoient '' qui ne passe pas
// la validation z.string().uuid(). On préprocesse pour avaler ce cas.
const optionalUuid = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.string().uuid().nullable(),
);

export const invoiceSchema = z
  .object({
    // 'client' = facture de vente (entreprise obligatoire) ·
    // 'consultant' = facture de sous-traitance (consultant obligatoire).
    party: z.enum(['client', 'consultant']).default('client'),
    company_id: optionalUuid.optional(),
    consultant_id: optionalUuid.optional(),
    mission_id: optionalUuid.optional(),
    job_offer_id: optionalUuid.optional(),
    timesheet_id: optionalUuid.optional(),
    // Vide autorisé : la DB attribue un numéro SÉQUENTIEL atomique
    // (trigger assign_invoice_number, migration 088). Un numéro saisi à la
    // main dans un format personnalisé est conservé tel quel.
    invoice_number: z.string().max(50),
    issue_date: z.string(),
    due_date: z.string(),
    period_label: z.string().max(100).optional().nullable(),
    amount_ht: z.coerce.number().min(0),
    vat_rate: z.coerce.number().min(0).max(100).default(20),
    unit_price: z.coerce.number().min(0).optional().nullable(),
    quantity: z.coerce.number().min(0).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.party === 'client' && !val.company_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['company_id'],
        message: 'Client obligatoire pour une facture client',
      });
    }
    if (val.party === 'consultant' && !val.consultant_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['consultant_id'],
        message: 'Consultant obligatoire pour une facture consultant',
      });
    }
  });

export type InvoiceInput = z.infer<typeof invoiceSchema>;

// ========== Timesheet ==========

export const timesheetSchema = z.object({
  mission_id: z.string().uuid(),
  period_month: z.coerce.number().int().min(1).max(12),
  period_year: z.coerce.number().int().min(2020).max(2100),
  // Auto-rempli par le trigger Postgres `populate_timesheet_weekdays` à la
  // création (jours ouvrés du mois). Optionnel ici, recalculé par le
  // trigger `recompute_timesheet_days_worked` à chaque édition.
  days_worked: z.coerce.number().min(0).max(31).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export type TimesheetInput = z.infer<typeof timesheetSchema>;

// ========== Login ==========

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ========== Signup ==========

export const signupSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(12, 'Mot de passe : 12 caractères minimum'),
  first_name: z.string().min(1, 'Prénom requis').max(100),
  last_name: z.string().min(1, 'Nom requis').max(100),
});

export type SignupInput = z.infer<typeof signupSchema>;

// ========== Organization ==========

export const organizationSchema = z.object({
  name: z.string().min(2, 'Nom requis').max(100),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Lettres minuscules, chiffres et tirets uniquement'),
  siren: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
});

export type OrganizationInput = z.infer<typeof organizationSchema>;

// ========== Invitation ==========

export const invitationSchema = z.object({
  email: z.string().email('Email invalide'),
  role: z.enum(['admin', 'business_manager', 'recruiter', 'finance', 'viewer']),
});

export type InvitationInput = z.infer<typeof invitationSchema>;

// ========== Contract ==========

export * from './contract';
