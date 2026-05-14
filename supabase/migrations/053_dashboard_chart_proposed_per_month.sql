-- =============================================================
-- 053_dashboard_chart_proposed_per_month.sql
--
-- Étoffe la RPC dashboard_revenue_chart : les CV poussés en attente
-- (status='proposed') sont désormais comptés MOIS PAR MOIS via leur
-- created_at, pas seulement sur le mois courant. Permet d'afficher
-- une 3e courbe historique "CV poussés" dans le graph dashboard.
--
-- missions_proposed reste le compteur du mois courant (snapshot du
-- pipeline) — on garde la sémantique côté header KPI. La nouvelle
-- série proposed_created compte les "nouveaux" CV poussés créés
-- chaque mois — c'est la courbe historique.
-- =============================================================

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
  -- Snapshot du mois courant pour le header KPI (compat avec
  -- l'ancienne sémantique).
  proposed_snapshot AS (
    SELECT to_char(date_trunc('month', CURRENT_DATE), 'YYYY-MM') AS month_key,
           COUNT(*) AS cnt
    FROM missions
    WHERE organization_id = org_id
      AND status = 'proposed'
      AND COALESCE(archived, FALSE) = FALSE
  ),
  -- Historique mois par mois : nouveaux CV poussés créés chaque mois.
  -- Sert à la 3e courbe du graph (jaune).
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
