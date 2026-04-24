-- =========================================================================
-- Migration 022 : Identité légale de l'organisation pour les contrats
-- =========================================================================
-- Ajoute les champs manquants pour que le contrat d'assistance technique
-- puisse être émis au nom de n'importe quelle ESN cliente (pas seulement
-- QuadCore), avec en-tête, mentions légales et signataire dynamiques.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS legal_form TEXT,
  ADD COLUMN IF NOT EXISTS representative_name TEXT,
  ADD COLUMN IF NOT EXISTS representative_title TEXT;

COMMENT ON COLUMN organizations.legal_form IS
  'Forme juridique (SAS, SARL, SA, EURL, etc.) — utilisée en en-tête des contrats.';
COMMENT ON COLUMN organizations.representative_name IS
  'Nom complet du signataire par défaut des contrats (ex: MOUHAMAD Moustakine).';
COMMENT ON COLUMN organizations.representative_title IS
  'Fonction du signataire (Président, Gérant, Directeur Général, etc.).';
