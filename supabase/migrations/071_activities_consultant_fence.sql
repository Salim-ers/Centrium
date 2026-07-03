-- ============================================================================
-- 071 — Fence consultant sur la table activities
-- ----------------------------------------------------------------------------
-- La policy historique `activities_org` (002_rls_policies.sql) autorisait
-- TOUT membre de l'org — y compris role='consultant' (portail) — à lire et
-- écrire le journal d'activité interne de l'organisation. Les consultants
-- externes n'ont pas à voir les activités commerciales/CRM de l'ESN.
--
-- Alignement sur le pattern de 012_fence_admin_policies_from_consultant :
-- on ajoute `public.user_role() <> 'consultant'` au USING et au WITH CHECK.
-- Les écritures serveur (audit log, contrats) passent par service_role et
-- ne sont pas affectées.
-- ============================================================================

DROP POLICY IF EXISTS activities_org ON public.activities;

CREATE POLICY activities_org ON public.activities
  FOR ALL
  USING (
    organization_id = public.organization_id()
    AND public.user_role() <> 'consultant'
  )
  WITH CHECK (
    organization_id = public.organization_id()
    AND public.user_role() <> 'consultant'
  );
