// =========================================================================
// Catalogue des widgets du tableau de bord — partagé navigateur / serveur.
// Une disposition (par utilisateur, par organisation, par vue) est une
// liste ordonnée de widgets, chacun visible ou masqué.
//
// Grille contrôlée (grand écran) : 12 colonnes × 6 rangées qui remplissent
// exactement l'écran. Chaque widget a une empreinte fixe ; les dispositions
// par défaut remplissent la grille sans trou (docs/CENTRIUM_UX_AUDIT.md).
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
  'open-opps',
  'bench',
  'forecast',
  'timesheets',
  'todo',
  'activity',
  'staffing',
  'missions',
  'pipeline',
  'clients',
  'feed',
] as const;
export type WidgetId = (typeof WIDGET_IDS)[number];

/** Empreinte sur la grille 12 × 6 (colonnes × rangées). */
export type WidgetSpan = { cols: 3 | 4 | 6 | 9 | 12; rows: 1 | 2 | 3 };

export type WidgetDef = {
  id: WidgetId;
  label: { fr: string; en: string };
  description: { fr: string; en: string };
  span: WidgetSpan;
  /** Indicateur sur une rangée (tuile KPI compacte). */
  kpi?: boolean;
  /** Le widget s'affiche si l'utilisateur a AU MOINS une de ces permissions. */
  anyOf?: Permission[];
  /** …et toutes celles-ci. */
  allOf?: Permission[];
};

const REVENUE: Permission[] = ['finance.view', 'analytics.view'];
const KPI: WidgetSpan = { cols: 3, rows: 1 };

export const WIDGETS: Record<WidgetId, WidgetDef> = {
  revenue: {
    id: 'revenue',
    label: { fr: 'CA signé', en: 'Booked revenue' },
    description: { fr: 'Carnet de commandes des missions actives, et le CA validé des derniers mois.', en: 'Order book of active missions, and approved revenue of recent months.' },
    span: KPI,
    kpi: true,
    anyOf: REVENUE,
  },
  margin: {
    id: 'margin',
    label: { fr: 'Marge', en: 'Margin' },
    description: { fr: 'Marge moyenne des missions actives dont le coût est connu.', en: 'Average margin of active missions with a known cost.' },
    span: KPI,
    kpi: true,
    allOf: ['consultants.financials'],
  },
  occupancy: {
    id: 'occupancy',
    label: { fr: 'Taux d’occupation', en: 'Utilisation' },
    description: { fr: 'Consultants en mission sur l’effectif disponible.', en: 'Consultants on assignment over available headcount.' },
    span: KPI,
    kpi: true,
    anyOf: ['staffing.view', 'consultants.view'],
  },
  'pipeline-kpi': {
    id: 'pipeline-kpi',
    label: { fr: 'Pipeline', en: 'Pipeline' },
    description: { fr: 'Montant des opportunités ouvertes, pondéré par leur probabilité.', en: 'Open opportunities, weighted by probability.' },
    span: KPI,
    kpi: true,
    anyOf: ['opportunities.view'],
  },
  ending: {
    id: 'ending',
    label: { fr: 'Fins de mission', en: 'Missions ending' },
    description: { fr: 'Missions actives qui se terminent sous 15, 30, 60 et 90 jours.', en: 'Active missions ending within 15, 30, 60 and 90 days.' },
    span: KPI,
    kpi: true,
    anyOf: ['missions.view'],
  },
  'open-opps': {
    id: 'open-opps',
    label: { fr: 'Opportunités ouvertes', en: 'Open opportunities' },
    description: { fr: 'Besoins clients en cours dans le CRM.', en: 'Client needs in progress in the CRM.' },
    span: KPI,
    kpi: true,
    anyOf: ['opportunities.view'],
  },
  bench: {
    id: 'bench',
    label: { fr: 'Intercontrat', en: 'On bench' },
    description: { fr: 'Consultants actifs sans mission en cours.', en: 'Active consultants without a current assignment.' },
    span: KPI,
    kpi: true,
    anyOf: ['staffing.view', 'consultants.view'],
  },
  forecast: {
    id: 'forecast',
    label: { fr: 'CA prévisionnel', en: 'Forecast revenue' },
    description: { fr: 'CA attendu ce mois-ci et le mois prochain, d’après les missions.', en: 'Revenue expected this month and next, from missions.' },
    span: KPI,
    kpi: true,
    anyOf: REVENUE,
  },
  timesheets: {
    id: 'timesheets',
    label: { fr: 'CRA à valider', en: 'Timesheets to approve' },
    description: { fr: 'Comptes rendus soumis qui attendent une validation.', en: 'Submitted timesheets waiting for approval.' },
    span: KPI,
    kpi: true,
    anyOf: ['timesheets.view'],
  },
  todo: {
    id: 'todo',
    label: { fr: 'À traiter', en: 'To handle' },
    description: { fr: 'Ce qui demande une action aujourd’hui.', en: 'What needs action today.' },
    span: { cols: 3, rows: 3 },
  },
  activity: {
    id: 'activity',
    label: { fr: 'Activité & marge', en: 'Activity & margin' },
    description: { fr: 'CA validé, marge et prévision sur 3, 6 ou 12 mois.', en: 'Approved revenue, margin and forecast over 3, 6 or 12 months.' },
    span: { cols: 6, rows: 3 },
    anyOf: REVENUE,
  },
  staffing: {
    id: 'staffing',
    label: { fr: 'Staffing', en: 'Staffing' },
    description: { fr: 'Qui est en mission, qui se libère, qui est disponible.', en: 'Who is staffed, who frees up, who is available.' },
    span: { cols: 3, rows: 3 },
    anyOf: ['staffing.view'],
  },
  missions: {
    id: 'missions',
    label: { fr: 'Missions à échéance', en: 'Missions ending' },
    description: { fr: 'Missions actives, avancement, échéance et marge.', en: 'Active missions, progress, end date and margin.' },
    span: { cols: 6, rows: 2 },
    anyOf: ['missions.view'],
  },
  pipeline: {
    id: 'pipeline',
    label: { fr: 'Pipeline par étape', en: 'Pipeline by stage' },
    description: { fr: 'Opportunités ouvertes par étape.', en: 'Open opportunities by stage.' },
    span: { cols: 6, rows: 3 },
    anyOf: ['opportunities.view'],
  },
  clients: {
    id: 'clients',
    label: { fr: 'Top clients', en: 'Top clients' },
    description: { fr: 'Clients qui pèsent le plus dans le CA validé (12 mois).', en: 'Clients weighing most in approved revenue (12 months).' },
    span: { cols: 6, rows: 2 },
    allOf: ['clients.view'],
    anyOf: REVENUE,
  },
  feed: {
    id: 'feed',
    label: { fr: 'Activité récente', en: 'Recent activity' },
    description: { fr: 'Opportunités gagnées, missions créées, CRA validés, demandes clients.', en: 'Won opportunities, new missions, approved timesheets, client requests.' },
    span: { cols: 3, rows: 3 },
  },
};

