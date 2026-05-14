-- =============================================================
-- 042_archive_missions_offers.sql
--
-- Ajoute le concept "archivé" aux missions et aux offres d'emploi.
-- Permet de mettre de côté des éléments terminés/anciens sans les
-- supprimer (FK invoices, contracts, timesheets restent valides).
--
-- Les RPC dashboard et toutes les listes ignorent par défaut les
-- éléments archivés. Une vue archive dédiée les fait réapparaître.
-- =============================================================

ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE job_offers
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS missions_archived_idx
  ON missions (organization_id, archived);
CREATE INDEX IF NOT EXISTS job_offers_archived_idx
  ON job_offers (organization_id, archived);

-- ---------------------------------------------------------------
-- RPC dashboard mise à jour : ignore les missions et offres archivées.
-- ---------------------------------------------------------------

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

  -- En mission = uniquement les missions actives non archivées.
  SELECT COUNT(DISTINCT consultant_id) INTO consultants_on_mission
  FROM missions
  WHERE organization_id = org_id
    AND status = 'active'
    AND archived = FALSE;

  -- Disponibles : consultant actif sans mission active (les CV poussés
  -- n'enlèvent pas la dispo : on peut pousser à plusieurs endroits).
  SELECT COUNT(*) INTO consultants_available
  FROM consultants c
  WHERE c.organization_id = org_id
    AND c.status = 'available'
    AND c.archived = FALSE
    AND c.is_prospect = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM missions m
      WHERE m.consultant_id = c.id
        AND m.status = 'active'
        AND m.archived = FALSE
    );

  SELECT
    (SELECT COUNT(*) FROM opportunities
      WHERE organization_id = org_id AND status NOT IN ('won', 'lost'))
    +
    (SELECT COUNT(*) FROM job_offers
      WHERE organization_id = org_id
        AND status = 'open'
        AND archived = FALSE)
  INTO open_opportunities;

  SELECT COUNT(*) INTO opportunities_won_this_month
  FROM opportunities
  WHERE organization_id = org_id
    AND status = 'won'
    AND updated_at >= month_start;

  -- CA produit : missions actives non archivées uniquement.
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
    AND m.status = 'active'
    AND m.archived = FALSE
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

COMMENT ON COLUMN missions.archived IS
  'Mission archivée — exclue du dashboard, du KPI "En mission" et du CA produit. Reste accessible via la vue archive.';
COMMENT ON COLUMN job_offers.archived IS
  'Offre archivée — exclue du KPI "Opportunités ouvertes" et des listes par défaut.';
