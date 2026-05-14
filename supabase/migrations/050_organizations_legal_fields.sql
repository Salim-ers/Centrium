-- =============================================================
-- 050_organizations_legal_fields.sql
--
-- Complète le branding par les champs légaux dont les PDF (contrats,
-- factures, fiches de poste) ont besoin pour qu'un client comme
-- "Futurmaster" voie ses propres mentions partout, et pas celles
-- de QuadCore par défaut.
--
-- La plupart des champs existaient déjà (siren, siret, vat_number,
-- rcs, capital_eur, address, city, postal_code, country, logo_url,
-- signature_url, brand_name, brand_primary_color, brand_accent_color,
-- footer_tagline). On ajoute ici ceux qui manquaient encore.
-- =============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS representative_name  TEXT,
  ADD COLUMN IF NOT EXISTS representative_title TEXT,
  ADD COLUMN IF NOT EXISTS iban                 TEXT,
  ADD COLUMN IF NOT EXISTS bic                  TEXT,
  ADD COLUMN IF NOT EXISTS bank_name            TEXT,
  ADD COLUMN IF NOT EXISTS legal_form           TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms_days   INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS late_fee_rate_pct    NUMERIC(5,2);

COMMENT ON COLUMN organizations.representative_name IS
  'Nom du signataire légal (ex: gérant, président). Apparaît sur contrats et factures.';
COMMENT ON COLUMN organizations.representative_title IS
  'Titre du signataire (Gérant, Président, Directeur Général…).';
COMMENT ON COLUMN organizations.iban IS
  'IBAN bancaire pour réception des paiements clients.';
COMMENT ON COLUMN organizations.bic IS
  'BIC/SWIFT correspondant à l''IBAN.';
COMMENT ON COLUMN organizations.bank_name IS
  'Nom de la banque (BNP Paribas, Crédit Agricole...) — affiché sur les factures.';
COMMENT ON COLUMN organizations.legal_form IS
  'Forme juridique (SAS, SARL, EURL...) — affiché en mentions légales.';
COMMENT ON COLUMN organizations.payment_terms_days IS
  'Délai de paiement par défaut (jours après émission). 30 par défaut.';
COMMENT ON COLUMN organizations.late_fee_rate_pct IS
  'Taux d''intérêts de retard (%) — mentions légales factures.';
