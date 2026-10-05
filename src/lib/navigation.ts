// =========================================================================
// Navigation de l'application — source unique pour la barre latérale, les
// onglets internes, le fil d'Ariane et la palette de commandes.
//
// Huit destinations, jamais de troisième niveau : une destination peut
// avoir des onglets (SECTION_TABS), rien de plus. Voir
// docs/CENTRIUM_UX_AUDIT.md §2.
// =========================================================================

import {
  LayoutDashboard,
  Handshake,
  Users,
  CalendarRange,
  Briefcase,
  Layers,
  BarChart3,
  DoorOpen,
  Settings,
  LifeBuoy,
  FileText,
  Workflow,
  ListChecks,
  History,
  ClipboardList,
  Building2,
  Palette,
  SlidersHorizontal,
  CreditCard,
  BellRing,
  Plug,
  ShieldCheck,
  User,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { Permission } from '@/lib/auth/permissions';

type Label = { fr: string; en: string };

export type NavItem = {
  id: string;
  label: Label;
  href: string;
  icon: LucideIcon;
  /** Permission requise (une seule suffit si liste). */
  permission: Permission | Permission[];
  /** Routes historiques ou sous-routes qui allument cette entrée. */
  matchAlso?: string[];
  /** Mots-clés supplémentaires pour la palette de commandes. */
  keywords?: string[];
};

/** Les huit destinations de la barre latérale. */
export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: { fr: 'Dashboard', en: 'Dashboard' },
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: 'dashboard.view',
    matchAlso: ['/alerts', '/todos'],
    keywords: ['accueil', 'home', 'kpi', 'à faire', 'tableau de bord'],
  },
  {
    id: 'crm',
    label: { fr: 'CRM', en: 'CRM' },
    href: '/crm',
    icon: Handshake,
    permission: ['crm.view', 'opportunities.view', 'clients.view'],
    matchAlso: ['/opportunities', '/clients', '/companies', '/contacts', '/offers', '/responses'],
    keywords: ['pipeline', 'opportunités', 'clients', 'contacts', 'affaires', 'tâches', 'besoins'],
  },
  {
    id: 'talents',
    label: { fr: 'Talents', en: 'Talents' },
    href: '/consultants',
    icon: Users,
    permission: 'consultants.view',
    matchAlso: ['/prospects', '/cv-pushed', '/cv-optimizer'],
    keywords: ['consultants', 'vivier', 'cv', 'dossier de compétences', 'profils'],
  },
  {
    id: 'staffing',
    label: { fr: 'Staffing', en: 'Staffing' },
    href: '/staffing',
    icon: CalendarRange,
    permission: 'staffing.view',
    matchAlso: ['/matching', '/en-mission'],
    keywords: ['planning', 'disponibilités', 'matching', 'intercontrat', 'positionnements'],
  },
  {
    id: 'missions',
    label: { fr: 'Missions', en: 'Missions' },
    href: '/missions',
    icon: Briefcase,
    permission: 'missions.view',
    keywords: ['affectations', 'échéances', 'renouvellements'],
  },
  {
    id: 'operations',
    label: { fr: 'Opérations', en: 'Operations' },
    href: '/timesheets',
    icon: Layers,
    permission: ['timesheets.view', 'documents.view', 'finance.view'],
    matchAlso: ['/documents', '/contracts', '/templates', '/finance', '/invoices', '/accounting'],
    keywords: ['cra', 'comptes rendus', 'devis', 'documents', 'préfacturation', 'finance', 'export'],
  },
  {
    id: 'analytics',
    label: { fr: 'Analytics', en: 'Analytics' },
    href: '/analytics',
    icon: BarChart3,
    permission: 'analytics.view',
    keywords: ['rapports', 'statistiques', 'rentabilité', 'performance'],
  },
  {
    id: 'portals',
    label: { fr: 'Portails', en: 'Portals' },
    href: '/portals',
    icon: DoorOpen,
    permission: 'portals.manage',
    keywords: ['portail client', 'portail consultant', 'accès', 'demandes'],
  },
];

