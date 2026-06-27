import type { Locale } from './landing';

/**
 * Dictionnaire i18n pour l'APP admin (dashboard, sidebar, pages métier).
 * Séparé du dictionnaire `landing` qui couvre les pages publiques.
 *
 * Approche MVP : on traduit les éléments les plus VISIBLES (sidebar, headers,
 * KPIs dashboard, statuts génériques, actions communes). Les pages internes
 * restent en FR pour ce premier passage — extension incrémentale.
 *
 * Convention : clés en english snake_case pour lisibilité dev.
 */

export type AppDict = {
  // ---------- Sidebar groupes ----------
  sidebar: {
    pilotage: string;
    talents: string;
    commercial: string;
    facturation: string;
    organisation: string;
  };
  // ---------- Sidebar items ----------
  nav: {
    dashboard: string;
    alerts: string;
    todos: string;
    consultants: string;
    cv_optimizer: string;
    missions: string;
    matching: string;
    pipeline: string;
    contacts: string;
    cra: string;
    contracts: string;
    invoices: string;
    accounting: string;
    team: string;
    billing: string;
    settings: string;
    collapse_menu: string;
    expand_menu: string;
  };
  // ---------- Dashboard ----------
  dashboard: {
    eyebrow: string;
    title_a: string; // "Votre"
    title_b: string; // "tableau de bord."
    description: string; // "Vue d'ensemble de votre activité {brand}."
    reset: string;
    reset_title: string;
    consultants_on_mission: string;
    available: string;
    open_opportunities: string;
    invoiced_this_month: string;
    cashed: string;
    forecast: string;
    see_list: string;
    see_available_pool: string;
    commercial_pipeline: string;
    ca_cumulative: string;
    cv_pushed_pending: string;
    missions_active: string;
    last_12_months: string;
    intercontract_title: string;
    intercontract_sub: string;
    bench_recent: string;
    bench_over_30: string; // "X depuis >30 jours"
    avg_bench: string;
    missions_ending_title: string;
    missions_ending_sub: string;
    no_mission_ending: string;
    see_all: string;
    overdue_followups_title: string;
    overdue_followups_sub: string;
    no_overdue: string;
    priority_alerts: string;
    alerts_to_handle: string; // "{n} alertes à traiter"
    all_under_control: string;
    invoicing: string;
    invoices_state: string;
    pending: string;
    overdue: string;
    cra_to_validate: string;
    manage_invoicing: string;
    quick_actions: string;
    add_consultant: string;
    generate_cv: string;
    new_opportunity: string;
    new_invoice: string;
  };
  // ---------- Header / search ----------
  header: {
    search_placeholder: string;
    show_tuto: string;
    notifications: string;
    profile: string;
    logout: string;
  };
  // ---------- Actions communes ----------
  actions: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    archive: string;
    unarchive: string;
    create: string;
    confirm: string;
    close: string;
    apply: string;
    remove_filter: string;
    loading: string;
    no_results: string;
  };
  // ---------- Statuts consultants ----------
  consultant_status: {
    available: string;
    soon_available: string;
    on_mission: string;
    unavailable: string;
    archived: string;
  };
  // ---------- Séniorités ----------
  seniority: {
    junior: string;
    confirmed: string;
    senior: string;
    expert: string;
    lead: string;
    architect: string;
  };
};

