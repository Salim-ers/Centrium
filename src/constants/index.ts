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
  soon_available: 'Bientôt disponible',
  unavailable: 'Indisponible',
  archived: 'Archivé',
};

export const CONSULTANT_STATUS_STYLE: Record<ConsultantStatus, string> = {
  available: 'bg-success/10 text-success border-success/20',
  on_mission: 'bg-primary/10 text-primary border-primary/20',
  soon_available: 'bg-warning/10 text-warning border-warning/20',
  unavailable: 'bg-muted text-muted-foreground border-border',
  archived: 'bg-muted text-muted-foreground border-border',
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
  new: 'bg-muted text-muted-foreground border-border',
  contacted: 'bg-info/15 text-info border-info/30',
  discussion: 'bg-info/15 text-info border-info/30',
  cv_sent: 'bg-primary/15 text-primary border-primary/30',
  client_interview: 'bg-primary/15 text-primary border-primary/30',
  negotiation: 'bg-warning/15 text-warning border-warning/30',
  won: 'bg-success/15 text-success border-success/30',
  lost: 'bg-destructive/15 text-destructive border-destructive/30',
  on_hold: 'bg-muted text-muted-foreground border-border',
};

export const ALERT_PRIORITY_STYLE: Record<AlertPriority, string> = {
  low: 'bg-muted text-muted-foreground border-border',
  medium: 'bg-info/10 text-info border-info/20',
  high: 'bg-warning/10 text-warning border-warning/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
};

export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  new: 'Nouvelle',
  in_progress: 'Prise en charge',
  snoozed: 'Reportée',
  resolved: 'Résolue',
  dismissed: 'Ignorée',
  expired: 'Expirée',
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  paid: 'Payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
};

export const INVOICE_STATUS_STYLE: Record<InvoiceStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-info/10 text-info',
  paid: 'bg-success/10 text-success',
  overdue: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
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
