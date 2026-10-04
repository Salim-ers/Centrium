// =========================================================================
// Types métier QuadCore Platform
// (Le fichier database.ts peut être généré automatiquement par
//  `npx supabase gen types typescript --local`)
// =========================================================================

export type UserRole =
  | 'admin'
  // Direction (V2, migration 095) : lecture complète + pilotage.
  | 'direction'
  | 'business_manager'
  | 'recruiter'
  | 'finance'
  | 'viewer'
  | 'consultant'
  // Contact client avec accès au portail client (V2, migration 095).
  // N'a jamais d'organisation active : accès via client_portal_users.
  | 'client'
  // Fondateurs uniquement — accès super-console cross-tenant. Aligné sur
  // l'enum DB user_role (migration 048). Vérifié serveur via
  // lib/auth/super-admin.ts (rôle DB + allowlist FOUNDER_EMAILS).
  | 'super_admin';

export type ConsultantStatus =
  | 'available'
  | 'on_mission'
  | 'soon_available'
  | 'unavailable'
  | 'archived';

export type SeniorityLevel =
  | 'junior'
  | 'confirmed'
  | 'senior'
  | 'expert'
  | 'lead'
  | 'architect';

export type ContractType =
  | 'freelance'
  | 'cdi'
  | 'cdd'
  | 'portage'
  | 'partner_esn';

export type ContactType =
  | 'recruiter'
  | 'sales'
  | 'manager'
  | 'client_final'
  | 'esn_partner'
  | 'buyer'
  | 'hr'
  | 'consultant'
  | 'other';

export type OpportunityStatus =
  | 'new'
  | 'contacted'
  | 'discussion'
  | 'cv_sent'
  | 'client_interview'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'on_hold';

export type AlertType =
  | 'client_follow_up'
  | 'unanswered_message'
  | 'mission_ending'
  | 'consultant_available'
  | 'timesheet_pending'
  | 'invoice_overdue'
  | 'offer_stale'
  | 'opportunity_cold'
  // Détections du moteur d'alertes (migration 083)
  | 'profile_incomplete'
  | 'document_expiring'
  | 'timesheet_missing'
  | 'invoice_forgotten'
  | 'invoice_draft_stale'
  | 'contract_pending_signature'
  | 'contract_expiring'
  | 'mission_no_contract'
  | 'mission_overrun'
  | 'invitation_pending'
  | 'system_issue';

export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus =
  | 'new'
  | 'in_progress'
  | 'snoozed'
  | 'resolved'
  | 'dismissed'
  | 'expired';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type TimesheetStatus =
  | 'draft'
  | 'submitted'
  | 'client_validated'
  | 'rejected';
export type CVTemplateId = 'standard' | 'dense' | 'executive';

// ---------- Entités ----------

export type Organization = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  siren: string | null;
  siret: string | null;
  vat_number: string | null;
  rcs: string | null;
  capital_eur: number | null;
  plan: string;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  organization_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  phone: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type Language = {
  code: string;
  level: 'Natif' | 'Bilingue' | 'Professionnel' | 'Intermédiaire' | 'Notions';
};

export type Consultant = {
  id: string;
  organization_id: string;
  owner_id: string | null;
  first_name: string;
  last_name: string;
  initials: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  job_title: string;
  sub_title: string | null;
  seniority: SeniorityLevel;
  years_experience: number;
  city: string | null;
  country: string;
  mobility: string | null;
  languages: Language[];
  daily_rate_eur: number | null;
  contract_type: ContractType | null;
  status: ConsultantStatus;
  available_from: string | null;
  current_client: string | null;
  current_mission_end: string | null;
  summary: string | null;
  internal_notes: string | null;
  archived: boolean;
  is_prospect: boolean;
  /** Drapeau "CV envoyé / positionné" — transversal bibliothèque + vivier. */
  cv_pushed: boolean;
  cv_pushed_at: string | null;
  cv_pushed_target: string | null;
  // Infos légales / fiscales / bancaires déclarées par le consultant
  // (migration 072) — éditables via le portail (whitelist PATCH).
  legal_status: string | null;
  company_name: string | null;
  siret: string | null;
  vat_number: string | null;
  address: string | null;
  postal_code: string | null;
  iban: string | null;
  bic: string | null;
  created_at: string;
  updated_at: string;
};

export type ConsultantSkill = {
  id: string;
  consultant_id: string;
  category: string;
  name: string;
  level: number | null;
  years: number | null;
  is_highlighted: boolean;
  created_at: string;
};