export const APP_DICT: Record<Locale, AppDict> = {
  fr: {
    sidebar: {
      pilotage: 'Pilotage',
      talents: 'Talents',
      commercial: 'Commercial',
      facturation: 'Facturation',
      organisation: 'Organisation',
    },
    nav: {
      dashboard: 'Tableau de bord',
      alerts: 'Alertes',
      todos: 'À faire',
      consultants: 'Consultants',
      cv_optimizer: 'CV Optimizer',
      missions: 'Missions',
      matching: 'Matching IA',
      pipeline: 'Pipeline',
      contacts: 'Contacts',
      cra: 'CRA',
      contracts: 'Contrats',
      invoices: 'Factures',
      accounting: 'Comptabilité',
      team: 'Équipe',
      billing: 'Abonnement',
      settings: 'Paramètres',
      collapse_menu: 'Réduire le menu',
      expand_menu: 'Afficher le menu',
    },
    dashboard: {
      eyebrow: 'Pilotage',
      title_a: 'Votre',
      title_b: 'tableau de bord.',
      description: "Vue d'ensemble de votre activité {brand}.",
      reset: 'Réinitialiser',
      reset_title: 'Réinitialiser les données transactionnelles',
      consultants_on_mission: 'Consultants en mission',
      available: 'Disponibles',
      open_opportunities: 'Opportunités ouvertes',
      invoiced_this_month: 'CA facturé ce mois',
      cashed: 'Encaissé',
      forecast: 'Prévu',
      see_list: 'voir la liste',
      see_available_pool: 'voir le vivier disponible',
      commercial_pipeline: 'pipeline commercial',
      ca_cumulative: 'CA cumulé',
      cv_pushed_pending: 'CV poussés en attente',
      missions_active: 'Missions en cours',
      last_12_months: '12 derniers mois',
      intercontract_title: 'Intercontrat',
      intercontract_sub: 'consultants sur le banc',
      bench_recent: 'Bench récent ✓',
      bench_over_30: '{n} depuis >30 jours',
      avg_bench: 'Ancienneté moyenne',
      missions_ending_title: 'Fins de mission',
      missions_ending_sub: 'prochains 30 jours',
      no_mission_ending: 'Aucune mission ne se termine bientôt ✓',
      see_all: 'Tout voir',
      overdue_followups_title: 'Relances en retard',
      overdue_followups_sub: 'opportunités à relancer',
      no_overdue: 'Aucune relance en retard ✓',
      priority_alerts: 'Alertes prioritaires',
      alerts_to_handle: '{n} alerte{s} à traiter',
      all_under_control: 'Tout est sous contrôle',
      invoicing: 'Facturation',
      invoices_state: 'État des factures',
      pending: 'En attente',
      overdue: 'En retard',
      cra_to_validate: 'CRA à valider',
      manage_invoicing: 'Gérer la facturation',
      quick_actions: 'Actions rapides',
      add_consultant: 'Ajouter consultant',
      generate_cv: 'Générer un CV',
      new_opportunity: 'Nouvelle opportunité',
      new_invoice: 'Créer une facture',
    },
    header: {
      search_placeholder: 'Rechercher un consultant, contact, opportunité…',
      show_tuto: 'Voir le tuto',
      notifications: 'Notifications',
      profile: 'Profil',
      logout: 'Se déconnecter',
    },
    actions: {
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Éditer',
      archive: 'Archiver',
      unarchive: 'Restaurer',
      create: 'Créer',
      confirm: 'Confirmer',
      close: 'Fermer',
      apply: 'Appliquer',
      remove_filter: 'Retirer le filtre',
      loading: 'Chargement…',
      no_results: 'Aucun résultat',
    },
    consultant_status: {
      available: 'Disponible',
      soon_available: 'Bientôt dispo',
      on_mission: 'En mission',
      unavailable: 'Indisponible',
      archived: 'Archivé',
    },
    seniority: {
      junior: 'Junior',
      confirmed: 'Confirmé',
      senior: 'Senior',
      expert: 'Expert',
      lead: 'Lead',
      architect: 'Architecte',
    },
  },
  en: {
    sidebar: {
      pilotage: 'Overview',
      talents: 'Talents',
      commercial: 'Sales',
      facturation: 'Billing',
      organisation: 'Organization',
    },
    nav: {
      dashboard: 'Dashboard',
      alerts: 'Alerts',
      todos: 'To-do',
      consultants: 'Consultants',
      cv_optimizer: 'CV Optimizer',
      missions: 'Missions',
      matching: 'AI Matching',
      pipeline: 'Pipeline',
      contacts: 'Contacts',
      cra: 'Timesheets',
      contracts: 'Contracts',
      invoices: 'Invoices',
      accounting: 'Accounting',
      team: 'Team',
      billing: 'Subscription',
      settings: 'Settings',
      collapse_menu: 'Collapse menu',
      expand_menu: 'Expand menu',
    },
    dashboard: {
      eyebrow: 'Overview',
      title_a: 'Your',
      title_b: 'dashboard.',
      description: 'Overview of your {brand} activity.',
      reset: 'Reset',
      reset_title: 'Reset transactional data',
      consultants_on_mission: 'Consultants on mission',
      available: 'Available',
      open_opportunities: 'Open opportunities',
      invoiced_this_month: 'Invoiced this month',
      cashed: 'Cashed',
      forecast: 'Forecast',
      see_list: 'see list',
      see_available_pool: 'see available pool',
      commercial_pipeline: 'sales pipeline',
      ca_cumulative: 'Total revenue',
      cv_pushed_pending: 'CVs pushed (pending)',
      missions_active: 'Active missions',
      last_12_months: 'Last 12 months',
      intercontract_title: 'On the bench',
      intercontract_sub: 'consultants without mission',
      bench_recent: 'Bench recent ✓',
      bench_over_30: '{n} for over 30 days',
      avg_bench: 'Average bench',
      missions_ending_title: 'Missions ending',
      missions_ending_sub: 'next 30 days',
      no_mission_ending: 'No mission ending soon ✓',
      see_all: 'See all',
      overdue_followups_title: 'Overdue follow-ups',
      overdue_followups_sub: 'opportunities to follow up',
      no_overdue: 'No overdue follow-up ✓',
      priority_alerts: 'Priority alerts',
      alerts_to_handle: '{n} alert{s} to handle',
      all_under_control: 'All under control',
      invoicing: 'Invoicing',
      invoices_state: 'Invoices state',
      pending: 'Pending',
      overdue: 'Overdue',
      cra_to_validate: 'Timesheets to validate',
      manage_invoicing: 'Manage invoicing',
      quick_actions: 'Quick actions',
      add_consultant: 'Add consultant',
      generate_cv: 'Generate a CV',
      new_opportunity: 'New opportunity',
      new_invoice: 'New invoice',
    },
    header: {
      search_placeholder: 'Search consultant, contact, opportunity…',
      show_tuto: 'Show tutorial',
      notifications: 'Notifications',
      profile: 'Profile',
      logout: 'Log out',
    },
    actions: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      archive: 'Archive',
      unarchive: 'Restore',
      create: 'Create',
      confirm: 'Confirm',
      close: 'Close',
      apply: 'Apply',
      remove_filter: 'Remove filter',
      loading: 'Loading…',
      no_results: 'No results',
    },
    consultant_status: {
      available: 'Available',
      soon_available: 'Soon available',
      on_mission: 'On mission',
      unavailable: 'Unavailable',
      archived: 'Archived',
    },
    seniority: {
      junior: 'Junior',
      confirmed: 'Confirmed',
      senior: 'Senior',
      expert: 'Expert',
      lead: 'Lead',
      architect: 'Architect',
    },
  },
};

/**
 * Hook utilitaire — retourne le dictionnaire app de la locale active.
 * À utiliser dans les composants client : const t = useAppT(); t.nav.dashboard
 *
 * Doit être appelé depuis un composant 'use client' descendant de LocaleProvider.
 */
export function getAppDict(locale: Locale): AppDict {
  return APP_DICT[locale];
}
