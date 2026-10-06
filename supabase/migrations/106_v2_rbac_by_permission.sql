-- =========================================================================
-- 106 — RBAC : la base suit la matrice de permissions
-- -------------------------------------------------------------------------
-- Plusieurs policies et le trigger de transition des CRA listaient des
-- rôles en dur, en décalage avec la matrice (lib/auth/permissions.ts,
-- table role_permission_defaults) :
--   - la Direction a « Valider les CRA » dans la matrice, mais le trigger
--     check_timesheet_transition ne laissait valider que admin et BM ;
--   - contracts_write ne laissait écrire que admin et BM, alors que la
--     matrice donne « documents.edit » à la Direction, au recruteur et à la
--     finance ;
--   - invoices_write ignorait la Direction, qui valide pourtant les CRA (la
--     validation crée la préfacture client).
-- Les décisions passent désormais par public.has_permission() : matrice par
-- défaut et surcharges de l'organisation, propriétaire compris. Ajouter un
-- rôle revient à publier ses lignes dans role_permission_defaults.
--
-- Effets avec la matrice par défaut :
--   - CRA : la Direction peut valider et renvoyer (bug corrigé) ;
--   - contrats : Direction, recruteur et finance peuvent les écrire
--     (documents.edit), comme la matrice le prévoit ;
--   - préfactures : la Direction peut les créer en validant un CRA ;
--   - Commercial et Opérations (105) reçoivent leurs droits.
-- Aucun rôle existant ne perd de droit. Une organisation qui retire une
-- permission la voit désormais appliquée aussi par la base.
--
-- ⚠ À APPLIQUER SUR VALIDATION EXPLICITE (staging d'abord), après 105.
-- Idempotente.
-- =========================================================================

-- ── 1. Rôles surchargeables par une organisation ─────────────────────────
ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_check
  CHECK (role IN ('admin', 'direction', 'business_manager', 'commercial', 'recruiter', 'operations', 'finance', 'viewer'));

-- ── 2. Policies : une permission plutôt qu'une liste de rôles ────────────
DROP POLICY IF EXISTS consultants_insert ON public.consultants;
CREATE POLICY consultants_insert ON public.consultants
  FOR INSERT WITH CHECK (
    organization_id = public.organization_id()
    AND public.has_permission('consultants.edit')
  );

DROP POLICY IF EXISTS consultants_update ON public.consultants;
CREATE POLICY consultants_update ON public.consultants
  FOR UPDATE USING (
    organization_id = public.organization_id()
    AND public.has_permission('consultants.edit')
  );

-- CRA : ceux qui valident, et la finance (suivi de facturation).
DROP POLICY IF EXISTS timesheets_write ON public.timesheets;
CREATE POLICY timesheets_write ON public.timesheets
  FOR ALL USING (
    organization_id = public.organization_id()
    AND (public.has_permission('timesheets.validate') OR public.has_permission('finance.edit'))
  );

-- Préfactures : la finance, et ceux qui valident les CRA (la validation crée la préfacture).
DROP POLICY IF EXISTS invoices_write ON public.invoices;
CREATE POLICY invoices_write ON public.invoices
  FOR ALL USING (
    organization_id = public.organization_id()
    AND (public.has_permission('finance.edit') OR public.has_permission('timesheets.validate'))
  );

DROP POLICY IF EXISTS contracts_write ON public.contracts;
CREATE POLICY contracts_write ON public.contracts
  FOR ALL USING (
    organization_id = public.organization_id()
    AND public.has_permission('documents.edit')
  );

DROP POLICY IF EXISTS consultant_docs_insert ON storage.objects;
CREATE POLICY consultant_docs_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'consultant-documents'
    AND (storage.foldername(name))[1] = public.organization_id()::text
    AND public.has_permission('consultants.edit')
  );

DROP POLICY IF EXISTS consultant_docs_delete ON storage.objects;
CREATE POLICY consultant_docs_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'consultant-documents'
    AND (storage.foldername(name))[1] = public.organization_id()::text
    AND public.has_permission('consultants.edit')
  );

-- ── 3. Transitions de CRA : la permission « Valider les CRA » ────────────
-- Même matrice de transitions qu'en 009 ; seul le « qui valide » change :
-- la permission (matrice + surcharges) au lieu de la liste admin / BM.
CREATE OR REPLACE FUNCTION public.check_timesheet_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role user_role;
  v_validator boolean;
