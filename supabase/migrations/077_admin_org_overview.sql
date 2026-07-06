-- =============================================================================
-- 077_admin_org_overview.sql — RPC de supervision multi-tenant (super console)
-- -----------------------------------------------------------------------------
-- Renvoie TOUTES les organisations (nouvelles, anciennes, actives ou non) avec
-- leurs stats agrégées en UNE seule requête : plan + statut d'abonnement,
-- nombres de membres / consultants / missions / factures, et signaux
-- d'activité (dernière action, volume 7 j). Alimente /admin/organizations.
--
-- SECURITY DEFINER + verrou d'accès : la fonction est appelée par la super
-- console via le client service_role (createAdminClient). On révoque l'accès
-- public/authenticated pour qu'un utilisateur normal ne puisse jamais
-- l'invoquer directement (défense en profondeur, en plus du gate
-- getSuperAdminContext côté route).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_org_overview()
RETURNS TABLE (
  id                   UUID,
  name                 TEXT,
  slug                 TEXT,
  logo_url             TEXT,
  created_at           TIMESTAMPTZ,
  plan_id              TEXT,
  plan_name            TEXT,
  sub_status           TEXT,
  trial_end            TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  is_exempt            BOOLEAN,
  members_count        INT,
  consultants_count    INT,
  active_missions      INT,
  invoices_count       INT,
  last_activity_at     TIMESTAMPTZ,
  activity_7d          INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.name,
    o.slug,
    o.logo_url,
    o.created_at,
    s.plan_id,
    p.name AS plan_name,
    s.status AS sub_status,
    s.trial_end,
    s.current_period_end,
    COALESCE(s.cancel_at_period_end, FALSE) AS cancel_at_period_end,
    COALESCE(s.is_exempt_from_billing, FALSE) AS is_exempt,
    (SELECT COUNT(*)::INT FROM organization_members m
       WHERE m.organization_id = o.id AND m.role <> 'consultant'),
    (SELECT COUNT(*)::INT FROM consultants c
       WHERE c.organization_id = o.id AND c.archived = FALSE),
    (SELECT COUNT(*)::INT FROM missions mi
       WHERE mi.organization_id = o.id AND mi.status = 'active'),
    (SELECT COUNT(*)::INT FROM invoices iv
       WHERE iv.organization_id = o.id),
    (SELECT MAX(a.created_at) FROM activities a
       WHERE a.organization_id = o.id),
    (SELECT COUNT(*)::INT FROM activities a
       WHERE a.organization_id = o.id AND a.created_at > now() - INTERVAL '7 days')
  FROM organizations o
  LEFT JOIN subscriptions s ON s.organization_id = o.id
  LEFT JOIN plans p ON p.id = s.plan_id
  ORDER BY o.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_org_overview() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_org_overview() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_org_overview() TO service_role;

COMMENT ON FUNCTION public.admin_org_overview() IS
  'Supervision super-admin : toutes les orgs + stats agrégées (abonnement, effectifs, activité). service_role uniquement (077).';
