-- =============================================================
-- 029_alerts_compute.sql
--
-- Le centre d'alertes ne reflétait pas la réalité : factures envoyées
-- non payées, CRA en attente, missions qui se terminent — rien n'était
-- remonté. La table `alerts` n'avait aucun trigger d'alimentation, donc
-- elle restait vide en pratique.
--
-- On part sur une fonction `compute_org_alerts(org_id)` qui synthétise
-- en live tous les signaux à traiter à partir de l'état actuel des
-- entités (invoices, timesheets, missions) + UNION avec la table
-- `alerts` historique pour les alertes manuelles. Pas de stockage,
-- pas de drift : ce que tu vois est ce qui est, en temps réel.
-- =============================================================

-- Helper : nom de mois en français pour les CRA (declared first because
-- compute_org_alerts l'utilise dans son corps)
CREATE OR REPLACE FUNCTION public.month_label_fr(year_in INT, month_in INT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (ARRAY[
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
  ])[month_in] || ' ' || year_in::TEXT;
$$;

CREATE OR REPLACE FUNCTION public.compute_org_alerts(org_id UUID)
RETURNS TABLE (
  id TEXT,
  kind TEXT,
  priority TEXT,
  title TEXT,
  description TEXT,
  due_date DATE,
  link TEXT,
  entity_kind TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH all_alerts AS (
    -- ============== INVOICES ==============
    -- Factures en retard (déjà overdue OU envoyée mais date d'échéance dépassée)
    SELECT
      'invoice-overdue:' || i.id::TEXT AS id,
      'invoice_overdue' AS kind,
      'critical' AS priority,
      'Facture ' || i.invoice_number || ' en retard' AS title,
      'Échue depuis ' || (CURRENT_DATE - i.due_date) ||
        ' jour' || CASE WHEN (CURRENT_DATE - i.due_date) > 1 THEN 's' ELSE '' END ||
        ' · ' || to_char(i.amount_ttc, 'FM999G999G999D00') || ' € TTC' AS description,
      i.due_date,
      '/invoices/' || i.id::TEXT AS link,
      'invoice' AS entity_kind,
      i.id AS entity_id,
      i.created_at
    FROM invoices i
    WHERE i.organization_id = org_id
      AND (
        i.status = 'overdue'
        OR (i.status = 'sent' AND i.due_date < CURRENT_DATE)
      )

    UNION ALL

    -- Factures à échéance dans 7 jours
    SELECT
      'invoice-soon:' || i.id::TEXT,
      'invoice_overdue',
      'high',
      'Facture ' || i.invoice_number || ' à encaisser bientôt',
      'Échéance le ' || to_char(i.due_date, 'DD/MM/YYYY') ||
        ' (' || (i.due_date - CURRENT_DATE) || ' j) · ' ||
        to_char(i.amount_ttc, 'FM999G999G999D00') || ' € TTC',
      i.due_date,
      '/invoices/' || i.id::TEXT,
      'invoice',
      i.id,
      i.created_at
    FROM invoices i
    WHERE i.organization_id = org_id
      AND i.status = 'sent'
      AND i.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'

    UNION ALL

    -- ============== TIMESHEETS ==============
    -- CRA soumis en attente de validation client
    SELECT
      'ts-submitted:' || t.id::TEXT,
      'timesheet_pending',
      CASE
        WHEN t.submitted_at IS NOT NULL AND t.submitted_at < NOW() - INTERVAL '14 days' THEN 'high'
        ELSE 'medium'
      END,
      'CRA ' || month_label_fr(t.period_year, t.period_month) || ' à valider',
      CASE
        WHEN t.submitted_at IS NOT NULL THEN
          'Soumis le ' || to_char(t.submitted_at, 'DD/MM/YYYY') ||
          ' — en attente de validation'
        ELSE 'En attente de validation client'
      END,
      NULL::DATE,
      '/timesheets/' || t.id::TEXT,
      'timesheet',
      t.id,
      t.created_at
    FROM timesheets t
    WHERE t.organization_id = org_id
      AND t.status = 'submitted'

    UNION ALL

    -- CRA en brouillon sur un mois clos = à finaliser
    SELECT
      'ts-draft:' || t.id::TEXT,
      'timesheet_pending',
      'medium',
      'CRA ' || month_label_fr(t.period_year, t.period_month) || ' non soumis',
      'Période close — à finaliser et soumettre au client',
      NULL,
      '/timesheets/' || t.id::TEXT,
      'timesheet',
      t.id,
      t.created_at
    FROM timesheets t
    WHERE t.organization_id = org_id
      AND t.status = 'draft'
      AND make_date(t.period_year, t.period_month, 1) < date_trunc('month', CURRENT_DATE)::DATE

    UNION ALL

    -- ============== MISSIONS ==============
    -- Mission active qui se termine bientôt
    SELECT
      'mission-end:' || m.id::TEXT,
      'mission_ending',
      CASE
        WHEN m.end_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'high'
        ELSE 'medium'
      END,
      'Mission ' || COALESCE(m.title, 'sans titre') || ' se termine bientôt',
      'Fin prévue le ' || to_char(m.end_date, 'DD/MM/YYYY') ||
        ' (dans ' || (m.end_date - CURRENT_DATE) || ' j) — préparer le relais',
      m.end_date,
      '/missions/' || m.id::TEXT,
      'mission',
      m.id,
      m.created_at
    FROM missions m
    WHERE m.organization_id = org_id
      AND m.status = 'active'
      AND m.end_date IS NOT NULL
      AND m.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'

    UNION ALL

    -- ============== CONSULTANTS ==============
    -- Consultant disponible sans mission active = intercontrat
    SELECT
      'consultant-bench:' || c.id::TEXT,
      'consultant_available',
      'low',
      c.first_name || ' ' || c.last_name || ' disponible',
      'Profil disponible — à positionner sur une mission ou opportunité',
      NULL,
      '/consultants/' || c.id::TEXT,
      'consultant',
      c.id,
      c.created_at
    FROM consultants c
    WHERE c.organization_id = org_id
      AND c.archived = FALSE
      AND c.is_prospect = FALSE
      AND c.status = 'available'
      AND NOT EXISTS (
        SELECT 1 FROM missions m
        WHERE m.consultant_id = c.id AND m.status IN ('proposed', 'active')
      )

    UNION ALL

    -- ============== ALERTES MANUELLES (table historique) ==============
    SELECT
      'manual:' || a.id::TEXT,
      a.kind::TEXT,
      a.priority::TEXT,
      a.title,
      a.description,
      a.due_date,
      NULL,
      NULL,
      NULL::UUID,
      a.created_at
    FROM alerts a
    WHERE a.organization_id = org_id
      AND a.status = 'new'
  )
  SELECT *
  FROM all_alerts
  ORDER BY
    CASE priority
      WHEN 'critical' THEN 0
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 3
      ELSE 4
    END,
    due_date NULLS LAST,
    created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.compute_org_alerts(UUID) TO authenticated;

COMMENT ON FUNCTION public.compute_org_alerts(UUID) IS
  'Génère en live les alertes prioritaires de l''org à partir de l''état des invoices/timesheets/missions/consultants + UNION des alertes manuelles. Pas de stockage : reflète toujours la réalité courante.';

-- =============================================================
-- Dashboard KPI : compte les alertes "criticalAlerts" via la nouvelle
-- fonction (la table `alerts` n'est plus la source — on lit le live).
-- On rebuild dashboard_kpis avec la même signature.
-- =============================================================

CREATE OR REPLACE FUNCTION public.dashboard_kpis(org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  consultants_on_mission INT;
  consultants_available INT;
  open_opportunities INT;
  opportunities_won_this_month INT;
  revenue_this_month NUMERIC;
  revenue_this_month_paid NUMERIC;
  pending_invoices INT;
  overdue_invoices INT;
  pending_timesheets INT;
  critical_alerts INT;
  month_start DATE := date_trunc('month', CURRENT_DATE)::DATE;
  month_end DATE := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
  today DATE := CURRENT_DATE;
BEGIN
  IF NOT public.is_member_of(org_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(DISTINCT consultant_id) INTO consultants_on_mission
  FROM missions
  WHERE organization_id = org_id AND status IN ('proposed', 'active');

  SELECT COUNT(*) INTO consultants_available
  FROM consultants c
  WHERE c.organization_id = org_id
    AND c.status = 'available'
    AND c.archived = FALSE
    AND c.is_prospect = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM missions m
      WHERE m.consultant_id = c.id AND m.status IN ('proposed', 'active')
    );

  SELECT
    (SELECT COUNT(*) FROM opportunities WHERE organization_id = org_id AND status NOT IN ('won', 'lost'))
    + (SELECT COUNT(*) FROM job_offers WHERE organization_id = org_id AND status = 'open')
  INTO open_opportunities;

  SELECT COUNT(*) INTO opportunities_won_this_month
  FROM opportunities
  WHERE organization_id = org_id AND status = 'won' AND updated_at >= month_start;

  SELECT COALESCE(SUM(
    COALESCE(m.daily_rate_eur, 0) *
    (
      SELECT COUNT(*)::INT
      FROM generate_series(
        GREATEST(m.start_date, month_start),
        LEAST(COALESCE(m.end_date, month_end), today, month_end),
        '1 day'::INTERVAL
      ) d
      WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)
    )
  ), 0) INTO revenue_this_month
  FROM missions m
  WHERE m.organization_id = org_id
    AND m.status IN ('proposed', 'active')
    AND m.start_date IS NOT NULL
    AND m.start_date <= LEAST(today, month_end);

  SELECT COALESCE(SUM(amount_ht), 0) INTO revenue_this_month_paid
  FROM invoices
  WHERE organization_id = org_id AND status = 'paid' AND issue_date >= month_start;

  SELECT COUNT(*) INTO pending_invoices
  FROM invoices WHERE organization_id = org_id AND status = 'sent';

  SELECT COUNT(*) INTO overdue_invoices
  FROM invoices WHERE organization_id = org_id AND status = 'overdue';

  SELECT COUNT(*) INTO pending_timesheets
  FROM timesheets WHERE organization_id = org_id AND status IN ('draft', 'submitted');

  -- Compteur live des alertes critical+high.
  SELECT COUNT(*) INTO critical_alerts
  FROM compute_org_alerts(org_id) a
  WHERE a.priority IN ('critical', 'high');

  result := jsonb_build_object(
    'consultantsOnMission', consultants_on_mission,
    'consultantsAvailable', consultants_available,
    'openOpportunities', open_opportunities,
    'opportunitiesWonThisMonth', opportunities_won_this_month,
    'revenueThisMonth', revenue_this_month,
    'revenueThisMonthPaid', revenue_this_month_paid,
    'pendingInvoices', pending_invoices,
    'overdueInvoices', overdue_invoices,
    'pendingTimesheets', pending_timesheets,
    'criticalAlerts', critical_alerts
  );
  RETURN result;
END;
$$;