BEGIN
  -- public.user_role() peut être NULL en contexte service_role (migrations,
  -- seed, Edge Functions) : on laisse passer, comme avant.
  BEGIN
    v_role := public.user_role();
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;
  IF v_role IS NULL THEN
    RETURN NEW;
  END IF;

  v_validator := v_role <> 'consultant'::user_role AND public.has_permission('timesheets.validate');

  IF TG_OP = 'INSERT' THEN
    IF v_role = 'consultant'::user_role THEN
      IF NEW.status NOT IN ('draft') THEN
        RAISE EXCEPTION 'CRA : un consultant ne peut créer qu''un CRA en statut draft (reçu : %)', NEW.status
          USING ERRCODE = 'check_violation';
      END IF;
    ELSIF v_validator THEN
      IF NEW.status NOT IN ('draft', 'submitted', 'client_validated') THEN
        RAISE EXCEPTION 'CRA : statut initial invalide (reçu : %)', NEW.status
          USING ERRCODE = 'check_violation';
      END IF;
    ELSE
      RAISE EXCEPTION 'CRA : rôle % non autorisé à créer un CRA', v_role
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'draft'    AND NEW.status = 'submitted' THEN RETURN NEW; END IF;
  IF OLD.status = 'rejected' AND NEW.status = 'draft'     THEN RETURN NEW; END IF;

  IF OLD.status = 'submitted' AND NEW.status = 'client_validated' THEN
    IF v_validator THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'CRA : valider un CRA demande la permission « Valider les CRA »'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF OLD.status = 'submitted' AND NEW.status = 'rejected' THEN
    IF v_validator THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'CRA : renvoyer un CRA demande la permission « Valider les CRA »'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RAISE EXCEPTION 'CRA : transition interdite % → %', OLD.status, NEW.status
    USING ERRCODE = 'check_violation';
END;
$$;

