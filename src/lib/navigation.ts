// =========================================================================
// Navigation de l'application — source unique pour la sidebar, la
// navigation mobile et la palette de commandes.
// =========================================================================

import {
  LayoutDashboard,
  Kanban,
  Building2,
  Target,
  Users,
  CalendarRange,
  Briefcase,
  ClipboardCheck,
  FileText,
  Wallet,
  DoorOpen,
  Workflow,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { Permission } from '@/lib/auth/permissions';

export type NavItem = {
  id: string;
  label: { fr: string; en: string };
  href: string;
  icon: LucideIcon;
  /** Permission requise pour afficher l'entrée. */
  permission: Permission;
  /** Routes historiques ou sous-routes qui allument cette entrée. */
  matchAlso?: string[];
  /** Mots-clés supplémentaires pour la palette de commandes. */
  keywords?: string[];
};

export type NavSection = {
  id: string;
  label: { fr: string; en: string };
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'pilotage',
    label: { fr: 'Pilotage', en: 'Overview' },
    items: [
      {
        id: 'dashboard',
        label: { fr: 'Dashboard', en: 'Dashboard' },
        href: '/dashboard',
        icon: LayoutDashboard,
        permission: 'dashboard.view',
        matchAlso: ['/alerts', '/todos'],
        keywords: ['accueil', 'home', 'kpi', 'à traiter'],
      },
    ],
  },
  {
    id: 'commercial',
    label: { fr: 'Activité commerciale', en: 'Sales' },
    items: [
      {
        id: 'crm',
        label: { fr: 'CRM', en: 'CRM' },
        href: '/crm',
        icon: Kanban,
        permission: 'crm.view',
        matchAlso: ['/contacts'],
        keywords: ['pipeline', 'kanban', 'contacts', 'tâches'],
      },
      {
        id: 'clients',
        label: { fr: 'Clients', en: 'Clients' },
        href: '/clients',
        icon: Building2,
        permission: 'clients.view',
        matchAlso: ['/companies'],
        keywords: ['sociétés', 'comptes', 'entreprises'],
      },
      {
        id: 'opportunities',
        label: { fr: 'Opportunités', en: 'Opportunities' },
        href: '/opportunities',
        icon: Target,
        permission: 'opportunities.view',
        matchAlso: ['/offers', '/responses'],
        keywords: ['besoins', 'affaires', 'deals', 'appels d’offres'],
      },
    ],
  },
  {
    id: 'ressources',
    label: { fr: 'Ressources', en: 'Resources' },
    items: [
      {
        id: 'consultants',
        label: { fr: 'Consultants', en: 'Consultants' },
        href: '/consultants',
        icon: Users,
        permission: 'consultants.view',
        matchAlso: ['/prospects', '/cv-pushed', '/cv-optimizer'],
        keywords: ['talents', 'vivier', 'cv', 'dossier de compétences'],
      },
      {
        id: 'staffing',
        label: { fr: 'Staffing', en: 'Staffing' },
        href: '/staffing',
        icon: CalendarRange,
        permission: 'staffing.view',
        matchAlso: ['/matching', '/en-mission'],
        keywords: ['planning', 'disponibilités', 'matching', 'intercontrat'],
      },
      {
        id: 'missions',
        label: { fr: 'Missions', en: 'Missions' },
        href: '/missions',
        icon: Briefcase,
        permission: 'missions.view',
        keywords: ['affectations', 'échéances', 'renouvellements'],
      },
    ],
  },
  {
    id: 'operations',
    label: { fr: 'Opérations', en: 'Operations' },
    items: [
      {
        id: 'timesheets',
        label: { fr: 'CRA', en: 'Timesheets' },
        href: '/timesheets',
        icon: ClipboardCheck,
        permission: 'timesheets.view',
        keywords: ['comptes rendus', 'temps', 'validation'],
      },
      {
        id: 'documents',
        label: { fr: 'Devis & documents', en: 'Quotes & documents' },
        href: '/documents',
        icon: FileText,
        permission: 'documents.view',
        matchAlso: ['/contracts', '/templates'],
        keywords: ['devis', 'contrats', 'propositions', 'bons de commande', 'modèles'],
      },
      {
        id: 'finance',
        label: { fr: 'Finance', en: 'Finance' },
        href: '/finance',
        icon: Wallet,
        permission: 'finance.view',
        matchAlso: ['/invoices', '/accounting'],
        keywords: ['préfacturation', 'factures', 'marge', 'export comptable'],
      },
    ],
  },
  {
    id: 'collaboration',
    label: { fr: 'Collaboration', en: 'Collaboration' },
    items: [
      {
        id: 'portals',
        label: { fr: 'Portails', en: 'Portals' },
        href: '/portals',
        icon: DoorOpen,
        permission: 'portals.manage',
        keywords: ['portail client', 'portail consultant', 'accès', 'demandes'],
      },
      {
        id: 'automations',
        label: { fr: 'Automatisations', en: 'Automations' },
        href: '/automations',
        icon: Workflow,
        permission: 'automations.manage',
        keywords: ['règles', 'rappels', 'alertes', 'workflows'],
      },
    ],
  },
  {
    id: 'analyse',
    label: { fr: 'Analyse', en: 'Insights' },
    items: [
      {
        id: 'analytics',
        label: { fr: 'Analytics', en: 'Analytics' },
        href: '/analytics',
        icon: BarChart3,
        permission: 'analytics.view',
        keywords: ['rapports', 'statistiques', 'rentabilité'],
      },
    ],
  },
  {
    id: 'administration',
    label: { fr: 'Administration', en: 'Administration' },
    items: [
      {
        id: 'settings',
        label: { fr: 'Paramètres', en: 'Settings' },
        href: '/settings',
        icon: Settings,
        permission: 'dashboard.view',
        matchAlso: ['/billing', '/aide', '/onboarding/setup'],
        keywords: ['équipe', 'rôles', 'abonnement', 'branding', 'intégrations'],
      },
    ],
  },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  const match = (p: string) => pathname === p || pathname.startsWith(p + '/');
  return match(item.href) || (item.matchAlso ?? []).some(match);
}
