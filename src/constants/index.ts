import type {
  ConsultantStatus,
  OpportunityStatus,
  AlertPriority,
  AlertStatus,
  InvoiceStatus,
  SeniorityLevel,
  ContactType,
  CVTemplateId,
} from '@/types';

export const CONSULTANT_STATUS_LABEL: Record<ConsultantStatus, string> = {
  available: 'Disponible',
  on_mission: 'En mission',
  soon_available: 'Bientôt dispo',
  unavailable: 'Indisponible',
  archived: 'Archivé',
};

export const CONSULTANT_STATUS_STYLE: Record<ConsultantStatus, string> = {
  available: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  on_mission: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  soon_available: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  unavailable: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  archived: 'bg-slate-700/20 text-slate-500 border-slate-700/30',
};

export const SENIORITY_LABEL: Record<SeniorityLevel, string> = {
  junior: 'Junior',
  confirmed: 'Confirmé',
  senior: 'Senior',
  expert: 'Expert',
  lead: 'Lead',
  architect: 'Architecte',
};

export const OPPORTUNITY_STATUS_LABEL: Record<OpportunityStatus, string> = {
  new: 'Nouveau',
  contacted: 'Contacté',
  discussion: 'En discussion',
  cv_sent: 'CV envoyé',
  client_interview: 'Entretien client',
  negotiation: 'Négociation',
  won: 'Gagné',
  lost: 'Perdu',
  on_hold: 'En veille',
};

export const OPPORTUNITY_STATUS_ORDER: OpportunityStatus[] = [
  'new',
  'contacted',
  'discussion',
  'cv_sent',
  'client_interview',
  'negotiation',
  'won',
  'lost',
  'on_hold',
];

export const OPPORTUNITY_STATUS_COLOR: Record<OpportunityStatus, string> = {
  new: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  contacted: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  discussion: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  cv_sent: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  client_interview: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  negotiation: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  won: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  lost: 'bg-red-500/15 text-red-300 border-red-500/30',
  on_hold: 'bg-slate-600/15 text-slate-400 border-slate-600/30',
};

export const ALERT_PRIORITY_STYLE: Record<AlertPriority, string> = {
  low: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  medium: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  high: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  critical: 'bg-red-500/10 text-red-300 border-red-500/20',
};

export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  new: 'Nouveau',
  in_progress: 'En cours',
  resolved: 'Résolu',
  dismissed: 'Ignoré',
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  paid: 'Payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
};

export const INVOICE_STATUS_STYLE: Record<InvoiceStatus, string> = {
  draft: 'bg-slate-500/10 text-slate-300',
  sent: 'bg-blue-500/10 text-blue-300',
  paid: 'bg-emerald-500/10 text-emerald-300',
  overdue: 'bg-red-500/10 text-red-300',
  cancelled: 'bg-slate-600/10 text-slate-500',
};

export const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
  recruiter: 'Recruteur',
  sales: 'Commercial',
  manager: 'Manager',
  client_final: 'Client final',
  esn_partner: 'ESN partenaire',
  buyer: 'Acheteur',
  hr: 'RH',
  consultant: 'Consultant',
  other: 'Autre',
};

export const CV_TEMPLATE_LABEL: Record<CVTemplateId, string> = {
  standard: 'Centrium Standard',
  dense: 'Centrium Dense',
  executive: 'Centrium Executive',
};

export const SKILL_CATEGORIES = [
  { id: 'languages', label: 'Langages' },
  { id: 'frameworks', label: 'Frameworks' },
  { id: 'automation', label: 'Automatisation' },
  { id: 'testing', label: 'Tests / QA' },
  { id: 'databases', label: 'Bases de données' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'ci_cd', label: 'CI/CD' },
  { id: 'tools', label: 'Outils' },
  { id: 'methodologies', label: 'Méthodologies' },
  { id: 'data', label: 'Data' },
  { id: 'platforms', label: 'Plateformes' },
] as const;
