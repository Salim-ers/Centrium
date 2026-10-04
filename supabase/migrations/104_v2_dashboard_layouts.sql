-- =========================================================================
-- 104 — Dispositions personnelles du tableau de bord
-- -------------------------------------------------------------------------
-- Chaque utilisateur interne choisit, pour chaque vue (Direction,
-- Commercial, Staffing, Finance), l'ordre et la visibilité des widgets.
-- Une ligne par (utilisateur, organisation, vue). Le contenu est une liste
-- courte et validée côté serveur (identifiants de widgets connus).
-- Aucune donnée métier n'est stockée ici.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.user_dashboard_layouts (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  view text NOT NULL CHECK (view IN ('direction', 'commercial', 'staffing', 'finance')),
  widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id, view),
  CONSTRAINT user_dashboard_layouts_widgets_array CHECK (jsonb_typeof(widgets) = 'array'),
  CONSTRAINT user_dashboard_layouts_widgets_small CHECK (jsonb_array_length(widgets) <= 32)
);

ALTER TABLE public.user_dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- Chacun ne lit et n'écrit que ses propres dispositions, dans son
-- organisation active. Les comptes portail (consultant, client) n'ont pas
-- de tableau de bord interne.
DROP POLICY IF EXISTS user_dashboard_layouts_own ON public.user_dashboard_layouts;
CREATE POLICY user_dashboard_layouts_own ON public.user_dashboard_layouts
  FOR ALL
  USING (
    user_id = auth.uid()
    AND organization_id = public.organization_id()
  )
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id = public.organization_id()
    AND public.user_role() NOT IN ('consultant'::user_role, 'client'::user_role)
  );

COMMENT ON TABLE public.user_dashboard_layouts IS
  'Disposition personnelle du tableau de bord (ordre et visibilité des widgets) par utilisateur, organisation et vue.';
