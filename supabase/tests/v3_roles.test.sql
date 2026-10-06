-- =========================================================================
-- Tests des rôles Commercial et Opérations et de la RBAC par permission
-- (migrations 105-106). Jeu de données propre (ESN C), joué après
-- v2_rls.test.sql sur la même base.
-- =========================================================================

-- Superutilisateur sans session : triggers et RLS ignorés pour le jeu de données.
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', false);

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000c001', 'owner@c.test'),
  ('00000000-0000-0000-0000-00000000c002', 'dir@c.test'),
  ('00000000-0000-0000-0000-00000000c003', 'sales@c.test'),
  ('00000000-0000-0000-0000-00000000c004', 'ops@c.test'),
  ('00000000-0000-0000-0000-00000000c005', 'rec@c.test'),
  ('00000000-0000-0000-0000-00000000c006', 'fin@c.test');

INSERT INTO organizations (id, name, slug) VALUES ('0000000c-0000-0000-0000-000000000000', 'ESN C', 'esn-c');

INSERT INTO organization_members (organization_id, user_id, role, joined_at) VALUES
  ('0000000c-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000c001', 'admin', now() - interval '3 days'),
  ('0000000c-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000c002', 'direction', now()),
  ('0000000c-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000c003', 'commercial', now()),
  ('0000000c-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000c004', 'operations', now()),
  ('0000000c-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000c005', 'recruiter', now()),
  ('0000000c-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000c006', 'finance', now());

UPDATE profiles SET organization_id = '0000000c-0000-0000-0000-000000000000', role = 'admin' WHERE id = '00000000-0000-0000-0000-00000000c001';
UPDATE profiles SET organization_id = '0000000c-0000-0000-0000-000000000000', role = 'direction' WHERE id = '00000000-0000-0000-0000-00000000c002';
UPDATE profiles SET organization_id = '0000000c-0000-0000-0000-000000000000', role = 'commercial' WHERE id = '00000000-0000-0000-0000-00000000c003';
UPDATE profiles SET organization_id = '0000000c-0000-0000-0000-000000000000', role = 'operations' WHERE id = '00000000-0000-0000-0000-00000000c004';
UPDATE profiles SET organization_id = '0000000c-0000-0000-0000-000000000000', role = 'recruiter' WHERE id = '00000000-0000-0000-0000-00000000c005';
UPDATE profiles SET organization_id = '0000000c-0000-0000-0000-000000000000', role = 'finance' WHERE id = '00000000-0000-0000-0000-00000000c006';

INSERT INTO consultants (id, organization_id, first_name, last_name, job_title) VALUES
  ('d000000c-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000000', 'Nora', 'Petit', 'Dev');
INSERT INTO missions (id, organization_id, consultant_id, title, daily_rate_eur, start_date, status) VALUES
  ('e000000c-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000000', 'd000000c-0000-0000-0000-000000000001', 'Run', 700, CURRENT_DATE - 200, 'active');
INSERT INTO timesheets (id, organization_id, mission_id, consultant_id, period_month, period_year, status) VALUES
  ('a000000c-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000000', 'e000000c-0000-0000-0000-000000000001', 'd000000c-0000-0000-0000-000000000001', 6, 2026, 'submitted'),
  ('a000000c-0000-0000-0000-000000000002', '0000000c-0000-0000-0000-000000000000', 'e000000c-0000-0000-0000-000000000001', 'd000000c-0000-0000-0000-000000000001', 7, 2026, 'submitted'),
  ('a000000c-0000-0000-0000-000000000003', '0000000c-0000-0000-0000-000000000000', 'e000000c-0000-0000-0000-000000000001', 'd000000c-0000-0000-0000-000000000001', 8, 2026, 'submitted'),
  ('a000000c-0000-0000-0000-000000000004', '0000000c-0000-0000-0000-000000000000', 'e000000c-0000-0000-0000-000000000001', 'd000000c-0000-0000-0000-000000000001', 9, 2026, 'submitted');
INSERT INTO contracts (id, organization_id, contract_number, title, start_date, daily_rate_eur) VALUES
  ('f000000c-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000000', 'CT-C-0001', 'Contrat Nora', CURRENT_DATE - 200, 600);

-- ── Matrice : ce que voient Commercial et Opérations ─────────────────────
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c003', false);
DO $$ BEGIN
  ASSERT public.effective_role() = 'commercial', 'rôle effectif commercial';
  ASSERT public.has_permission('crm.edit'), 'commercial : CRM';
  ASSERT public.has_permission('documents.edit'), 'commercial : propositions et contrats';
  ASSERT NOT public.has_permission('timesheets.validate'), 'commercial : pas de validation de CRA';
  ASSERT NOT public.has_permission('finance.view'), 'commercial : pas de pilotage financier';