export type ConsultantExperience = {
  id: string;
  consultant_id: string;
  client_name: string;
  role: string;
  start_date: string;
  end_date: string | null;
  context: string | null;
  tasks: string[];
  environment: string[];
  order_index: number;
  created_at: string;
};

export type ConsultantEducation = {
  id: string;
  consultant_id: string;
  year: number;
  degree: string;
  institution: string | null;
  created_at: string;
};

// CV généré
export type CVSection =
  | { type: 'header'; data: CVHeaderData }
  | { type: 'summary'; content: string }
  | { type: 'skills'; categories: Array<{ name: string; items: string[]; highlighted?: string[] }> }
  | { type: 'experience'; items: ConsultantExperience[] }
  | { type: 'education'; items: ConsultantEducation[] }
  | { type: 'languages'; items: Language[] };

export type CVHeaderData = {
  displayName: string;
  jobTitle: string;
  subTitle: string | null;
  yearsExperience: number;
  location: string | null;
  mobility: string | null;
  availability: string | null;
};

export type CVContent = {
  header: CVHeaderData;
  summary: string;
  skillCategories: Array<{
    name: string;
    items: string[];
    highlighted?: string[];
  }>;
  experiences: ConsultantExperience[];
  educations: ConsultantEducation[];
  languages: Language[];
};

export type CVVersion = {
  id: string;
  organization_id: string;
  consultant_id: string;
  template_id: CVTemplateId;
  job_offer_id: string | null;
  version_label: string | null;
  content: CVContent;
  matching_score: number | null;
  matched_skills: string[];
  missing_skills: string[];
  warnings: string[];
  pdf_url: string | null;
  created_by: string | null;
  created_at: string;
};

