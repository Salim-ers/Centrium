-- =========================================================================
-- 096 — Centrium V2 : propriétaire d'organisation + RBAC personnalisable
-- -------------------------------------------------------------------------
-- 1. organization_members.is_owner : un seul propriétaire par organisation,
--    obligatoirement admin. Positionné automatiquement sur le premier admin,
--    modifiable uniquement via transfer_org_ownership().
-- 2. role_permission_defaults : matrice par défaut (générée depuis
--    src/lib/auth/permissions.ts — scripts/v2-permissions-sql.ts).
--    role_permissions : surcharges par organisation.
--    has_permission(perm) : décision côté base, réutilisée par la RLS.
-- 3. Rôle `direction` ajouté aux policies à liste de rôles explicite.
-- Additive et idempotente : aucune donnée supprimée.
-- =========================================================================

-- ── 1. Propriétaire ──────────────────────────────────────────────────────

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS is_owner boolean NOT NULL DEFAULT false;

-- Rattrapage : le premier admin (par date d'arrivée) devient propriétaire
-- des organisations qui n'en ont pas encore.
UPDATE public.organization_members m
   SET is_owner = true
  FROM (
    SELECT DISTINCT ON (organization_id) id
      FROM public.organization_members
     WHERE role = 'admin'
     ORDER BY organization_id, joined_at ASC, id ASC
  ) first_admin
 WHERE m.id = first_admin.id
   AND NOT EXISTS (
     SELECT 1 FROM public.organization_members o
      WHERE o.organization_id = m.organization_id AND o.is_owner
   );

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_members_single_owner
  ON public.organization_members (organization_id) WHERE is_owner;

ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS org_members_owner_is_admin;
ALTER TABLE public.organization_members
  ADD CONSTRAINT org_members_owner_is_admin CHECK (NOT is_owner OR role = 'admin');

-- Le drapeau ne se pose jamais à la main : premier admin d'une org sans
-- propriétaire → propriétaire automatique ; toute autre modification passe
-- par transfer_org_ownership() (ou le service_role côté serveur).
CREATE OR REPLACE FUNCTION public.guard_org_owner_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'admin' AND NOT EXISTS (
      SELECT 1 FROM public.organization_members
       WHERE organization_id = NEW.organization_id AND is_owner
    ) THEN
      NEW.is_owner := true;
      RETURN NEW;
    END IF;
  END IF;

  IF auth.uid() IS NULL OR current_setting('centrium.owner_transfer', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.is_owner THEN
    RAISE EXCEPTION 'is_owner ne peut pas être positionné directement' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.is_owner IS DISTINCT FROM OLD.is_owner THEN
    RAISE EXCEPTION 'Utilisez transfer_org_ownership() pour changer de propriétaire' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_org_owner_flag ON public.organization_members;
CREATE TRIGGER trg_guard_org_owner_flag
  BEFORE INSERT OR UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_org_owner_flag();

-- Le propriétaire ne peut pas quitter l'organisation sans transfert.
CREATE OR REPLACE FUNCTION public.guard_org_owner_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.is_owner AND auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.organizations WHERE id = OLD.organization_id) THEN
    RAISE EXCEPTION 'Transférez la propriété avant de retirer le propriétaire' USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_org_owner_delete ON public.organization_members;
CREATE TRIGGER trg_guard_org_owner_delete
  BEFORE DELETE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_org_owner_delete();

CREATE OR REPLACE FUNCTION public.transfer_org_ownership(p_org uuid, p_new_owner uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
     WHERE organization_id = p_org AND user_id = auth.uid() AND is_owner
  ) THEN
    RAISE EXCEPTION 'Seul le propriétaire peut transférer la propriété' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
     WHERE organization_id = p_org AND user_id = p_new_owner AND role NOT IN ('consultant', 'client')
  ) THEN
    RAISE EXCEPTION 'Le nouveau propriétaire doit être un membre interne' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('centrium.owner_transfer', 'on', true);
  UPDATE public.organization_members SET is_owner = false
   WHERE organization_id = p_org AND user_id = auth.uid();
  UPDATE public.organization_members SET role = 'admin', is_owner = true
   WHERE organization_id = p_org AND user_id = p_new_owner;
  UPDATE public.profiles SET role = 'admin'
   WHERE id = p_new_owner AND organization_id = p_org;
  PERFORM set_config('centrium.owner_transfer', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_org_ownership(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_org_ownership(uuid, uuid) TO authenticated;

-- ── 2. Permissions ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.role_permission_defaults (
  role       text NOT NULL,
  permission text NOT NULL,
  PRIMARY KEY (role, permission)
);
ALTER TABLE public.role_permission_defaults ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS role_permission_defaults_read ON public.role_permission_defaults;
CREATE POLICY role_permission_defaults_read ON public.role_permission_defaults
  FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('admin', 'direction', 'business_manager', 'recruiter', 'finance', 'viewer')),
  permission      text NOT NULL CHECK (permission ~ '^[a-z_]+\.[a-z_]+$'),
  allowed         boolean NOT NULL,
  updated_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, role, permission)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS role_permissions_read ON public.role_permissions;
