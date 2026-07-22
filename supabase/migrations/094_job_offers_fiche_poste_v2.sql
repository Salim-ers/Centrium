-- =========================================================================
-- 094 — Fiche de poste v2 : champs additifs (mode de travail, démarrage
-- flexible, expérience libre, TJM optionnel).
--
-- 100 % ADDITIF et rétro-compatible : toutes les colonnes sont nullable
-- (ou avec défaut sûr). Les anciennes fiches gardent leurs valeurs ; le
-- rendu tombe sur des fallbacks dérivés (remote_days, start_date,
-- seniority) — cf. src/lib/offers/poster-model.ts. Aucune donnée touchée.
-- =========================================================================

ALTER TABLE public.job_offers
  -- TJM masqué par défaut sur la fiche PDF (choix par fiche).
  ADD COLUMN IF NOT EXISTS show_rate boolean NOT NULL DEFAULT false,
  -- Mode de travail explicite : null = on dérive de remote_days (legacy).
  ADD COLUMN IF NOT EXISTS work_mode text,
  ADD COLUMN IF NOT EXISTS work_mode_detail text,
  -- Démarrage : type + libellé libre ; null = on dérive de start_date.
  ADD COLUMN IF NOT EXISTS start_type text,
  ADD COLUMN IF NOT EXISTS start_label text,
  -- Expérience en clair, prioritaire sur seniority.
  ADD COLUMN IF NOT EXISTS experience_label text;

-- Contraintes de valeurs (idempotentes).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_offers_work_mode_check'
  ) THEN
    ALTER TABLE public.job_offers
      ADD CONSTRAINT job_offers_work_mode_check
      CHECK (work_mode IS NULL OR work_mode IN ('onsite', 'hybrid', 'remote', 'custom'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_offers_start_type_check'
  ) THEN
    ALTER TABLE public.job_offers
      ADD CONSTRAINT job_offers_start_type_check
      CHECK (start_type IS NULL OR start_type IN ('date', 'asap', 'immediate', 'tbd', 'custom'));
  END IF;
END $$;

COMMENT ON COLUMN public.job_offers.show_rate IS 'Affiche le TJM sur la fiche de poste PDF (masqué par défaut).';
COMMENT ON COLUMN public.job_offers.work_mode IS 'Mode de travail explicite ; null = dérivé de remote_days.';
COMMENT ON COLUMN public.job_offers.start_type IS 'Type de démarrage : date|asap|immediate|tbd|custom ; null = dérivé de start_date.';
COMMENT ON COLUMN public.job_offers.experience_label IS 'Expérience en clair, prioritaire sur seniority pour la fiche.';
