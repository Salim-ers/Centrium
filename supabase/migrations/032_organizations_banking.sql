-- =============================================================
-- 032_organizations_banking.sql
--
-- Coordonnées bancaires de l'organisation, imprimées sur les
-- factures dans le bloc "Modalités de paiement" (RIB/IBAN/BIC).
-- =============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS bic TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT;

COMMENT ON COLUMN organizations.iban IS 'IBAN bancaire imprimé sur les factures (RIB).';
COMMENT ON COLUMN organizations.bic IS 'BIC / SWIFT bancaire imprimé sur les factures.';
COMMENT ON COLUMN organizations.bank_name IS 'Nom de la banque (Domiciliation) imprimé sur les factures.';
