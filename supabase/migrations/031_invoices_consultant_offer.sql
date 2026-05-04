-- =============================================================
-- 031_invoices_consultant_offer.sql
--
-- Permet de lier une facture manuelle directement à un consultant et/ou
-- à un appel d'offre / opportunité (job_offer), sans avoir à passer
-- obligatoirement par une mission. Utile pour les factures one-shot,
-- les avances, les factures de prospection, etc.
-- =============================================================

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS consultant_id UUID REFERENCES consultants(id) ON DELETE SET NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS job_offer_id UUID REFERENCES job_offers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_consultant ON invoices(consultant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job_offer ON invoices(job_offer_id);

COMMENT ON COLUMN invoices.consultant_id IS
  'Consultant facturé (optionnel). Pour les factures manuelles non liées à une mission. Si mission_id est défini, on peut déduire le consultant via missions.consultant_id, mais on duplique ici pour les factures hors mission.';

COMMENT ON COLUMN invoices.job_offer_id IS
  'Appel d''offre / opportunité source de la facture (optionnel). Permet de remonter la chaîne commerciale AO → facture même sans mission.';
