-- =========================================================================
-- 019 — Prospection consultants
-- -------------------------------------------------------------------------
-- On veut pouvoir garder en réserve des profils repérés (viviers,
-- candidatures spontanées, LinkedIn, etc.) SANS qu'ils comptent comme
-- consultants actifs de l'organisation. À la signature effective,
-- on les "promeut" en bascule simple.
--
--   is_prospect = true  → visible uniquement dans /prospects
--   is_prospect = false → consultant à part entière, visible partout
--
-- Les listes existantes (matching, facturation, dashboards, …) doivent
-- continuer à ignorer les prospects : elles utilisent le service list()
-- qui filtre désormais par défaut sur is_prospect = false.
-- =========================================================================

ALTER TABLE consultants
  ADD COLUMN IF NOT EXISTS is_prospect BOOLEAN NOT NULL DEFAULT false;

-- Index partiel : on accède presque toujours à l'un ou l'autre,
-- jamais aux deux en même temps. Partial index = plus léger.
CREATE INDEX IF NOT EXISTS idx_consultants_is_prospect_true
  ON consultants (organization_id, updated_at DESC)
  WHERE is_prospect = true;

CREATE INDEX IF NOT EXISTS idx_consultants_is_prospect_false
  ON consultants (organization_id, updated_at DESC)
  WHERE is_prospect = false;

COMMENT ON COLUMN consultants.is_prospect IS
  'true = profil en vivier/prospection, hors effectif. false = consultant actif de l''organisation.';
