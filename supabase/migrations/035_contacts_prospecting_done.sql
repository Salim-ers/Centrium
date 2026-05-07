-- =============================================================
-- 035_contacts_prospecting_done.sql
--
-- Permet de marquer le démarchage d'un contact comme terminé
-- (cycle clos, peu importe l'issue : signé, refusé, hors-scope).
-- Le contact reste dans le carnet pour l'historique mais sort
-- des listes de prospection active.
-- =============================================================

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS prospecting_done BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS prospecting_done_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_contacts_prospecting_done
  ON contacts(organization_id, prospecting_done);

COMMENT ON COLUMN contacts.prospecting_done IS
  'TRUE quand le démarchage / la prospection sur ce contact est terminé (cycle clos, peu importe l''issue).';
COMMENT ON COLUMN contacts.prospecting_done_at IS
  'Date à laquelle le démarchage a été marqué comme terminé.';
