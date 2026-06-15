-- =========================================================================
-- 064 — SECURITY DEFINER hardening : SET search_path sur toutes les fonctions
-- =========================================================================
-- Contexte : audit sécurité du 15/06/2026 a identifié que les fonctions
-- SECURITY DEFINER critiques (organization_id, user_role, is_member_of, role_in)
-- — utilisées dans CHAQUE policy RLS — n'avaient pas de SET search_path explicite.
--
-- Vulnérabilité théorique : un attaquant qui parviendrait à créer un objet
-- malveillant dans un schéma intermédiaire (via search_path injection) pourrait
-- détourner les requêtes internes de la fonction, qui s'exécutent avec les
-- privilèges du créateur (postgres). Mitigé en pratique par Supabase qui
-- restreint l'accès aux schémas, mais c'est un finding HIGH garanti en pentest.
--
-- Référence : CVE pattern PostgreSQL "Function Search Path Hijack"
-- https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY
--
-- Cette migration applique ALTER FUNCTION ... SET search_path = public, pg_temp
-- à toutes les fonctions SECURITY DEFINER identifiées par l'audit (20 fonctions
-- dédupliquées sur 29 définitions — certaines fonctions ont été redéfinies
-- plusieurs fois via CREATE OR REPLACE).
--
-- search_path = public, pg_temp :
--   - public : seul schéma de l'application (jamais sys/pg_*)
--   - pg_temp : ALWAYS-LAST, pour les tables temporaires locales à la session
--   - Pas de "$user" : on ne dépend pas du rôle qui appelle
--
-- Idempotent : peut être réexécuté sans effet de bord.
-- =========================================================================

-- -------------------------------------------------------------------------
-- CRITICAL — fonctions utilisées dans les policies RLS (priorité absolue)
-- -------------------------------------------------------------------------

ALTER FUNCTION public.organization_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.user_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_member_of(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.role_in(UUID) SET search_path = public, pg_temp;

-- -------------------------------------------------------------------------
-- HIGH — triggers d'isolation et de validation métier
-- -------------------------------------------------------------------------

ALTER FUNCTION public.consultant_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_timesheet_transition() SET search_path = public, pg_temp;
ALTER FUNCTION public.prevent_consultant_tampering() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_invoice_requires_validated_cra() SET search_path = public, pg_temp;
ALTER FUNCTION public.enforce_profile_active_org_is_member() SET search_path = public, pg_temp;
ALTER FUNCTION public.auto_invoice_from_validated_cra() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_consultant_status_from_missions() SET search_path = public, pg_temp;

-- -------------------------------------------------------------------------
-- MEDIUM — helpers utilitaires et RPC dashboard / billing
-- -------------------------------------------------------------------------

ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_default_subscription() SET search_path = public, pg_temp;
ALTER FUNCTION public.consultants_count(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_billing_exempt(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.dashboard_kpis(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.dashboard_revenue_chart(UUID, INT) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_default_security_settings() SET search_path = public, pg_temp;
ALTER FUNCTION public.purge_archives_older_than_30_days() SET search_path = public, pg_temp;

-- -------------------------------------------------------------------------
-- LOW — fonctions de calcul read-only
-- -------------------------------------------------------------------------

ALTER FUNCTION public.compute_org_alerts(UUID) SET search_path = public, pg_temp;

-- =========================================================================
-- Vérification post-migration (informationnel, ne plante pas le déploiement)
-- =========================================================================
--
-- Pour valider après migration :
--
--   SELECT proname, prosrc, proconfig
--   FROM pg_proc
--   WHERE pronamespace = 'public'::regnamespace
--     AND prosecdef = TRUE
--     AND (proconfig IS NULL
--          OR NOT 'search_path=public, pg_temp' = ANY(proconfig));
--
-- Cette requête doit retourner ZÉRO ligne. Si elle retourne des fonctions,
-- elles doivent être altérées avec ALTER FUNCTION ... SET search_path = ...
-- =========================================================================

COMMENT ON FUNCTION public.organization_id() IS
  'Renvoie l''organization_id du user courant. Hardened : search_path=public,pg_temp (064).';

COMMENT ON FUNCTION public.user_role() IS
  'Renvoie le rôle du user courant. Hardened : search_path=public,pg_temp (064).';

COMMENT ON FUNCTION public.is_member_of(UUID) IS
  'Vérifie si le user courant est membre d''une org. Hardened : search_path=public,pg_temp (064).';

COMMENT ON FUNCTION public.role_in(UUID) IS
  'Renvoie le rôle du user dans une org spécifique. Hardened : search_path=public,pg_temp (064).';
