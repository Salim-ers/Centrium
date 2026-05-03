-- =============================================================
-- 028_dashboard_rpc.sql
--
-- Le dashboard faisait 12 round-trips parallèles depuis le navigateur
-- (10 KPIs + 2 séries du graph 12 mois). Chaque round-trip cumule
-- TLS + auth + RLS, ce qui rend le 1er chargement lent et chaque retour
-- d'onglet pénible. On collapse tout en 2 RPC SECURITY DEFINER qui
-- vérifient l'appartenance à l'org puis renvoient un JSON agrégé.
--
-- Gains : N+1 → 1, et l'agrégation se fait au plus près des données.
-- =============================================================

-- 1. KPIs dashboard
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
  -- Garde-fou : seul un membre de l'org peut interroger ses KPIs.
  IF NOT public.is_member_of(org_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Consultants en mission active : DISTINCT consultant_id sur les missions
  -- proposed/active. Source de vérité = missions, pas consultants.status
  -- (pour éviter les drifts).
  SELECT COUNT(DISTINCT consultant_id) INTO consultants_on_mission
  FROM missions
  WHERE organization_id = org_id
    AND status IN ('proposed', 'active');

  -- Consultants disponibles : status='available' ET pas en mission active.
  SELECT COUNT(*) INTO consultants_available
  FROM consultants c
  WHERE c.organization_id = org_id
    AND c.status = 'available'
    AND c.archived = FALSE
    AND c.is_prospect = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM missions m
      WHERE m.consultant_id = c.id
        AND m.status IN ('proposed', 'active')
    );

  -- Opportunités ouvertes = AO ouverts + opportunités CRM non clôturées.
  SELECT
    (SELECT COUNT(*) FROM opportunities
      WHERE organization_id = org_id AND status NOT IN ('won', 'lost'))
    +
    (SELECT COUNT(*) FROM job_offers
      WHERE organization_id = org_id AND status = 'open')
  INTO open_opportunities;

  SELECT COUNT(*) INTO opportunities_won_this_month
  FROM opportunities
  WHERE organization_id = org_id
    AND status = 'won'
    AND updated_at >= month_start;

  -- CA "produit" du mois : TJM × jours ouvrés écoulés sur missions actives.
  -- Évolue chaque jour ouvré sans dépendre du cycle facturation.
  SELECT COALESCE(SUM(
    COALESCE(m.daily_rate_eur, 0) *
    -- Compte les jours ouvrés (lundi-vendredi) entre max(start, month_start)
    -- et min(end, today, month_end).
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
  WHERE organization_id = org_id
    AND status = 'paid'
    AND issue_date >= month_start;

  SELECT COUNT(*) INTO pending_invoices
  FROM invoices WHERE organization_id = org_id AND status = 'sent';

  SELECT COUNT(*) INTO overdue_invoices
  FROM invoices WHERE organization_id = org_id AND status = 'overdue';

  SELECT COUNT(*) INTO pending_timesheets
  FROM timesheets
  WHERE organization_id = org_id AND status IN ('draft', 'submitted');

  SELECT COUNT(*) INTO critical_alerts
  FROM alerts
  WHERE organization_id = org_id AND priority = 'critical' AND status = 'new';

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

GRANT EXECUTE ON FUNCTION public.dashboard_kpis(UUID) TO authenticated;

-- 2. Graph CA + missions sur 12 mois
CREATE OR REPLACE FUNCTION public.dashboard_revenue_chart(org_id UUID, months_back INT DEFAULT 12)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  start_month DATE;
BEGIN
  IF NOT public.is_member_of(org_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  start_month := (date_trunc('month', CURRENT_DATE) - ((months_back - 1) || ' months')::INTERVAL)::DATE;

  WITH months AS (
    SELECT
      to_char(d, 'YYYY-MM') AS month_key,
      d::DATE AS month_start,
      (d + INTERVAL '1 month - 1 day')::DATE AS month_end
    FROM generate_series(start_month, CURRENT_DATE, '1 month'::INTERVAL) d
  ),
  ca_per_month AS (
    SELECT to_char(date_trunc('month', issue_date), 'YYYY-MM') AS month_key,
           SUM(amount_ht) AS ca
    FROM invoices
    WHERE organization_id = org_id
      AND status IN ('paid', 'sent', 'overdue')
      AND issue_date >= start_month
    GROUP BY 1
  ),
  missions_per_month AS (
    SELECT m.month_key, COUNT(*) AS missions_count
    FROM months m
    LEFT JOIN missions ms
      ON ms.organization_id = org_id
     AND ms.start_date <= m.month_end
     AND COALESCE(ms.end_date, CURRENT_DATE) >= m.month_start
    WHERE ms.id IS NOT NULL
    GROUP BY m.month_key
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'month', m.month_key,
      'ca', COALESCE(c.ca, 0),
      'missions', COALESCE(mm.missions_count, 0)
    ) ORDER BY m.month_key
  )
  INTO result
  FROM months m
  LEFT JOIN ca_per_month c ON c.month_key = m.month_key
  LEFT JOIN missions_per_month mm ON mm.month_key = m.month_key;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_revenue_chart(UUID, INT) TO authenticated;

COMMENT ON FUNCTION public.dashboard_kpis(UUID) IS
  'Renvoie tous les KPIs du dashboard en un seul round-trip. SECURITY DEFINER + check is_member_of pour la borne d''org.';
COMMENT ON FUNCTION public.dashboard_revenue_chart(UUID, INT) IS
  'Renvoie le tableau CA + missions par mois pour le graph. SECURITY DEFINER + check is_member_of.';
