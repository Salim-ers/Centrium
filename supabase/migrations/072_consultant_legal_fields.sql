-- ============================================================================
-- 072 — Champs légaux / fiscaux / bancaires structurés sur consultants
-- ----------------------------------------------------------------------------
-- Jusqu'ici, le statut juridique, le SIRET ou l'IBAN d'un consultant
-- n'existaient QUE sous forme de PDF uploadé (Kbis / RIB via KycDocuments).
-- On les ajoute en colonnes structurées pour :
--   - le profil portail (le consultant complète lui-même ses infos)
--   - la génération de contrats / factures (données exploitables)
-- Éditables par le consultant via la whitelist PATCH /api/portal/profile,
-- et par l'org via ses formulaires. RLS existante inchangée (les policies
-- consultants_* couvrent la ligne entière).
-- ============================================================================

ALTER TABLE public.consultants
  ADD COLUMN IF NOT EXISTS legal_status TEXT,    -- EI, EURL, SASU, portage, salarié…
  ADD COLUMN IF NOT EXISTS company_name TEXT,    -- raison sociale si société
  ADD COLUMN IF NOT EXISTS siret TEXT,
  ADD COLUMN IF NOT EXISTS vat_number TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS bic TEXT;

COMMENT ON COLUMN public.consultants.legal_status IS 'Statut juridique déclaré par le consultant (EI, EURL, SASU, portage salarial, salarié…)';
COMMENT ON COLUMN public.consultants.iban IS 'IBAN de facturation du consultant — visible org + consultant lui-même (RLS)';