/** Bas de la barre latérale. */
export const SECONDARY_ITEMS: NavItem[] = [
  {
    id: 'settings',
    label: { fr: 'Paramètres', en: 'Settings' },
    href: '/settings',
    icon: Settings,
    permission: 'dashboard.view',
    matchAlso: ['/billing', '/onboarding/setup', '/automations'],
    keywords: ['équipe', 'rôles', 'abonnement', 'branding', 'intégrations', 'automatisations'],
  },
  {
    id: 'help',
    label: { fr: 'Aide', en: 'Help' },
    href: '/aide',
    icon: LifeBuoy,
    permission: 'dashboard.view',
    matchAlso: ['/changelog'],
    keywords: ['support', 'documentation', 'nouveautés'],
  },
];

export type SectionTab = {
  href: string;
  label: Label;
  permission: Permission | Permission[];
  /** Préfixes de routes qui activent l'onglet (le plus spécifique l'emporte). */
  match: string[];
};

/** Onglets internes des destinations qui en ont. */
export const SECTION_TABS: Record<'crm' | 'operations' | 'staffing', SectionTab[]> = {
  crm: [
    { href: '/crm', label: { fr: 'Pipeline', en: 'Pipeline' }, permission: ['crm.view', 'opportunities.view'], match: ['/crm', '/opportunities', '/offers', '/responses'] },
    { href: '/clients', label: { fr: 'Clients', en: 'Clients' }, permission: 'clients.view', match: ['/clients', '/companies'] },
    { href: '/contacts', label: { fr: 'Contacts', en: 'Contacts' }, permission: 'crm.view', match: ['/contacts'] },
    { href: '/crm/tasks', label: { fr: 'Tâches', en: 'Tasks' }, permission: 'crm.view', match: ['/crm/tasks'] },
  ],
  operations: [
    { href: '/timesheets', label: { fr: 'CRA', en: 'Timesheets' }, permission: 'timesheets.view', match: ['/timesheets'] },
    { href: '/documents', label: { fr: 'Documents', en: 'Documents' }, permission: 'documents.view', match: ['/documents', '/contracts', '/templates'] },
    { href: '/finance', label: { fr: 'Pilotage financier', en: 'Financial overview' }, permission: 'finance.view', match: ['/finance', '/invoices', '/accounting'] },
  ],
  staffing: [
    { href: '/staffing', label: { fr: 'Planning', en: 'Planning' }, permission: 'staffing.view', match: ['/staffing', '/en-mission'] },
    { href: '/matching', label: { fr: 'Matching', en: 'Matching' }, permission: 'staffing.view', match: ['/matching'] },
  ],
};

export type SettingsSection = SectionTab & { icon: LucideIcon; group: 'org' | 'workspace' | 'account' };

/** Groupes de la navigation interne des Paramètres. */
export const SETTINGS_GROUPS: Array<{ id: SettingsSection['group']; label: Label }> = [
  { id: 'org', label: { fr: 'Organisation', en: 'Organization' } },
  { id: 'workspace', label: { fr: 'Espace de travail', en: 'Workspace' } },
  { id: 'account', label: { fr: 'Mon compte', en: 'My account' } },
];

/**
 * Sections des Paramètres : une navigation interne compacte, le contenu à
 * droite. Les pages historiques (/billing, /automations) restent valides.
 */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  { group: 'org', href: '/settings', label: { fr: 'Organisation', en: 'Organization' }, icon: Building2, permission: 'dashboard.view', match: ['/settings', '/settings/facturation'] },
  { group: 'org', href: '/settings/branding', label: { fr: 'Branding', en: 'Branding' }, icon: Palette, permission: 'dashboard.view', match: ['/settings/branding'] },
  { group: 'org', href: '/settings/team', label: { fr: 'Équipe', en: 'Team' }, icon: Users, permission: 'dashboard.view', match: ['/settings/team'] },
  { group: 'org', href: '/settings/permissions', label: { fr: 'Rôles & permissions', en: 'Roles & permissions' }, icon: SlidersHorizontal, permission: 'team.manage', match: ['/settings/permissions'] },
  { group: 'org', href: '/settings/subscription', label: { fr: 'Abonnement', en: 'Subscription' }, icon: CreditCard, permission: 'dashboard.view', match: ['/settings/subscription', '/billing'] },
  { group: 'workspace', href: '/settings/notifications', label: { fr: 'Notifications', en: 'Notifications' }, icon: BellRing, permission: 'dashboard.view', match: ['/settings/notifications'] },
  { group: 'workspace', href: '/settings/automations', label: { fr: 'Automatisations', en: 'Automations' }, icon: Workflow, permission: 'automations.manage', match: ['/settings/automations', '/automations'] },
  { group: 'workspace', href: '/settings/portals', label: { fr: 'Portails', en: 'Portals' }, icon: DoorOpen, permission: 'portals.manage', match: ['/settings/portals'] },
  { group: 'workspace', href: '/settings/integrations', label: { fr: 'Intégrations', en: 'Integrations' }, icon: Plug, permission: 'finance.edit', match: ['/settings/integrations'] },
  { group: 'workspace', href: '/settings/privacy', label: { fr: 'Sécurité & données', en: 'Security & data' }, icon: ShieldCheck, permission: 'dashboard.view', match: ['/settings/privacy'] },
  { group: 'account', href: '/settings/profile', label: { fr: 'Mon profil', en: 'My profile' }, icon: User, permission: 'dashboard.view', match: ['/settings/profile'] },
  { group: 'account', href: '/settings/appearance', label: { fr: 'Apparence', en: 'Appearance' }, icon: Sparkles, permission: 'dashboard.view', match: ['/settings/appearance'] },
];

