-- =========================================================================
-- Tests de sécurité V2 (RLS, RBAC, portails) — à exécuter sur une base
-- vierge après toutes les migrations. Chaque vérification lève une
-- exception en cas d'échec (ASSERT). Exécuté en CI locale via PGlite
-- (scripts/db-check) ou manuellement : psql -f supabase/tests/v2_rls.test.sql
-- =========================================================================

-- ── Jeu de données (superutilisateur : RLS ignorée) ──────────────────────
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000a001', 'owner@a.test'),
  ('00000000-0000-0000-0000-00000000a002', 'bm@a.test'),
  ('00000000-0000-0000-0000-00000000a003', 'rec@a.test'),
  ('00000000-0000-0000-0000-00000000a004', 'dir@a.test'),
  ('00000000-0000-0000-0000-00000000a005', 'cons@a.test'),
  ('00000000-0000-0000-0000-00000000a006', 'client@a.test'),
  ('00000000-0000-0000-0000-00000000b001', 'admin@b.test');

INSERT INTO organizations (id, name, slug) VALUES
  ('0000000a-0000-0000-0000-000000000000', 'ESN A', 'esn-a'),
  ('0000000b-0000-0000-0000-000000000000', 'ESN B', 'esn-b');

INSERT INTO organization_members (organization_id, user_id, role, joined_at) VALUES
  ('0000000a-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000a001', 'admin', now() - interval '3 days'),
  ('0000000a-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000a002', 'business_manager', now()),
  ('0000000a-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000a003', 'recruiter', now()),
  ('0000000a-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000a004', 'direction', now()),
  ('0000000a-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000a005', 'consultant', now()),
  ('0000000b-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000b001', 'admin', now());

