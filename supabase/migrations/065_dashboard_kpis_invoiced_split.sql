-- =========================================================================
-- 065 — dashboard_kpis : ajoute revenueThisMonthInvoiced + split open KPIs
-- =========================================================================
--
-- Bug user : "CA du mois 8 400 €" affiché dans le KPI mais "CA cumulé 12 mois
-- = 0 €" dans le graphe → incohérence visuelle.
--
-- Cause : revenueThisMonth = TJM × jours ouvrés des missions actives (= CA
-- PRODUIT, prévisionnel). revenueThisMonthInvoiced n'existait pas. Le graphe
-- 12 mois lui lit les FACTURES émises. Si missions actives mais 0 facture
-- émise → 8 400€ vs 0€ → user perdu.
--
-- Fix : ajoute revenueThisMonthInvoiced (somme invoices sent+overdue+paid
-- depuis 1er du mois). Le dashboard affiche maintenant le CA FACTURÉ comme
-- valeur principale (cohérent avec graphe), et le PRODUIT (prévisionnel)
-- + ENCAISSÉ dans le hint sous le KPI.
--
-- Bonus : openOpportunities ne cumule plus avec job_offers (déjà fixé côté
-- TS dans le service fallback en commit `e52e93c`, mais pas dans la RPC).
-- openJobOffers ajouté comme champ séparé.
-- =========================================================================

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
  open_job_offers INT;
  opportunities_won_this_month INT;
  revenue_this_month NUMERIC;
  revenue_this_month_invoiced NUMERIC;
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

  -- Disponibles = consultants actifs non archivés sans mission ACTIVE en cours.
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

  -- Opportunités CRM ouvertes (sans cumuler avec job_offers — KPI séparé).
  -- Aligné sur le Kanban : on exclut won/lost/on_hold.
  SELECT COUNT(*) INTO open_opportunities
  FROM opportunities
  WHERE organization_id = org_id
    AND status NOT IN ('won', 'lost', 'on_hold');

  -- AO/job_offers ouverts (KPI distinct, page /offers).
  SELECT COUNT(*) INTO open_job_offers
  FROM job_offers
  WHERE organization_id = org_id
    AND status = 'open'
    AND archived = FALSE;

  SELECT COUNT(*) INTO opportunities_won_this_month
  FROM opportunities
  WHERE organization_id = org_id
    AND status = 'won'
    AND updated_at >= month_start;

  -- CA PRODUIT du mois (prévisionnel) : TJM × jours ouvrés écoulés sur
  -- chaque mission active.
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

  -- CA FACTURÉ du mois (réel) : somme des invoices émises (sent/overdue/paid)
  -- depuis le 1er du mois. Cohérent avec la courbe CA cumulé 12 mois du graphe.
  SELECT COALESCE(SUM(amount_ht), 0) INTO revenue_this_month_invoiced
  FROM invoices
  WHERE organization_id = org_id
    AND status IN ('sent', 'overdue', 'paid')
    AND issue_date >= month_start;

  -- CA ENCAISSÉ du mois : sous-ensemble des factures effectivement payées.
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
    'openJobOffers', open_job_offers,
    'opportunitiesWonThisMonth', opportunities_won_this_month,
    'revenueThisMonth', revenue_this_month,
    'revenueThisMonthInvoiced', revenue_this_month_invoiced,
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

-- Note : pas besoin d'ALTER FUNCTION SET search_path (déjà dans la définition
-- CREATE OR REPLACE ci-dessus, ligne SET search_path = public).
COMMENT ON FUNCTION public.dashboard_kpis(UUID) IS
  'Dashboard KPIs : revenueThisMonth (produit) vs revenueThisMonthInvoiced (facturé) distincts (065). Cohérent avec graphe CA cumulé.';