/** Pages sans entrée de menu, trouvables par la palette (⌘K). */
export const HIDDEN_PAGES: NavItem[] = [
  { id: 'todos', label: { fr: 'À faire', en: 'To do' }, href: '/todos', icon: ListChecks, permission: 'dashboard.view', keywords: ['tâches', 'relances', 'inbox', 'alertes'] },
  { id: 'activity', label: { fr: 'Activité', en: 'Activity' }, href: '/activity', icon: History, permission: 'dashboard.view', keywords: ['historique', 'journal', 'timeline', 'fil'] },
  { id: 'dossier', label: { fr: 'Dossier de compétences', en: 'Skills dossier' }, href: '/cv-optimizer', icon: FileText, permission: 'consultants.view', keywords: ['cv', 'cv optimizer', 'dossier', 'export pdf', 'word'] },
  { id: 'offers', label: { fr: 'Fiches de poste', en: 'Job descriptions' }, href: '/offers', icon: ClipboardList, permission: 'opportunities.view', keywords: ['offres', 'besoins'] },
  { id: 'responses', label: { fr: 'Réponses aux appels d’offres', en: 'Tender responses' }, href: '/responses', icon: FileText, permission: 'opportunities.view', keywords: ['ao', 'appel d’offres'] },
  { id: 'automations', label: { fr: 'Automatisations', en: 'Automations' }, href: '/automations', icon: Workflow, permission: 'automations.manage', keywords: ['règles', 'rappels', 'recettes'] },
];

function matches(pathname: string, p: string) {
  return pathname === p || pathname.startsWith(p + '/');
}

/** L'entrée est visible si l'utilisateur détient une des permissions. */
export function canSeeNavItem(item: Pick<NavItem, 'permission'>, can: (p: Permission) => boolean): boolean {
  return Array.isArray(item.permission) ? item.permission.some(can) : can(item.permission);
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return matches(pathname, item.href) || (item.matchAlso ?? []).some((p) => matches(pathname, p));
}

/** Onglet actif : celui dont le préfixe correspondant est le plus long. */
export function activeSectionTab(tabs: SectionTab[], pathname: string): SectionTab | null {
  let best: { tab: SectionTab; len: number } | null = null;
  for (const tab of tabs) {
    for (const p of tab.match) {
      if (matches(pathname, p) && (!best || p.length > best.len)) best = { tab, len: p.length };
    }
  }
  return best?.tab ?? null;
}

/** Destination courante (barre latérale ou bas de barre). */
export function currentNavItem(pathname: string): NavItem | null {
  return [...NAV_ITEMS, ...SECONDARY_ITEMS].find((i) => isNavItemActive(i, pathname)) ?? null;
}

/** Fil d'Ariane : destination, puis onglet interne s'il y en a un. */
export function breadcrumb(pathname: string, lang: 'fr' | 'en'): string[] {
  const item = currentNavItem(pathname);
  if (!item) {
    const hidden = HIDDEN_PAGES.find((p) => matches(pathname, p.href));
    return hidden ? [hidden.label[lang]] : [];
  }
  const crumbs = [item.label[lang]];
  const tabs = item.id === 'settings' ? SETTINGS_SECTIONS : (SECTION_TABS as Record<string, SectionTab[] | undefined>)[item.id];
  const tab = tabs ? activeSectionTab(tabs, pathname) : null;
  if (tab) crumbs.push(tab.label[lang]);
  return crumbs;
}
