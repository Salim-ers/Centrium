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

-- 3. Helper SQL : récupérer le consultant_id du user courant
CREATE OR REPLACE FUNCTION public.consultant_id() RETURNS UUID AS $$
  SELECT consultant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- NOTE : la contrainte CHECK sur (role='consultant' <=> consultant_id NOT NULL)
-- est déportée dans la migration 006a_consultant_role_constraint.sql.
-- Raison : Postgres 12+ refuse d'utiliser une valeur d'enum dans la même
-- transaction que son ADD VALUE. Supabase wrappe chaque migration dans une
-- transaction → on split en deux fichiers.
