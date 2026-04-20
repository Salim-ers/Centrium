-- =========================================================================
-- Migration 013 : Upload de documents par le consultant lui-même
-- =========================================================================
-- Le consultant peut uploader ses propres documents (CV, certifications,
-- pièce d'identité…). Ils sont visibles par lui (visible_to_consultant=true)
-- ET par l'admin.
--
-- Le consultant NE peut PAS :
--   - uploader un doc pour un autre consultant
--   - uploader un doc de type 'contract' (réservé admin)
--   - modifier visible_to_consultant après coup
--   - supprimer un doc uploadé par l'admin (règle : ne peut supprimer que
--     ceux dont uploaded_by = auth.uid())
-- =========================================================================

-- === DB : consultant_documents INSERT ===
DROP POLICY IF EXISTS docs_self_insert ON consultant_documents;
CREATE POLICY docs_self_insert ON consultant_documents
  FOR INSERT
  WITH CHECK (
    auth.user_role() = 'consultant'
    AND consultant_id = auth.consultant_id()
    AND uploaded_by = auth.uid()
    AND kind <> 'contract'                -- pas de contrat uploadé par le consultant
    AND visible_to_consultant = true      -- ses propres docs lui sont visibles
  );

-- === DB : consultant_documents DELETE (ses propres uploads uniquement) ===
DROP POLICY IF EXISTS docs_self_delete ON consultant_documents;
CREATE POLICY docs_self_delete ON consultant_documents
  FOR DELETE
  USING (
    auth.user_role() = 'consultant'
    AND consultant_id = auth.consultant_id()
    AND uploaded_by = auth.uid()
  );

-- === Storage : objects INSERT pour consultant ===
-- Chemin attendu : <org_id>/<consultant_id>/<filename>
DROP POLICY IF EXISTS consultant_docs_insert_self ON storage.objects;
CREATE POLICY consultant_docs_insert_self ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'consultant-documents'
    AND auth.user_role() = 'consultant'
    AND (storage.foldername(name))[1] = auth.organization_id()::text
    AND (storage.foldername(name))[2] = auth.consultant_id()::text
  );

-- === Storage : objects DELETE pour consultant (ses propres fichiers) ===
DROP POLICY IF EXISTS consultant_docs_delete_self ON storage.objects;
CREATE POLICY consultant_docs_delete_self ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'consultant-documents'
    AND auth.user_role() = 'consultant'
    AND (storage.foldername(name))[1] = auth.organization_id()::text
    AND (storage.foldername(name))[2] = auth.consultant_id()::text
    AND owner = auth.uid()   -- seulement les fichiers uploadés par lui
  );
