-- =========================================================================
-- 100 — Clôture des tables internes vis-à-vis des comptes consultant
-- -------------------------------------------------------------------------
-- Audit V2 : plusieurs tables n'étaient filtrées que par organisation.
-- Un compte consultant (membre de l'organisation) pouvait donc lire, via
-- l'API, des données qui ne le concernent pas :
--   - notes, messages, contact_interactions : notes commerciales internes
--   - cv_versions : dossiers de compétences des AUTRES consultants
--   - contract_versions : historique des contrats (dont les tarifs)
-- Le portail consultant n'utilise aucune de ces tables. On réserve leur
-- accès aux rôles internes (les comptes client n'ont pas d'organisation
-- active et restent refusés par construction).
-- =========================================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['notes', 'messages', 'contact_interactions', 'cv_versions'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %1$I_org ON public.%1$I', t);
    EXECUTE format($f$
      CREATE POLICY %1$I_org ON public.%1$I
        FOR ALL USING (
          organization_id = public.organization_id()
          AND public.user_role() NOT IN ('consultant'::user_role, 'client'::user_role)
        ) WITH CHECK (
          organization_id = public.organization_id()
          AND public.user_role() NOT IN ('consultant'::user_role, 'client'::user_role)
        )$f$, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS contract_versions_org ON public.contract_versions;
CREATE POLICY contract_versions_org ON public.contract_versions
  FOR ALL USING (
    public.user_role() NOT IN ('consultant'::user_role, 'client'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.contracts c
       WHERE c.id = contract_versions.contract_id
         AND c.organization_id = public.organization_id()
    )
  ) WITH CHECK (
    public.user_role() NOT IN ('consultant'::user_role, 'client'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.contracts c
       WHERE c.id = contract_versions.contract_id
         AND c.organization_id = public.organization_id()
    )
  );
