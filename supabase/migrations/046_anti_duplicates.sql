-- =============================================================
-- 046_anti_duplicates.sql
--
-- Empêche les doublons côté DB :
--
-- 1) Consultants : un email donné ne doit exister qu'une seule fois
--    par organisation (sur les fiches actives = non archivées).
--    On laisse les fiches archivées de côté pour permettre une
--    réinsertion après archivage volontaire.
--
-- 2) Missions : on n'autorise pas deux missions "vivantes"
--    (proposed ou active) pour le même couple (consultant_id,
--    job_offer_id). Ça empêche de pousser deux fois le même CV
--    sur la même offre. Plusieurs missions terminées (ended/rejected)
--    sont autorisées — c'est l'historique.
-- =============================================================

-- 1) Dédoublonnage préalable : si des doublons existent déjà, on
--    archive les plus récents pour préserver la première fiche
--    (politique conservatrice). Sans ça, la création de l'index
--    plante sur de la donnée existante.
WITH ranked AS (
  SELECT id,
         organization_id,
         LOWER(TRIM(email)) AS norm_email,
         archived,
         ROW_NUMBER() OVER (
           PARTITION BY organization_id, LOWER(TRIM(email))
           ORDER BY created_at ASC
         ) AS rn
    FROM consultants
   WHERE email IS NOT NULL
     AND TRIM(email) <> ''
     AND archived = FALSE
)
UPDATE consultants c
   SET archived = TRUE,
       status = 'archived'
  FROM ranked r
 WHERE c.id = r.id
   AND r.rn > 1;

-- 2) Index unique partiel sur (org, email lower) pour les fiches actives.
CREATE UNIQUE INDEX IF NOT EXISTS consultants_org_email_active_unique
  ON consultants (organization_id, LOWER(TRIM(email)))
  WHERE email IS NOT NULL
    AND TRIM(email) <> ''
    AND archived = FALSE;

-- 3) Index unique partiel sur missions vivantes pour (consultant, offer).
--    Le job_offer_id peut être NULL (mission libre) — dans ce cas la
--    contrainte ne s'applique pas (NULL ne déclenche pas l'unicité).
CREATE UNIQUE INDEX IF NOT EXISTS missions_consultant_offer_live_unique
  ON missions (consultant_id, job_offer_id)
  WHERE status IN ('proposed', 'active')
    AND COALESCE(archived, FALSE) = FALSE
    AND job_offer_id IS NOT NULL;

COMMENT ON INDEX consultants_org_email_active_unique IS
  'Anti-doublon : un email = une fiche consultant active par organisation.';
COMMENT ON INDEX missions_consultant_offer_live_unique IS
  'Anti-doublon : on ne peut pas avoir 2 missions proposed/active pour la même paire (consultant, offre).';
