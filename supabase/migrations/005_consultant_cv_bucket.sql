-- =========================================================================
-- Migration 005 : bucket Storage pour les CV sources consultant
-- =========================================================================

-- Bucket privé pour les documents consultants (CV sources, certifications, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'consultant-documents',
  'consultant-documents',
  false,
  20971520, -- 20 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies Storage : seuls les users de l'org peuvent lire / écrire
-- Le chemin attendu est : consultant-documents/<organization_id>/<consultant_id>/<filename>

DROP POLICY IF EXISTS consultant_docs_select ON storage.objects;
CREATE POLICY consultant_docs_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'consultant-documents'
    AND (storage.foldername(name))[1] = public.organization_id()::text
  );

DROP POLICY IF EXISTS consultant_docs_insert ON storage.objects;
CREATE POLICY consultant_docs_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'consultant-documents'
    AND (storage.foldername(name))[1] = public.organization_id()::text
    AND public.user_role() IN ('admin', 'business_manager', 'recruiter')
  );

DROP POLICY IF EXISTS consultant_docs_delete ON storage.objects;
CREATE POLICY consultant_docs_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'consultant-documents'
    AND (storage.foldername(name))[1] = public.organization_id()::text
    AND public.user_role() IN ('admin', 'business_manager', 'recruiter')
  );