CREATE POLICY role_permissions_read ON public.role_permissions
  FOR SELECT USING (
    organization_id = public.organization_id()
    AND public.user_role() NOT IN ('consultant'::user_role, 'client'::user_role)
  );
DROP POLICY IF EXISTS role_permissions_write ON public.role_permissions;
CREATE POLICY role_permissions_write ON public.role_permissions
  FOR ALL USING (public.role_in(organization_id) = 'admin'::user_role)
  WITH CHECK (public.role_in(organization_id) = 'admin'::user_role);

/** Rôle effectif de l'utilisateur courant dans son organisation active. */
CREATE OR REPLACE FUNCTION public.effective_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN m.role = 'admin' AND m.is_owner THEN 'owner'
    ELSE m.role::text
  END
  FROM public.profiles p
  JOIN public.organization_members m
    ON m.user_id = p.id AND m.organization_id = p.organization_id
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

/**
 * Décision de permission : matrice par défaut + surcharge d'organisation.
 * Une surcharge ne peut pas accorder une permission verrouillée
 * (org.delete, billing.manage, team.manage) ni toucher au propriétaire.
 */
CREATE OR REPLACE FUNCTION public.has_permission(p_permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := public.effective_role();
  v_base boolean;
  v_override boolean;
BEGIN
  IF v_role IS NULL THEN
    RETURN false;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.role_permission_defaults WHERE role = v_role AND permission = p_permission
  ) INTO v_base;
  IF v_role = 'owner' THEN
    RETURN v_base;
  END IF;
  SELECT allowed INTO v_override
    FROM public.role_permissions
   WHERE organization_id = public.organization_id() AND role = v_role AND permission = p_permission;
  IF v_override IS NULL THEN
    RETURN v_base;
  END IF;
  IF v_override AND p_permission IN ('org.delete', 'billing.manage', 'team.manage') THEN
    RETURN v_base;
  END IF;
  RETURN v_override;
END;
$$;

REVOKE ALL ON FUNCTION public.has_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;
REVOKE ALL ON FUNCTION public.effective_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_role() TO authenticated;

-- ── 3. Rôle direction dans les policies à liste explicite ────────────────

DROP POLICY IF EXISTS consultants_insert ON public.consultants;
CREATE POLICY consultants_insert ON public.consultants
  FOR INSERT WITH CHECK (
    organization_id = public.organization_id()
    AND public.user_role() = ANY (ARRAY['admin', 'direction', 'business_manager', 'recruiter']::user_role[])
  );

DROP POLICY IF EXISTS consultants_update ON public.consultants;
CREATE POLICY consultants_update ON public.consultants
  FOR UPDATE USING (
    organization_id = public.organization_id()
    AND public.user_role() = ANY (ARRAY['admin', 'direction', 'business_manager', 'recruiter']::user_role[])
  );

DROP POLICY IF EXISTS timesheets_write ON public.timesheets;
CREATE POLICY timesheets_write ON public.timesheets
  FOR ALL USING (
    organization_id = public.organization_id()
    AND public.user_role() = ANY (ARRAY['admin', 'direction', 'business_manager', 'finance']::user_role[])
  );

DROP POLICY IF EXISTS consultant_docs_insert ON storage.objects;
CREATE POLICY consultant_docs_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'consultant-documents'
    AND (storage.foldername(name))[1] = public.organization_id()::text
    AND public.user_role() = ANY (ARRAY['admin', 'direction', 'business_manager', 'recruiter']::user_role[])
  );

DROP POLICY IF EXISTS consultant_docs_delete ON storage.objects;
CREATE POLICY consultant_docs_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'consultant-documents'
    AND (storage.foldername(name))[1] = public.organization_id()::text
    AND public.user_role() = ANY (ARRAY['admin', 'direction', 'business_manager', 'recruiter']::user_role[])
  );

