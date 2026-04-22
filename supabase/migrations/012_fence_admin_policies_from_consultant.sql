-- =========================================================================
-- Migration 012 : exclure le rôle "consultant" des policies admin
-- =========================================================================
-- Les policies admin existantes filtrent par organization_id, mais un user
-- 'consultant' a aussi organization_id = <org QuadCore>. Donc sans fence,
-- un consultant passe AUSSI la policy admin → il voit tous les consultants
-- de son org.
--
-- Correction : on ajoute `public.user_role() <> 'consultant'` sur chaque
-- policy admin qui a une contrepartie consultant_self_* dans 011.
--
-- Tables fencées :
--   consultants, consultant_skills, consultant_experiences,
--   consultant_educations, consultant_documents,
--   missions, contracts, timesheets, timesheet_days,
--   invoices, invoice_items
-- =========================================================================

-- === CONSULTANTS ===
DROP POLICY IF EXISTS consultants_select ON consultants;
CREATE POLICY consultants_select ON consultants
  FOR SELECT USING (
    organization_id = public.organization_id()
    AND public.user_role() <> 'consultant'
  );

-- === SKILLS / EXPERIENCES / EDUCATIONS ===
DROP POLICY IF EXISTS skills_org ON consultant_skills;
CREATE POLICY skills_org ON consultant_skills
  FOR ALL USING (
    public.user_role() <> 'consultant'
    AND EXISTS (SELECT 1 FROM consultants c
                WHERE c.id = consultant_id
                  AND c.organization_id = public.organization_id())
  );

DROP POLICY IF EXISTS exp_org ON consultant_experiences;
CREATE POLICY exp_org ON consultant_experiences
  FOR ALL USING (
    public.user_role() <> 'consultant'
    AND EXISTS (SELECT 1 FROM consultants c
                WHERE c.id = consultant_id
                  AND c.organization_id = public.organization_id())
  );

DROP POLICY IF EXISTS edu_org ON consultant_educations;
CREATE POLICY edu_org ON consultant_educations
  FOR ALL USING (
    public.user_role() <> 'consultant'
    AND EXISTS (SELECT 1 FROM consultants c
                WHERE c.id = consultant_id
                  AND c.organization_id = public.organization_id())
  );

-- === CONSULTANT_DOCUMENTS ===
DROP POLICY IF EXISTS docs_org ON consultant_documents;
CREATE POLICY docs_org ON consultant_documents
  FOR ALL USING (
    public.user_role() <> 'consultant'
    AND EXISTS (SELECT 1 FROM consultants c
                WHERE c.id = consultant_id
                  AND c.organization_id = public.organization_id())
  );

-- === MISSIONS ===
DROP POLICY IF EXISTS missions_org ON missions;
CREATE POLICY missions_org ON missions
  FOR ALL USING (
    organization_id = public.organization_id()
    AND public.user_role() <> 'consultant'
  );

-- === TIMESHEETS ===
DROP POLICY IF EXISTS timesheets_select ON timesheets;
CREATE POLICY timesheets_select ON timesheets
  FOR SELECT USING (
    organization_id = public.organization_id()
    AND public.user_role() <> 'consultant'
  );

DROP POLICY IF EXISTS timesheets_write ON timesheets;
CREATE POLICY timesheets_write ON timesheets
  FOR ALL USING (
    organization_id = public.organization_id()
    AND public.user_role() IN ('admin', 'business_manager', 'finance')
  );

DROP POLICY IF EXISTS timesheet_days_org ON timesheet_days;
CREATE POLICY timesheet_days_org ON timesheet_days
  FOR ALL USING (
    public.user_role() <> 'consultant'
    AND EXISTS (SELECT 1 FROM timesheets t
                WHERE t.id = timesheet_id
                  AND t.organization_id = public.organization_id())
  );

-- === INVOICES ===
DROP POLICY IF EXISTS invoices_select ON invoices;
CREATE POLICY invoices_select ON invoices
  FOR SELECT USING (
    organization_id = public.organization_id()
    AND public.user_role() <> 'consultant'
  );

DROP POLICY IF EXISTS invoices_write ON invoices;
CREATE POLICY invoices_write ON invoices
  FOR ALL USING (
    organization_id = public.organization_id()
    AND public.user_role() IN ('admin', 'business_manager', 'finance')
  );

DROP POLICY IF EXISTS invoice_items_org ON invoice_items;
CREATE POLICY invoice_items_org ON invoice_items
  FOR ALL USING (
    public.user_role() <> 'consultant'
    AND EXISTS (SELECT 1 FROM invoices i
                WHERE i.id = invoice_id
                  AND i.organization_id = public.organization_id())
  );

-- === CONTRACTS (si la table existe) ===
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contracts') THEN
    -- On ne connaît pas le nom exact de la policy admin, on va chercher
    -- et remplacer toutes les policies contracts qui ne commencent pas par 'self'
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN SELECT policyname FROM pg_policies
                WHERE schemaname='public' AND tablename='contracts'
                  AND policyname NOT LIKE '%self%'
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON contracts', r.policyname);
      END LOOP;
    END;

    -- Recréer une policy admin fencée
    CREATE POLICY contracts_admin_rw ON contracts
      FOR ALL USING (
        organization_id = public.organization_id()
        AND public.user_role() <> 'consultant'
      );
  END IF;
END $$;
