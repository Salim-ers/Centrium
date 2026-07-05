-- =============================================================================
-- 076_document_party.sql — Dissociation documents CLIENT vs CONSULTANT
-- -----------------------------------------------------------------------------
-- Une ESN a deux flux documentaires distincts :
--   · côté CLIENT (entreprise)   : contrat de prestation + factures de VENTE
--   · côté CONSULTANT (freelance): contrat de sous-traitance + factures de
--     SOUS-TRAITANCE (établies par l'ESN pour le compte du prestataire —
--     autofacturation) + CRA validé.
--
-- Jusqu'ici tout était mélangé : les contrats étaient de facto côté
-- consultant (champs supplier_*), les factures de facto côté client
-- (company_id), et le portail consultant voyait les factures CLIENT de ses
-- missions — donc le TJM de vente et la marge de l'ESN (fuite métier).
--
-- Ce que fait cette migration :
--   1. `party` ('client'|'consultant') sur contracts ET invoices + backfill
--   2. contracts.company_id → lien structurel vers l'entreprise cliente
--   3. contract_kind += 'prestation_client' (contrat de prestation ESN↔client)
--   4. RLS portail : le consultant ne voit QUE ses documents party='consultant'
--      (contrats + factures + items) — plus jamais les factures client
--   5. dashboard_kpis / dashboard_revenue_chart / compute_org_alerts scopés
--      party='client' (les factures consultants sont un ACHAT, pas du CA)
--   6. compute_org_alerts += alertes « facture consultant à régler »
-- =============================================================================

-- ============ 1) CONTRACTS : party + company_id ============

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS party TEXT NOT NULL DEFAULT 'consultant'
    CHECK (party IN ('client', 'consultant')),
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.contracts.party IS
  'Contrepartie du contrat : client (entreprise, contrat de prestation) ou consultant (freelance, sous-traitance). Tous les contrats pré-076 sont côté consultant (champs supplier_*).';
COMMENT ON COLUMN public.contracts.company_id IS
  'Entreprise cliente signataire (party=client). client_name/client_address restent le snapshot texte imprimé sur le document.';

CREATE INDEX IF NOT EXISTS idx_contracts_org_party ON public.contracts(organization_id, party);
CREATE INDEX IF NOT EXISTS idx_contracts_company ON public.contracts(company_id);

-- Nouveau type : contrat de prestation de services ESN ↔ entreprise cliente.
ALTER TYPE contract_kind ADD VALUE IF NOT EXISTS 'prestation_client';

-- ============ 2) INVOICES : party ============

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS party TEXT NOT NULL DEFAULT 'client'
    CHECK (party IN ('client', 'consultant'));

COMMENT ON COLUMN public.invoices.party IS
  'client = facture de vente (ESN → entreprise, à encaisser) · consultant = facture de sous-traitance (société du freelance → ESN, à payer, autofacturation).';

CREATE INDEX IF NOT EXISTS idx_invoices_org_party ON public.invoices(organization_id, party);

-- Backfill : les factures manuelles liées à un consultant SANS entreprise
-- cliente étaient déjà, dans les faits, des factures consultant.
UPDATE public.invoices
SET party = 'consultant'
WHERE company_id IS NULL AND consultant_id IS NOT NULL;

-- ============ 3) RLS PORTAIL : le consultant ne voit que SES documents ============

-- Contrats : uniquement les contrats de sous-traitance qui le concernent.
-- (Un contrat CLIENT peut référencer le consultant positionné → sans le filtre
--  party, il verrait le TJM de vente.)
DROP POLICY IF EXISTS contracts_self_select ON public.contracts;
CREATE POLICY contracts_self_select ON public.contracts
  FOR SELECT USING (
    public.user_role() = 'consultant'
    AND party = 'consultant'
    AND consultant_id = public.consultant_id()
  );

-- Factures : SES factures de sous-traitance (émises, payées, en retard —
-- pas les brouillons), plus JAMAIS les factures client de ses missions.
DROP POLICY IF EXISTS invoices_self_select ON public.invoices;
CREATE POLICY invoices_self_select ON public.invoices
  FOR SELECT USING (
    public.user_role() = 'consultant'
    AND party = 'consultant'
    AND consultant_id = public.consultant_id()
    AND status <> 'draft'
  );

DROP POLICY IF EXISTS invoice_items_self_select ON public.invoice_items;
CREATE POLICY invoice_items_self_select ON public.invoice_items
  FOR SELECT USING (
    public.user_role() = 'consultant'
    AND EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.party = 'consultant'
        AND i.consultant_id = public.consultant_id()
        AND i.status <> 'draft'
    )
  );

-- ============ 4) DASHBOARD KPIs : CA = factures CLIENT uniquement ============
-- (corps identique à 065, + AND party = 'client' sur chaque agrégat invoices)

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

  SELECT COUNT(*) INTO open_opportunities
  FROM opportunities
  WHERE organization_id = org_id
    AND status NOT IN ('won', 'lost', 'on_hold');

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

  -- CA FACTURÉ : factures de VENTE uniquement (les factures consultant
  -- sont un achat de sous-traitance — les compter gonflerait le CA).
  SELECT COALESCE(SUM(amount_ht), 0) INTO revenue_this_month_invoiced
  FROM invoices
  WHERE organization_id = org_id
    AND party = 'client'
    AND status IN ('sent', 'overdue', 'paid')
    AND issue_date >= month_start;

  SELECT COALESCE(SUM(amount_ht), 0) INTO revenue_this_month_paid
  FROM invoices
  WHERE organization_id = org_id
    AND party = 'client'
    AND status = 'paid'
    AND issue_date >= month_start;

  SELECT COUNT(*) INTO pending_invoices
  FROM invoices WHERE organization_id = org_id AND party = 'client' AND status = 'sent';

  SELECT COUNT(*) INTO overdue_invoices
  FROM invoices WHERE organization_id = org_id AND party = 'client' AND status = 'overdue';

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

