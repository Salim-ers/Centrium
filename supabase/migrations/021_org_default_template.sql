-- =========================================================================
-- Migration 021 : Template CV par défaut par organisation
-- =========================================================================
-- Permet à chaque ESN de choisir lequel des 3 layouts (standard / dense /
-- executive) est préselectionné quand un utilisateur ouvre le CV Optimizer.
-- Étend l'ensemble de branding introduit par la migration 020.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS default_cv_template TEXT;

-- Ajout du CHECK seulement s'il n'existe pas — permet de rejouer la migration
-- sans erreur en cas d'exécution partielle.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organizations_default_cv_template_check'
  ) THEN
    ALTER TABLE organizations
      ADD CONSTRAINT organizations_default_cv_template_check
      CHECK (default_cv_template IN ('standard', 'dense', 'executive'));
  END IF;
END $$;

COMMENT ON COLUMN organizations.default_cv_template IS
  'Layout CV présélectionné dans le CV Optimizer. Valeurs autorisées : standard, dense, executive. NULL = standard par défaut.';

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
  m.role,
  m.joined_at
FROM organization_members m
JOIN organizations o ON o.id = m.organization_id
WHERE m.user_id = auth.uid()
ORDER BY m.joined_at ASC;

GRANT SELECT ON public.my_organizations TO authenticated;

COMMENT ON VIEW my_organizations IS
  'Organisations du user courant + branding + template CV par défaut.';
