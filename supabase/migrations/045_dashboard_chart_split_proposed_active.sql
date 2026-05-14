-- =============================================================
-- 045_dashboard_chart_split_proposed_active.sql
--
-- Le compteur "Missions" du graph dashboard incluait toutes les
-- missions (proposed + active + ended) qui chevauchaient le mois.
-- Conséquence : pousser un CV faisait grimper "Missions en cours"
-- alors qu'il s'agit d'une proposition en attente, pas d'une mission
-- réellement en cours.
--
-- On split en deux séries claires :
--   - missions_active   : missions validées (status='active')
--   - missions_proposed : CV poussés en attente (status='proposed')
--
-- Les missions terminées / refusées sont exclues : elles ne sont
-- ni "en cours" ni "en attente".
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
  proposed_per_month AS (
    -- Les propositions ne sont pas datées sur une période ; on les
    -- compte sur le mois courant uniquement (= snapshot du pipeline).
    SELECT to_char(date_trunc('month', CURRENT_DATE), 'YYYY-MM') AS month_key,
           COUNT(*) AS cnt
    FROM missions
    WHERE organization_id = org_id
      AND status = 'proposed'
      AND COALESCE(archived, FALSE) = FALSE
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'month', m.month_key,
      'ca', COALESCE(c.ca, 0),
      'missions', COALESCE(a.cnt, 0),
      'missions_active', COALESCE(a.cnt, 0),
      'missions_proposed', COALESCE(p.cnt, 0)
    ) ORDER BY m.month_key
  )
  INTO result
  FROM months m
  LEFT JOIN ca_per_month c ON c.month_key = m.month_key
  LEFT JOIN active_per_month a ON a.month_key = m.month_key
  LEFT JOIN proposed_per_month p ON p.month_key = m.month_key;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_revenue_chart(UUID, INT) TO authenticated;

COMMENT ON FUNCTION public.dashboard_revenue_chart(UUID, INT) IS
  'Graph CA + missions/mois. `missions_active` = status=active (en cours). `missions_proposed` = CV poussés en attente, snapshot du mois courant uniquement. La clé `missions` (legacy) reflète missions_active pour compat.';
