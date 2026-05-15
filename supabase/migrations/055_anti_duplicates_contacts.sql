-- =============================================================
-- 055_anti_duplicates_contacts.sql
--
-- Anti-doublon sur le carnet de contacts :
--   Un même email ne doit pas exister deux fois en actif dans la
--   même organisation. La normalisation est LOWER(TRIM(email))
--   pour neutraliser "Jean@A.com" vs "jean@a.com  ".
--
-- Politique de dédoublonnage préalable :
--   On garde la fiche la plus ancienne (created_at ASC). Les copies
--   plus récentes sont archivées (archived=true), pas supprimées —
--   l'historique reste consultable et restaurable manuellement.
--
-- L'index est PARTIEL :
--   - exclut les contacts archivés (permet de re-créer après archivage)
--   - exclut email NULL ou vide (un contact peut ne pas avoir d'email)
--
-- Compagnon de 046_anti_duplicates.sql qui gère consultants + missions.
-- =============================================================

WITH ranked AS (
  SELECT id,
         organization_id,
         LOWER(TRIM(email)) AS norm_email,
         archived,
         ROW_NUMBER() OVER (
           PARTITION BY organization_id, LOWER(TRIM(email))
           ORDER BY created_at ASC
         ) AS rn
    FROM contacts
   WHERE email IS NOT NULL
     AND TRIM(email) <> ''
     AND archived = FALSE
)
UPDATE contacts c
   SET archived = TRUE
  FROM ranked r
 WHERE c.id = r.id
   AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS contacts_org_email_active_unique
  ON contacts (organization_id, LOWER(TRIM(email)))
  WHERE email IS NOT NULL
    AND TRIM(email) <> ''
    AND archived = FALSE;

COMMENT ON INDEX contacts_org_email_active_unique IS
  'Anti-doublon : un email = un contact actif par organisation. Permet d''ajouter à nouveau le même email après archivage.';
