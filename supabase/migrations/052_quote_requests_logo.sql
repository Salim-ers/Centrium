-- =============================================================
-- 052_quote_requests_logo.sql
--
-- 1) Colonne logo_url sur quote_requests : URL publique d'un logo
--    uploadé par le prospect via /devis. Permet à l'équipe Centrium
--    de récupérer la marque visuelle avant même de provisionner.
--
-- 2) Bucket de stockage `quote-attachments` :
--    - accessible publiquement en lecture (URLs visibles dans
--      /admin/clients sans devoir gérer des signed URLs)
--    - écriture autorisée à anon (le prospect upload sans compte)
--    - limite de taille 5 Mo / fichier côté API + côté policy
-- =============================================================

ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN quote_requests.logo_url IS
  'URL publique du logo uploadé par le prospect via /devis (Supabase Storage). Pré-rempli ensuite dans la fiche org au provisioning.';

-- Création du bucket public si pas existant. Idempotent.
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-attachments', 'quote-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Policy : tout le monde peut uploader sur ce bucket (formulaire public).
-- Le nom de fichier est préfixé par un UUID côté client pour éviter
-- les collisions. Pas de PII dans le path.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'quote-attachments anon upload'
  ) THEN
    CREATE POLICY "quote-attachments anon upload"
      ON storage.objects FOR INSERT
      TO anon, authenticated
      WITH CHECK (bucket_id = 'quote-attachments');
  END IF;
END $$;

-- Policy : lecture publique du bucket (sera de toute façon public via
-- l'URL Supabase Storage, mais on l'explicite pour clarté).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'quote-attachments public read'
  ) THEN
    CREATE POLICY "quote-attachments public read"
      ON storage.objects FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'quote-attachments');
  END IF;
END $$;

-- Policy : super_admin peut nettoyer les fichiers (cleanup orphelins).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'quote-attachments super_admin delete'
  ) THEN
    CREATE POLICY "quote-attachments super_admin delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'quote-attachments'
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;
