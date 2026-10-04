// =========================================================================
// Catalogue des widgets du tableau de bord — partagé navigateur / serveur.
// Une disposition (par utilisateur, par organisation, par vue) est une
// liste ordonnée de widgets, chacun visible ou masqué.
// =========================================================================

import type { Permission } from '@/lib/auth/permissions';

export const DASHBOARD_VIEWS = ['direction', 'commercial', 'staffing', 'finance'] as const;
export type DashboardView = (typeof DASHBOARD_VIEWS)[number];

export const WIDGET_IDS = [
  'revenue',
  'margin',
  'occupancy',
  'pipeline-kpi',
  'ending',
  'todo',
  'activity',
  'staffing',
  'missions',
  'pipeline',
  'clients',
  'feed',
] as const;
export type WidgetId = (typeof WIDGET_IDS)[number];

/** Largeur sur la grille de 12 colonnes (grand écran). */
export type WidgetSize = 'sm' | 'md' | 'lg' | 'full';

export type WidgetDef = {
  id: WidgetId;
  label: { fr: string; en: string };
  description: { fr: string; en: string };
  size: WidgetSize;
  /** Occupe deux rangées (les petits widgets se rangent à côté). */
  tall?: boolean;
  /** Le widget s'affiche si l'utilisateur a AU MOINS une de ces permissions. */
  anyOf?: Permission[];
  /** …et toutes celles-ci. */
  allOf?: Permission[];
};

const REVENUE: Permission[] = ['finance.view', 'analytics.view'];

export const WIDGETS: Record<WidgetId, WidgetDef> = {
  revenue: {
    id: 'revenue',
    label: { fr: 'CA signé', en: 'Booked revenue' },
    description: { fr: 'Carnet de commandes des missions actives, et le CA validé des derniers mois.', en: 'Order book of active missions, and approved revenue of recent months.' },
    size: 'sm',
    anyOf: REVENUE,
  },
  margin: {
    id: 'margin',
    label: { fr: 'Marge', en: 'Margin' },
    description: { fr: 'Marge moyenne des missions actives dont le coût est connu.', en: 'Average margin of active missions with a known cost.' },
    size: 'sm',
    allOf: ['consultants.financials'],
  },
  occupancy: {
    id: 'occupancy',
    label: { fr: 'Taux d’occupation', en: 'Utilisation' },
    description: { fr: 'Consultants en mission sur l’effectif disponible.', en: 'Consultants on assignment over available headcount.' },
    size: 'sm',
    anyOf: ['staffing.view', 'consultants.view'],
  },
  'pipeline-kpi': {
    id: 'pipeline-kpi',
    label: { fr: 'Pipeline pondéré', en: 'Weighted pipeline' },
    description: { fr: 'Montant des opportunités ouvertes × probabilité.', en: 'Open opportunities × probability.' },
    size: 'sm',
    anyOf: ['opportunities.view'],
  },
  ending: {
    id: 'ending',
    label: { fr: 'Fins de mission', en: 'Missions ending' },
    description: { fr: 'Missions actives qui se terminent sous 15, 30, 60 et 90 jours.', en: 'Active missions ending within 15, 30, 60 and 90 days.' },
    size: 'sm',
    anyOf: ['missions.view'],
  },
  todo: {
    id: 'todo',
    label: { fr: 'À traiter', en: 'To handle' },
    description: { fr: 'Ce qui demande une action aujourd’hui.', en: 'What needs action today.' },
    size: 'sm',
  },
  activity: {
    id: 'activity',
    label: { fr: 'Activité & marge', en: 'Activity & margin' },
    description: { fr: 'CA validé, marge et prévision sur 3, 6 ou 12 mois.', en: 'Approved revenue, margin and forecast over 3, 6 or 12 months.' },
    size: 'lg',
    tall: true,
    anyOf: REVENUE,
  },
  staffing: {
    id: 'staffing',
    label: { fr: 'Staffing', en: 'Staffing' },
    description: { fr: 'Qui est en mission, qui se libère, qui est disponible.', en: 'Who is staffed, who frees up, who is available.' },
    size: 'sm',
    anyOf: ['staffing.view'],
  },
  missions: {
    id: 'missions',
    label: { fr: 'Missions', en: 'Missions' },
    description: { fr: 'Missions actives, avancement, échéance et marge.', en: 'Active missions, progress, end date and margin.' },
    size: 'sm',
    anyOf: ['missions.view'],
  },
  pipeline: {
    id: 'pipeline',
    label: { fr: 'Pipeline', en: 'Pipeline' },
    description: { fr: 'Opportunités ouvertes par étape.', en: 'Open opportunities by stage.' },
    size: 'md',
    anyOf: ['opportunities.view'],
  },
  clients: {
    id: 'clients',
    label: { fr: 'Top clients', en: 'Top clients' },
    description: { fr: 'Clients qui pèsent le plus dans le CA validé (12 mois).', en: 'Clients weighing most in approved revenue (12 months).' },
    size: 'md',
    allOf: ['clients.view'],
    anyOf: REVENUE,
  },
  feed: {
    id: 'feed',
    label: { fr: 'Activité récente', en: 'Recent activity' },
    description: { fr: 'Opportunités gagnées, missions créées, CRA validés, demandes clients.', en: 'Won opportunities, new missions, approved timesheets, client requests.' },
    size: 'full',
  },
};

