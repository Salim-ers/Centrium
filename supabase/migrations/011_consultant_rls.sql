-- =========================================================================
-- Migration 011 : Policies RLS pour le rôle "consultant"
-- =========================================================================
-- Toutes les policies UPDATE ont USING + WITH CHECK.
-- Les policies admin existantes (001_initial_schema + 002_rls_policies)
-- ne sont PAS modifiées ici : elles continuent de s'appliquer via OR aux
-- admins/BM/recruiter/finance/viewer.
--
-- Principes :
--   - Un consultant ne voit QUE ses propres données.
--   - Les factures ne sont visibles côté consultant que si status='paid'.
--   - Les documents ne sont visibles côté consultant que si
--     visible_to_consultant = true.
--   - Un consultant ne peut insérer / modifier un CRA que pour lui-même
--     et dans les statuts draft (création) ou draft/rejected (édition).
-- =========================================================================

-- =========================================================================
-- CONSULTANTS : un consultant peut voir sa propre fiche
-- =========================================================================

DROP POLICY IF EXISTS consultants_self_select ON consultants;
CREATE POLICY consultants_self_select ON consultants
  FOR SELECT
  USING (
    public.user_role() = 'consultant'
    AND id = public.consultant_id()
  );

-- Pas de INSERT/DELETE/UPDATE côté consultant sur sa propre fiche (V1 lecture seule).
-- V1.5 pourra ouvrir UPDATE sur quelques champs (phone, linkedin_url, languages).

-- =========================================================================
-- CONSULTANT_SKILLS / EXPERIENCES / EDUCATIONS : lecture seule sur ses propres data
-- =========================================================================

DROP POLICY IF EXISTS skills_self_select ON consultant_skills;
CREATE POLICY skills_self_select ON consultant_skills
  FOR SELECT USING (
    public.user_role() = 'consultant'
    AND consultant_id = public.consultant_id()
  );

DROP POLICY IF EXISTS exp_self_select ON consultant_experiences;
CREATE POLICY exp_self_select ON consultant_experiences
  FOR SELECT USING (
    public.user_role() = 'consultant'
    AND consultant_id = public.consultant_id()
  );

DROP POLICY IF EXISTS edu_self_select ON consultant_educations;
CREATE POLICY edu_self_select ON consultant_educations
  FOR SELECT USING (
    public.user_role() = 'consultant'
    AND consultant_id = public.consultant_id()
  );

-- =========================================================================
-- CONSULTANT_DOCUMENTS : consultant ne voit que les docs avec visible_to_consultant=true
-- =========================================================================

DROP POLICY IF EXISTS docs_self_select ON consultant_documents;
CREATE POLICY docs_self_select ON consultant_documents
  FOR SELECT USING (
    public.user_role() = 'consultant'
    AND consultant_id = public.consultant_id()
    AND visible_to_consultant = true
  );

-- Policies Storage pour le bucket consultant-documents (mise à jour pour permettre
-- au consultant de lire les fichiers dont la DB row a visible_to_consultant=true)

DROP POLICY IF EXISTS consultant_docs_select_self ON storage.objects;
CREATE POLICY consultant_docs_select_self ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'consultant-documents'
    AND public.user_role() = 'consultant'
    AND EXISTS (
      SELECT 1 FROM public.consultant_documents d
      WHERE d.storage_path = name
        AND d.consultant_id = public.consultant_id()
        AND d.visible_to_consultant = true
    )
  );

-- =========================================================================
-- MISSIONS : consultant voit ses propres missions (pour afficher les contrats)
-- =========================================================================

DROP POLICY IF EXISTS missions_self_select ON missions;
CREATE POLICY missions_self_select ON missions
  FOR SELECT USING (
    public.user_role() = 'consultant'
    AND consultant_id = public.consultant_id()
  );

-- =========================================================================
-- CONTRACTS : consultant voit ses contrats
-- La table contracts a été introduite dans 003_contracts.sql, on suppose
-- une colonne mission_id ou consultant_id. On regarde les deux possibilités.
-- =========================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='contracts' AND column_name='consultant_id'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS contracts_self_select ON contracts';
    EXECUTE $POL$
      CREATE POLICY contracts_self_select ON contracts
        FOR SELECT USING (
          public.user_role() = 'consultant'
          AND consultant_id = public.consultant_id()
        )
    $POL$;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='contracts' AND column_name='mission_id'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS contracts_self_select ON contracts';
    EXECUTE $POL$
      CREATE POLICY contracts_self_select ON contracts
        FOR SELECT USING (
          public.user_role() = 'consultant'
          AND mission_id IN (
            SELECT id FROM missions WHERE consultant_id = public.consultant_id()
          )
        )
    $POL$;
  END IF;
