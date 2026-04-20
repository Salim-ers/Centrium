// =========================================================================
// Types métier QuadCore Platform
// (Le fichier database.ts peut être généré automatiquement par
//  `npx supabase gen types typescript --local`)
// =========================================================================

export type UserRole =
  | 'admin'
  | 'business_manager'
  | 'recruiter'
  | 'finance'
  | 'viewer';

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
  | 'opportunity_cold';

export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'new' | 'in_progress' | 'resolved' | 'dismissed';

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
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
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
  source: string | null;
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
  created_at: string;
  updated_at: string;
};

export type Mission = {
  id: string;
  organization_id: string;
  consultant_id: string;
  company_id: string;
  opportunity_id: string | null;
  title: string;
  daily_rate_eur: number;
  start_date: string;
  end_date: string | null;
  contract_number: string | null;
  status: 'active' | 'ended' | 'suspended';
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
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  organization_id: string;
  company_id: string;
  mission_id: string | null;
  timesheet_id: string | null;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  period_label: string | null;
  amount_ht: number;
  vat_rate: number;
  amount_vat: number;
  amount_ttc: number;
  status: InvoiceStatus;
  payment_date: string | null;
  payment_method: string | null;
  pdf_url: string | null;
  notes: string | null;
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
};

// ---------- Re-exports ----------

export * from './contract';

// ---------- Helpers ----------

export type ServiceResult<T> = { data: T; error: null } | { data: null; error: Error };
