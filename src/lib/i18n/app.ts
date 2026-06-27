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
  // ---------- Pages secondaires (PageHeader + KPIs + EmptyStates) ----------
  pages: {
    consultants: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
      new: string;
      import_csv: string;
      empty_title: string;
      empty_title_archived: string;
      empty_description: string;
      empty_description_archived: string;
    };
    cv_optimizer: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
      edit_cv: string;
      stop_editing: string;
      export_word: string;
      export_pdf: string;
      empty_title: string;
      empty_description: string;
      consultant_label: string;
      template_label: string;
      offer_label: string;
      offer_hint: string;
      pick_existing: string;
      manual_entry: string;
      job_title: string;
      required_skills: string;
      full_description: string;
    };
    matching: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
      new_offer: string;
      manage_offers: string;
      pick_offer: string;
      offer_select: string;
      run_match: string;
      results_classified: string;
      ai_enriching: string;
      empty_select_offer: string;
      empty_select_description: string;
    };
    crm: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
      new_opp: string;
      pipeline_value: string;
      closed_opps: string;
      see_list: string;
    };
    offers: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
      new: string;
      tab_available: string;
      tab_pushed: string;
      empty_title: string;
      empty_description: string;
    };
    contacts: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
      new: string;
      empty_title: string;
      empty_description: string;
    };
    contracts: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
      new: string;
      empty_title: string;
      empty_description: string;
    };
    timesheets: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
      new: string;
      empty_title: string;
      empty_description: string;
      kpi_total_days: string;
      kpi_validated_days: string;
      kpi_pending_days: string;
      kpi_billable_ratio: string;
    };
    invoices: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
      new: string;
      see_archived: string;
      see_active: string;
      empty_title: string;
      empty_title_archived: string;
      empty_description: string;
      kpi_issued: string;
      kpi_paid: string;
      kpi_pending: string;
      kpi_overdue: string;
    };
    accounting: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
    };
    alerts: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
      empty_title: string;
      empty_description: string;
    };
    todos: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
    };
    billing: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
    };
    settings: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
    };
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
    pages: {
      consultants: {
        eyebrow: 'Talents',
        title_a: 'Vos',
        title_b: 'consultants.',
        description: 'Bibliothèque de profils — sélectionne et pousse un CV à une offre.',
        new: 'Nouveau consultant',
        import_csv: 'Importer CSV',
        empty_title: 'Aucun profil disponible',
        empty_title_archived: 'Aucun profil archivé',
        empty_description: 'Importez votre première bibliothèque CSV ou créez un consultant manuellement.',
        empty_description_archived: 'Les profils archivés apparaîtront ici.',
      },
      cv_optimizer: {
        eyebrow: 'Talents',
        title_a: 'CV Optimizer',
        title_b: 'IA.',
        description: 'Sélectionne un consultant — le CV se génère automatiquement. Colle une offre pour aligner le wording.',
        edit_cv: 'Modifier le CV',
        stop_editing: 'Fin édition',
        export_word: 'Word (.docx)',
        export_pdf: 'PDF',
        empty_title: 'Sélectionne un consultant pour commencer',
        empty_description: "Le CV s'affichera automatiquement",
        consultant_label: 'Consultant',
        template_label: 'Template',
        offer_label: 'Offre client',
        offer_hint: 'Optionnel — active le scoring & le surlignage des skills demandées',
        pick_existing: 'Choisir une offre existante',
        manual_entry: '— Saisie manuelle —',
        job_title: 'Intitulé',
        required_skills: 'Compétences demandées (séparées par virgule)',
        full_description: 'Description complète',
      },
      matching: {
        eyebrow: 'Commercial',
        title_a: 'Matching',
        title_b: 'IA.',
        description: 'Trouve les meilleurs profils pour chaque offre client — scoring multi-critères sur skills, séniorité, TJM et disponibilité.',
        new_offer: 'Nouvelle offre',
        manage_offers: 'Gérer les offres',
        pick_offer: 'Sélection de l’offre.',
        offer_select: 'Offre',
        run_match: 'Lancer le matching',
        results_classified: 'profils classés.',
        ai_enriching: 'L’IA rédige les justifications du top 5…',
        empty_select_offer: 'Lance le matching pour voir les profils classés',
        empty_select_description: 'Choisis une offre puis clique sur « Lancer le matching » pour obtenir les meilleurs candidats.',
      },
      crm: {
        eyebrow: 'Commercial',
        title_a: 'Pipeline',
        title_b: 'commercial.',
        description: 'Glisse une carte d’une colonne à l’autre pour changer son statut.',
        new_opp: 'Nouvelle opportunité',
        pipeline_value: 'Pipeline prévisionnel',
        closed_opps: 'Opportunités terminées',
        see_list: 'Voir la liste',
      },
      offers: {
        eyebrow: 'Commercial',
        title_a: 'Missions',
        title_b: 'clients.',
        description: 'Suivi des offres reçues et des CV poussés.',
        new: 'Nouvelle mission',
        tab_available: 'Disponibles',
        tab_pushed: 'Avec CV poussé',
        empty_title: 'Aucune mission',
        empty_description: 'Ajoute ta première mission client ou importe-la via screenshot.',
      },
      contacts: {
        eyebrow: 'Commercial',
        title_a: 'Carnet de',
        title_b: 'contacts.',
        description: 'Recruteurs, clients, ESN partenaires — toute votre relation commerciale.',
        new: 'Nouveau contact',
        empty_title: 'Aucun contact',
        empty_description: 'Ajoute ton premier contact pour démarrer ton carnet.',
      },
      contracts: {
        eyebrow: 'Facturation',
        title_a: 'Vos',
        title_b: 'contrats.',
        description: 'Contrats assistance technique, sous-traitance, avenants — toute la chaîne facturable.',
        new: 'Nouveau contrat',
        empty_title: 'Aucun contrat',
        empty_description: 'Crée ton premier contrat pour démarrer la chaîne facturable.',
      },
      timesheets: {
        eyebrow: 'Facturation',
        title_a: 'Comptes rendus',
        title_b: "d'activité.",
        description: 'Saisie mensuelle des jours travaillés — base de la facturation.',
        new: 'Nouveau CRA',
        empty_title: 'Aucun CRA',
        empty_description: "Crée ton premier compte-rendu d'activité pour démarrer la facturation.",
        kpi_total_days: 'Jours travaillés',
        kpi_validated_days: 'Jours validés',
        kpi_pending_days: 'En attente',
        kpi_billable_ratio: 'Ratio facturable',
      },
      invoices: {
        eyebrow: 'Facturation',
        title_a: 'Factures',
        title_b: 'clients.',
        description: "Suivi du chiffre d'affaires, des encaissements et des relances.",
        new: 'Nouvelle facture',
        see_archived: 'Voir archivées',
        see_active: 'Voir actives',
        empty_title: 'Aucune facture',
        empty_title_archived: 'Aucune facture archivée',
        empty_description: 'Crée ta première facture pour démarrer la facturation client.',
        kpi_issued: 'Émis ce mois',
        kpi_paid: 'Encaissé',
        kpi_pending: 'En attente',
        kpi_overdue: 'En retard',
      },
      accounting: {
        eyebrow: 'Facturation',
        title_a: 'Assistant',
        title_b: 'comptable.',
        description: 'Synthèse mensuelle des factures, encaissements et écritures comptables.',
      },
      alerts: {
        eyebrow: 'Pilotage',
        title_a: 'Centre',
        title_b: "d'alertes.",
        description: 'Les signaux qui requièrent ton attention — triés par priorité.',
        empty_title: 'Tout est sous contrôle',
        empty_description: 'Aucune alerte en cours.',
      },
      todos: {
        eyebrow: 'Pilotage',
        title_a: 'À',
        title_b: 'faire.',
        description: 'Tes tâches personnelles — privées, RLS stricte sur user_id.',
      },
      billing: {
        eyebrow: 'Organisation',
        title_a: 'Votre',
        title_b: 'abonnement.',
        description: 'Plan, facturation, consommation — gère ton abonnement Centrium.',
      },
      settings: {
        eyebrow: 'Organisation',
        title_a: 'Paramètres',
        title_b: 'de votre ESN.',
        description: 'Profil personnel, équipe, identité visuelle, conformité RGPD — pilotez votre espace Centrium.',
      },
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
    pages: {
      consultants: {
        eyebrow: 'Talents',
        title_a: 'Your',
        title_b: 'consultants.',
        description: 'Profile library — pick and push a CV to a client offer.',
        new: 'New consultant',
        import_csv: 'Import CSV',
        empty_title: 'No profile available',
        empty_title_archived: 'No archived profile',
        empty_description: 'Import your first CSV library or create a consultant manually.',
        empty_description_archived: 'Archived profiles will appear here.',
      },
      cv_optimizer: {
        eyebrow: 'Talents',
        title_a: 'CV Optimizer',
        title_b: 'AI.',
        description: 'Pick a consultant — the CV is generated automatically. Paste an offer to align the wording.',
        edit_cv: 'Edit CV',
        stop_editing: 'Stop editing',
        export_word: 'Word (.docx)',
        export_pdf: 'PDF',
        empty_title: 'Pick a consultant to start',
        empty_description: 'The CV will display automatically',
        consultant_label: 'Consultant',
        template_label: 'Template',
        offer_label: 'Client offer',
        offer_hint: 'Optional — enables scoring & highlighting of requested skills',
        pick_existing: 'Pick an existing offer',
        manual_entry: '— Manual entry —',
        job_title: 'Title',
        required_skills: 'Required skills (comma-separated)',
        full_description: 'Full description',
      },
      matching: {
        eyebrow: 'Sales',
        title_a: 'AI',
        title_b: 'Matching.',
        description: 'Find the best profiles for each client offer — multi-criteria scoring on skills, seniority, day rate and availability.',
        new_offer: 'New offer',
        manage_offers: 'Manage offers',
        pick_offer: 'Offer selection.',
        offer_select: 'Offer',
        run_match: 'Run matching',
        results_classified: 'profiles ranked.',
        ai_enriching: 'AI is writing top-5 justifications…',
        empty_select_offer: 'Run the matching to see ranked profiles',
        empty_select_description: 'Pick an offer then click "Run matching" to get the best candidates.',
      },
      crm: {
        eyebrow: 'Sales',
        title_a: 'Sales',
        title_b: 'pipeline.',
        description: 'Drag a card from one column to another to change its status.',
        new_opp: 'New opportunity',
        pipeline_value: 'Forecast pipeline',
        closed_opps: 'Closed opportunities',
        see_list: 'See list',
      },
      offers: {
        eyebrow: 'Sales',
        title_a: 'Client',
        title_b: 'missions.',
        description: 'Track received offers and pushed CVs.',
        new: 'New mission',
        tab_available: 'Available',
        tab_pushed: 'With pushed CV',
        empty_title: 'No mission',
        empty_description: 'Add your first client mission or import it from a screenshot.',
      },
      contacts: {
        eyebrow: 'Sales',
        title_a: 'Contact',
        title_b: 'book.',
        description: 'Recruiters, clients, partner ESNs — all your commercial relationships.',
        new: 'New contact',
        empty_title: 'No contact',
        empty_description: 'Add your first contact to start your book.',
      },
      contracts: {
        eyebrow: 'Billing',
        title_a: 'Your',
        title_b: 'contracts.',
        description: 'Service contracts, subcontracting, addenda — the full billable chain.',
        new: 'New contract',
        empty_title: 'No contract',
        empty_description: 'Create your first contract to start the billable chain.',
      },
      timesheets: {
        eyebrow: 'Billing',
        title_a: 'Activity',
        title_b: 'timesheets.',
        description: 'Monthly entry of worked days — basis for invoicing.',
        new: 'New timesheet',
        empty_title: 'No timesheet',
        empty_description: 'Create your first activity report to start invoicing.',
        kpi_total_days: 'Days worked',
        kpi_validated_days: 'Validated days',
        kpi_pending_days: 'Pending',
        kpi_billable_ratio: 'Billable ratio',
      },
      invoices: {
        eyebrow: 'Billing',
        title_a: 'Client',
        title_b: 'invoices.',
        description: 'Track revenue, collections and follow-ups.',
        new: 'New invoice',
        see_archived: 'Show archived',
        see_active: 'Show active',
        empty_title: 'No invoice',
        empty_title_archived: 'No archived invoice',
        empty_description: 'Create your first invoice to start client billing.',
        kpi_issued: 'Issued this month',
        kpi_paid: 'Cashed',
        kpi_pending: 'Pending',
        kpi_overdue: 'Overdue',
      },
      accounting: {
        eyebrow: 'Billing',
        title_a: 'Accounting',
        title_b: 'assistant.',
        description: 'Monthly summary of invoices, cash-ins and accounting entries.',
      },
      alerts: {
        eyebrow: 'Overview',
        title_a: 'Alert',
        title_b: 'center.',
        description: 'Signals requiring your attention — sorted by priority.',
        empty_title: 'All under control',
        empty_description: 'No active alert.',
      },
      todos: {
        eyebrow: 'Overview',
        title_a: 'To',
        title_b: 'do.',
        description: 'Your personal tasks — private, strict RLS on user_id.',
      },
      billing: {
        eyebrow: 'Organization',
        title_a: 'Your',
        title_b: 'subscription.',
        description: 'Plan, billing, usage — manage your Centrium subscription.',
      },
      settings: {
        eyebrow: 'Organization',
        title_a: 'Settings',
        title_b: 'of your firm.',
        description: 'Personal profile, team, branding, GDPR compliance — steer your Centrium workspace.',
      },
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
