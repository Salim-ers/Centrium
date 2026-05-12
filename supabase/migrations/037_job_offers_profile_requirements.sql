-- =============================================================
-- 037_job_offers_profile_requirements.sql
--
-- Ajoute `profile_requirements` à `job_offers` : la liste des
-- exigences du profil (séniorité, soft skills, certifications,
-- expérience sectorielle), distinctes des compétences techniques
-- listées dans `required_skills` / `tech_stack`.
--
-- Sans ce champ, le PDF fiche de poste affichait les techs dans
-- la colonne "Profil recherché" — incorrect sémantiquement et
-- redondant avec la section "Environnement technique" (tech_stack).
-- =============================================================

ALTER TABLE job_offers
  ADD COLUMN IF NOT EXISTS profile_requirements JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN job_offers.profile_requirements IS
  'Exigences du profil recherché (séniorité, soft skills, certifications, expérience sectorielle). Distinct de required_skills/tech_stack qui listent les technos.';