INSERT INTO companies (id, organization_id, name) VALUES
  ('c000000a-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'Client Orange'),
  ('c000000a-0000-0000-0000-000000000002', '0000000a-0000-0000-0000-000000000000', 'Client Autre'),
  ('c000000b-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000000', 'Client de B');

INSERT INTO consultants (id, organization_id, first_name, last_name, job_title, contract_type, daily_rate_eur) VALUES
  ('d000000a-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'Camille', 'Martin', 'Dev', 'freelance', 650),
  ('d000000b-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000000', 'Bob', 'B', 'Dev', 'cdi', 500);

UPDATE profiles SET organization_id = '0000000a-0000-0000-0000-000000000000', role = 'admin' WHERE id = '00000000-0000-0000-0000-00000000a001';
UPDATE profiles SET organization_id = '0000000a-0000-0000-0000-000000000000', role = 'business_manager' WHERE id = '00000000-0000-0000-0000-00000000a002';
UPDATE profiles SET organization_id = '0000000a-0000-0000-0000-000000000000', role = 'recruiter' WHERE id = '00000000-0000-0000-0000-00000000a003';
UPDATE profiles SET organization_id = '0000000a-0000-0000-0000-000000000000', role = 'direction' WHERE id = '00000000-0000-0000-0000-00000000a004';
UPDATE profiles SET organization_id = '0000000a-0000-0000-0000-000000000000', role = 'consultant', consultant_id = 'd000000a-0000-0000-0000-000000000001' WHERE id = '00000000-0000-0000-0000-00000000a005';
UPDATE profiles SET role = 'client' WHERE id = '00000000-0000-0000-0000-00000000a006';
UPDATE profiles SET organization_id = '0000000b-0000-0000-0000-000000000000', role = 'admin' WHERE id = '00000000-0000-0000-0000-00000000b001';

INSERT INTO missions (id, organization_id, consultant_id, company_id, title, daily_rate_eur, start_date, end_date, status) VALUES
  ('e000000a-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'd000000a-0000-0000-0000-000000000001',
   'c000000a-0000-0000-0000-000000000001', 'Refonte SI', 780, CURRENT_DATE - 30, CURRENT_DATE + 20, 'active');
INSERT INTO mission_financials (mission_id, organization_id, daily_cost_eur) VALUES
  ('e000000a-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000000', 600); -- org forcée par trigger
INSERT INTO consultant_financials (consultant_id, organization_id, daily_cost_eur) VALUES
  ('d000000a-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 600);

INSERT INTO client_portal_users (user_id, organization_id, company_id, email) VALUES
  ('00000000-0000-0000-0000-00000000a006', '0000000a-0000-0000-0000-000000000000', 'c000000a-0000-0000-0000-000000000001', 'client@a.test');
INSERT INTO client_requests (organization_id, company_id, title) VALUES
  ('0000000a-0000-0000-0000-000000000000', 'c000000a-0000-0000-0000-000000000001', 'Besoin data engineer'),
  ('0000000a-0000-0000-0000-000000000000', 'c000000a-0000-0000-0000-000000000002', 'Besoin autre société');

-- ── Vérifications structurelles ──────────────────────────────────────────
DO $$ BEGIN
  ASSERT (SELECT is_owner FROM organization_members WHERE user_id = '00000000-0000-0000-0000-00000000a001'), 'premier admin = propriétaire';
  ASSERT NOT (SELECT is_owner FROM organization_members WHERE user_id = '00000000-0000-0000-0000-00000000a002'), 'BM non propriétaire';
  ASSERT (SELECT organization_id FROM mission_financials WHERE mission_id = 'e000000a-0000-0000-0000-000000000001')
         = '0000000a-0000-0000-0000-000000000000', 'org des finances alignée sur la mission';
  ASSERT (SELECT count(*) FROM plans WHERE is_public AND id LIKE 'v2_%') = 4, '4 plans V2 publics';
  ASSERT (SELECT count(*) FROM plans WHERE is_public AND id IN ('starter', 'growth', 'enterprise')) = 0, 'plans historiques masqués';
END $$;

DO $$ BEGIN
  ASSERT (SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'quote_requests_plan_id_check') LIKE '%v2_team%',
         'demandes de démo acceptent les plans V2';
  ASSERT (SELECT count(*) FROM pg_constraint WHERE conrelid = 'public.quote_requests'::regclass AND contype = 'c'
            AND pg_get_constraintdef(oid) LIKE '%plan_id%') = 1, 'une seule contrainte plan_id';
END $$;

-- Devis : numérotation + totaux.
INSERT INTO quotes (id, organization_id, title, company_id, issue_date) VALUES
  ('f000000a-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000000', 'Proposition data', 'c000000a-0000-0000-0000-000000000001', '2026-10-01');
INSERT INTO quote_items (quote_id, description, quantity, unit_price) VALUES
  ('f000000a-0000-0000-0000-000000000001', 'Data engineer senior', 20, 750),
  ('f000000a-0000-0000-0000-000000000001', 'Cadrage', 2, 900);
DO $$ BEGIN
  ASSERT (SELECT number FROM quotes WHERE id = 'f000000a-0000-0000-0000-000000000001') = 'DEV-2026-0001', 'numéro de devis';
  ASSERT (SELECT total_ht FROM quotes WHERE id = 'f000000a-0000-0000-0000-000000000001') = 16800, 'total HT';
  ASSERT (SELECT total_ttc FROM quotes WHERE id = 'f000000a-0000-0000-0000-000000000001') = 20160, 'total TTC';
END $$;

-- ── Business manager : voit les finances de son organisation ─────────────
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a002', false);
DO $$ BEGIN
  ASSERT public.has_permission('consultants.financials'), 'BM : financials';
  ASSERT NOT public.has_permission('finance.edit'), 'BM : pas de finance.edit';
  ASSERT (SELECT count(*) FROM consultant_financials) = 1, 'BM lit le CJM';
  ASSERT (SELECT count(*) FROM mission_financials) = 1, 'BM lit les coûts mission';
  ASSERT (SELECT count(*) FROM client_requests) = 2, 'BM voit les demandes clients';
END $$;

-- ── Recruteur : pas d'accès aux finances, sauf surcharge ─────────────────
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a003', false);
DO $$ BEGIN
  ASSERT NOT public.has_permission('consultants.financials'), 'recruteur sans financials';
  ASSERT (SELECT count(*) FROM consultant_financials) = 0, 'recruteur ne lit pas le CJM';
  ASSERT (SELECT count(*) FROM mission_financials) = 0, 'recruteur ne lit pas les coûts';
  ASSERT (SELECT count(*) FROM consultants) = 1, 'recruteur lit les consultants de son org';
END $$;
RESET ROLE;
INSERT INTO role_permissions (organization_id, role, permission, allowed) VALUES
  ('0000000a-0000-0000-0000-000000000000', 'recruiter', 'consultants.financials', true),
  ('0000000a-0000-0000-0000-000000000000', 'recruiter', 'team.manage', true);
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a003', false);
DO $$ BEGIN
  ASSERT public.has_permission('consultants.financials'), 'surcharge accordée';
  ASSERT (SELECT count(*) FROM consultant_financials) = 1, 'surcharge appliquée par la RLS';
  ASSERT NOT public.has_permission('team.manage'), 'permission verrouillée non accordable';
END $$;

-- ── Direction : écriture consultants + validation CRA ────────────────────
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a004', false);
DO $$ BEGIN
  ASSERT public.effective_role() = 'direction', 'rôle effectif direction';
  ASSERT public.has_permission('timesheets.validate'), 'direction valide les CRA';
  UPDATE consultants SET sub_title = 'MAJ direction' WHERE id = 'd000000a-0000-0000-0000-000000000001';
  ASSERT (SELECT sub_title FROM consultants WHERE id = 'd000000a-0000-0000-0000-000000000001') = 'MAJ direction', 'direction modifie un consultant';
END $$;

-- ── Propriétaire : rôle effectif + transfert ─────────────────────────────
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a002', false);
DO $$
DECLARE failed boolean := false;
BEGIN
  BEGIN
    PERFORM public.transfer_org_ownership('0000000a-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000a002');
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  ASSERT failed, 'un non-propriétaire ne peut pas transférer';
END $$;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', false);
DO $$ BEGIN
  ASSERT public.effective_role() = 'owner', 'rôle effectif owner';
  ASSERT public.has_permission('org.delete'), 'owner peut supprimer l''org';
END $$;
SELECT public.transfer_org_ownership('0000000a-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000a004');
DO $$ BEGIN
  ASSERT public.effective_role() = 'admin', 'ancien owner redevient admin';
  ASSERT NOT public.has_permission('org.delete'), 'admin ne supprime pas l''org';
END $$;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a004', false);
DO $$ BEGIN
  ASSERT public.effective_role() = 'owner', 'nouveau propriétaire';
END $$;

-- ── Consultant : jamais le TJM de vente ni les coûts ─────────────────────
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a005', false);
DO $$
DECLARE r record;
BEGIN
  ASSERT (SELECT count(*) FROM missions) = 0, 'consultant ne lit pas missions';
  ASSERT (SELECT count(*) FROM mission_financials) = 0, 'consultant ne lit pas les coûts';
  ASSERT (SELECT count(*) FROM consultant_financials) = 0, 'consultant ne lit pas son CJM brut';
  SELECT * INTO r FROM public.portal_my_missions();
  ASSERT r.title = 'Refonte SI', 'mission visible via la fonction portail';
  ASSERT r.consultant_rate = 600, 'tarif indépendant = CJM';
  INSERT INTO timesheets (organization_id, mission_id, consultant_id, period_month, period_year, status)
  VALUES ('0000000a-0000-0000-0000-000000000000', 'e000000a-0000-0000-0000-000000000001',
          'd000000a-0000-0000-0000-000000000001', 9, 2026, 'draft');
  ASSERT (SELECT count(*) FROM timesheets) = 1, 'consultant crée son CRA';
END $$;

-- ── Client : périmètre strict de sa société ──────────────────────────────
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a006', false);
DO $$ BEGIN
  ASSERT public.organization_id() IS NULL, 'client sans organisation active';
  ASSERT public.client_company_id() = 'c000000a-0000-0000-0000-000000000001', 'société du client';
  ASSERT (SELECT count(*) FROM missions) = 0, 'client ne lit pas missions en direct';
  ASSERT (SELECT count(*) FROM consultants) = 0, 'client ne lit pas les consultants';
  ASSERT (SELECT count(*) FROM companies) = 0, 'client ne lit pas les sociétés';
  ASSERT (SELECT count(*) FROM quotes) = 0, 'client ne lit pas les devis en direct';
  ASSERT (SELECT count(*) FROM client_requests) = 1, 'client voit uniquement les demandes de sa société';
  ASSERT NOT public.has_permission('dashboard.view'), 'client sans permission interne';
END $$;

-- ── Autre organisation : isolation stricte ───────────────────────────────
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000b001', false);
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM consultants) = 1, 'org B ne voit que ses consultants';
  ASSERT (SELECT count(*) FROM missions) = 0, 'org B ne voit pas les missions de A';
  ASSERT (SELECT count(*) FROM consultant_financials) = 0, 'org B ne voit pas les finances de A';
  ASSERT (SELECT count(*) FROM client_requests) = 0, 'org B ne voit pas les demandes de A';
  ASSERT (SELECT count(*) FROM quotes) = 0, 'org B ne voit pas les devis de A';
  ASSERT (SELECT count(*) FROM role_permissions) = 0, 'org B ne voit pas les surcharges de A';
END $$;
DO $$
DECLARE failed boolean := false;
BEGIN
  BEGIN
    INSERT INTO mission_financials (mission_id, organization_id, daily_cost_eur)
    VALUES ('e000000a-0000-0000-0000-000000000001', '0000000b-0000-0000-0000-000000000000', 1);
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  ASSERT failed, 'org B ne peut pas écrire les finances d''une mission de A';
END $$;
RESET ROLE;

SELECT 'v2_rls: OK' AS result;
