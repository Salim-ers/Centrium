-- =========================================================================
-- Migration 006 : Rôle "consultant" + lien profiles ↔ consultants
-- =========================================================================
-- Permet à un consultant de se connecter à la plateforme avec son propre
-- compte, limité à ses propres données.
--
-- Règles :
--   - 1 profile(role='consultant') ⇔ 1 consultants.id (unique)
--   - consultant_id doit être NULL pour les autres rôles (check)
--   - Révocation d'accès = ban dans auth.users (pas de suppression)
-- =========================================================================

-- 1. Ajouter la valeur au enum user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'consultant';

-- 2. Lier un profile à un consultant (1:1, nullable pour admin/BM/etc.)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS consultant_id UUID UNIQUE
    REFERENCES consultants(id) ON DELETE SET NULL;

COMMENT ON COLUMN profiles.consultant_id IS
  'Si le profile est un compte consultant, pointe vers sa fiche. NULL pour les rôles admin/BM/recruiter/finance/viewer.';

-- 3. Contrainte : consultant_id ne peut être non-NULL que si role = 'consultant'
ALTER TABLE profiles
  ADD CONSTRAINT profiles_consultant_role_match
  CHECK (
    (role = 'consultant' AND consultant_id IS NOT NULL)
    OR (role <> 'consultant' AND consultant_id IS NULL)
  ) NOT VALID; -- NOT VALID pour ne pas casser les profiles existants

-- Les profiles existants ont role != 'consultant' et consultant_id = NULL, ils passent la contrainte.
-- On peut la valider maintenant :
ALTER TABLE profiles VALIDATE CONSTRAINT profiles_consultant_role_match;

CREATE INDEX IF NOT EXISTS idx_profiles_consultant_id
  ON profiles(consultant_id)
  WHERE consultant_id IS NOT NULL;

-- 4. Helper SQL : récupérer le consultant_id du user courant
CREATE OR REPLACE FUNCTION auth.consultant_id() RETURNS UUID AS $$
  SELECT consultant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;