-- ── 4. Matrice par défaut (générée) ──────────────────────────────────────
-- Remplacée intégralement à chaque migration RBAC : DELETE puis INSERT.
DELETE FROM public.role_permission_defaults;
INSERT INTO public.role_permission_defaults (role, permission) VALUES
  ('owner', 'dashboard.view'),
  ('owner', 'crm.view'),
  ('owner', 'crm.edit'),
  ('owner', 'clients.view'),
  ('owner', 'clients.edit'),
  ('owner', 'opportunities.view'),
  ('owner', 'opportunities.edit'),
  ('owner', 'consultants.view'),
  ('owner', 'consultants.edit'),
  ('owner', 'consultants.financials'),
  ('owner', 'staffing.view'),
  ('owner', 'staffing.edit'),
  ('owner', 'missions.view'),
  ('owner', 'missions.edit'),
  ('owner', 'timesheets.view'),
  ('owner', 'timesheets.validate'),
  ('owner', 'documents.view'),
  ('owner', 'documents.edit'),
  ('owner', 'finance.view'),
  ('owner', 'finance.edit'),
  ('owner', 'portals.manage'),
  ('owner', 'automations.manage'),
  ('owner', 'analytics.view'),
  ('owner', 'settings.manage'),
  ('owner', 'team.manage'),
  ('owner', 'billing.manage'),
  ('owner', 'org.delete'),
  ('admin', 'dashboard.view'),
  ('admin', 'crm.view'),
  ('admin', 'crm.edit'),
  ('admin', 'clients.view'),
  ('admin', 'clients.edit'),
  ('admin', 'opportunities.view'),
  ('admin', 'opportunities.edit'),
  ('admin', 'consultants.view'),
  ('admin', 'consultants.edit'),
  ('admin', 'consultants.financials'),
  ('admin', 'staffing.view'),
  ('admin', 'staffing.edit'),
  ('admin', 'missions.view'),
  ('admin', 'missions.edit'),
  ('admin', 'timesheets.view'),
  ('admin', 'timesheets.validate'),
  ('admin', 'documents.view'),
  ('admin', 'documents.edit'),
  ('admin', 'finance.view'),
  ('admin', 'finance.edit'),
  ('admin', 'portals.manage'),
  ('admin', 'automations.manage'),
  ('admin', 'analytics.view'),
  ('admin', 'settings.manage'),
  ('admin', 'team.manage'),
  ('admin', 'billing.manage'),
  ('direction', 'dashboard.view'),
  ('direction', 'crm.view'),
  ('direction', 'clients.view'),
  ('direction', 'opportunities.view'),
  ('direction', 'consultants.view'),
  ('direction', 'staffing.view'),
  ('direction', 'missions.view'),
  ('direction', 'timesheets.view'),
  ('direction', 'documents.view'),
  ('direction', 'finance.view'),
  ('direction', 'analytics.view'),
  ('direction', 'crm.edit'),
  ('direction', 'clients.edit'),
  ('direction', 'opportunities.edit'),
  ('direction', 'consultants.edit'),
  ('direction', 'consultants.financials'),
  ('direction', 'staffing.edit'),
  ('direction', 'missions.edit'),
  ('direction', 'timesheets.validate'),
  ('direction', 'documents.edit'),
  ('direction', 'automations.manage'),
  ('business_manager', 'dashboard.view'),
  ('business_manager', 'crm.view'),
  ('business_manager', 'crm.edit'),
  ('business_manager', 'clients.view'),
  ('business_manager', 'clients.edit'),
  ('business_manager', 'opportunities.view'),
  ('business_manager', 'opportunities.edit'),
  ('business_manager', 'consultants.view'),
  ('business_manager', 'consultants.edit'),
  ('business_manager', 'consultants.financials'),
  ('business_manager', 'staffing.view'),
  ('business_manager', 'staffing.edit'),
  ('business_manager', 'missions.view'),
  ('business_manager', 'missions.edit'),
  ('business_manager', 'timesheets.view'),
  ('business_manager', 'timesheets.validate'),
  ('business_manager', 'documents.view'),
  ('business_manager', 'documents.edit'),
  ('business_manager', 'finance.view'),
  ('business_manager', 'portals.manage'),
  ('business_manager', 'analytics.view'),
  ('recruiter', 'dashboard.view'),
  ('recruiter', 'crm.view'),
  ('recruiter', 'clients.view'),
  ('recruiter', 'opportunities.view'),
  ('recruiter', 'consultants.view'),
  ('recruiter', 'consultants.edit'),
  ('recruiter', 'staffing.view'),
  ('recruiter', 'staffing.edit'),
  ('recruiter', 'missions.view'),
  ('recruiter', 'timesheets.view'),
  ('recruiter', 'documents.view'),
  ('recruiter', 'documents.edit'),
  ('finance', 'dashboard.view'),
  ('finance', 'clients.view'),
  ('finance', 'opportunities.view'),
  ('finance', 'consultants.view'),
  ('finance', 'consultants.financials'),
  ('finance', 'missions.view'),
  ('finance', 'timesheets.view'),
  ('finance', 'documents.view'),
  ('finance', 'documents.edit'),
  ('finance', 'finance.view'),
  ('finance', 'finance.edit'),
  ('finance', 'analytics.view'),
  ('viewer', 'dashboard.view'),
  ('viewer', 'crm.view'),
  ('viewer', 'clients.view'),
  ('viewer', 'opportunities.view'),
  ('viewer', 'consultants.view'),
  ('viewer', 'staffing.view'),
  ('viewer', 'missions.view'),
  ('viewer', 'timesheets.view'),
  ('viewer', 'documents.view'),
  ('viewer', 'analytics.view')
ON CONFLICT DO NOTHING;