END $$;
-- Le commercial ne valide pas de CRA (aucune ligne écrivable) et ne modifie pas les consultants…
UPDATE timesheets SET status = 'client_validated' WHERE id = 'a000000c-0000-0000-0000-000000000001';
UPDATE consultants SET sub_title = 'MAJ commercial' WHERE id = 'd000000c-0000-0000-0000-000000000001';
-- …mais met à jour un contrat (documents.edit).
UPDATE contracts SET title = 'Contrat Nora (révisé)' WHERE id = 'f000000c-0000-0000-0000-000000000001';

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c004', false);
DO $$ BEGIN
  ASSERT public.effective_role() = 'operations', 'rôle effectif opérations';
  ASSERT public.has_permission('timesheets.validate'), 'opérations : validation des CRA';
  ASSERT public.has_permission('portals.manage'), 'opérations : accès portail';
  ASSERT NOT public.has_permission('crm.edit'), 'opérations : pas de CRM en écriture';
  ASSERT NOT public.has_permission('finance.edit'), 'opérations : préfacturation en lecture';
END $$;
UPDATE timesheets SET status = 'client_validated' WHERE id = 'a000000c-0000-0000-0000-000000000002';
UPDATE timesheets SET status = 'rejected', rejection_reason = 'Jour manquant' WHERE id = 'a000000c-0000-0000-0000-000000000003';
UPDATE consultants SET sub_title = 'MAJ opérations' WHERE id = 'd000000c-0000-0000-0000-000000000001';
-- Isolation : rien d'une autre organisation.
UPDATE consultants SET sub_title = 'intrusion' WHERE id = 'd000000a-0000-0000-0000-000000000001';

-- ── Direction : valide les CRA (refusé par le trigger avant 106) ─────────
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c002', false);
UPDATE timesheets SET status = 'client_validated' WHERE id = 'a000000c-0000-0000-0000-000000000001';

-- ── Recruteur et finance : pas de validation ─────────────────────────────
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c005', false);
UPDATE timesheets SET status = 'client_validated' WHERE id = 'a000000c-0000-0000-0000-000000000004';
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c006', false);
DO $$
DECLARE failed boolean := false;
BEGIN
  BEGIN
    -- La finance écrit les CRA (suivi de facturation) mais ne les valide pas : le trigger refuse.
    UPDATE timesheets SET status = 'client_validated' WHERE id = 'a000000c-0000-0000-0000-000000000004';
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  ASSERT failed, 'la finance ne valide pas un CRA';
END $$;
RESET ROLE;

DO $$ BEGIN
  ASSERT (SELECT status FROM timesheets WHERE id = 'a000000c-0000-0000-0000-000000000001') = 'client_validated', 'la direction valide un CRA';
  ASSERT (SELECT status FROM timesheets WHERE id = 'a000000c-0000-0000-0000-000000000002') = 'client_validated', 'les opérations valident un CRA';
  ASSERT (SELECT status FROM timesheets WHERE id = 'a000000c-0000-0000-0000-000000000003') = 'rejected', 'les opérations renvoient un CRA';
  ASSERT (SELECT status FROM timesheets WHERE id = 'a000000c-0000-0000-0000-000000000004') = 'submitted', 'recruteur et finance ne valident pas';
  ASSERT (SELECT sub_title FROM consultants WHERE id = 'd000000c-0000-0000-0000-000000000001') = 'MAJ opérations', 'opérations modifient un consultant, pas le commercial';
  ASSERT (SELECT title FROM contracts WHERE id = 'f000000c-0000-0000-0000-000000000001') = 'Contrat Nora (révisé)', 'le commercial modifie un contrat';
  ASSERT (SELECT sub_title FROM consultants WHERE id = 'd000000a-0000-0000-0000-000000000001') IS DISTINCT FROM 'intrusion', 'aucune écriture dans une autre organisation';
END $$;

-- ── Surcharge d'organisation : appliquée par la base ─────────────────────
INSERT INTO role_permissions (organization_id, role, permission, allowed) VALUES
  ('0000000c-0000-0000-0000-000000000000', 'operations', 'timesheets.validate', false);
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c004', false);
DO $$ BEGIN
  ASSERT NOT public.has_permission('timesheets.validate'), 'surcharge : opérations sans validation';
END $$;
UPDATE timesheets SET status = 'client_validated' WHERE id = 'a000000c-0000-0000-0000-000000000004';
RESET ROLE;
DO $$ BEGIN
  ASSERT (SELECT status FROM timesheets WHERE id = 'a000000c-0000-0000-0000-000000000004') = 'submitted', 'la surcharge bloque la validation en base';
END $$;
SELECT set_config('request.jwt.claim.sub', '', false);

SELECT 'v3_roles: OK' AS result;
