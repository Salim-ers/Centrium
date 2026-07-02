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
    revenue_chart_title: string;
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
    // ---- New action widgets (replacing intercontract / missions ending / overdue) ----
    top_consultants_title: string;
    top_consultants_sub: string;
    top_consultants_empty: string;
    hot_opportunities_title: string;
    hot_opportunities_sub: string;
    hot_opportunities_empty: string;
    invoices_to_collect_title: string;
    invoices_to_collect_sub: string;
    invoices_to_collect_empty: string;
    per_day_short: string;        // "/j" or "/d"
    weighted_value: string;       // "pondérée" or "weighted"
    due_in: string;               // "échéance" or "due"
    overdue_short: string;        // "en retard" or "overdue"
    see_consultants: string;
    see_invoices: string;
    see_pipeline: string;
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
    tuto_short: string;
    notifications: string;
    profile: string;
    logout: string;
    logged_in_as: string;
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
  // ---------- Formulaires (modales de création / édition) ----------
  forms: {
    consultant: {
      title_create: string;
      title_edit: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      linkedin: string;
      job_title: string;
      sub_title: string;
      seniority: string;
      years_xp: string;
      city: string;
      country: string;
      mobility: string;
      daily_rate: string;
      contract_type: string;
      summary: string;
      summary_placeholder: string;
      languages: string;
      saving: string;
      created: string;
      updated: string;
    };
    opportunity: {
      title_create: string;
      title_edit: string;
      title_field: string;
      company: string;
      contact: string;
      status: string;
      priority: string;
      expected_revenue: string;
      probability: string;
      daily_rate: string;
      duration_months: string;
      expected_close: string;
      next_follow_up: string;
      notes: string;
      created: string;
      updated: string;
      deleted: string;
    };
    invoice: {
      title_create: string;
      title_edit: string;
      invoice_number: string;
      mission: string;
      consultant: string;
      issue_date: string;
      due_date: string;
      period: string;
      amount_ht: string;
      vat_rate: string;
      payment_terms: string;
      created: string;
      updated: string;
      marked_paid: string;
      marked_sent: string;
      deleted: string;
    };
    job_offer: {
      title_create: string;
      title_edit: string;
      title_field: string;
      description: string;
      required_skills: string;
      nice_to_have: string;
      seniority: string;
      daily_rate_min: string;
      daily_rate_max: string;
      location: string;
      remote_days: string;
      start_date: string;
      duration_months: string;
      deadline: string;
      source: string;
      created: string;
      updated: string;
    };
    contract: {
      title_create: string;
      title_edit: string;
      kind: string;
      reference: string;
      consultant: string;
      client: string;
      start_date: string;
      end_date: string;
      daily_rate: string;
      status: string;
      created: string;
      updated: string;
      archived: string;
    };
    timesheet: {
      title_create: string;
      title_edit: string;
      mission: string;
      period: string;
      days_worked: string;
      days_validated: string;
      status: string;
      created: string;
      validated: string;
      rejected: string;
    };
    common: {
      required_field: string;
      invalid_email: string;
      saving: string;
      validation_error: string;
    };
  };
  // ---------- Toasts génériques ----------
  toasts: {
    saved: string;
    deleted: string;
    archived: string;
    restored: string;
    copied: string;
    error_generic: string;
    error_network: string;
    error_permission: string;
    confirm_delete: string;
    confirm_archive: string;
  };
  // ---------- Badges / chips / statuts métier ----------
  badges: {
    opportunity_status: {
      new: string;
      contacted: string;
      discussion: string;
      cv_sent: string;
      client_interview: string;
      negotiation: string;
      won: string;
      lost: string;
      on_hold: string;
    };
    invoice_status: {
      draft: string;
      sent: string;
      paid: string;
      overdue: string;
      cancelled: string;
    };
    timesheet_status: {
      draft: string;
      submitted: string;
      client_validated: string;
      rejected: string;
    };
    mission_status: {
      proposed: string;
      active: string;
      ended: string;
      suspended: string;
      rejected: string;
    };
    contract_status: {
      draft: string;
      signed: string;
      active: string;
      ended: string;
      cancelled: string;
    };
    contact_type: {
      recruiter: string;
      sales: string;
      manager: string;
      client_final: string;
      esn_partner: string;
      buyer: string;
      hr: string;
      consultant: string;
      other: string;
    };
  };
  // ---------- Pages secondaires (PageHeader + KPIs + EmptyStates) ----------
  // ---------- Footer (mentions légales en bas de toutes les pages app) ----------
  footer: {
    edited_by: string;
    my_data: string;
    privacy: string;
    engagements: string;
    terms: string;
  };
  // ---------- Bandeau usage / quota (UsageBanner) ----------
  usage: {
    consultants_label: string;
    members_label: string;
    opportunities_label: string;
    contacts_label: string;
    missions_label: string;
    unlimited_word: string;
    founder_suffix: string;     // "Compte Fondateur — aucune limite"
    on_plan_prefix: string;     // "sur le plan"
    limit_reached_suffix: string;
    almost_at_limit_suffix: string;
    upgrade_button: string;
    see_plans_button: string;
    trial_expired_banner: string;
    trial_days_left: string;
  };
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
      see_archived: string;
      see_active: string;
      kpi_library: string;
      kpi_library_sub: string;
      kpi_on_mission: string;
      kpi_available: string;
      kpi_intercontract: string;
      kpi_intercontract_sub: string;
      tab_all: string;
      tab_qa: string;
      tab_dev: string;
      tab_data: string;
      tab_devops: string;
      tab_cyber: string;
      tab_pm: string;
      tab_ba: string;
      tab_architect: string;
      tab_support: string;
      tab_design: string;
      tab_other: string;
      filter_city: string;
      search_placeholder: string;
      table_consultant: string;
      table_seniority: string;
      table_daily_rate: string;
      table_city: string;
      table_status: string;
      table_actions: string;
      action_view: string;
      action_push_cv: string;
      consultants_count_unlimited: string;
      consultants_count_limit: string;
      tabs_library: string;
      tabs_cv_pushed: string;
      tabs_on_mission: string;
      profiles_available: string;
      not_positioned_yet: string;
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
      scoring_eyebrow: string;
      pick_offer_placeholder: string;
      edit_action: string;
      results_eyebrow: string;
      top5_enriched_hint: string;
      score_label: string;
      matched_label: string;
      missing_label: string;
      none_label: string;
      assign_action: string;
      generate_cv_action: string;
      scoring_detail_title: string;
      scoring_skills_required: string;
      scoring_skills_nice: string;
      scoring_seniority: string;
      scoring_availability: string;
      scoring_tjm: string;
      scoring_languages: string;
      scoring_location: string;
      scoring_ceiling: string;
      confidence_high: string;
      confidence_medium: string;
      confidence_low: string;
      pitch_ai_label: string;
      risks_label: string;
      gate_unavailable: string;
      gate_seniority_mismatch: string;
      gate_skills_too_low: string;
      err_select_offer: string;
      err_matching_failed: string;
      err_unexpected: string;
      loading: string;
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
      drop_hint: string;
      drop_here: string;
      drop_here_peer: string;
      closed_won: string;
      closed_lost: string;
      closed_on_hold: string;
      closed_dialog_title: string;
      closed_dialog_description: string;
      closed_filter_all: string;
      closed_empty: string;
      closed_open: string;
      closed_reopen: string;
      closure_title: string;
      closure_question_prefix: string;
      closure_won_title: string;
      closure_won_description: string;
      closure_lost_title: string;
      closure_lost_description: string;
      closure_on_hold_title: string;
      closure_on_hold_description: string;
      closure_cancel: string;
      err_update: string;
      peer_aim_label: string;
      peer_move_label: string;
      card_edit_title: string;
      card_delete_title: string;
      confirm_delete_prefix: string;
      loading: string;
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
      archived_title_a: string;
      archived_title_b: string;
      description_suffix: string;
      description_suffix_archived: string;
      see_archived: string;
      see_active: string;
      launch_matching: string;
      kpi_open: string;
      kpi_open_hint: string;
      kpi_pushed: string;
      kpi_pushed_hint: string;
      kpi_total: string;
      kpi_avg_tjm: string;
      kpi_avg_tjm_hint_zero: string;
      kpi_avg_tjm_hint: string;
      search_placeholder: string;
      tab_available_tooltip: string;
      tab_pushed_tooltip: string;
      clear_city_filter: string;
      table_mission: string;
      table_source: string;
      table_seniority: string;
      table_tjm: string;
      table_location: string;
      table_skills: string;
      table_updated: string;
      table_actions: string;
      client_to_define: string;
      client_to_fill: string;
      esn_partner: string;
      direct_client: string;
      remote_short: string;
      duration_months_short: string;
      action_run_matching: string;
      action_download_poster: string;
      action_edit: string;
      action_archive: string;
      action_unarchive: string;
      action_delete: string;
      empty_archived_title: string;
      empty_archived_description: string;
      empty_no_offers_title: string;
      empty_no_offers_description: string;
      bulk_restore: string;
      bulk_delete_permanent: string;
      bulk_archive: string;
      bulk_confirm_archive: string;
      bulk_confirm_delete_permanent: string;
      toast_offer_archived: string;
      toast_offer_restored: string;
      toast_offer_deleted: string;
      toast_poster_downloaded: string;
      toast_export_pdf_error: string;
      toast_offers_archived: string;
      toast_offers_restored: string;
      toast_offers_deleted: string;
      confirm_delete: string;
      confirm_archive: string;
      select_all_aria: string;
      item_label: string;
    };
    contacts: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
      new: string;
      empty_title: string;
      empty_description: string;
      description_count: string;
      import_csv: string;
      kpi_total: string;
      kpi_recruiters: string;
      kpi_clients: string;
      kpi_esn: string;
      search_placeholder: string;
      table_contact: string;
      table_type: string;
      table_company: string;
      table_email: string;
      table_phone: string;
      table_last_contact: string;
      table_actions: string;
      badge_esn_partner: string;
      badge_recruiter: string;
      badge_direct_client: string;
      never_contacted: string;
      action_mark_contacted: string;
    };
    contracts: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
      new: string;
      empty_title: string;
      empty_description: string;
      description_count: string;
      kpi_signed_month: string;
      kpi_signed_month_hint: string;
      kpi_pending_signature: string;
      kpi_pending_signature_hint: string;
      kpi_expired: string;
      kpi_expired_hint: string;
      kpi_annual_tjm: string;
      kpi_annual_tjm_hint: string;
      tab_active: string;
      tab_archived: string;
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
      kpi_validated_month: string;
      kpi_pending: string;
      kpi_days_entered: string;
      kpi_validated_count: string;
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
      ai_mock_badge: string;
      greeting: string;
      quick_questions: string;
      one_click_hint: string;
      q_overview: string;
      q_overdue_invoices: string;
      q_treasury_30: string;
      q_cra_to_validate: string;
      q_cra_not_invoiced: string;
      q_vat_quarter: string;
      q_draft_followup: string;
      q_top_clients: string;
      q_top_consultants: string;
      q_dso: string;
      q_aging: string;
      q_forecast_90: string;
      q_win_rate: string;
      q_pipeline_value: string;
      to_know_title: string;
      to_know_body: string;
      chat_placeholder: string;
    };
    alerts: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
      empty_title: string;
      empty_description: string;
      chip_critical: string;
      chip_important: string;
      chip_moderate: string;
      chip_info: string;
      filter_all: string;
      section_critical_title: string;
      section_critical_hint: string;
      section_important_title: string;
      section_important_hint: string;
      section_moderate_title: string;
      section_moderate_hint: string;
      section_info_title: string;
      section_info_hint: string;
      kind_invoice_overdue: string;
      kind_timesheet_pending: string;
      kind_mission_ending: string;
      kind_consultant_available: string;
      kind_client_follow_up: string;
      kind_unanswered_message: string;
      kind_offer_stale: string;
      kind_opportunity_cold: string;
      alert_word_one: string;
      alert_word_many: string;
      view_detail: string;
      view: string;
      hide_alert: string;
      hide_button: string;
      hidden_title: string;
      hidden_description: string;
      cannot_hide_prefix: string;
    };
    todos: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
      share_hint_prefix: string;
      share_hint_suffix: string;
      new_task: string;
      tab_pending: string;
      tab_done: string;
      tab_all: string;
      card_my_title: string;
      card_team_title: string;
      stat_pending: string;
      stat_overdue: string;
      stat_done: string;
      stat_progress: string;
      due_today: string;
      due_overdue: string;
      form_dialog_hint: string;
      prio_high: string;
      prio_medium: string;
      prio_low: string;
      team_badge: string;
      shared_team_badge: string;
      drop_team_hint: string;
      drop_private_hint: string;
      pinged_by_label: string;
      ping_to_label: string;
      a_colleague: string;
      empty_mine_pending: string;
      empty_mine_done: string;
      empty_mine_all: string;
      empty_team_pending: string;
      empty_team_done: string;
      empty_team_all: string;
      created_by_label: string;
      due_label: string;
      no_due: string;
      created_label: string;
      completed_label: string;
      notes_label: string;
      no_notes: string;
      priority_label: string;
      share_with_team: string;
      back_to_private: string;
      mark_done: string;
      mark_undone: string;
      mark_undone_short: string;
      mark_done_short: string;
      edit_button: string;
      delete_button: string;
      edit_title: string;
      view_details: string;
      shared_with_team: string;
      delete_confirm_prefix: string;
      view_tooltip: string;
      form_edit_title: string;
      form_create_title: string;
      form_title_label: string;
      form_title_placeholder: string;
      form_notes_label: string;
      form_notes_placeholder: string;
      form_priority_label: string;
      form_due_label: string;
      form_ping_label: string;
      form_ping_optional: string;
      form_ping_none: string;
      form_ping_hint: string;
      form_cancel: string;
      form_save: string;
      form_add: string;
      form_close: string;
      err_title_required: string;
      err_session_expired: string;
      err_update_failed: string;
      err_save_failed_prefix: string;
      err_create_failed_prefix: string;
      err_delete_failed: string;
      err_share_failed: string;
      err_no_org: string;
      toast_shared_suffix: string;
      toast_back_private_suffix: string;
      toast_deleted_suffix: string;
      toast_updated_suffix: string;
      toast_added_suffix: string;
    };
    billing: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
      status_active: string;
      founder_account_title: string;
      no_billing: string;
      founder_description: string;
      permanent_active_status: string;
    };
    settings: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
      card_profile_title: string;
      card_profile_description: string;
      card_branding_title: string;
      card_branding_description: string;
      card_team_title: string;
      card_team_description: string;
      card_data_title: string;
      card_data_description: string;
      card_appearance_title: string;
      card_appearance_description: string;
      legal_section_eyebrow: string;
      legal_section_title_a: string;
      legal_section_title_b: string;
      legal_section_description: string;
      account_section_eyebrow: string;
      account_section_title_a: string;
      account_section_title_b: string;
      account_section_description: string;
      logout_button: string;
    };
    team: {
      eyebrow: string;
      title_a: string;
      title_b: string;
      description: string;
      banner_unlimited: string;
      banner_limited: string;
      kpi_members: string;
      kpi_members_hint: string;
      kpi_admins: string;
      kpi_admins_hint: string;
      kpi_invitations: string;
      kpi_invitations_hint: string;
      kpi_seats_left: string;
      kpi_seats_left_hint: string;
      invite_section_eyebrow: string;
      invite_section_title_a: string;
      invite_section_title_b: string;
      invite_section_description: string;
      email_label: string;
      email_placeholder: string;
      role_label: string;
      role_admin: string;
      role_member: string;
      role_viewer: string;
      role_finance: string;
      invite_button: string;
      members_section_eyebrow: string;
      members_section_title_a: string;
      members_section_title_b: string;
      members_section_description: string;
      table_name: string;
      table_email: string;
      table_role: string;
      table_joined_at: string;
      empty_no_members: string;
      pending_invitations_title: string;
      empty_no_invitations: string;
      all_invites_accepted: string;
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
      revenue_chart_title: "Chiffre d'affaires & missions",
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
      top_consultants_title: 'Top consultants',
      top_consultants_sub: 'en mission · classés par TJM',
      top_consultants_empty: 'Aucun consultant en mission active',
      hot_opportunities_title: 'Opportunités prioritaires',
      hot_opportunities_sub: 'valeur pondérée par probabilité',
      hot_opportunities_empty: 'Aucune opportunité chaude — go prospecter ✨',
      invoices_to_collect_title: 'Factures à encaisser',
      invoices_to_collect_sub: 'impayées triées par montant',
      invoices_to_collect_empty: 'Tout est payé ✓',
      per_day_short: '/j',
      weighted_value: 'pondérée',
      due_in: 'échéance',
      overdue_short: 'en retard',
      see_consultants: 'Consultants',
      see_invoices: 'Factures',
      see_pipeline: 'Pipeline',
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
    tuto_short: 'Tuto',
      notifications: 'Notifications',
      profile: 'Profil',
      logout: 'Déconnexion',
      logged_in_as: 'Connecté en tant que',
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
    forms: {
      consultant: {
        title_create: 'Nouveau consultant',
        title_edit: 'Éditer le consultant',
        first_name: 'Prénom',
        last_name: 'Nom',
        email: 'Email',
        phone: 'Téléphone',
        linkedin: 'LinkedIn',
        job_title: 'Poste',
        sub_title: 'Sous-titre',
        seniority: 'Séniorité',
        years_xp: "Années d'expérience",
        city: 'Ville',
        country: 'Pays',
        mobility: 'Mobilité',
        daily_rate: 'TJM (€)',
        contract_type: 'Type de contrat',
        summary: 'Résumé exécutif',
        summary_placeholder: 'Décrivez le profil en quelques phrases…',
        languages: 'Langues',
        saving: 'Enregistrement…',
        created: 'Consultant créé',
        updated: 'Consultant mis à jour',
      },
      opportunity: {
        title_create: 'Nouvelle opportunité',
        title_edit: "Éditer l'opportunité",
        title_field: 'Intitulé',
        company: 'Société',
        contact: 'Contact',
        status: 'Statut',
        priority: 'Priorité',
        expected_revenue: 'CA prévisionnel',
        probability: 'Probabilité (%)',
        daily_rate: 'TJM (€)',
        duration_months: 'Durée (mois)',
        expected_close: 'Closing prévu',
        next_follow_up: 'Prochaine relance',
        notes: 'Notes',
        created: 'Opportunité créée',
        updated: 'Opportunité mise à jour',
        deleted: 'Opportunité supprimée',
      },
      invoice: {
        title_create: 'Nouvelle facture',
        title_edit: 'Éditer la facture',
        invoice_number: 'N° facture',
        mission: 'Mission',
        consultant: 'Consultant',
        issue_date: "Date d'émission",
        due_date: "Date d'échéance",
        period: 'Période',
        amount_ht: 'Montant HT (€)',
        vat_rate: 'TVA (%)',
        payment_terms: 'Conditions de paiement',
        created: 'Facture créée',
        updated: 'Facture mise à jour',
        marked_paid: 'Facture marquée payée',
        marked_sent: 'Facture marquée envoyée',
        deleted: 'Facture supprimée',
      },
      job_offer: {
        title_create: 'Nouvelle offre',
        title_edit: "Éditer l'offre",
        title_field: 'Intitulé',
        description: 'Description',
        required_skills: 'Compétences requises',
        nice_to_have: 'Nice to have',
        seniority: 'Séniorité',
        daily_rate_min: 'TJM min (€)',
        daily_rate_max: 'TJM max (€)',
        location: 'Localisation',
        remote_days: 'Jours remote',
        start_date: 'Date de début',
        duration_months: 'Durée (mois)',
        deadline: 'Deadline',
        source: 'Source',
        created: 'Offre créée',
        updated: 'Offre mise à jour',
      },
      contract: {
        title_create: 'Nouveau contrat',
        title_edit: 'Éditer le contrat',
        kind: 'Type',
        reference: 'Référence',
        consultant: 'Consultant',
        client: 'Client',
        start_date: 'Date de début',
        end_date: 'Date de fin',
        daily_rate: 'TJM (€)',
        status: 'Statut',
        created: 'Contrat créé',
        updated: 'Contrat mis à jour',
        archived: 'Contrat archivé',
      },
      timesheet: {
        title_create: 'Nouveau CRA',
        title_edit: 'Éditer le CRA',
        mission: 'Mission',
        period: 'Période',
        days_worked: 'Jours travaillés',
        days_validated: 'Jours validés',
        status: 'Statut',
        created: 'CRA créé',
        validated: 'CRA validé',
        rejected: 'CRA rejeté',
      },
      common: {
        required_field: 'Champ requis',
        invalid_email: 'Email invalide',
        saving: 'Enregistrement…',
        validation_error: 'Vérifie les champs en erreur',
      },
    },
    toasts: {
      saved: 'Enregistré',
      deleted: 'Supprimé',
      archived: 'Archivé',
      restored: 'Restauré',
      copied: 'Copié',
      error_generic: 'Une erreur est survenue',
      error_network: 'Erreur réseau',
      error_permission: 'Action non autorisée',
      confirm_delete: 'Supprimer définitivement ?',
      confirm_archive: 'Archiver ?',
    },
    footer: {
      edited_by: 'édité par QuadCore SAS',
      my_data: 'Mes données',
      privacy: 'Confidentialité',
      engagements: 'Engagements',
      terms: 'CGU',
    },
    usage: {
      consultants_label: 'consultants',
      members_label: 'utilisateurs internes',
      opportunities_label: 'opportunités ouvertes',
      contacts_label: 'contacts',
      missions_label: 'missions actives',
      unlimited_word: 'illimité',
      founder_suffix: 'Compte Fondateur — aucune limite',
      on_plan_prefix: 'sur le plan',
      limit_reached_suffix: ' — limite atteinte, upgrade requis',
      almost_at_limit_suffix: ' — bientôt à la limite',
      upgrade_button: 'Mettre à niveau',
      see_plans_button: 'Voir les plans',
      trial_expired_banner: 'Ta période d\'essai est terminée. Choisis un plan pour continuer.',
      trial_days_left: 'Essai gratuit : {days} jours restants',
    },
    badges: {
      opportunity_status: {
        new: 'Nouveau',
        contacted: 'Contacté',
        discussion: 'En discussion',
        cv_sent: 'CV envoyé',
        client_interview: 'Entretien client',
        negotiation: 'Négociation',
        won: 'Gagnée',
        lost: 'Perdue',
        on_hold: 'En veille',
      },
      invoice_status: {
        draft: 'Brouillon',
        sent: 'Envoyée',
        paid: 'Payée',
        overdue: 'En retard',
        cancelled: 'Annulée',
      },
      timesheet_status: {
        draft: 'Brouillon',
        submitted: 'Soumis',
        client_validated: 'Validé',
        rejected: 'Rejeté',
      },
      mission_status: {
        proposed: 'CV poussé',
        active: 'Active',
        ended: 'Terminée',
        suspended: 'Suspendue',
        rejected: 'Rejetée',
      },
      contract_status: {
        draft: 'Brouillon',
        signed: 'Signé',
        active: 'Actif',
        ended: 'Terminé',
        cancelled: 'Annulé',
      },
      contact_type: {
        recruiter: 'Recruteur',
        sales: 'Commercial',
        manager: 'Manager',
        client_final: 'Client final',
        esn_partner: 'ESN partenaire',
        buyer: 'Acheteur',
        hr: 'RH',
        consultant: 'Consultant',
        other: 'Autre',
      },
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
        see_archived: 'Voir les archivés',
        see_active: 'Voir les actifs',
        kpi_library: 'Bibliothèque',
        kpi_library_sub: 'Tous profils confondus',
        kpi_on_mission: 'En mission',
        kpi_available: 'Disponibles',
        kpi_intercontract: 'Intercontrat',
        kpi_intercontract_sub: 'profils',
        tab_all: 'TOUS',
        tab_qa: 'QA',
        tab_dev: 'DEV',
        tab_data: 'DATA',
        tab_devops: 'DEVOPS / CLOUD',
        tab_cyber: 'CYBER',
        tab_pm: 'CHEF DE PROJET',
        tab_ba: 'BUSINESS ANALYST',
        tab_architect: 'ARCHITECTE',
        tab_support: 'SUPPORT / TECH',
        tab_design: 'DESIGN / UX',
        tab_other: 'AUTRES',
        filter_city: 'Ville',
        search_placeholder: 'Rechercher par nom, intitulé…',
        table_consultant: 'CONSULTANT',
        table_seniority: 'SÉNIORITÉ',
        table_daily_rate: 'TJM',
        table_city: 'VILLE',
        table_status: 'STATUT',
        table_actions: 'ACTIONS',
        action_view: 'Voir',
        action_push_cv: 'Pousser CV',
        consultants_count_unlimited: '{n} / illimité consultants · Compte Fondateur — aucune limite',
        consultants_count_limit: '{n} / {max} consultants',
        tabs_library: 'Consultants',
        tabs_cv_pushed: 'CV poussés',
        tabs_on_mission: 'En Mission',
        profiles_available: 'profils disponibles',
        not_positioned_yet: 'pas encore positionnés',
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
        scoring_eyebrow: 'Scoring',
        pick_offer_placeholder: '— Choisir une offre —',
        edit_action: 'Éditer',
        results_eyebrow: 'Résultats',
        top5_enriched_hint: 'Top 5 enrichi par une justification IA (pitch + risques).',
        score_label: 'score / 100',
        matched_label: 'Matchées',
        missing_label: 'Manquantes',
        none_label: 'aucune',
        assign_action: 'Affecter',
        generate_cv_action: 'Générer CV',
        scoring_detail_title: 'Détail du scoring',
        scoring_skills_required: 'Skills requis',
        scoring_skills_nice: 'Nice to have',
        scoring_seniority: 'Séniorité',
        scoring_availability: 'Disponibilité',
        scoring_tjm: 'TJM',
        scoring_languages: 'Langues',
        scoring_location: 'Localisation',
        scoring_ceiling: 'Plafond appliqué par le moteur',
        confidence_high: 'Confiance haute',
        confidence_medium: 'Confiance moyenne',
        confidence_low: 'Confiance faible',
        pitch_ai_label: 'Pitch IA',
        risks_label: 'Risques :',
        gate_unavailable: 'Indisponible',
        gate_seniority_mismatch: 'Écart séniorité',
        gate_skills_too_low: 'Skills trop bas',
        err_select_offer: 'Sélectionne une offre',
        err_matching_failed: 'Matching impossible : ',
        err_unexpected: 'Erreur inattendue : ',
        loading: 'Chargement…',
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
        drop_hint: '💡 Glisse une carte ici, on te demandera ensuite si elle est Gagnée, Perdue ou En veille.',
        drop_here: 'Déposer ici',
        drop_here_peer: 'dépose ici…',
        closed_won: 'Gagné',
        closed_lost: 'Perdu',
        closed_on_hold: 'En veille',
        closed_dialog_title: 'Opportunités terminées',
        closed_dialog_description: 'Filtre par sous-statut. Tu peux ré-ouvrir une opportunité en la déplaçant vers un statut actif depuis la fiche.',
        closed_filter_all: 'Toutes',
        closed_empty: 'Aucune opportunité dans cette catégorie.',
        closed_open: 'Ouvrir',
        closed_reopen: 'Réouvrir',
        closure_title: 'Marquer comme terminée',
        closure_question_prefix: 'Quel est le statut final de',
        closure_won_title: 'Gagnée',
        closure_won_description: "L'opportunité s'est conclue par un contrat signé.",
        closure_lost_title: 'Perdue',
        closure_lost_description: 'Le client a choisi un autre prestataire ou abandonné.',
        closure_on_hold_title: 'En veille',
        closure_on_hold_description: 'Mise en pause, à reprendre plus tard.',
        closure_cancel: 'Annuler',
        err_update: 'Erreur lors de la mise à jour',
        peer_aim_label: 'vise',
        peer_move_label: 'déplace',
        card_edit_title: "Éditer l'opportunité",
        card_delete_title: "Supprimer l'opportunité",
        confirm_delete_prefix: "Supprimer l'opportunité",
        loading: 'Chargement…',
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
        archived_title_a: 'Offres',
        archived_title_b: 'archivées.',
        description_suffix: ' — besoins clients qui alimentent le matching.',
        description_suffix_archived: ' archivée — besoins clients qui alimentent le matching.',
        see_archived: 'Voir les archivées',
        see_active: 'Voir les actives',
        launch_matching: 'Lancer matching',
        kpi_open: 'Offres ouvertes',
        kpi_open_hint: 'disponibles pour matching',
        kpi_pushed: 'Avec CV poussé',
        kpi_pushed_hint: 'en proposition / validation',
        kpi_total: 'Total offres',
        kpi_avg_tjm: 'TJM moyen',
        kpi_avg_tjm_hint_zero: 'aucune donnée',
        kpi_avg_tjm_hint: 'sur {n} offre(s)',
        search_placeholder: 'Rechercher par intitulé, skill, source, lieu…',
        tab_available_tooltip: 'Offres encore disponibles pour pousser un CV',
        tab_pushed_tooltip: 'Offres déjà avec un CV poussé (en attente de validation ou en mission)',
        clear_city_filter: 'Effacer le filtre ville',
        table_mission: 'Mission',
        table_source: 'Source',
        table_seniority: 'Séniorité',
        table_tjm: 'TJM',
        table_location: 'Lieu',
        table_skills: 'Skills',
        table_updated: 'Maj',
        table_actions: 'Actions',
        client_to_define: 'Client à définir',
        client_to_fill: "À renseigner sur l'AO",
        esn_partner: 'ESN partenaire',
        direct_client: 'Client direct',
        remote_short: 'j TT/sem.',
        duration_months_short: 'mois',
        action_run_matching: 'Lancer le matching sur cette offre',
        action_download_poster: 'Télécharger la fiche de poste PDF',
        action_edit: 'Éditer',
        action_archive: 'Archiver — sort des KPI, peut être restauré',
        action_unarchive: "Restaurer l'offre",
        action_delete: 'Supprimer définitivement',
        empty_archived_title: 'Aucune offre archivée',
        empty_archived_description: 'Les offres archivées apparaîtront ici.',
        empty_no_offers_title: 'Aucune offre pour l’instant',
        empty_no_offers_description: 'Crée ta première offre pour alimenter le matching et le CRM.',
        bulk_restore: 'Restaurer',
        bulk_delete_permanent: 'Supprimer définitivement',
        bulk_archive: 'Archiver',
        bulk_confirm_archive: 'Archiver {n} offre(s) ?',
        bulk_confirm_delete_permanent: 'Supprimer DÉFINITIVEMENT {n} offre(s) ? Cette action est irréversible.',
        toast_offer_archived: 'Offre "{title}" archivée',
        toast_offer_restored: 'Offre "{title}" restaurée',
        toast_offer_deleted: 'Offre supprimée',
        toast_poster_downloaded: 'Fiche de poste téléchargée',
        toast_export_pdf_error: 'Erreur export PDF : ',
        toast_offers_archived: '{n} offre(s) archivée(s)',
        toast_offers_restored: '{n} offre(s) restaurée(s)',
        toast_offers_deleted: '{n} offre(s) supprimée(s)',
        confirm_delete: 'Supprimer l\'offre "{title}" ?\n\nCette action est irréversible.',
        confirm_archive: 'Archiver l\'offre "{title}" ?\n\nElle disparaît du KPI "Opportunités ouvertes" et de la liste par défaut.',
        select_all_aria: 'Tout sélectionner',
        item_label: 'offre',
      },
      contacts: {
        eyebrow: 'Commercial',
        title_a: 'Carnet de',
        title_b: 'contacts.',
        description: 'Recruteurs, clients, ESN partenaires — toute votre relation commerciale.',
        new: 'Nouveau contact',
        empty_title: 'Aucun contact',
        empty_description: 'Ajoute ton premier contact pour démarrer ton carnet.',
        description_count: '{n} contacts — recruteurs, clients, ESN partenaires.',
        import_csv: 'Importer CSV',
        kpi_total: 'Total contacts',
        kpi_recruiters: 'Recruteurs',
        kpi_clients: 'Clients finaux',
        kpi_esn: 'ESN partenaires',
        search_placeholder: 'Rechercher par nom, entreprise, email, téléphone, poste…',
        table_contact: 'Contact',
        table_type: 'Type',
        table_company: 'Entreprise / ESN',
        table_email: 'Email',
        table_phone: 'Téléphone',
        table_last_contact: 'Dernier contact',
        table_actions: 'Actions',
        badge_esn_partner: 'ESN partenaire',
        badge_recruiter: 'Recruteur',
        badge_direct_client: 'Client direct',
        never_contacted: 'Jamais contacté',
        action_mark_contacted: "Marquer contacté aujourd'hui",
      },
      contracts: {
        eyebrow: 'Facturation',
        title_a: 'Vos',
        title_b: 'contrats.',
        description: 'Contrats assistance technique, sous-traitance, avenants — toute la chaîne facturable.',
        new: 'Nouveau contrat',
        empty_title: "Aucun contrat pour l'instant",
        empty_description: "Crée ton premier contrat d'assistance technique pour démarrer le suivi.",
        description_count: '{n} contrat(s) — assistance technique, sous-traitance, avenants.',
        kpi_signed_month: 'Signés ce mois',
        kpi_signed_month_hint: '',
        kpi_pending_signature: 'En attente signature',
        kpi_pending_signature_hint: '',
        kpi_expired: 'Expirés',
        kpi_expired_hint: 'à clôturer ou renouveler',
        kpi_annual_tjm: 'TJM annuel cumulé',
        kpi_annual_tjm_hint: 'depuis le 1er janvier',
        tab_active: 'Actifs',
        tab_archived: 'Archivés',
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
        kpi_validated_month: 'Validés ce mois',
        kpi_pending: 'En attente',
        kpi_days_entered: 'Jours saisis',
        kpi_validated_count: '{n} validé(s)',
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
        ai_mock_badge: 'IA · Mock',
        greeting: 'Bonjour. Je suis ton assistant comptable Centrium. Je peux répondre à tes questions sur la trésorerie, les factures, la TVA, les CRA… Choisis une question rapide ou pose la tienne.',
        quick_questions: 'Questions rapides',
        one_click_hint: 'Un clic pour interroger',
        q_overview: "Vue d'ensemble",
        q_overdue_invoices: 'Factures en retard',
        q_treasury_30: 'Trésorerie 30j',
        q_cra_to_validate: 'CRA à valider',
        q_cra_not_invoiced: 'CRA non facturés',
        q_vat_quarter: 'TVA du trimestre',
        q_draft_followup: 'Rédige une relance',
        q_top_clients: 'Top clients',
        q_top_consultants: 'Top consultants',
        q_dso: 'DSO',
        q_aging: 'Balance âgée',
        q_forecast_90: 'Prévi 90 jours',
        q_win_rate: 'Taux de gain',
        q_pipeline_value: 'Valeur pipeline',
        to_know_title: 'À savoir',
        to_know_body: "L'assistant ne remplace pas un comptable. Il analyse les données saisies dans Centrium. Pour la déclaration officielle (bilan, liasse fiscale), utilise ces chiffres comme support pour ton expert-comptable.",
        chat_placeholder: 'Ex : quelles factures sont en retard ?',
      },
      alerts: {
        eyebrow: 'Pilotage',
        title_a: 'Centre',
        title_b: "d'alertes.",
        description: 'Les signaux qui requièrent ton attention — triés par priorité.',
        empty_title: 'Tout est sous contrôle',
        empty_description: 'Aucune action urgente, aucune échéance dépassée. Bonne nouvelle.',
        chip_critical: 'Critique',
        chip_important: 'Important',
        chip_moderate: 'Modéré',
        chip_info: 'Info',
        filter_all: 'Toutes',
        section_critical_title: 'Critique — à traiter immédiatement',
        section_critical_hint: "Bloquant ou échu, action requise aujourd'hui",
        section_important_title: 'Important — à traiter cette semaine',
        section_important_hint: 'Échéance proche ou risque significatif',
        section_moderate_title: 'Modéré — à planifier',
        section_moderate_hint: 'À traiter dans les prochaines semaines',
        section_info_title: 'Info — bon à savoir',
        section_info_hint: "Signaux faibles, pas d'urgence",
        kind_invoice_overdue: 'Facturation',
        kind_timesheet_pending: 'CRA',
        kind_mission_ending: 'Mission',
        kind_consultant_available: 'Intercontrat',
        kind_client_follow_up: 'Relance client',
        kind_unanswered_message: 'Message',
        kind_offer_stale: 'Offre',
        kind_opportunity_cold: 'Opportunité',
        alert_word_one: 'alerte',
        alert_word_many: 'alertes',
        view_detail: 'Voir le détail',
        view: 'Voir',
        hide_alert: 'Masquer cette alerte',
        hide_button: 'Masquer',
        hidden_title: 'Alerte masquée',
        hidden_description: 'Elle ne réapparaîtra plus tant que la situation reste identique.',
        cannot_hide_prefix: 'Impossible de masquer cette alerte — ',
      },
      todos: {
        eyebrow: 'Pilotage',
        title_a: 'À',
        title_b: 'faire.',
        description: 'Tes tâches personnelles — privées, RLS stricte sur user_id.',
        share_hint_prefix: "Tes tâches privées + les tâches partagées par l'équipe — clique sur l'icône",
        share_hint_suffix: 'pour partager.',
        new_task: 'Nouvelle tâche',
        tab_pending: 'À faire',
        tab_done: 'Terminées',
        tab_all: 'Toutes',
        card_my_title: 'Mes tâches',
        card_team_title: 'Tâches équipe',
        stat_pending: 'En cours',
        stat_overdue: 'En retard',
        stat_done: 'Terminées',
        stat_progress: 'Progression',
        due_today: "Aujourd'hui",
        due_overdue: 'En retard',
        form_dialog_hint: 'Une tâche claire = une tâche faite. Ajoute une échéance pour la voir remonter au bon moment.',
        prio_high: 'Haute',
        prio_medium: 'Moyenne',
        prio_low: 'Basse',
        team_badge: 'Équipe',
        shared_team_badge: "Partagé avec l'équipe",
        drop_team_hint: "Déposer ici pour partager avec l'équipe",
        drop_private_hint: 'Déposer ici pour repasser en privé',
        pinged_by_label: 'Pingué par',
        ping_to_label: 'Pinge',
        a_colleague: 'Un collègue',
        empty_mine_pending: 'Rien à faire — tout est sous contrôle 🎯',
        empty_mine_done: 'Aucune tâche terminée pour le moment',
        empty_mine_all: 'Aucune tâche perso. Clique sur « Nouvelle tâche ».',
        empty_team_pending: "Aucune tâche d'équipe en cours",
        empty_team_done: "Aucune tâche d'équipe terminée",
        empty_team_all: "Glisse une de tes tâches ici pour la partager avec l'équipe.",
        created_by_label: 'Créée par',
        due_label: 'Échéance',
        no_due: 'Aucune',
        created_label: 'Créée le',
        completed_label: 'Terminée le',
        notes_label: 'Notes',
        no_notes: 'Aucune note.',
        priority_label: 'Priorité',
        share_with_team: "Partager avec l'équipe",
        back_to_private: 'Repasser en privé',
        mark_done: 'Marquer fait',
        mark_undone: 'Remettre à faire',
        mark_undone_short: 'Marquer non fait',
        mark_done_short: 'Marquer fait',
        edit_button: 'Éditer',
        delete_button: 'Supprimer',
        edit_title: 'Modifier la tâche',
        view_details: 'Voir les détails',
        shared_with_team: "Tâche partagée avec l'équipe",
        delete_confirm_prefix: 'Supprimer',
        view_tooltip: 'Voir les détails',
        form_edit_title: 'Modifier la tâche',
        form_create_title: 'Nouvelle tâche',
        form_title_label: 'Titre *',
        form_title_placeholder: 'Ex: Relancer Banque Postale pour la mission Tech Lead',
        form_notes_label: 'Notes (optionnel)',
        form_notes_placeholder: 'Détails, contexte, prochaines étapes…',
        form_priority_label: 'Priorité',
        form_due_label: 'Échéance',
        form_ping_label: 'Ping une personne',
        form_ping_optional: '(optionnel)',
        form_ping_none: '— Personne —',
        form_ping_hint: "La personne pinguée verra la tâche et pourra la cocher. Elle ne peut ni l'éditer ni la supprimer.",
        form_cancel: 'Annuler',
        form_save: 'Enregistrer',
        form_add: 'Ajouter',
        form_close: 'Fermer',
        err_title_required: 'Le titre est requis',
        err_session_expired: 'Session expirée — reconnecte-toi',
        err_update_failed: 'Mise à jour impossible : ',
        err_save_failed_prefix: 'Mise à jour impossible : ',
        err_create_failed_prefix: 'Création impossible : ',
        err_delete_failed: 'Suppression impossible : ',
        err_share_failed: 'Partage impossible : ',
        err_no_org: 'Organisation introuvable — impossible de partager',
        toast_shared_suffix: " partagé avec l'équipe",
        toast_back_private_suffix: ' remis en privé',
        toast_deleted_suffix: ' supprimé',
        toast_updated_suffix: ' mis à jour',
        toast_added_suffix: ' ajouté',
      },
      billing: {
        eyebrow: 'Organisation',
        title_a: 'Votre',
        title_b: 'abonnement.',
        description: 'Plan, facturation, consommation — gère ton abonnement Centrium.',
        status_active: 'Actif',
        founder_account_title: 'COMPTE FONDATEUR',
        no_billing: 'Aucune facturation',
        founder_description: "Cette organisation est exemptée de facturation. Accès illimité à toutes les fonctionnalités de la plateforme, sans limite de consultants ni d'utilisateurs, sans abonnement Stripe.",
        permanent_active_status: 'Statut actif · permanent',
      },
      settings: {
        eyebrow: 'Organisation',
        title_a: 'Paramètres',
        title_b: 'de votre ESN.',
        description: 'Profil personnel, équipe, identité visuelle, conformité RGPD — pilotez votre espace Centrium.',
        card_profile_title: 'Mon profil',
        card_profile_description: "Vos infos personnelles (poste, contact, adresse, contact d'urgence) — visibles uniquement par vous.",
        card_branding_title: 'Identité visuelle',
        card_branding_description: 'Logo, couleurs et nom de marque affichés sur les CV, contrats et factures générés.',
        card_team_title: 'Équipe',
        card_team_description: "Membres, invitations et rôles de l'organisation.",
        card_data_title: 'Mes données & confidentialité',
        card_data_description: 'Exportez vos données, gérez vos cookies, exercez vos droits RGPD.',
        card_appearance_title: 'Apparence & design',
        card_appearance_description: "Thème sombre/clair, intensité du fond animé, densité de l'interface — personnalisez l'ambiance.",
        legal_section_eyebrow: 'IDENTITÉ LÉGALE',
        legal_section_title_a: 'Votre',
        legal_section_title_b: 'organisation.',
        legal_section_description: 'Informations utilisées sur vos contrats et factures.',
        account_section_eyebrow: 'COMPTE',
        account_section_title_a: 'Session',
        account_section_title_b: 'active.',
        account_section_description: 'Déconnectez-vous de Centrium.',
        logout_button: 'Se déconnecter',
      },
      team: {
        eyebrow: 'ORGANISATION',
        title_a: 'Équipe',
        title_b: 'Centrium.',
        description: "Membres, invitations et rôles de l'organisation.",
        banner_unlimited: '{n} / illimité utilisateurs internes · Compte Fondateur — aucune limite',
        banner_limited: '{n} / {max} utilisateurs internes',
        kpi_members: 'Membres',
        kpi_members_hint: 'Compte actif',
        kpi_admins: 'Administrateurs',
        kpi_admins_hint: 'Accès total',
        kpi_invitations: 'Invitations',
        kpi_invitations_hint: 'En attente',
        kpi_seats_left: 'Sièges restants',
        kpi_seats_left_hint: 'Voir bannière plan',
        invite_section_eyebrow: 'INVITATION',
        invite_section_title_a: 'Inviter un',
        invite_section_title_b: 'membre.',
        invite_section_description: "Un email Centrium sera envoyé automatiquement à l'invité avec un lien de connexion. Le lien expire après 7 jours.",
        email_label: 'EMAIL',
        email_placeholder: 'collegue@entreprise.fr',
        role_label: 'RÔLE',
        role_admin: 'Admin',
        role_member: 'Membre',
        role_viewer: 'Viewer',
        role_finance: 'Finance',
        invite_button: 'Inviter',
        members_section_eyebrow: 'MEMBRES',
        members_section_title_a: 'Équipe',
        members_section_title_b: 'active ({n}).',
        members_section_description: 'Tous les utilisateurs de votre organisation.',
        table_name: 'NOM',
        table_email: 'EMAIL',
        table_role: 'RÔLE',
        table_joined_at: 'REJOINT LE',
        empty_no_members: "Aucun membre pour l'instant.",
        pending_invitations_title: 'Aucune invitation en cours',
        empty_no_invitations: 'Aucune invitation en cours',
        all_invites_accepted: 'Toutes les invitations envoyées ont été acceptées (ou révoquées).',
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
      revenue_chart_title: 'Revenue & missions',
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
      top_consultants_title: 'Top consultants',
      top_consultants_sub: 'on mission · ranked by day rate',
      top_consultants_empty: 'No consultant on active mission',
      hot_opportunities_title: 'Hot opportunities',
      hot_opportunities_sub: 'value weighted by probability',
      hot_opportunities_empty: 'No hot opportunity — go prospect ✨',
      invoices_to_collect_title: 'Invoices to collect',
      invoices_to_collect_sub: 'unpaid, sorted by amount',
      invoices_to_collect_empty: 'All paid ✓',
      per_day_short: '/d',
      weighted_value: 'weighted',
      due_in: 'due',
      overdue_short: 'overdue',
      see_consultants: 'Consultants',
      see_invoices: 'Invoices',
      see_pipeline: 'Pipeline',
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
    tuto_short: 'Tutorial',
      notifications: 'Notifications',
      profile: 'Profile',
      logout: 'Log out',
      logged_in_as: 'Logged in as',
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
    forms: {
      consultant: {
        title_create: 'New consultant',
        title_edit: 'Edit consultant',
        first_name: 'First name',
        last_name: 'Last name',
        email: 'Email',
        phone: 'Phone',
        linkedin: 'LinkedIn',
        job_title: 'Job title',
        sub_title: 'Subtitle',
        seniority: 'Seniority',
        years_xp: 'Years of experience',
        city: 'City',
        country: 'Country',
        mobility: 'Mobility',
        daily_rate: 'Day rate (€)',
        contract_type: 'Contract type',
        summary: 'Executive summary',
        summary_placeholder: 'Describe the profile in a few sentences…',
        languages: 'Languages',
        saving: 'Saving…',
        created: 'Consultant created',
        updated: 'Consultant updated',
      },
      opportunity: {
        title_create: 'New opportunity',
        title_edit: 'Edit opportunity',
        title_field: 'Title',
        company: 'Company',
        contact: 'Contact',
        status: 'Status',
        priority: 'Priority',
        expected_revenue: 'Expected revenue',
        probability: 'Probability (%)',
        daily_rate: 'Day rate (€)',
        duration_months: 'Duration (months)',
        expected_close: 'Expected close',
        next_follow_up: 'Next follow-up',
        notes: 'Notes',
        created: 'Opportunity created',
        updated: 'Opportunity updated',
        deleted: 'Opportunity deleted',
      },
      invoice: {
        title_create: 'New invoice',
        title_edit: 'Edit invoice',
        invoice_number: 'Invoice #',
        mission: 'Mission',
        consultant: 'Consultant',
        issue_date: 'Issue date',
        due_date: 'Due date',
        period: 'Period',
        amount_ht: 'Amount excl. VAT (€)',
        vat_rate: 'VAT (%)',
        payment_terms: 'Payment terms',
        created: 'Invoice created',
        updated: 'Invoice updated',
        marked_paid: 'Invoice marked paid',
        marked_sent: 'Invoice marked sent',
        deleted: 'Invoice deleted',
      },
      job_offer: {
        title_create: 'New offer',
        title_edit: 'Edit offer',
        title_field: 'Title',
        description: 'Description',
        required_skills: 'Required skills',
        nice_to_have: 'Nice to have',
        seniority: 'Seniority',
        daily_rate_min: 'Min day rate (€)',
        daily_rate_max: 'Max day rate (€)',
        location: 'Location',
        remote_days: 'Remote days',
        start_date: 'Start date',
        duration_months: 'Duration (months)',
        deadline: 'Deadline',
        source: 'Source',
        created: 'Offer created',
        updated: 'Offer updated',
      },
      contract: {
        title_create: 'New contract',
        title_edit: 'Edit contract',
        kind: 'Type',
        reference: 'Reference',
        consultant: 'Consultant',
        client: 'Client',
        start_date: 'Start date',
        end_date: 'End date',
        daily_rate: 'Day rate (€)',
        status: 'Status',
        created: 'Contract created',
        updated: 'Contract updated',
        archived: 'Contract archived',
      },
      timesheet: {
        title_create: 'New timesheet',
        title_edit: 'Edit timesheet',
        mission: 'Mission',
        period: 'Period',
        days_worked: 'Days worked',
        days_validated: 'Validated days',
        status: 'Status',
        created: 'Timesheet created',
        validated: 'Timesheet validated',
        rejected: 'Timesheet rejected',
      },
      common: {
        required_field: 'Required field',
        invalid_email: 'Invalid email',
        saving: 'Saving…',
        validation_error: 'Check fields in error',
      },
    },
    toasts: {
      saved: 'Saved',
      deleted: 'Deleted',
      archived: 'Archived',
      restored: 'Restored',
      copied: 'Copied',
      error_generic: 'An error occurred',
      error_network: 'Network error',
      error_permission: 'Action not allowed',
      confirm_delete: 'Delete permanently?',
      confirm_archive: 'Archive?',
    },
    footer: {
      edited_by: 'edited by QuadCore SAS',
      my_data: 'My data',
      privacy: 'Privacy',
      engagements: 'Engagements',
      terms: 'Terms',
    },
    usage: {
      consultants_label: 'consultants',
      members_label: 'internal users',
      opportunities_label: 'open opportunities',
      contacts_label: 'contacts',
      missions_label: 'active missions',
      unlimited_word: 'unlimited',
      founder_suffix: 'Founder account — no limit',
      on_plan_prefix: 'on plan',
      limit_reached_suffix: ' — limit reached, upgrade required',
      almost_at_limit_suffix: ' — close to limit',
      upgrade_button: 'Upgrade',
      see_plans_button: 'See plans',
      trial_expired_banner: 'Your free trial has ended. Pick a plan to keep using Centrium.',
      trial_days_left: 'Free trial: {days} days left',
    },
    badges: {
      opportunity_status: {
        new: 'New',
        contacted: 'Contacted',
        discussion: 'In discussion',
        cv_sent: 'CV sent',
        client_interview: 'Client interview',
        negotiation: 'Negotiation',
        won: 'Won',
        lost: 'Lost',
        on_hold: 'On hold',
      },
      invoice_status: {
        draft: 'Draft',
        sent: 'Sent',
        paid: 'Paid',
        overdue: 'Overdue',
        cancelled: 'Cancelled',
      },
      timesheet_status: {
        draft: 'Draft',
        submitted: 'Submitted',
        client_validated: 'Validated',
        rejected: 'Rejected',
      },
      mission_status: {
        proposed: 'CV pushed',
        active: 'Active',
        ended: 'Ended',
        suspended: 'Suspended',
        rejected: 'Rejected',
      },
      contract_status: {
        draft: 'Draft',
        signed: 'Signed',
        active: 'Active',
        ended: 'Ended',
        cancelled: 'Cancelled',
      },
      contact_type: {
        recruiter: 'Recruiter',
        sales: 'Sales',
        manager: 'Manager',
        client_final: 'End client',
        esn_partner: 'Partner ESN',
        buyer: 'Buyer',
        hr: 'HR',
        consultant: 'Consultant',
        other: 'Other',
      },
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
        see_archived: 'See archived',
        see_active: 'See active',
        kpi_library: 'Library',
        kpi_library_sub: 'All profiles',
        kpi_on_mission: 'On mission',
        kpi_available: 'Available',
        kpi_intercontract: 'Bench',
        kpi_intercontract_sub: 'profiles',
        tab_all: 'ALL',
        tab_qa: 'QA',
        tab_dev: 'DEV',
        tab_data: 'DATA',
        tab_devops: 'DEVOPS / CLOUD',
        tab_cyber: 'CYBER',
        tab_pm: 'PROJECT MANAGER',
        tab_ba: 'BUSINESS ANALYST',
        tab_architect: 'ARCHITECT',
        tab_support: 'SUPPORT / TECH',
        tab_design: 'DESIGN / UX',
        tab_other: 'OTHER',
        filter_city: 'City',
        search_placeholder: 'Search by name, title…',
        table_consultant: 'CONSULTANT',
        table_seniority: 'SENIORITY',
        table_daily_rate: 'DAY RATE',
        table_city: 'CITY',
        table_status: 'STATUS',
        table_actions: 'ACTIONS',
        action_view: 'View',
        action_push_cv: 'Push CV',
        consultants_count_unlimited: '{n} / unlimited consultants · Founder account — no limit',
        consultants_count_limit: '{n} / {max} consultants',
        tabs_library: 'Consultants',
        tabs_cv_pushed: 'CVs pushed',
        tabs_on_mission: 'On Mission',
        profiles_available: 'profiles available',
        not_positioned_yet: 'not positioned yet',
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
        scoring_eyebrow: 'Scoring',
        pick_offer_placeholder: '— Pick an offer —',
        edit_action: 'Edit',
        results_eyebrow: 'Results',
        top5_enriched_hint: 'Top 5 enriched with AI justification (pitch + risks).',
        score_label: 'score / 100',
        matched_label: 'Matched',
        missing_label: 'Missing',
        none_label: 'none',
        assign_action: 'Assign',
        generate_cv_action: 'Generate CV',
        scoring_detail_title: 'Scoring detail',
        scoring_skills_required: 'Required skills',
        scoring_skills_nice: 'Nice to have',
        scoring_seniority: 'Seniority',
        scoring_availability: 'Availability',
        scoring_tjm: 'Day rate',
        scoring_languages: 'Languages',
        scoring_location: 'Location',
        scoring_ceiling: 'Ceiling applied by the engine',
        confidence_high: 'High confidence',
        confidence_medium: 'Medium confidence',
        confidence_low: 'Low confidence',
        pitch_ai_label: 'AI pitch',
        risks_label: 'Risks:',
        gate_unavailable: 'Unavailable',
        gate_seniority_mismatch: 'Seniority mismatch',
        gate_skills_too_low: 'Skills too low',
        err_select_offer: 'Select an offer',
        err_matching_failed: 'Matching failed: ',
        err_unexpected: 'Unexpected error: ',
        loading: 'Loading…',
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
        drop_hint: '💡 Drag a card here, you will then be asked whether it is Won, Lost or On Hold.',
        drop_here: 'Drop here',
        drop_here_peer: 'is dropping here…',
        closed_won: 'Won',
        closed_lost: 'Lost',
        closed_on_hold: 'On hold',
        closed_dialog_title: 'Closed opportunities',
        closed_dialog_description: 'Filter by sub-status. You can reopen an opportunity by moving it to an active status from its card.',
        closed_filter_all: 'All',
        closed_empty: 'No opportunity in this category.',
        closed_open: 'Open',
        closed_reopen: 'Reopen',
        closure_title: 'Mark as closed',
        closure_question_prefix: 'What is the final status of',
        closure_won_title: 'Won',
        closure_won_description: 'The opportunity ended with a signed contract.',
        closure_lost_title: 'Lost',
        closure_lost_description: 'The client picked another provider or abandoned.',
        closure_on_hold_title: 'On hold',
        closure_on_hold_description: 'Paused, to resume later.',
        closure_cancel: 'Cancel',
        err_update: 'Update error',
        peer_aim_label: 'aims',
        peer_move_label: 'moves',
        card_edit_title: 'Edit opportunity',
        card_delete_title: 'Delete opportunity',
        confirm_delete_prefix: 'Delete the opportunity',
        loading: 'Loading…',
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
        archived_title_a: 'Archived',
        archived_title_b: 'offers.',
        description_suffix: ' — client needs that feed matching.',
        description_suffix_archived: ' archived — client needs that feed matching.',
        see_archived: 'Show archived',
        see_active: 'Show active',
        launch_matching: 'Run matching',
        kpi_open: 'Open offers',
        kpi_open_hint: 'available for matching',
        kpi_pushed: 'With pushed CV',
        kpi_pushed_hint: 'in proposal / validation',
        kpi_total: 'Total offers',
        kpi_avg_tjm: 'Avg day rate',
        kpi_avg_tjm_hint_zero: 'no data',
        kpi_avg_tjm_hint: 'across {n} offer(s)',
        search_placeholder: 'Search by title, skill, source, location…',
        tab_available_tooltip: 'Offers still available to push a CV',
        tab_pushed_tooltip: 'Offers already with a pushed CV (pending validation or on mission)',
        clear_city_filter: 'Clear city filter',
        table_mission: 'Mission',
        table_source: 'Source',
        table_seniority: 'Seniority',
        table_tjm: 'Day rate',
        table_location: 'Location',
        table_skills: 'Skills',
        table_updated: 'Updated',
        table_actions: 'Actions',
        client_to_define: 'Client to define',
        client_to_fill: 'To fill on the RFP',
        esn_partner: 'Partner ESN',
        direct_client: 'Direct client',
        remote_short: 'd remote/wk',
        duration_months_short: 'months',
        action_run_matching: 'Run matching on this offer',
        action_download_poster: 'Download the job poster PDF',
        action_edit: 'Edit',
        action_archive: 'Archive — removed from KPIs, can be restored',
        action_unarchive: 'Restore the offer',
        action_delete: 'Delete permanently',
        empty_archived_title: 'No archived offer',
        empty_archived_description: 'Archived offers will appear here.',
        empty_no_offers_title: 'No offer yet',
        empty_no_offers_description: 'Create your first offer to feed matching and the CRM.',
        bulk_restore: 'Restore',
        bulk_delete_permanent: 'Delete permanently',
        bulk_archive: 'Archive',
        bulk_confirm_archive: 'Archive {n} offer(s)?',
        bulk_confirm_delete_permanent: 'PERMANENTLY delete {n} offer(s)? This action cannot be undone.',
        toast_offer_archived: 'Offer "{title}" archived',
        toast_offer_restored: 'Offer "{title}" restored',
        toast_offer_deleted: 'Offer deleted',
        toast_poster_downloaded: 'Job poster downloaded',
        toast_export_pdf_error: 'PDF export error: ',
        toast_offers_archived: '{n} offer(s) archived',
        toast_offers_restored: '{n} offer(s) restored',
        toast_offers_deleted: '{n} offer(s) deleted',
        confirm_delete: 'Delete offer "{title}"?\n\nThis action cannot be undone.',
        confirm_archive: 'Archive offer "{title}"?\n\nIt will disappear from the "Open opportunities" KPI and from the default list.',
        select_all_aria: 'Select all',
        item_label: 'offer',
      },
      contacts: {
        eyebrow: 'Sales',
        title_a: 'Contact',
        title_b: 'book.',
        description: 'Recruiters, clients, partner ESNs — all your commercial relationships.',
        new: 'New contact',
        empty_title: 'No contact',
        empty_description: 'Add your first contact to start your book.',
        description_count: '{n} contacts — recruiters, clients, partner ESNs.',
        import_csv: 'Import CSV',
        kpi_total: 'Total contacts',
        kpi_recruiters: 'Recruiters',
        kpi_clients: 'End clients',
        kpi_esn: 'Partner ESNs',
        search_placeholder: 'Search by name, company, email, phone, role…',
        table_contact: 'Contact',
        table_type: 'Type',
        table_company: 'Company / ESN',
        table_email: 'Email',
        table_phone: 'Phone',
        table_last_contact: 'Last contact',
        table_actions: 'Actions',
        badge_esn_partner: 'Partner ESN',
        badge_recruiter: 'Recruiter',
        badge_direct_client: 'Direct client',
        never_contacted: 'Never contacted',
        action_mark_contacted: 'Mark as contacted today',
      },
      contracts: {
        eyebrow: 'Billing',
        title_a: 'Your',
        title_b: 'contracts.',
        description: 'Service contracts, subcontracting, addenda — the full billable chain.',
        new: 'New contract',
        empty_title: 'No contract yet',
        empty_description: 'Create your first service contract to start tracking.',
        description_count: '{n} contract(s) — service contracts, subcontracting, addenda.',
        kpi_signed_month: 'Signed this month',
        kpi_signed_month_hint: '',
        kpi_pending_signature: 'Pending signature',
        kpi_pending_signature_hint: '',
        kpi_expired: 'Expired',
        kpi_expired_hint: 'to close or renew',
        kpi_annual_tjm: 'Cumulated annual day rate',
        kpi_annual_tjm_hint: 'since January 1st',
        tab_active: 'Active',
        tab_archived: 'Archived',
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
        kpi_validated_month: 'Validated this month',
        kpi_pending: 'Pending',
        kpi_days_entered: 'Days entered',
        kpi_validated_count: '{n} validated',
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
        ai_mock_badge: 'AI · Mock',
        greeting: 'Hello. I am your Centrium accounting assistant. I can answer your questions about cash flow, invoices, VAT, timesheets… Pick a quick question or ask your own.',
        quick_questions: 'Quick questions',
        one_click_hint: 'One click to ask',
        q_overview: 'Overview',
        q_overdue_invoices: 'Overdue invoices',
        q_treasury_30: 'Cash flow 30d',
        q_cra_to_validate: 'Timesheets to validate',
        q_cra_not_invoiced: 'Timesheets not invoiced',
        q_vat_quarter: 'Quarterly VAT',
        q_draft_followup: 'Draft a follow-up',
        q_top_clients: 'Top clients',
        q_top_consultants: 'Top consultants',
        q_dso: 'DSO',
        q_aging: 'Aging report',
        q_forecast_90: 'Forecast 90 days',
        q_win_rate: 'Win rate',
        q_pipeline_value: 'Pipeline value',
        to_know_title: 'Good to know',
        to_know_body: 'The assistant does not replace an accountant. It analyses the data entered in Centrium. For the official filing (balance sheet, tax return), use these numbers as supporting material for your accountant.',
        chat_placeholder: 'Ex: which invoices are overdue?',
      },
      alerts: {
        eyebrow: 'Overview',
        title_a: 'Alert',
        title_b: 'center.',
        description: 'Signals requiring your attention — sorted by priority.',
        empty_title: 'All under control',
        empty_description: 'No urgent action, no overdue deadline. Good news.',
        chip_critical: 'Critical',
        chip_important: 'Important',
        chip_moderate: 'Moderate',
        chip_info: 'Info',
        filter_all: 'All',
        section_critical_title: 'Critical — handle immediately',
        section_critical_hint: 'Blocking or overdue, action required today',
        section_important_title: 'Important — handle this week',
        section_important_hint: 'Close deadline or significant risk',
        section_moderate_title: 'Moderate — to schedule',
        section_moderate_hint: 'To handle in the coming weeks',
        section_info_title: 'Info — good to know',
        section_info_hint: 'Weak signals, no urgency',
        kind_invoice_overdue: 'Invoicing',
        kind_timesheet_pending: 'Timesheet',
        kind_mission_ending: 'Mission',
        kind_consultant_available: 'Bench',
        kind_client_follow_up: 'Client follow-up',
        kind_unanswered_message: 'Message',
        kind_offer_stale: 'Offer',
        kind_opportunity_cold: 'Opportunity',
        alert_word_one: 'alert',
        alert_word_many: 'alerts',
        view_detail: 'View details',
        view: 'View',
        hide_alert: 'Hide this alert',
        hide_button: 'Hide',
        hidden_title: 'Alert hidden',
        hidden_description: "It won't reappear as long as the situation stays the same.",
        cannot_hide_prefix: 'Cannot hide this alert — ',
      },
      todos: {
        eyebrow: 'Overview',
        title_a: 'To',
        title_b: 'do.',
        description: 'Your personal tasks — private, strict RLS on user_id.',
        share_hint_prefix: 'Your private tasks + tasks shared by the team — click the',
        share_hint_suffix: 'icon to share.',
        new_task: 'New task',
        tab_pending: 'To do',
        tab_done: 'Done',
        tab_all: 'All',
        card_my_title: 'My tasks',
        card_team_title: 'Team tasks',
        stat_pending: 'In progress',
        stat_overdue: 'Overdue',
        stat_done: 'Done',
        stat_progress: 'Progress',
        due_today: 'Today',
        due_overdue: 'Overdue',
        form_dialog_hint: 'A clear task is a done task. Add a due date to surface it at the right time.',
        prio_high: 'High',
        prio_medium: 'Medium',
        prio_low: 'Low',
        team_badge: 'Team',
        shared_team_badge: 'Shared with team',
        drop_team_hint: 'Drop here to share with the team',
        drop_private_hint: 'Drop here to make it private again',
        pinged_by_label: 'Pinged by',
        ping_to_label: 'Pings',
        a_colleague: 'A colleague',
        empty_mine_pending: 'Nothing to do — all under control 🎯',
        empty_mine_done: 'No completed task for now',
        empty_mine_all: 'No personal task. Click "New task".',
        empty_team_pending: 'No ongoing team task',
        empty_team_done: 'No completed team task',
        empty_team_all: 'Drag one of your tasks here to share it with the team.',
        created_by_label: 'Created by',
        due_label: 'Due',
        no_due: 'None',
        created_label: 'Created on',
        completed_label: 'Completed on',
        notes_label: 'Notes',
        no_notes: 'No note.',
        priority_label: 'Priority',
        share_with_team: 'Share with team',
        back_to_private: 'Make private again',
        mark_done: 'Mark as done',
        mark_undone: 'Mark as not done',
        mark_undone_short: 'Mark as not done',
        mark_done_short: 'Mark as done',
        edit_button: 'Edit',
        delete_button: 'Delete',
        edit_title: 'Edit task',
        view_details: 'View details',
        shared_with_team: 'Task shared with the team',
        delete_confirm_prefix: 'Delete',
        view_tooltip: 'View details',
        form_edit_title: 'Edit task',
        form_create_title: 'New task',
        form_title_label: 'Title *',
        form_title_placeholder: 'Ex: Follow up with Banque Postale on Tech Lead mission',
        form_notes_label: 'Notes (optional)',
        form_notes_placeholder: 'Details, context, next steps…',
        form_priority_label: 'Priority',
        form_due_label: 'Due date',
        form_ping_label: 'Ping a person',
        form_ping_optional: '(optional)',
        form_ping_none: '— Nobody —',
        form_ping_hint: 'The pinged person will see the task and can check it. They cannot edit or delete it.',
        form_cancel: 'Cancel',
        form_save: 'Save',
        form_add: 'Add',
        form_close: 'Close',
        err_title_required: 'Title is required',
        err_session_expired: 'Session expired — please reconnect',
        err_update_failed: 'Update failed: ',
        err_save_failed_prefix: 'Update failed: ',
        err_create_failed_prefix: 'Creation failed: ',
        err_delete_failed: 'Delete failed: ',
        err_share_failed: 'Share failed: ',
        err_no_org: 'Organization not found — cannot share',
        toast_shared_suffix: ' shared with the team',
        toast_back_private_suffix: ' set back to private',
        toast_deleted_suffix: ' deleted',
        toast_updated_suffix: ' updated',
        toast_added_suffix: ' added',
      },
      billing: {
        eyebrow: 'Organization',
        title_a: 'Your',
        title_b: 'subscription.',
        description: 'Plan, billing, usage — manage your Centrium subscription.',
        status_active: 'Active',
        founder_account_title: 'FOUNDER ACCOUNT',
        no_billing: 'No billing',
        founder_description: 'This organization is exempt from billing. Unlimited access to all platform features, no consultant or user limit, no Stripe subscription.',
        permanent_active_status: 'Active status · permanent',
      },
      settings: {
        eyebrow: 'Organization',
        title_a: 'Settings',
        title_b: 'of your firm.',
        description: 'Personal profile, team, branding, GDPR compliance — steer your Centrium workspace.',
        card_profile_title: 'My profile',
        card_profile_description: 'Your personal info (role, contact, address, emergency contact) — visible only to you.',
        card_branding_title: 'Branding',
        card_branding_description: 'Logo, colors and brand name displayed on generated CVs, contracts and invoices.',
        card_team_title: 'Team',
        card_team_description: "Members, invitations and roles of the organization.",
        card_data_title: 'My data & privacy',
        card_data_description: 'Export your data, manage cookies, exercise your GDPR rights.',
        card_appearance_title: 'Appearance & design',
        card_appearance_description: 'Dark/light theme, animated background intensity, interface density — customize the vibe.',
        legal_section_eyebrow: 'LEGAL IDENTITY',
        legal_section_title_a: 'Your',
        legal_section_title_b: 'organization.',
        legal_section_description: 'Information used on your contracts and invoices.',
        account_section_eyebrow: 'ACCOUNT',
        account_section_title_a: 'Active',
        account_section_title_b: 'session.',
        account_section_description: 'Sign out of Centrium.',
        logout_button: 'Sign out',
      },
      team: {
        eyebrow: 'ORGANIZATION',
        title_a: 'Centrium',
        title_b: 'team.',
        description: "Members, invitations and roles of the organization.",
        banner_unlimited: '{n} / unlimited internal users · Founder account — no limit',
        banner_limited: '{n} / {max} internal users',
        kpi_members: 'Members',
        kpi_members_hint: 'Active account',
        kpi_admins: 'Administrators',
        kpi_admins_hint: 'Full access',
        kpi_invitations: 'Invitations',
        kpi_invitations_hint: 'Pending',
        kpi_seats_left: 'Seats left',
        kpi_seats_left_hint: 'See plan banner',
        invite_section_eyebrow: 'INVITE',
        invite_section_title_a: 'Invite a',
        invite_section_title_b: 'member.',
        invite_section_description: 'A Centrium email will be sent automatically to the invitee with a login link. The link expires after 7 days.',
        email_label: 'EMAIL',
        email_placeholder: 'colleague@company.com',
        role_label: 'ROLE',
        role_admin: 'Admin',
        role_member: 'Member',
        role_viewer: 'Viewer',
        role_finance: 'Finance',
        invite_button: 'Invite',
        members_section_eyebrow: 'MEMBERS',
        members_section_title_a: 'Active',
        members_section_title_b: 'team ({n}).',
        members_section_description: 'All users in your organization.',
        table_name: 'NAME',
        table_email: 'EMAIL',
        table_role: 'ROLE',
        table_joined_at: 'JOINED ON',
        empty_no_members: 'No member yet.',
        pending_invitations_title: 'No pending invitation',
        empty_no_invitations: 'No pending invitation',
        all_invites_accepted: 'All sent invitations have been accepted (or revoked).',
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
