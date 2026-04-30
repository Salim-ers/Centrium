-- =========================================================================
-- Migration 023 : Signature officielle par organisation
-- =========================================================================
-- Ajoute signature_url pour permettre à chaque ESN d'uploader une image de
-- signature (PNG transparent recommandé) qui sera fondue dans les documents
-- officiels : contrats, CRA, factures.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS signature_url TEXT;

COMMENT ON COLUMN organizations.signature_url IS
  'URL publique (bucket organization-assets) de la signature image utilisée dans les contrats, CRA et factures. NULL = signature texte stylisée par défaut.';

-- Rafraîchir my_organizations pour exposer la nouvelle colonne au front.
DROP VIEW IF EXISTS public.my_organizations;
CREATE OR REPLACE VIEW public.my_organizations AS
SELECT
  m.organization_id AS id,
  o.name,
  o.slug,
  o.logo_url,
  o.brand_name,
  o.footer_tagline,
  o.brand_primary_color,
  o.brand_accent_color,
  o.default_cv_template,
  o.signature_url,
  m.role,
  m.joined_at
FROM organization_members m
JOIN organizations o ON o.id = m.organization_id
WHERE m.user_id = auth.uid()
ORDER BY m.joined_at ASC;

GRANT SELECT ON public.my_organizations TO authenticated;

COMMENT ON VIEW my_organizations IS
  'Organisations du user courant + branding + template CV par défaut + signature officielle.';