/** Empreintes propres à une vue (le widget principal y prend plus de place). */
export const VIEW_SPANS: Partial<Record<DashboardView, Partial<Record<WidgetId, WidgetSpan>>>> = {
  staffing: { staffing: { cols: 6, rows: 3 }, missions: { cols: 12, rows: 2 } },
  finance: { activity: { cols: 9, rows: 3 } },
};

export function widgetSpan(view: DashboardView, id: WidgetId): WidgetSpan {
  return VIEW_SPANS[view]?.[id] ?? WIDGETS[id].span;
}

export type LayoutItem = { id: WidgetId; hidden?: boolean };

const hidden = (...ids: WidgetId[]): LayoutItem[] => ids.map((id) => ({ id, hidden: true }));

/**
 * Dispositions par défaut (ordre de lecture). Chacune remplit la grille
 * 12 × 6 : quatre indicateurs, une bande principale de trois rangées, une
 * bande basse de deux rangées.
 */
export const DEFAULT_LAYOUTS: Record<DashboardView, LayoutItem[]> = {
  direction: [
    { id: 'revenue' },
    { id: 'margin' },
    { id: 'occupancy' },
    { id: 'pipeline-kpi' },
    { id: 'activity' },
    { id: 'todo' },
    { id: 'staffing' },
    { id: 'missions' },
    { id: 'clients' },
    ...hidden('ending', 'open-opps', 'bench', 'forecast', 'timesheets', 'pipeline', 'feed'),
  ],
  commercial: [
    { id: 'pipeline-kpi' },
    { id: 'open-opps' },
    { id: 'revenue' },
    { id: 'ending' },
    { id: 'pipeline' },
    { id: 'todo' },
    { id: 'feed' },
    { id: 'clients' },
    { id: 'missions' },
    ...hidden('margin', 'occupancy', 'bench', 'forecast', 'timesheets', 'activity', 'staffing'),
  ],
  staffing: [
    { id: 'occupancy' },
    { id: 'bench' },
    { id: 'ending' },
    { id: 'open-opps' },
    { id: 'staffing' },
    { id: 'todo' },
    { id: 'feed' },
    { id: 'missions' },
    ...hidden('revenue', 'margin', 'pipeline-kpi', 'forecast', 'timesheets', 'activity', 'pipeline', 'clients'),
  ],
  finance: [
    { id: 'revenue' },
    { id: 'forecast' },
    { id: 'margin' },
    { id: 'timesheets' },
    { id: 'activity' },
    { id: 'todo' },
    { id: 'clients' },
    { id: 'missions' },
    ...hidden('occupancy', 'pipeline-kpi', 'ending', 'open-opps', 'bench', 'staffing', 'pipeline', 'feed'),
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
