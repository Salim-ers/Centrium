-- =========================================================================
-- 015 — Système d'invitations à rejoindre une organisation
-- =========================================================================

CREATE TABLE IF NOT EXISTS organization_invitations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'viewer',
  token           TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by      UUID NOT NULL REFERENCES auth.users(id),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at     TIMESTAMPTZ,
  accepted_by     UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, email, accepted_at)  -- autorise plusieurs invites pour la même adresse si pas encore acceptées
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON organization_invitations(lower(email));

ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Les admins de l'org voient/gèrent les invitations de leur org
DROP POLICY IF EXISTS invitations_admin_select ON organization_invitations;
CREATE POLICY invitations_admin_select ON organization_invitations FOR SELECT
  USING (public.role_in(organization_id) = 'admin');

DROP POLICY IF EXISTS invitations_admin_insert ON organization_invitations;
CREATE POLICY invitations_admin_insert ON organization_invitations FOR INSERT
  WITH CHECK (public.role_in(organization_id) = 'admin' AND invited_by = auth.uid());

DROP POLICY IF EXISTS invitations_admin_update ON organization_invitations;
CREATE POLICY invitations_admin_update ON organization_invitations FOR UPDATE
  USING (public.role_in(organization_id) = 'admin');

DROP POLICY IF EXISTS invitations_admin_delete ON organization_invitations;
CREATE POLICY invitations_admin_delete ON organization_invitations FOR DELETE
  USING (public.role_in(organization_id) = 'admin');

-- L'acceptation se fait via service_role (bypass RLS) dans une Route Handler,
-- car le user qui accepte n'est pas (encore) membre de l'org.

COMMENT ON TABLE organization_invitations IS
  'Invitations par email. Token unique envoyé par mail. Accepté → insère organization_members.';