END $$;

-- =========================================================================
-- TIMESHEETS : consultant peut lire, créer, éditer ses CRA dans les limites
-- =========================================================================

DROP POLICY IF EXISTS timesheets_self_select ON timesheets;
CREATE POLICY timesheets_self_select ON timesheets
  FOR SELECT USING (
    public.user_role() = 'consultant'
    AND consultant_id = public.consultant_id()
  );

DROP POLICY IF EXISTS timesheets_self_insert ON timesheets;
CREATE POLICY timesheets_self_insert ON timesheets
  FOR INSERT
  WITH CHECK (
    public.user_role() = 'consultant'
    AND consultant_id = public.consultant_id()
    AND status = 'draft'
    -- Le consultant ne peut créer un CRA que pour une de ses missions
    AND mission_id IN (
      SELECT id FROM missions WHERE consultant_id = public.consultant_id()
    )
  );

DROP POLICY IF EXISTS timesheets_self_update ON timesheets;
CREATE POLICY timesheets_self_update ON timesheets
  FOR UPDATE
  USING (
    -- Lignes éditables par le consultant : ses CRA en draft ou rejected
    public.user_role() = 'consultant'
    AND consultant_id = public.consultant_id()
    AND status IN ('draft', 'rejected')
  )
  WITH CHECK (
    -- Après update : toujours son CRA, statut cible draft (édition) ou submitted (soumission)
    public.user_role() = 'consultant'
    AND consultant_id = public.consultant_id()
    AND status IN ('draft', 'submitted')
  );

-- Pas de DELETE côté consultant.

-- =========================================================================
-- TIMESHEET_DAYS : idem, via la relation timesheet
-- =========================================================================

DROP POLICY IF EXISTS timesheet_days_self_select ON timesheet_days;
CREATE POLICY timesheet_days_self_select ON timesheet_days
  FOR SELECT USING (
    public.user_role() = 'consultant'
    AND EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.id = timesheet_id
        AND t.consultant_id = public.consultant_id()
    )
  );

DROP POLICY IF EXISTS timesheet_days_self_write ON timesheet_days;
CREATE POLICY timesheet_days_self_write ON timesheet_days
  FOR ALL
  USING (
    public.user_role() = 'consultant'
    AND EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.id = timesheet_id
        AND t.consultant_id = public.consultant_id()
        AND t.status IN ('draft', 'rejected')
    )
  )
  WITH CHECK (
    public.user_role() = 'consultant'
    AND EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.id = timesheet_id
        AND t.consultant_id = public.consultant_id()
        AND t.status IN ('draft', 'rejected', 'submitted')
    )
  );

-- =========================================================================
-- INVOICES : consultant voit uniquement les factures 'paid' liées à ses missions
-- =========================================================================

DROP POLICY IF EXISTS invoices_self_select ON invoices;
CREATE POLICY invoices_self_select ON invoices
  FOR SELECT USING (
    public.user_role() = 'consultant'
    AND status = 'paid'
    AND mission_id IN (
      SELECT id FROM missions WHERE consultant_id = public.consultant_id()
    )
  );

-- Pas de INSERT/UPDATE/DELETE côté consultant.

-- =========================================================================
-- INVOICE_ITEMS : suivent la visibilité de la facture parente
-- =========================================================================

DROP POLICY IF EXISTS invoice_items_self_select ON invoice_items;
CREATE POLICY invoice_items_self_select ON invoice_items
  FOR SELECT USING (
    public.user_role() = 'consultant'
    AND EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_id
        AND i.status = 'paid'
        AND i.mission_id IN (
          SELECT id FROM missions WHERE consultant_id = public.consultant_id()
        )
    )
  );

-- =========================================================================
-- PROFILES : un consultant ne peut lire que son propre profile
-- =========================================================================
-- (Les admins continuent de voir tous les profiles de leur org via la policy
--  profiles_select_same_org déjà en place.)

-- Pas de nouvelle policy à créer : la policy existante
--   profiles_select_same_org USING (organization_id = public.organization_id() OR id = auth.uid())
-- couvre déjà le cas consultant (il voit son propre profile via id = auth.uid()).
