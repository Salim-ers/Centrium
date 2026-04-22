-- =========================================================================
-- 014 — Multi-tenancy : organization_members (N:N user ↔ organization)
-- =========================================================================
-- Approche pragmatique :
--   • organization_members = source de vérité des droits (qui est dans quelle org).
--   • profiles.organization_id reste l'"org active" du user (pour le routing).
--   • Les policies RLS existantes (public.organization_id()) continuent à
--     marcher : elles filtrent sur l'org active. L'important c'est d'empêcher
--     un user de switch active_org vers une org dont il n'est pas membre.
--   • Helpers public.is_member_of() et public.role_in() pour les futures policies
--     qui voudront checker directement.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) Table organization_members
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS organization_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            user_role NOT NULL DEFAULT 'viewer',
  invited_by      UUID REFERENCES auth.users(id),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org  ON organization_members(organization_id);

-- -------------------------------------------------------------------------
-- 2) Migration des données existantes
--    Chaque profile avec organization_id devient un membre.
-- -------------------------------------------------------------------------

INSERT INTO organization_members (organization_id, user_id, role, joined_at)
SELECT p.organization_id, p.id, p.role, p.created_at
FROM profiles p
WHERE p.organization_id IS NOT NULL
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- -------------------------------------------------------------------------
-- 3) Helpers auth.* pour les policies
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_member_of(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND organization_id = org_id
  );
$$;

CREATE OR REPLACE FUNCTION public.role_in(org_id UUID)
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.organization_members
  WHERE user_id = auth.uid() AND organization_id = org_id
  LIMIT 1;
$$;

-- Idempotent : si profile.organization_id n'est plus fiable, on peut aussi
-- override public.organization_id() pour renvoyer la première membership.
-- On garde la version existante (basée sur profiles.organization_id) pour
-- ne pas casser les policies. Le trigger ci-dessous empêche la triche.

-- -------------------------------------------------------------------------
-- 4) Garde-fou : empêche de set profiles.organization_id vers une org
--    dont le user n'est pas membre.
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_profile_active_org_is_member()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- On laisse passer la mise à NULL (sign-out / onboarding pending).
  IF NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Pas de check si rien n'a changé (évite le coût sur chaque UPDATE).
  IF TG_OP = 'UPDATE' AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = NEW.id AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION
      'profiles.organization_id: user % is not a member of organization %',
      NEW.id, NEW.organization_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_active_org_is_member ON profiles;
CREATE TRIGGER enforce_profile_active_org_is_member
  BEFORE INSERT OR UPDATE OF organization_id ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_active_org_is_member();

-- -------------------------------------------------------------------------
-- 5) RLS sur organization_members
-- -------------------------------------------------------------------------

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Un user voit ses propres memberships, et un admin voit celles de son org.
DROP POLICY IF EXISTS members_select ON organization_members;
CREATE POLICY members_select ON organization_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.role_in(organization_id) = 'admin'
  );

-- Seul un admin d'une org peut ajouter un membre à cette org.
DROP POLICY IF EXISTS members_insert ON organization_members;
CREATE POLICY members_insert ON organization_members FOR INSERT
  WITH CHECK (public.role_in(organization_id) = 'admin');

-- Seul un admin peut changer le rôle d'un membre.
DROP POLICY IF EXISTS members_update ON organization_members;
CREATE POLICY members_update ON organization_members FOR UPDATE
  USING (public.role_in(organization_id) = 'admin');

-- Un admin peut retirer un autre membre (mais pas lui-même — évite l'auto-lock).
DROP POLICY IF EXISTS members_delete ON organization_members;
CREATE POLICY members_delete ON organization_members FOR DELETE
  USING (
    public.role_in(organization_id) = 'admin'
    AND user_id <> auth.uid()
  );

-- -------------------------------------------------------------------------
-- 6) Vue pratique pour le front : "mes organisations"
-- -------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.my_organizations AS
SELECT
  m.organization_id AS id,
  o.name,
  o.slug,
  o.logo_url,
  m.role,
  m.joined_at
FROM organization_members m
JOIN organizations o ON o.id = m.organization_id
WHERE m.user_id = auth.uid()
ORDER BY m.joined_at ASC;

GRANT SELECT ON public.my_organizations TO authenticated;

COMMENT ON TABLE organization_members IS
  'Source de vérité des memberships user↔org. profiles.organization_id = org active (UI), cette table = droits réels.';
COMMENT ON VIEW my_organizations IS
  'Liste des organisations dont le user connecté est membre.';
