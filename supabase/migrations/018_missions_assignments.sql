-- =========================================================================
-- 018 — Missions : lien direct avec job_offer + statut "proposed"
-- -------------------------------------------------------------------------
-- Le matching produit des "propositions" qui doivent devenir des missions
-- une fois validées par l'admin. On veut :
--   • lier une mission directement à une job_offer (pas seulement opportunity)
--   • supporter un cycle de vie 'proposed' → 'active' → 'ended'
--   • rendre company_id optionnel (toutes les offres n'ont pas encore de company)
-- =========================================================================

ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS job_offer_id UUID REFERENCES job_offers(id) ON DELETE SET NULL,
  ALTER COLUMN company_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_missions_job_offer ON missions(job_offer_id);

COMMENT ON COLUMN missions.job_offer_id IS
  'Offre client à l''origine de la mission (issue du matching). Optionnel.';
COMMENT ON COLUMN missions.status IS
  'proposed (matché en attente de validation) | active (validée, en cours) | ended | suspended | rejected';

-- Le consultant doit voir ses propres missions
DROP POLICY IF EXISTS missions_self_select ON missions;
CREATE POLICY missions_self_select ON missions
  FOR SELECT USING (
    consultant_id IN (
      SELECT consultant_id FROM profiles WHERE id = auth.uid() AND consultant_id IS NOT NULL
    )
  );
