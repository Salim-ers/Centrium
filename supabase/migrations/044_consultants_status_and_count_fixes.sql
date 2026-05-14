-- =============================================================
-- 044_consultants_status_and_count_fixes.sql
--
-- 3 corrections cohérentes avec la nouvelle organisation Talents :
--
-- 1) Trigger sync consultant.status ↔ missions :
--    le statut "on_mission" ne se déclenche QUE pour une mission
--    active. Les CV poussés (proposed) ne doivent PAS rendre le
--    consultant indisponible — il peut être positionné en parallèle
--    sur plusieurs offres.
--
-- 2) Backfill : tout consultant en 'on_mission' qui n'a en réalité
--    aucune mission *active* est repassé en 'available'.
--
-- 3) RPC dashboard_kpis : le KPI "Disponibles" ne filtre plus sur
--    is_prospect=false (le concept vivier/bibliothèque a été retiré
--    de l'UI). On normalise aussi les données existantes en mettant
--    tous les consultants à is_prospect=false.
-- =============================================================

-- 1) Nouveau trigger : on_mission uniquement pour status='active'
CREATE OR REPLACE FUNCTION public.sync_consultant_status_from_missions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consultant_id UUID;
  v_active_count INT;
  v_current_status TEXT;
BEGIN
  v_consultant_id := COALESCE(NEW.consultant_id, OLD.consultant_id);
  IF v_consultant_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- ⚠️ Important : seulement les missions ACTIVES rendent le consultant indisponible.
  -- Les missions 'proposed' (CV poussés) sont des propositions qui peuvent
  -- échouer — on ne veut pas amputer le pool de disponibles tant qu'aucune
  -- n'est validée.
  SELECT COUNT(*) INTO v_active_count
  FROM public.missions
  WHERE consultant_id = v_consultant_id
    AND status = 'active'
    AND archived = FALSE;

  SELECT status INTO v_current_status
  FROM public.consultants
  WHERE id = v_consultant_id;

  IF v_active_count > 0 THEN
    IF v_current_status IN ('available', 'soon_available') THEN
      UPDATE public.consultants
         SET status = 'on_mission'
       WHERE id = v_consultant_id;
    END IF;
  ELSE
    IF v_current_status = 'on_mission' THEN
      UPDATE public.consultants
         SET status = 'available'
       WHERE id = v_consultant_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2) Backfill : repasser à 'available' les consultants taggés 'on_mission'
--    sans mission active réelle. Beaucoup de cas existent depuis la version
--    précédente du trigger qui matchait aussi 'proposed'.
UPDATE public.consultants c
   SET status = 'available'
 WHERE c.status = 'on_mission'
   AND c.archived = FALSE
   AND NOT EXISTS (
     SELECT 1 FROM public.missions m
      WHERE m.consultant_id = c.id
        AND m.status = 'active'
        AND m.archived = FALSE
   );

-- 3) Normalisation is_prospect : la distinction vivier/bibliothèque a été
--    retirée de l'UI, on met tout à false pour qu'aucune query existante
--    ne filtre par erreur.
UPDATE public.consultants
   SET is_prospect = FALSE
 WHERE is_prospect = TRUE;

-- 4) RPC dashboard_kpis : "Disponibles" ne filtre plus sur is_prospect
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
  WHERE organization_id = org_id
    AND status = 'active'
    AND archived = FALSE;

  -- Disponibles = consultants actifs non archivés sans mission ACTIVE
  -- en cours. Plus de filtre is_prospect (distinction supprimée côté UI).
  SELECT COUNT(*) INTO consultants_available
  FROM consultants c
  WHERE c.organization_id = org_id
    AND c.status = 'available'
    AND c.archived = FALSE
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
