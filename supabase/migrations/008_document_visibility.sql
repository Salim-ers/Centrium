-- =========================================================================
-- Migration 008 : Visibilité des documents vers le consultant concerné
-- =========================================================================
-- Par défaut les documents sont internes à QuadCore (non visibles par le
-- consultant). L'admin doit explicitement activer la visibilité au cas par
-- cas (RGPD : principe du moins-privilège par défaut).
-- =========================================================================

ALTER TABLE consultant_documents
  ADD COLUMN IF NOT EXISTS visible_to_consultant BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN consultant_documents.visible_to_consultant IS
  'Si true, le consultant associé peut consulter ce document dans son espace /portal/documents.';

CREATE INDEX IF NOT EXISTS idx_consultant_documents_visible
  ON consultant_documents(consultant_id)
  WHERE visible_to_consultant = true;
