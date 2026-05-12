-- =============================================================
-- 039_alerts_perf.sql
--
-- Le Centre d'alertes prenait plusieurs secondes en cold load. Deux causes :
--
-- 1. Aucun index spécifique sur les colonnes scannées par compute_org_alerts :
--    invoices(organization_id, status, due_date), timesheets(org_id, status),
--    missions(org_id, status, end_date), consultants(org_id, status, archived,
--    is_prospect). Plus la base grossit, plus le seq scan ralentit.
--
-- 2. Le client faisait 2 round-trips (RPC compute_org_alerts + SELECT
--    dismissed_alerts) puis filtrait côté JS. On bouge le filtre dans la
--    RPC via LEFT JOIN sur dismissed_alerts → 1 seul aller-retour.
-- =============================================================

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_invoices_org_status_due
  ON public.invoices (organization_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_timesheets_org_status
  ON public.timesheets (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_missions_org_status_end
  ON public.missions (organization_id, status, end_date)
  WHERE end_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_missions_consultant_status
  ON public.missions (consultant_id, status);

CREATE INDEX IF NOT EXISTS idx_consultants_org_status_active
  ON public.consultants (organization_id, status)
  WHERE archived = FALSE AND is_prospect = FALSE;

CREATE INDEX IF NOT EXISTS idx_alerts_org_status
  ON public.alerts (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_dismissed_alerts_org_id
  ON public.dismissed_alerts (organization_id, alert_id);

-- ============ RPC AVEC FILTRE DISMISSED INTÉGRÉ ============
-- Nouvelle version de compute_org_alerts qui exclut directement les
-- alertes masquées via une LEFT JOIN ANTI sur dismissed_alerts. Évite
-- au client de faire 2 round-trips puis un filter en JS.
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
      AND i.status = 'sent'
      AND i.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'

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
  'Génère en live les alertes de l''org (invoices/timesheets/missions/consultants + manuelles), en excluant celles déjà dismissées via dismissed_alerts.';
