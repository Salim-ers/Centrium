-- =============================================================
-- 034_job_offers_fiche_poste.sql
--
-- Étend job_offers avec les champs nécessaires pour générer la
-- "Fiche de poste" PDF envoyée aux consultants (contexte, finalité,
-- missions, stack technique, conditions d'exercice, type de contrat).
-- =============================================================

ALTER TABLE job_offers
  ADD COLUMN IF NOT EXISTS context TEXT,
  ADD COLUMN IF NOT EXISTS mission_purpose TEXT,
  ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tech_stack JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS working_conditions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS contract_kind TEXT;

COMMENT ON COLUMN job_offers.context IS 'Bloc Contexte de la fiche de poste (mission/AO).';
COMMENT ON COLUMN job_offers.mission_purpose IS 'Finalité synthétique de la mission, mise en avant sur la fiche de poste.';
COMMENT ON COLUMN job_offers.tasks IS 'Liste des missions principales (puces) sur la fiche de poste.';
COMMENT ON COLUMN job_offers.tech_stack IS 'Liste de technologies clés (Cisco, Aruba, …) en tags sur la fiche.';
COMMENT ON COLUMN job_offers.working_conditions IS 'Conditions d''exercice (lieu, TT, HNO, astreintes…).';
COMMENT ON COLUMN job_offers.contract_kind IS 'Libellé de la nature de mission (ex: Mission Freelance, CDI, Portage, Pré-embauche).';