-- ── 4. Matrice par défaut (générée : npx tsx scripts/v2-permissions-sql.ts) ─
-- Remplacée intégralement à chaque migration RBAC : DELETE puis INSERT.
DELETE FROM public.role_permission_defaults;
INSERT INTO public.role_permission_defaults (role, permission) VALUES
  ('owner', 'dashboard.view'),
  ('owner', 'crm.view'),
  ('owner', 'crm.edit'),
  ('owner', 'clients.view'),
  ('owner', 'clients.edit'),
  ('owner', 'opportunities.view'),
  ('owner', 'opportunities.edit'),
  ('owner', 'consultants.view'),
  ('owner', 'consultants.edit'),
  ('owner', 'consultants.financials'),
  ('owner', 'staffing.view'),
  ('owner', 'staffing.edit'),
  ('owner', 'missions.view'),
  ('owner', 'missions.edit'),
  ('owner', 'timesheets.view'),
  ('owner', 'timesheets.validate'),
  ('owner', 'documents.view'),
  ('owner', 'documents.edit'),
  ('owner', 'finance.view'),
  ('owner', 'finance.edit'),
  ('owner', 'portals.manage'),
  ('owner', 'automations.manage'),
  ('owner', 'analytics.view'),
  ('owner', 'settings.manage'),
  ('owner', 'team.manage'),
  ('owner', 'billing.manage'),
  ('owner', 'org.delete'),
  ('admin', 'dashboard.view'),
  ('admin', 'crm.view'),
  ('admin', 'crm.edit'),
  ('admin', 'clients.view'),
  ('admin', 'clients.edit'),
  ('admin', 'opportunities.view'),
  ('admin', 'opportunities.edit'),
  ('admin', 'consultants.view'),
  ('admin', 'consultants.edit'),
  ('admin', 'consultants.financials'),
  ('admin', 'staffing.view'),
  ('admin', 'staffing.edit'),
  ('admin', 'missions.view'),
  ('admin', 'missions.edit'),
  ('admin', 'timesheets.view'),
  ('admin', 'timesheets.validate'),
  ('admin', 'documents.view'),
  ('admin', 'documents.edit'),
  ('admin', 'finance.view'),
  ('admin', 'finance.edit'),
  ('admin', 'portals.manage'),
  ('admin', 'automations.manage'),
  ('admin', 'analytics.view'),
  ('admin', 'settings.manage'),
  ('admin', 'team.manage'),
  ('admin', 'billing.manage'),
  ('direction', 'dashboard.view'),
  ('direction', 'crm.view'),
  ('direction', 'clients.view'),
  ('direction', 'opportunities.view'),
  ('direction', 'consultants.view'),
  ('direction', 'staffing.view'),
  ('direction', 'missions.view'),
  ('direction', 'timesheets.view'),
  ('direction', 'documents.view'),
  ('direction', 'finance.view'),
  ('direction', 'analytics.view'),
  ('direction', 'crm.edit'),
  ('direction', 'clients.edit'),
  ('direction', 'opportunities.edit'),
  ('direction', 'consultants.edit'),
  ('direction', 'consultants.financials'),
  ('direction', 'staffing.edit'),
  ('direction', 'missions.edit'),
  ('direction', 'timesheets.validate'),
  ('direction', 'documents.edit'),
  ('direction', 'automations.manage'),
  ('business_manager', 'dashboard.view'),
  ('business_manager', 'crm.view'),
  ('business_manager', 'crm.edit'),
  ('business_manager', 'clients.view'),
  ('business_manager', 'clients.edit'),
  ('business_manager', 'opportunities.view'),
  ('business_manager', 'opportunities.edit'),
  ('business_manager', 'consultants.view'),
  ('business_manager', 'consultants.edit'),
  ('business_manager', 'consultants.financials'),
  ('business_manager', 'staffing.view'),
  ('business_manager', 'staffing.edit'),
  ('business_manager', 'missions.view'),
  ('business_manager', 'missions.edit'),
  ('business_manager', 'timesheets.view'),
  ('business_manager', 'timesheets.validate'),
  ('business_manager', 'documents.view'),
  ('business_manager', 'documents.edit'),
  ('business_manager', 'finance.view'),
  ('business_manager', 'portals.manage'),
  ('business_manager', 'analytics.view'),
  ('commercial', 'dashboard.view'),
  ('commercial', 'crm.view'),
  ('commercial', 'crm.edit'),
  ('commercial', 'clients.view'),
  ('commercial', 'clients.edit'),
  ('commercial', 'opportunities.view'),
  ('commercial', 'opportunities.edit'),
  ('commercial', 'consultants.view'),
  ('commercial', 'consultants.financials'),
  ('commercial', 'staffing.view'),
  ('commercial', 'staffing.edit'),
  ('commercial', 'missions.view'),
  ('commercial', 'documents.view'),
  ('commercial', 'documents.edit'),
  ('commercial', 'analytics.view'),
  ('recruiter', 'dashboard.view'),
  ('recruiter', 'crm.view'),
  ('recruiter', 'clients.view'),
  ('recruiter', 'opportunities.view'),
  ('recruiter', 'consultants.view'),
  ('recruiter', 'consultants.edit'),
  ('recruiter', 'staffing.view'),
  ('recruiter', 'staffing.edit'),
  ('recruiter', 'missions.view'),
  ('recruiter', 'timesheets.view'),
  ('recruiter', 'documents.view'),
  ('recruiter', 'documents.edit'),
  ('operations', 'dashboard.view'),
  ('operations', 'clients.view'),
  ('operations', 'opportunities.view'),
  ('operations', 'consultants.view'),
  ('operations', 'consultants.edit'),
  ('operations', 'staffing.view'),
  ('operations', 'missions.view'),
  ('operations', 'missions.edit'),
  ('operations', 'timesheets.view'),
  ('operations', 'timesheets.validate'),
  ('operations', 'documents.view'),
  ('operations', 'documents.edit'),
  ('operations', 'finance.view'),
  ('operations', 'portals.manage'),
  ('finance', 'dashboard.view'),
  ('finance', 'clients.view'),
  ('finance', 'opportunities.view'),
  ('finance', 'consultants.view'),
  ('finance', 'consultants.financials'),
  ('finance', 'missions.view'),
  ('finance', 'timesheets.view'),
  ('finance', 'documents.view'),
  ('finance', 'documents.edit'),
  ('finance', 'finance.view'),
  ('finance', 'finance.edit'),
  ('finance', 'analytics.view'),
  ('viewer', 'dashboard.view'),
  ('viewer', 'crm.view'),
  ('viewer', 'clients.view'),
  ('viewer', 'opportunities.view'),
  ('viewer', 'consultants.view'),
  ('viewer', 'staffing.view'),
  ('viewer', 'missions.view'),
  ('viewer', 'timesheets.view'),
  ('viewer', 'documents.view'),
  ('viewer', 'analytics.view')
ON CONFLICT DO NOTHING;