export type LayoutItem = { id: WidgetId; hidden?: boolean };

/** Dispositions par défaut de chaque vue (ordre de lecture). */
export const DEFAULT_LAYOUTS: Record<DashboardView, LayoutItem[]> = {
  direction: [
    { id: 'revenue' },
    { id: 'margin' },
    { id: 'todo' },
    { id: 'activity' },
    { id: 'staffing' },
    { id: 'missions' },
    { id: 'pipeline' },
    { id: 'clients' },
    { id: 'feed' },
    { id: 'occupancy', hidden: true },
    { id: 'pipeline-kpi', hidden: true },
    { id: 'ending', hidden: true },
  ],
  commercial: [
    { id: 'pipeline-kpi' },
    { id: 'revenue' },
    { id: 'todo' },
    { id: 'pipeline' },
    { id: 'clients' },
    { id: 'feed' },
    { id: 'margin', hidden: true },
    { id: 'occupancy', hidden: true },
    { id: 'ending', hidden: true },
    { id: 'activity', hidden: true },
    { id: 'staffing', hidden: true },
    { id: 'missions', hidden: true },
  ],
  staffing: [
    { id: 'occupancy' },
    { id: 'ending' },
    { id: 'todo' },
    { id: 'staffing' },
    { id: 'missions' },
    { id: 'feed' },
    { id: 'revenue', hidden: true },
    { id: 'margin', hidden: true },
    { id: 'pipeline-kpi', hidden: true },
    { id: 'activity', hidden: true },
    { id: 'pipeline', hidden: true },
    { id: 'clients', hidden: true },
  ],
  finance: [
    { id: 'revenue' },
    { id: 'margin' },
    { id: 'todo' },
    { id: 'activity' },
    { id: 'clients' },
    { id: 'missions' },
    { id: 'feed' },
    { id: 'occupancy', hidden: true },
    { id: 'pipeline-kpi', hidden: true },
    { id: 'ending', hidden: true },
    { id: 'staffing', hidden: true },
    { id: 'pipeline', hidden: true },
  ],
};

/**
 * Disposition effective : la disposition enregistrée, complétée des
 * widgets apparus depuis (masqués), sans doublon ni identifiant inconnu.
 */
export function resolveLayout(view: DashboardView, saved: LayoutItem[] | null | undefined): LayoutItem[] {
  const out: LayoutItem[] = [];
  const seen = new Set<WidgetId>();
  for (const item of saved ?? DEFAULT_LAYOUTS[view]) {
    if (!(WIDGET_IDS as readonly string[]).includes(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push({ id: item.id, hidden: !!item.hidden });
  }
  for (const item of DEFAULT_LAYOUTS[view]) {
    if (!seen.has(item.id)) out.push({ id: item.id, hidden: true });
  }
  return out;
}

/** Le widget est-il autorisé pour ces permissions ? */
export function widgetAllowed(def: WidgetDef, can: (p: Permission) => boolean): boolean {
  if (def.allOf && !def.allOf.every(can)) return false;
  if (def.anyOf && !def.anyOf.some(can)) return false;
  return true;
}
