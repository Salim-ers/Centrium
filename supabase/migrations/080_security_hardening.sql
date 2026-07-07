-- =========================================================================
-- 080 — Durcissement sécurité (suite à l'audit)
-- =========================================================================
-- 1) REVOKE EXECUTE (anon/authenticated/public) sur les fonctions SECURITY
--    DEFINER qui n'ont RIEN à faire sur l'API PostgREST publique :
--      - enforce_plan_limit : injection SQL (p_where concaténé brut) qui
--        contournait la RLS, appelable avec la clé anon. [CRITIQUE]
--      - purge_archives_older_than_30_days : purge destructive NON scopée par
--        org, appelable par tout compte authentifié. [ÉLEVÉ]
--      - toutes les fonctions trigger / event_trigger (jamais des RPC).
--    NB Supabase : `REVOKE ... FROM PUBLIC` ne suffit PAS — anon/authenticated
--    reçoivent un GRANT explicite via les default privileges. On révoque
--    NOMMÉMENT de anon + authenticated + public.
--    On NE TOUCHE PAS aux helpers RLS (is_member_of, organization_id, role_in,
--    user_role, is_billing_exempt, consultant_id, consultants_count) — ils
--    sont évalués dans les policies avec le rôle appelant, ni aux RPC
--    légitimes du client (dashboard_kpis, dashboard_revenue_chart).
-- 2) SET search_path sur toutes les fonctions SECURITY DEFINER qui en
--    manquent (anti search-path hijack).
-- 3) Vue _archives_to_purge en security_invoker (respecte la RLS de l'appelant).
-- 4) Bucket quote-attachments : limite taille + types image, et fin du
--    listing public anonyme (énumération de tous les fichiers).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) REVOKE sur les fonctions non-RPC
-- -------------------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND (
        pg_get_function_result(p.oid) IN ('trigger', 'event_trigger')
        OR p.proname IN ('enforce_plan_limit', 'purge_archives_older_than_30_days')
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated, public', r.sig);
  END LOOP;
END $$;

-- La purge reste exécutable UNIQUEMENT par le service_role (cron serveur).
GRANT EXECUTE ON FUNCTION public.purge_archives_older_than_30_days() TO service_role;

-- -------------------------------------------------------------------------
-- 2) search_path explicite sur TOUTES les fonctions publiques qui en manquent
--    (anti search-path hijack ; couvre definer ET utilitaires trigger).
-- -------------------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND NOT (
        p.proconfig IS NOT NULL
        AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%')
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
  END LOOP;
END $$;

-- -------------------------------------------------------------------------
-- 3) Vue de purge en security_invoker (n'expose pas de lignes cross-org
--    à un éventuel appelant authenticated).
-- -------------------------------------------------------------------------
ALTER VIEW public._archives_to_purge SET (security_invoker = true);

-- -------------------------------------------------------------------------
-- 4) Bucket quote-attachments : contraintes upload + fin de l'énumération
-- -------------------------------------------------------------------------
UPDATE storage.buckets
SET file_size_limit = 5242880, -- 5 Mo
    allowed_mime_types = ARRAY[
      'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif'
    ]
WHERE id = 'quote-attachments';

-- L'ancienne policy autorisait anon à LISTER/énumérer tout le bucket.
-- Le bucket reste public (les logos s'affichent via URL publique, sans
-- policy SELECT), mais on retire la capacité d'énumération anonyme.
DROP POLICY IF EXISTS "quote-attachments public read" ON storage.objects;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'quote-attachments admin read'
  ) THEN
    CREATE POLICY "quote-attachments admin read"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'quote-attachments'
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Idem pour organization-assets : la policy SELECT était ouverte à `public`
-- (anon pouvait ÉNUMÉRER les assets de toutes les orgs). Le bucket reste
-- public (les logos s'affichent via URL publique, sans policy), on scope
-- juste le listing au membre de l'org.
DROP POLICY IF EXISTS "org_assets_select_public" ON storage.objects;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'org_assets_select_member'
  ) THEN
    CREATE POLICY "org_assets_select_member"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'organization-assets'
        AND (storage.foldername(name))[1] = organization_id()::text
      );
  END IF;
END $$;
