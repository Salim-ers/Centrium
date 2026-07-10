-- =========================================================================
-- 085 — compute_org_alerts v2 : cycle de vie + alertes du moteur
-- -------------------------------------------------------------------------
-- Évolutions vs 029/039 :
--   · Nouvelles colonnes de sortie : status, source, assignee_id, read_at,
--     snoozed_until, reminder_count, next_reminder_at, consultant_id.
--     Les alertes CALCULÉES (live) renvoient status='new' / source='computed'
--     — elles n'ont pas de cycle de vie persistant (le dismiss suffit).
--   · Le bloc "manual" devient le bloc "matérialisées" : il expose les
--     alertes créées par le moteur cron (source='engine') ET les manuelles,
--     avec statuts new / in_progress / snoozed. Une alerte snoozed dont
--     l'échéance de report est passée est présentée comme 'new' (le moteur
--     la réveillera de façon persistante à son prochain run).
--   · Les résolues / ignorées / expirées ne sortent pas ici (l'UI les
--     charge à part pour l'historique).
-- Changement de type de retour ⇒ DROP + CREATE (idempotent).
-- =========================================================================

DROP FUNCTION IF EXISTS public.compute_org_alerts(uuid);

CREATE OR REPLACE FUNCTION public.compute_org_alerts(org_id uuid)
RETURNS TABLE(
  id text,
  kind text,
  priority text,
  title text,
  description text,
  due_date date,
  link text,
  entity_kind text,
  entity_id uuid,
  created_at timestamptz,
  status text,
  source text,
  assignee_id uuid,
  read_at timestamptz,
  snoozed_until timestamptz,
  reminder_count integer,
  next_reminder_at timestamptz,
  consultant_id uuid
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH all_alerts AS (
    -- ── Factures client en retard ─────────────────────────────────────
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
      i.created_at,
      'new' AS status, 'computed' AS source,
      NULL::uuid AS assignee_id, NULL::timestamptz AS read_at,
      NULL::timestamptz AS snoozed_until, 0 AS reminder_count,
      NULL::timestamptz AS next_reminder_at, i.consultant_id
    FROM invoices i
    WHERE i.organization_id = org_id
      AND i.party = 'client'
      AND (i.status = 'overdue' OR (i.status = 'sent' AND i.due_date < CURRENT_DATE))

    UNION ALL

    -- ── Factures client à encaisser bientôt ───────────────────────────
    SELECT
      'invoice-soon:' || i.id::TEXT, 'invoice_overdue', 'high',
      'Facture ' || i.invoice_number || ' à encaisser bientôt',
      'Échéance le ' || to_char(i.due_date, 'DD/MM/YYYY') ||
        ' (' || (i.due_date - CURRENT_DATE) || ' j) · ' ||
        to_char(i.amount_ttc, 'FM999G999G999D00') || ' € TTC',
      i.due_date, '/invoices/' || i.id::TEXT, 'invoice', i.id, i.created_at,
      'new', 'computed', NULL::uuid, NULL::timestamptz, NULL::timestamptz, 0,
      NULL::timestamptz, i.consultant_id
    FROM invoices i
    WHERE i.organization_id = org_id
      AND i.party = 'client' AND i.status = 'sent'
      AND i.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'

    UNION ALL

    -- ── Factures fournisseur (consultant) à régler ────────────────────
    SELECT
      'invoice-pay:' || i.id::TEXT, 'invoice_overdue',
      CASE WHEN i.due_date < CURRENT_DATE THEN 'high' ELSE 'medium' END,
      'Facture consultant ' || i.invoice_number || ' à régler',
      'Échéance le ' || to_char(i.due_date, 'DD/MM/YYYY') ||
        ' · ' || to_char(i.amount_ttc, 'FM999G999G999D00') || ' € TTC à payer au prestataire',
      i.due_date, '/invoices/' || i.id::TEXT, 'invoice', i.id, i.created_at,
      'new', 'computed', NULL::uuid, NULL::timestamptz, NULL::timestamptz, 0,
      NULL::timestamptz, i.consultant_id
    FROM invoices i
    WHERE i.organization_id = org_id
      AND i.party = 'consultant'
      AND (i.status = 'overdue' OR (i.status = 'sent' AND i.due_date <= CURRENT_DATE + INTERVAL '7 days'))

    UNION ALL

    -- ── CRA soumis en attente de validation ───────────────────────────
    SELECT
      'ts-submitted:' || t.id::TEXT, 'timesheet_pending',
      CASE
        WHEN t.submitted_at IS NOT NULL AND t.submitted_at < NOW() - INTERVAL '14 days' THEN 'high'
        ELSE 'medium'
      END,
      'CRA ' || month_label_fr(t.period_year, t.period_month) || ' à valider',
      CASE
        WHEN t.submitted_at IS NOT NULL THEN
          'Soumis le ' || to_char(t.submitted_at, 'DD/MM/YYYY') || ' — en attente de validation'
        ELSE 'En attente de validation client'
      END,
      NULL::DATE, '/timesheets/' || t.id::TEXT, 'timesheet', t.id, t.created_at,
      'new', 'computed', NULL::uuid, NULL::timestamptz, NULL::timestamptz, 0,
      NULL::timestamptz, t.consultant_id
    FROM timesheets t
    WHERE t.organization_id = org_id AND t.status = 'submitted'

    UNION ALL

    -- ── CRA non soumis, période close ──────────────────────────────────
    SELECT
      'ts-draft:' || t.id::TEXT, 'timesheet_pending', 'medium',
      'CRA ' || month_label_fr(t.period_year, t.period_month) || ' non soumis',
      'Période close — à finaliser et soumettre au client',
      NULL, '/timesheets/' || t.id::TEXT, 'timesheet', t.id, t.created_at,
      'new', 'computed', NULL::uuid, NULL::timestamptz, NULL::timestamptz, 0,
      NULL::timestamptz, t.consultant_id
    FROM timesheets t
    WHERE t.organization_id = org_id
      AND t.status = 'draft'
      AND make_date(t.period_year, t.period_month, 1) < date_trunc('month', CURRENT_DATE)::DATE

    UNION ALL

    -- ── Missions se terminant sous 30 jours ────────────────────────────
    SELECT
      'mission-end:' || m.id::TEXT, 'mission_ending',
      CASE WHEN m.end_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'high' ELSE 'medium' END,
      'Mission ' || COALESCE(m.title, 'sans titre') || ' se termine bientôt',
      'Fin prévue le ' || to_char(m.end_date, 'DD/MM/YYYY') ||
        ' (dans ' || (m.end_date - CURRENT_DATE) || ' j) — préparer le relais',
      m.end_date, '/missions/' || m.id::TEXT, 'mission', m.id, m.created_at,
      'new', 'computed', NULL::uuid, NULL::timestamptz, NULL::timestamptz, 0,
      NULL::timestamptz, m.consultant_id
    FROM missions m
    WHERE m.organization_id = org_id
      AND m.status = 'active' AND m.end_date IS NOT NULL
      AND m.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'

    UNION ALL

    -- ── Consultants disponibles sans mission ni piste ───────────────────
    SELECT
      'consultant-bench:' || c.id::TEXT, 'consultant_available', 'low',
      c.first_name || ' ' || c.last_name || ' disponible',
      'Profil disponible — à positionner sur une mission ou opportunité',
      NULL, '/consultants/' || c.id::TEXT, 'consultant', c.id, c.created_at,
      'new', 'computed', NULL::uuid, NULL::timestamptz, NULL::timestamptz, 0,
      NULL::timestamptz, c.id
    FROM consultants c
    WHERE c.organization_id = org_id
      AND c.archived = FALSE AND c.is_prospect = FALSE AND c.status = 'available'
      AND NOT EXISTS (
        SELECT 1 FROM missions m
        WHERE m.consultant_id = c.id AND m.status IN ('proposed', 'active')
      )

    UNION ALL

    -- ── Alertes MATÉRIALISÉES (moteur cron + manuelles) ────────────────
    -- Actives = new / in_progress / snoozed. Une snooze échue est
    -- présentée 'new' (réveil persistant au prochain run du moteur).
    SELECT
      a.id::TEXT,
      a.kind::TEXT,
      a.priority::TEXT,
      a.title,
      a.description,
      a.due_date,
      a.link,
      a.entity_kind,
      a.entity_id,
      a.created_at,
      CASE
        WHEN a.status = 'snoozed' AND (a.snoozed_until IS NULL OR a.snoozed_until <= NOW())
          THEN 'new'
        ELSE a.status::TEXT
      END,
      a.source,
      a.assignee_id,
      a.read_at,
      a.snoozed_until,
      a.reminder_count,
      a.next_reminder_at,
      a.consultant_id
    FROM alerts a
    WHERE a.organization_id = org_id
      AND (
        a.status IN ('new', 'in_progress')
        OR (a.status = 'snoozed')
      )
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
$function$;

-- Compteur léger pour le badge de navigation (cloche) : total + par
-- priorité, sans rapatrier toutes les lignes côté client.
CREATE OR REPLACE FUNCTION public.count_org_alerts(org_id uuid)
RETURNS TABLE(priority text, total bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT a.priority, count(*)
  FROM compute_org_alerts(org_id) a
  WHERE a.status IN ('new', 'in_progress')
  GROUP BY a.priority;
$$;

-- Les RPC restent invocables par les membres authentifiés uniquement
-- (défense en profondeur : la fonction filtre déjà par org_id, et RLS
-- s'applique aux tables sous-jacentes en SECURITY INVOKER).
REVOKE EXECUTE ON FUNCTION public.compute_org_alerts(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.count_org_alerts(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.compute_org_alerts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_org_alerts(uuid) TO authenticated;
