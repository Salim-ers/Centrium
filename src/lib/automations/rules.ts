// =========================================================================
// Centre d'automatisations — catalogue des règles et réglages par
// organisation. Les réglages vivent dans
// org_notification_settings.settings.automations (JSONB, migration 084) :
// { [ruleId]: { enabled: boolean } }. Une règle absente prend sa valeur
// par défaut. Chaque règle listée ici est réellement exécutée (moteur
// d'alertes, routes serveur) : pas de règle décorative.
// =========================================================================

export const AUTOMATION_RULE_IDS = [
  'mission_ending_alerts',
  'missing_timesheet_reminders',
  'stale_opportunity_tasks',
  'client_request_to_opportunity',
  'quote_expiry_alerts',
] as const;

export type AutomationRuleId = (typeof AUTOMATION_RULE_IDS)[number];

export type AutomationRule = {
  id: AutomationRuleId;
  category: 'missions' | 'cra' | 'crm' | 'portals' | 'documents';
  defaultEnabled: boolean;
  label: { fr: string; en: string };
  trigger: { fr: string; en: string };
  action: { fr: string; en: string };
};

export const AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'mission_ending_alerts',
    category: 'missions',
    defaultEnabled: true,
    label: { fr: 'Fin de mission', en: 'Mission ending' },
    trigger: { fr: 'Une mission active se termine dans 90, 60, 30 ou 15 jours', en: 'An active mission ends in 90, 60, 30 or 15 days' },
    action: { fr: 'Alerte au responsable de la mission (à défaut, aux managers)', en: 'Alert the mission owner (or managers)' },
  },
  {
    id: 'missing_timesheet_reminders',
    category: 'cra',
    defaultEnabled: true,
    label: { fr: 'CRA manquants', en: 'Missing timesheets' },
    trigger: { fr: 'Le CRA du mois écoulé n’a pas été transmis', en: 'Last month’s timesheet was not submitted' },
    action: { fr: 'Alerte à l’équipe et rappel au consultant (si les rappels consultants sont activés), relances selon la cadence', en: 'Alert the team and remind the consultant (if consultant reminders are on), on the notification cadence' },
  },
  {
    id: 'stale_opportunity_tasks',
    category: 'crm',
    defaultEnabled: true,
    label: { fr: 'Opportunité sans activité', en: 'Stale opportunity' },
    trigger: { fr: 'Aucune interaction depuis le seuil défini (14 jours par défaut)', en: 'No interaction past the threshold (14 days by default)' },
    action: { fr: 'Crée une tâche de relance pour le responsable', en: 'Creates a follow-up task for the owner' },
  },
  {
    id: 'client_request_to_opportunity',
    category: 'portals',
    defaultEnabled: true,
    label: { fr: 'Demande client', en: 'Client request' },
    trigger: { fr: 'Un client dépose un besoin depuis son portail', en: 'A client submits a need from their portal' },
    action: { fr: 'Crée l’opportunité dans le CRM et notifie l’équipe commerciale', en: 'Creates the CRM opportunity and notifies sales' },
  },
  {
    id: 'quote_expiry_alerts',
    category: 'documents',
    defaultEnabled: true,
    label: { fr: 'Devis bientôt expiré', en: 'Quote expiring' },
    trigger: { fr: 'Un devis envoyé arrive à échéance dans 7 jours', en: 'A sent quote expires within 7 days' },
    action: { fr: 'Crée une tâche de relance pour l’auteur du devis', en: 'Creates a follow-up task for the quote author' },
  },
];

export type AutomationSettings = Record<AutomationRuleId, { enabled: boolean }>;

/** Fusionne les réglages stockés avec les valeurs par défaut. */
export function resolveAutomations(stored: unknown): AutomationSettings {
  const raw = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
  const out = {} as AutomationSettings;
  for (const rule of AUTOMATION_RULES) {
    const v = raw[rule.id];
    const enabled = v && typeof v === 'object' && typeof (v as { enabled?: unknown }).enabled === 'boolean' ? (v as { enabled: boolean }).enabled : rule.defaultEnabled;
    out[rule.id] = { enabled };
  }
  return out;
}
