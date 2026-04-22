-- =========================================================================
-- Migration 006a : Contrainte CHECK profiles (consultant_id ↔ role)
-- =========================================================================
-- Séparée de 006 pour contourner la limitation Postgres 12+ :
--   « unsafe use of new value of enum type (SQLSTATE 55P04) »
-- On ne peut pas utiliser la valeur 'consultant' dans un CHECK/WHERE dans la
-- même transaction que l'ADD VALUE. Ce fichier s'applique dans sa propre
-- transaction après que 006 a commité l'ajout de la valeur.
-- =========================================================================

-- Contrainte : consultant_id non-NULL ⇔ role = 'consultant'
ALTER TABLE profiles
  ADD CONSTRAINT profiles_consultant_role_match
  CHECK (
    (role = 'consultant' AND consultant_id IS NOT NULL)
    OR (role <> 'consultant' AND consultant_id IS NULL)
  ) NOT VALID; -- NOT VALID pour ne pas bloquer les profiles existants

-- Les profiles existants ont role != 'consultant' et consultant_id = NULL,
-- ils passent la contrainte. On peut donc la valider.
ALTER TABLE profiles VALIDATE CONSTRAINT profiles_consultant_role_match;

CREATE INDEX IF NOT EXISTS idx_profiles_consultant_id
  ON profiles(consultant_id)
  WHERE consultant_id IS NOT NULL;