export type Company = {
  id: string;
  organization_id: string;
  name: string;
  kind: 'client' | 'esn_partner' | 'prospect';
  industry: string | null;
  size: string | null;
  website: string | null;
  linkedin_url: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  organization_id: string;
  company_id: string | null;
  owner_id: string | null;
  first_name: string;
  last_name: string;
  contact_type: ContactType;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  city: string | null;
  source: string | null;
  last_interaction: string | null;
  prospecting_done: boolean;
  prospecting_done_at: string | null;
  next_call_reminder: string | null;
  next_call_reminder_note: string | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type ContactInteractionKind =
  | 'call'
  | 'email'
  | 'meeting'
  | 'note'
  | 'linkedin'
  | 'sms'
  | 'other';

export type ContactInteraction = {
  id: string;
  organization_id: string;
  contact_id: string;
  kind: ContactInteractionKind;
  note: string;
  occurred_at: string;
  created_by: string | null;
  created_at: string;
};

export type JobOffer = {
  id: string;
  organization_id: string;
  company_id: string | null;
  contact_id: string | null;
  owner_id: string | null;
  title: string;
  description: string | null;
  required_skills: string[];
  nice_to_have: string[];
  seniority: SeniorityLevel | null;
  daily_rate_min: number | null;
  daily_rate_max: number | null;
  location: string | null;
  remote_days: number | null;
  start_date: string | null;
  duration_months: number | null;
  deadline: string | null;
  status: 'open' | 'closed' | 'won' | 'lost';
  /** Type de la source : client direct vs ESN partenaire qui sous-traite. */
  source_kind: 'client' | 'esn' | null;
  /** Nom de la source (client ou ESN) — free-text. */
  source: string | null;
  // Fiche de poste (PDF envoyé aux consultants).
  context: string | null;
  mission_purpose: string | null;
  tasks: string[];
  tech_stack: string[];
  /** Exigences profil (séniorité, certifs, soft skills) — distinct des techs. */
  profile_requirements: string[];
  working_conditions: string[];
  contract_kind: string | null;
  // Fiche de poste v2 — tous nullable / avec défaut : les anciennes fiches
  // (colonnes absentes) tombent sur des fallbacks dérivés (cf. poster-model).
  /** Affichage du TJM sur la fiche PDF. Masqué par défaut. */
  show_rate: boolean | null;
  /** Mode de travail explicite. null = dérivé de `remote_days` (legacy). */
  work_mode: 'onsite' | 'hybrid' | 'remote' | 'custom' | null;
  /** Précision libre quand work_mode = 'custom' (ex. « 2j télétravail / sem. »). */
  work_mode_detail: string | null;
  /** Type de démarrage. null = dérivé de `start_date` (legacy). */
  start_type: 'date' | 'asap' | 'immediate' | 'tbd' | 'custom' | null;
  /** Libellé libre de démarrage (custom) ou surcharge d'affichage. */
  start_label: string | null;
  /** Expérience en clair (« 6–9 ans », « Senior »…). Prioritaire sur `seniority`. */
  experience_label: string | null;
  created_at: string;
  updated_at: string;
};

export type Opportunity = {
  id: string;
  organization_id: string;
  owner_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  job_offer_id: string | null;
  title: string;
  status: OpportunityStatus;
  priority: AlertPriority;
  expected_revenue: number | null;
  probability: number | null;
  daily_rate_eur: number | null;
  duration_months: number | null;
  expected_close: string | null;
  next_follow_up: string | null;
  last_interaction: string | null;
  notes: string | null;
  lost_reason: string | null;
  // V2 (migration 097) — optionnels tant que la migration n'est pas appliquée.
  description?: string | null;
  budget_eur?: number | null;
  start_date?: string | null;
  location?: string | null;
  remote_policy?: string | null;
  required_skills?: string[];
  next_action?: string | null;
  source?: 'manual' | 'client_portal' | 'import';
  client_request_id?: string | null;
  archived?: boolean;
  created_at: string;
  updated_at: string;
};

export type MissionRenewalStatus = 'unknown' | 'likely' | 'confirmed' | 'not_renewed';

export type Mission = {
  id: string;
  organization_id: string;
  consultant_id: string;
  company_id: string;
  opportunity_id: string | null;
  title: string;
  /** TJM de vente (facturé au client). Jamais exposé au consultant. */
  daily_rate_eur: number;
  start_date: string;
  end_date: string | null;
  contract_number: string | null;
  status: 'proposed' | 'active' | 'ended' | 'suspended' | 'rejected';
  // V2 (migration 097)
  owner_id?: string | null;
  planned_days?: number | null;
  renewal_status?: MissionRenewalStatus;
  location?: string | null;
  remote_policy?: string | null;
  created_at: string;
  updated_at: string;
};

// ---------- V2 : finances internes (has_permission('consultants.financials')) ----------

export type ConsultantFinancials = {
  consultant_id: string;
  organization_id: string;
  /** Coût journalier moyen (CJM). */
  daily_cost_eur: number | null;
  target_margin_pct: number | null;
  updated_at: string;
};

export type MissionFinancials = {
  mission_id: string;
  organization_id: string;
  daily_cost_eur: number | null;
  other_costs_eur: number;
  updated_at: string;
};

export type Certification = {
  name: string;
  issuer?: string | null;
  year?: number | null;
  expires_at?: string | null;
};

// ---------- V2 : tâches, documents, devis ----------

export type TaskEntityType =
  | 'opportunity'
  | 'client'
  | 'contact'
  | 'mission'
  | 'consultant'
  | 'timesheet'
  | 'quote'
  | 'client_request';

export type Task = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  assignee_id: string | null;
  created_by: string | null;
  entity_type: TaskEntityType | null;
  entity_id: string | null;
  source: 'manual' | 'automation';
  dedupe_key: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentKind =
  | 'quote'
  | 'proposal'
  | 'purchase_order'
  | 'contract'
  | 'mission_document'
  | 'skills_dossier'
  | 'client_document'
  | 'consultant_document'
  | 'other';

export type DocumentVisibility = 'internal' | 'client' | 'consultant';

export type LibraryDocument = {
  id: string;
  organization_id: string;
  kind: DocumentKind;
  title: string;
  description: string | null;
  company_id: string | null;
  consultant_id: string | null;
  mission_id: string | null;
  opportunity_id: string | null;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  root_id: string | null;
  version: number;
  visibility: DocumentVisibility;
  archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentTemplate = {
  id: string;
  organization_id: string;
  kind: 'quote' | 'proposal' | 'purchase_order' | 'contract' | 'skills_dossier';
  name: string;
  intro_text: string | null;
  terms_text: string | null;
  footer_text: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

export type Quote = {
  id: string;
  organization_id: string;
  number: string | null;
  title: string;
  company_id: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  template_id: string | null;
  status: QuoteStatus;
  issue_date: string;
  valid_until: string | null;
  vat_rate: number;
  intro_text: string | null;
  terms_text: string | null;
  notes: string | null;
  total_ht: number;
  total_ttc: number;
  root_id: string | null;
  version: number;
  sent_at: string | null;
  decided_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteItem = {
  id: string;
  quote_id: string;
  position: number;
  description: string;
  consultant_id: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
};

// ---------- V2 : portails ----------

export type ClientPortalUser = {
  user_id: string;
  organization_id: string;
  company_id: string;
  contact_id: string | null;
  email: string;
  invited_by: string | null;
  created_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
};

export type ClientRequestStatus = 'new' | 'in_review' | 'converted' | 'declined';

export type ClientRequest = {
  id: string;
  organization_id: string;
  company_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  skills: string[];
  seniority: string | null;
  location: string | null;
  remote_policy: string | null;
  start_date: string | null;
  duration_months: number | null;
  budget_eur: number | null;
  daily_rate_eur: number | null;
  status: ClientRequestStatus;
  opportunity_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Mission vue depuis le portail consultant (portal_my_missions()). */
export type PortalMission = {
  id: string;
  title: string;
  status: Mission['status'];
  start_date: string;
  end_date: string | null;
  company_id: string | null;
  company_name: string | null;
  location: string | null;
  remote_policy: string | null;
  planned_days: number | null;
  contract_number: string | null;
  /** Tarif du consultant indépendant (CJM). null pour un salarié. */
  consultant_rate: number | null;
};

// ---------- V2 : intégrations ----------

export type IntegrationProvider = 'pennylane' | 'sage' | 'sellsy' | 'approved_platform' | 'webhook';

export type Integration = {
  id: string;
  organization_id: string;
  provider: IntegrationProvider;
  status: 'not_connected' | 'requested' | 'configured' | 'error';
  config: Record<string, unknown>;
  last_event_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type Timesheet = {
  id: string;
  organization_id: string;
  mission_id: string;
  consultant_id: string;
  period_month: number;
  period_year: number;
  days_worked: number;
  days_validated: number;
  status: TimesheetStatus;
  client_signature_url: string | null;
  submitted_at: string | null;
  validated_at: string | null;
  submitted_by: string | null;
  validated_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  organization_id: string;
  /** 'client' = facture de vente (à encaisser) · 'consultant' = facture de sous-traitance (à payer au freelance). */
  party: 'client' | 'consultant';
  company_id: string | null;
  consultant_id: string | null;
  mission_id: string | null;
  job_offer_id: string | null;
  timesheet_id: string | null;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  period_label: string | null;
  unit_price: number | null;
  quantity: number | null;
  amount_ht: number;
  vat_rate: number;
  amount_vat: number;
  amount_ttc: number;
  status: InvoiceStatus;
  payment_date: string | null;
  payment_method: string | null;
  pdf_url: string | null;
  notes: string | null;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Alert = {
  id: string;
  organization_id: string;
  assignee_id: string | null;
  kind: AlertType;
  priority: AlertPriority;
  status: AlertStatus;
  title: string;
  description: string | null;
  due_date: string | null;
  consultant_id: string | null;
  opportunity_id: string | null;
  contact_id: string | null;
  invoice_id: string | null;
  timesheet_id: string | null;
  created_at: string;
  resolved_at: string | null;
  // Cycle de vie + relances (migration 084)
  dedupe_key: string | null;
  link: string | null;
  entity_kind: string | null;
  entity_id: string | null;
  source: 'manual' | 'engine';
  read_at: string | null;
  snoozed_until: string | null;
  next_reminder_at: string | null;
  reminder_count: number;
  reminder_interval_days: number;
  resolved_by: string | null;
  updated_at: string;
};

/** Notification personnelle (cloche in-app — app interne et portail). */
export type AppNotification = {
  id: string;
  organization_id: string;
  user_id: string;
  kind: string;
  priority: AlertPriority;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

/** Commentaire interne attaché à une alerte (matérialisée ou calculée). */
export type AlertComment = {
  id: string;
  organization_id: string;
  alert_key: string;
  author_id: string;
  body: string;
  created_at: string;
};

/** Trace d'un envoi de notification (idempotence + délivrabilité). */
export type NotificationDelivery = {
  id: string;
  organization_id: string;
  dedupe_key: string;
  channel: 'in_app' | 'email' | 'sms';
  user_id: string | null;
  consultant_id: string | null;
  recipient: string | null;
  status: 'sent' | 'failed' | 'skipped';
  provider: string | null;
  provider_id: string | null;
  error: string | null;
  created_at: string;
};

// ---------- Re-exports ----------

export * from './contract';

// ---------- Helpers ----------

export type ServiceResult<T> = { data: T; error: null } | { data: null; error: Error };
