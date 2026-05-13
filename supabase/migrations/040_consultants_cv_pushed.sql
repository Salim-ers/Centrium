-- =============================================================
-- 040_consultants_cv_pushed.sql
--
-- Ajoute le suivi "CV poussé" sur consultants & prospects. Permet de
-- savoir d'un coup d'œil qui a déjà été positionné (CV envoyé à un
-- client, à un AO, à un recruteur). Évite de re-pousser deux fois le
-- même profil et de perdre la trace des positionnements en cours.
--
-- Le drapeau est transversal aux deux vues (bibliothèque + vivier).
-- =============================================================

ALTER TABLE public.consultants
  ADD COLUMN IF NOT EXISTS cv_pushed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cv_pushed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cv_pushed_target TEXT;

COMMENT ON COLUMN public.consultants.cv_pushed IS
  'TRUE si le CV du consultant a été envoyé à au moins une cible (client, AO, recruteur). Drapeau transversal bibliothèque/vivier.';
COMMENT ON COLUMN public.consultants.cv_pushed_at IS
  'Horodatage du dernier "push" de CV.';
COMMENT ON COLUMN public.consultants.cv_pushed_target IS
  'Cible libre du dernier push : nom du client, intitulé d''AO, recruteur, etc. Texte libre court.';

CREATE INDEX IF NOT EXISTS idx_consultants_org_cv_pushed
  ON public.consultants (organization_id, cv_pushed)
  WHERE cv_pushed = TRUE;
