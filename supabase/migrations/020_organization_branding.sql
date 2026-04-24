-- =========================================================================
-- Migration 020 : Branding personnalisable par organisation
-- =========================================================================
-- Permet à chaque ESN cliente d'afficher son propre logo, nom et couleurs
-- sur les CV générés (au lieu de "QuadCore" en dur).

-- 1. Colonnes branding sur organizations (logo_url existe déjà)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS brand_name           TEXT,
  ADD COLUMN IF NOT EXISTS footer_tagline       TEXT,
  ADD COLUMN IF NOT EXISTS brand_primary_color  TEXT,
  ADD COLUMN IF NOT EXISTS brand_accent_color   TEXT;

COMMENT ON COLUMN organizations.brand_name IS
  'Nom de marque affiché en en-tête / footer des CV. Fallback = organizations.name.';
COMMENT ON COLUMN organizations.footer_tagline IS
  'Tagline affichée en footer des CV (ex: "IT Services & Consulting").';
COMMENT ON COLUMN organizations.brand_primary_color IS
  'Couleur principale hex (#RRGGBB). Fallback = #6d28d9 (violet QuadCore).';
COMMENT ON COLUMN organizations.brand_accent_color IS
  'Couleur d''accent hex (#RRGGBB). Fallback = #e11d74 (magenta QuadCore).';

-- 2. Bucket Storage pour les assets de branding (logo)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-assets',
  'organization-assets',
  true, -- public en lecture : le logo est embed dans les CV partagés
  5242880, -- 5 MB
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types,
      public = EXCLUDED.public;

-- 3. Policies Storage
-- Chemin attendu : organization-assets/<organization_id>/<filename>

-- Lecture publique (logo visible dans les CV partagés et sur l'UI)
DROP POLICY IF EXISTS org_assets_select_public ON storage.objects;
CREATE POLICY org_assets_select_public ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'organization-assets');

-- Upload / update / delete réservés aux admins de l'org propriétaire
DROP POLICY IF EXISTS org_assets_insert ON storage.objects;
CREATE POLICY org_assets_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'organization-assets'
    AND (storage.foldername(name))[1] = public.organization_id()::text
    AND public.user_role() = 'admin'
  );

DROP POLICY IF EXISTS org_assets_update ON storage.objects;
CREATE POLICY org_assets_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'organization-assets'
    AND (storage.foldername(name))[1] = public.organization_id()::text
    AND public.user_role() = 'admin'
  );

DROP POLICY IF EXISTS org_assets_delete ON storage.objects;
CREATE POLICY org_assets_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'organization-assets'
    AND (storage.foldername(name))[1] = public.organization_id()::text
    AND public.user_role() = 'admin'
  );

-- 4. Exposer les nouvelles colonnes dans la vue my_organizations
DROP VIEW IF EXISTS public.my_organizations;
CREATE OR REPLACE VIEW public.my_organizations AS
SELECT
  o.id,
  o.name,
  o.slug,
  o.logo_url,
  o.brand_name,
  o.footer_tagline,
  o.brand_primary_color,
  o.brand_accent_color,
  o.plan,
  m.role,
  m.status,
  m.joined_at
FROM organization_members m
JOIN organizations o ON o.id = m.organization_id
WHERE m.user_id = auth.uid()
  AND m.status = 'active';

GRANT SELECT ON public.my_organizations TO authenticated;

COMMENT ON VIEW my_organizations IS
  'Organisations actives du user courant + branding embarqué pour les CV.';