COMMENT ON FUNCTION public.dashboard_kpis(UUID) IS
  'Dashboard KPIs — agrégats factures scopés party=client depuis 076 (les factures consultant sont un achat, pas du CA).';

-- ============ 5) GRAPHE CA 12 MOIS : ventes uniquement ============
-- (corps identique à 053, + AND party = 'client' dans ca_per_month)

CREATE OR REPLACE FUNCTION public.dashboard_revenue_chart(
  org_id UUID,
  months_back INT DEFAULT 12
)
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
      AND party = 'client'
      AND status IN ('paid', 'sent', 'overdue')
      AND issue_date >= start_month
    GROUP BY 1
  ),
  active_per_month AS (
    SELECT m.month_key, COUNT(*) AS cnt
    FROM months m
    LEFT JOIN missions ms
      ON ms.organization_id = org_id
     AND ms.status = 'active'
     AND COALESCE(ms.archived, FALSE) = FALSE
     AND ms.start_date <= m.month_end
     AND COALESCE(ms.end_date, CURRENT_DATE) >= m.month_start
    WHERE ms.id IS NOT NULL
    GROUP BY m.month_key
  ),
  proposed_snapshot AS (
    SELECT to_char(date_trunc('month', CURRENT_DATE), 'YYYY-MM') AS month_key,
           COUNT(*) AS cnt
    FROM missions
    WHERE organization_id = org_id
      AND status = 'proposed'
      AND COALESCE(archived, FALSE) = FALSE
  ),
  proposed_created_per_month AS (
    SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month_key,
           COUNT(*) AS cnt
    FROM missions
    WHERE organization_id = org_id
      AND status = 'proposed'
      AND COALESCE(archived, FALSE) = FALSE
      AND created_at >= start_month
    GROUP BY 1
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'month', m.month_key,
      'ca', COALESCE(c.ca, 0),
      'missions', COALESCE(a.cnt, 0),
      'missions_active', COALESCE(a.cnt, 0),
      'missions_proposed', COALESCE(ps.cnt, 0),
      'proposed_created', COALESCE(pcm.cnt, 0)
    ) ORDER BY m.month_key
  )
  INTO result
  FROM months m
  LEFT JOIN ca_per_month c ON c.month_key = m.month_key
  LEFT JOIN active_per_month a ON a.month_key = m.month_key
  LEFT JOIN proposed_snapshot ps ON ps.month_key = m.month_key
  LEFT JOIN proposed_created_per_month pcm ON pcm.month_key = m.month_key;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_revenue_chart(UUID, INT) TO authenticated;

-- ============ 6) ALERTES : encaissements = client · + alertes « à régler » ============
-- (corps identique à 039, + party sur les blocs invoices, + bloc consultant)

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
      AND i.party = 'client'
      AND (
        i.status = 'overdue'
        OR (i.status = 'sent' AND i.due_date < CURRENT_DATE)
      )

    UNION ALL

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
      AND i.party = 'client'
      AND i.status = 'sent'
      AND i.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'

    UNION ALL

    -- Factures CONSULTANT émises arrivant à échéance / en retard :
    -- c'est un paiement à FAIRE au freelance (l'inverse d'un encaissement).
    SELECT
      'invoice-pay:' || i.id::TEXT,
      'invoice_overdue',
      CASE WHEN i.due_date < CURRENT_DATE THEN 'high' ELSE 'medium' END,
      'Facture consultant ' || i.invoice_number || ' à régler',
      'Échéance le ' || to_char(i.due_date, 'DD/MM/YYYY') ||
        ' · ' || to_char(i.amount_ttc, 'FM999G999G999D00') || ' € TTC à payer au prestataire',
      i.due_date,
      '/invoices/' || i.id::TEXT,
      'invoice',
      i.id,
      i.created_at
    FROM invoices i
    WHERE i.organization_id = org_id
      AND i.party = 'consultant'
      AND (
        i.status = 'overdue'
        OR (i.status = 'sent' AND i.due_date <= CURRENT_DATE + INTERVAL '7 days')
      )

    UNION ALL

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
  SELECT a.*
  FROM all_alerts a
  WHERE NOT EXISTS (
    SELECT 1 FROM dismissed_alerts d
    WHERE d.organization_id = org_id AND d.alert_id = a.id
  )
  ORDER BY
    CASE a.priority
      WHEN 'critical' THEN 0
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 3
      ELSE 4
    END,
    a.due_date NULLS LAST,
    a.created_at DESC;
$$;

COMMENT ON FUNCTION public.compute_org_alerts(UUID) IS
  'Alertes live : encaissements scopés party=client + alertes « facture consultant à régler » (076).';
