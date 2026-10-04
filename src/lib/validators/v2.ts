// =========================================================================
// Validateurs V2 (zod) — formulaires CRM, missions, finances, documents,
// portails. Partagés entre le navigateur (react-hook-form) et les routes
// serveur (re-validation systématique avant écriture).
// =========================================================================

import { z } from 'zod';

const uuid = z.string().uuid();
const optionalUuid = z
  .union([uuid, z.literal('')])
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));
const isoDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'), z.literal('')])
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));
const money = z.coerce.number().min(0).max(100_000_000).optional().nullable();
const shortText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const REMOTE_POLICIES = ['onsite', 'hybrid', 'remote', 'tbd'] as const;
export type RemotePolicy = (typeof REMOTE_POLICIES)[number];

export const REMOTE_POLICY_LABEL: Record<RemotePolicy, { fr: string; en: string }> = {
  onsite: { fr: 'Sur site', en: 'On site' },
  hybrid: { fr: 'Hybride', en: 'Hybrid' },
  remote: { fr: 'Télétravail complet', en: 'Fully remote' },
  tbd: { fr: 'À définir', en: 'To be defined' },
};

/** Liste de compétences : dédoublonnée, nettoyée, bornée. */
export const skillList = z
  .array(z.string().trim().min(1).max(60))
  .max(40)
  .default([])
  .transform((list) => {
    const seen = new Set<string>();
    return list.filter((s) => {
      const k = s.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  });

// ── Opportunité ─────────────────────────────────────────────────────────

export const opportunityV2Schema = z.object({
  title: z.string().trim().min(2, 'Intitulé requis').max(200),
  company_id: optionalUuid,
  contact_id: optionalUuid,
  owner_id: optionalUuid,
  job_offer_id: optionalUuid,
  status: z
    .enum(['new', 'contacted', 'discussion', 'cv_sent', 'client_interview', 'negotiation', 'won', 'lost', 'on_hold'])
    .default('new'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  description: shortText(8000),
  budget_eur: money,
  daily_rate_eur: money,
  expected_revenue: money,
  probability: z.coerce.number().int().min(0).max(100).optional().nullable(),
  start_date: isoDate,
  duration_months: z.coerce.number().int().min(0).max(120).optional().nullable(),
  location: shortText(200),
  remote_policy: z.enum(REMOTE_POLICIES).optional().nullable(),
  required_skills: skillList,
  next_action: shortText(300),
  next_follow_up: isoDate,
  expected_close: isoDate,
  notes: shortText(5000),
  lost_reason: shortText(500),
});

export type OpportunityV2Input = z.input<typeof opportunityV2Schema>;
export type OpportunityV2Values = z.output<typeof opportunityV2Schema>;

// ── Tâche ───────────────────────────────────────────────────────────────

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Titre requis').max(200),
  description: shortText(4000),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_date: isoDate,
  assignee_id: optionalUuid,
  entity_type: z
    .enum(['opportunity', 'client', 'contact', 'mission', 'consultant', 'timesheet', 'quote', 'client_request'])
    .optional()
    .nullable(),
  entity_id: optionalUuid,
});

export type TaskInput = z.input<typeof taskSchema>;

// ── Client (société) ────────────────────────────────────────────────────

export const clientSchema = z.object({
  name: z.string().trim().min(1, 'Raison sociale requise').max(200),
  kind: z.enum(['client', 'prospect', 'esn_partner']).default('client'),
  industry: shortText(120),
  size: shortText(60),
  website: z
    .union([z.string().trim().url('URL invalide').max(300), z.literal('')])
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  linkedin_url: z
    .union([z.string().trim().url('URL invalide').max(300), z.literal('')])
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  address: shortText(300),
  city: shortText(120),
  country: shortText(80),
  notes: shortText(5000),
});

export type ClientInput = z.input<typeof clientSchema>;

// ── Mission ─────────────────────────────────────────────────────────────

export const missionSchema = z
  .object({
    title: z.string().trim().min(2, 'Intitulé requis').max(200),
    consultant_id: uuid,
    company_id: optionalUuid,
    opportunity_id: optionalUuid,
    owner_id: optionalUuid,
    daily_rate_eur: z.coerce.number().min(0).max(100_000),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date de début requise'),
    end_date: isoDate,
    planned_days: z.coerce.number().min(0).max(2000).optional().nullable(),
    status: z.enum(['proposed', 'active', 'ended', 'suspended', 'rejected']).default('active'),
    renewal_status: z.enum(['unknown', 'likely', 'confirmed', 'not_renewed']).default('unknown'),
    location: shortText(200),
    remote_policy: z.enum(REMOTE_POLICIES).optional().nullable(),
    contract_number: shortText(80),
    /** CJM — enregistré dans mission_financials, jamais dans missions. */
    daily_cost_eur: money,
  })
  .refine((v) => !v.end_date || v.end_date >= v.start_date, {
    message: 'La date de fin doit suivre la date de début',
    path: ['end_date'],
  });

export type MissionInput = z.input<typeof missionSchema>;

// ── Finances consultant ─────────────────────────────────────────────────

export const consultantFinancialsSchema = z.object({
  daily_cost_eur: money,
  target_margin_pct: z.coerce.number().min(-100).max(100).optional().nullable(),
});

// ── Demande client (portail) ────────────────────────────────────────────

export const clientRequestSchema = z.object({
  title: z.string().trim().min(3, 'Intitulé requis').max(200),
  description: shortText(8000),
  skills: skillList,
  seniority: z.enum(['junior', 'confirmed', 'senior', 'expert']).optional().nullable(),
  location: shortText(200),
  remote_policy: z.enum(REMOTE_POLICIES).optional().nullable(),
  start_date: isoDate,
  duration_months: z.coerce.number().int().min(1).max(120).optional().nullable(),
  budget_eur: money,
  daily_rate_eur: money,
});

export type ClientRequestInput = z.input<typeof clientRequestSchema>;

// ── Devis ───────────────────────────────────────────────────────────────

export const quoteItemSchema = z.object({
  description: z.string().trim().min(1, 'Description requise').max(500),
  consultant_id: optionalUuid,
  quantity: z.coerce.number().min(0).max(100_000),
  unit: z.string().trim().min(1).max(20).default('jour'),
  unit_price: z.coerce.number().min(0).max(1_000_000),
});

export const quoteSchema = z.object({
  title: z.string().trim().min(2, 'Intitulé requis').max(200),
  company_id: optionalUuid,
  contact_id: optionalUuid,
  opportunity_id: optionalUuid,
  template_id: optionalUuid,
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  valid_until: isoDate,
  vat_rate: z.coerce.number().min(0).max(100).default(20),
  intro_text: shortText(5000),
  terms_text: shortText(8000),
  notes: shortText(5000),
  items: z.array(quoteItemSchema).min(1, 'Ajoutez au moins une ligne').max(50),
});

export type QuoteInput = z.input<typeof quoteSchema>;

export const DOCUMENT_TEMPLATE_KINDS = ['quote', 'proposal', 'purchase_order', 'contract', 'skills_dossier'] as const;

export const documentTemplateSchema = z.object({
  kind: z.enum(DOCUMENT_TEMPLATE_KINDS),
  name: z.string().trim().min(1, 'Nom requis').max(120),
  intro_text: shortText(5000),
  terms_text: shortText(8000),
  footer_text: shortText(2000),
  is_default: z.boolean().default(false),
});

export type DocumentTemplateInput = z.input<typeof documentTemplateSchema>;
