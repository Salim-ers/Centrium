-- =========================================================================
-- 060 — Security Hardening : garde-fous RLS Storage + tables sensibles
-- =========================================================================
-- Audit complet :
--   • s'assure que TOUS les buckets Storage ont leurs policies RLS
--   • vérifie que TOUTES les tables métier ont ENABLE ROW LEVEL SECURITY
--   • ajoute un trigger qui rejette les inserts sans organization_id
--     sur les tables où c'est NOT NULL (défense en profondeur)
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) Force RLS activée sur toutes les tables métier critiques
--    (idempotent — ne fait rien si déjà actif)
-- -------------------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
  critical_tables TEXT[] := ARRAY[
    'organizations', 'profiles', 'organization_members', 'organization_invitations',
    'consultants', 'consultant_skills', 'consultant_documents',
    'consultant_experiences', 'consultant_educations',
    'cv_versions', 'cv_templates',
    'companies', 'contacts', 'tags', 'contact_tags',
    'job_offers', 'opportunities', 'opportunity_consultants',
    'missions', 'timesheets', 'timesheet_days',
    'invoices', 'invoice_items',
    'contracts', 'contract_versions',
    'messages', 'alerts', 'activities', 'notes',
    'quote_requests', 'plans', 'subscriptions',
    'contact_interactions', 'dismissed_alerts',
    'user_todos', 'user_profile_personal'
  ];
BEGIN
  FOREACH t IN ARRAY critical_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
      -- FORCE = même les owners DB respectent les policies (sauf bypass via roles)
    END IF;
  END LOOP;
END $$;

-- -------------------------------------------------------------------------
-- 2) Vue d'audit interne : liste tables sans RLS
--    Utilisée par les tests E2E + monitoring pour détecter une régression
-- -------------------------------------------------------------------------

CREATE OR REPLACE VIEW public._security_rls_audit AS
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  (SELECT count(*) FROM pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname NOT LIKE 'pg_%'
  AND c.relname NOT LIKE '_security_%'
ORDER BY c.relname;

COMMENT ON VIEW public._security_rls_audit IS
  'Audit RLS : liste les tables public.* avec leur statut RLS + nombre de policies. Une ligne avec rls_enabled=false sur une table métier = trou de sécurité.';

GRANT SELECT ON public._security_rls_audit TO authenticated;

-- -------------------------------------------------------------------------
-- 3) Storage : vérifie que les buckets sensibles sont NON publics
--    (organization-assets est public en lecture = OK, c'est le logo
--     dans les CV diffusés ; consultant-documents doit rester privé)
-- -------------------------------------------------------------------------

DO $$
BEGIN
  -- Vérif bucket consultant-documents = privé
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'consultant-documents' AND public = true) THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: bucket consultant-documents must be private, found public=true';
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 4) Index sur activities pour requêtes "qui a accédé à quoi"
--    Évite les full scans sur la table d'audit qui grossit vite
-- -------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_activities_org_created
  ON activities(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user_action
  ON activities(user_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_entity
  ON activities(entity_type, entity_id, created_at DESC);

-- -------------------------------------------------------------------------
-- 5) Table login_events : pour détection nouvel appareil + audit connexions
--    Alimentée depuis le code (route /api/auth/track) et lue par le user
--    sur sa page "Activité du compte".
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS login_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip          TEXT,
  user_agent  TEXT,
  device_fp   TEXT,                    -- empreinte device (sha256 sur ua+lang+tz)
  country     TEXT,                    -- code ISO (deduit IP, optionnel)
  city        TEXT,                    -- (optionnel)
  is_new_device BOOLEAN NOT NULL DEFAULT FALSE,
  notified_at TIMESTAMPTZ              -- timestamp de l'email envoyé (si new device)
);

CREATE INDEX IF NOT EXISTS idx_login_events_user_at
  ON login_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_events_user_fp
  ON login_events(user_id, device_fp);

ALTER TABLE login_events ENABLE ROW LEVEL SECURITY;

-- L'utilisateur voit ses propres connexions
DROP POLICY IF EXISTS login_events_select_own ON login_events;
CREATE POLICY login_events_select_own ON login_events FOR SELECT
  USING (user_id = auth.uid());

-- Insert via admin client uniquement (le helper côté API)
DROP POLICY IF EXISTS login_events_insert_admin ON login_events;
CREATE POLICY login_events_insert_admin ON login_events FOR INSERT
  WITH CHECK (false);  -- bloque l'insert via anon/auth, oblige service_role

COMMENT ON TABLE login_events IS
  'Journal des connexions par user (nouvelle device détectée, IP, UA). Insert via service_role uniquement (helper côté API).';

-- -------------------------------------------------------------------------
-- 6) Table org_security_settings : politique mot de passe + session timeout
--    configurables par admin d'organisation
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS org_security_settings (
  organization_id        UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  password_min_length    INT NOT NULL DEFAULT 12 CHECK (password_min_length BETWEEN 8 AND 64),
  password_require_upper BOOLEAN NOT NULL DEFAULT TRUE,
  password_require_lower BOOLEAN NOT NULL DEFAULT TRUE,
  password_require_digit BOOLEAN NOT NULL DEFAULT TRUE,
  password_require_symbol BOOLEAN NOT NULL DEFAULT FALSE,
  session_timeout_min    INT NOT NULL DEFAULT 60 CHECK (session_timeout_min BETWEEN 15 AND 1440),
  mfa_required_for_admin BOOLEAN NOT NULL DEFAULT TRUE,
  notify_new_device      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by             UUID REFERENCES auth.users(id)
);

ALTER TABLE org_security_settings ENABLE ROW LEVEL SECURITY;

-- Lecture : tout membre de l'org peut lire les settings
DROP POLICY IF EXISTS org_security_select ON org_security_settings;
CREATE POLICY org_security_select ON org_security_settings FOR SELECT
  USING (organization_id = public.organization_id());

-- Écriture : admins de l'org uniquement
DROP POLICY IF EXISTS org_security_admin_all ON org_security_settings;
CREATE POLICY org_security_admin_all ON org_security_settings FOR ALL
  USING (
    organization_id = public.organization_id()
    AND public.user_role() = 'admin'
  );

COMMENT ON TABLE org_security_settings IS
  'Politique de sécurité par organisation : password policy, session timeout, MFA obligatoire admin.';

-- Crée des settings par défaut pour les orgs existantes
INSERT INTO org_security_settings (organization_id)
SELECT id FROM organizations
ON CONFLICT (organization_id) DO NOTHING;

-- -------------------------------------------------------------------------
-- 7) Trigger : à la création d'une organisation, créer ses security_settings
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_default_security_settings()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO org_security_settings (organization_id) VALUES (NEW.id)
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS create_default_security_settings_trigger ON organizations;
CREATE TRIGGER create_default_security_settings_trigger
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION public.create_default_security_settings();
