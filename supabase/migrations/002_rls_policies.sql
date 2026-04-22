-- =========================================================================
-- QuadCore Platform – Row Level Security (RLS)
-- Migration: 002_rls_policies.sql
-- =========================================================================

-- Helper : récupérer l'organization_id du user courant
CREATE OR REPLACE FUNCTION public.organization_id() RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper : récupérer le rôle du user courant
CREATE OR REPLACE FUNCTION public.user_role() RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =========================================================================
-- ENABLE RLS
-- =========================================================================

ALTER TABLE organizations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_skills        ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_experiences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_educations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_versions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_templates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies                ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags             ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities            ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_consultants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_days           ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities               ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes                    ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- POLICIES GÉNÉRIQUES : isolation par organization_id
-- =========================================================================

-- Organizations : l'utilisateur voit uniquement son organisation
CREATE POLICY org_select_own ON organizations
  FOR SELECT USING (id = public.organization_id());

CREATE POLICY org_update_admin ON organizations
  FOR UPDATE USING (id = public.organization_id() AND public.user_role() = 'admin');

-- Profiles : on voit tous les profiles de son organisation
CREATE POLICY profiles_select_same_org ON profiles
  FOR SELECT USING (organization_id = public.organization_id() OR id = auth.uid());

CREATE POLICY profiles_update_self ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Policy INSERT : l'utilisateur peut créer son propre profile lors du signup
-- (utile car le trigger handle_new_user insère avec SECURITY DEFINER,
--  mais en fallback on autorise l'utilisateur à créer son propre profile)
CREATE POLICY profiles_insert_self ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY profiles_admin_all ON profiles
  FOR ALL USING (public.user_role() = 'admin' AND organization_id = public.organization_id());

-- =========================================================================
-- MACRO : policy standard lecture (tous rôles) + écriture (selon rôle)
-- =========================================================================

-- CONSULTANTS – lecture : tout le monde dans l'org ; écriture : admin, BM, recruiter
CREATE POLICY consultants_select ON consultants
  FOR SELECT USING (organization_id = public.organization_id());

CREATE POLICY consultants_insert ON consultants
  FOR INSERT WITH CHECK (
    organization_id = public.organization_id()
    AND public.user_role() IN ('admin', 'business_manager', 'recruiter')
  );

CREATE POLICY consultants_update ON consultants
  FOR UPDATE USING (
    organization_id = public.organization_id()
    AND public.user_role() IN ('admin', 'business_manager', 'recruiter')
  );

CREATE POLICY consultants_delete ON consultants
  FOR DELETE USING (
    organization_id = public.organization_id()
    AND public.user_role() = 'admin'
  );

-- Skills, documents, experiences, educations : policies héritées via consultant
CREATE POLICY skills_org ON consultant_skills
  FOR ALL USING (
    EXISTS (SELECT 1 FROM consultants c
            WHERE c.id = consultant_id
            AND c.organization_id = public.organization_id())
  );

CREATE POLICY docs_org ON consultant_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM consultants c
            WHERE c.id = consultant_id
            AND c.organization_id = public.organization_id())
  );

CREATE POLICY exp_org ON consultant_experiences
  FOR ALL USING (
    EXISTS (SELECT 1 FROM consultants c
            WHERE c.id = consultant_id
            AND c.organization_id = public.organization_id())
  );

CREATE POLICY edu_org ON consultant_educations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM consultants c
            WHERE c.id = consultant_id
            AND c.organization_id = public.organization_id())
  );

-- CV Versions
CREATE POLICY cv_versions_org ON cv_versions
  FOR ALL USING (organization_id = public.organization_id());

-- CV Templates : lecture pour tous
CREATE POLICY cv_templates_select ON cv_templates FOR SELECT USING (TRUE);

-- Companies, Contacts, Tags
CREATE POLICY companies_org ON companies
  FOR ALL USING (organization_id = public.organization_id());

CREATE POLICY contacts_org ON contacts
  FOR ALL USING (organization_id = public.organization_id());

CREATE POLICY tags_org ON tags
  FOR ALL USING (organization_id = public.organization_id());

CREATE POLICY contact_tags_org ON contact_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM contacts c
            WHERE c.id = contact_id
            AND c.organization_id = public.organization_id())
  );

-- Job offers, Opportunities, Missions
CREATE POLICY offers_org ON job_offers
  FOR ALL USING (organization_id = public.organization_id());

CREATE POLICY opps_org ON opportunities
  FOR ALL USING (organization_id = public.organization_id());

CREATE POLICY opp_consultants_org ON opportunity_consultants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM opportunities o
            WHERE o.id = opportunity_id
            AND o.organization_id = public.organization_id())
  );

CREATE POLICY missions_org ON missions
  FOR ALL USING (organization_id = public.organization_id());

-- Timesheets, Invoices : lecture org, écriture BM/Finance/Admin
CREATE POLICY timesheets_select ON timesheets
  FOR SELECT USING (organization_id = public.organization_id());

CREATE POLICY timesheets_write ON timesheets
  FOR ALL USING (
    organization_id = public.organization_id()
    AND public.user_role() IN ('admin', 'business_manager', 'finance')
  );

CREATE POLICY timesheet_days_org ON timesheet_days
  FOR ALL USING (
    EXISTS (SELECT 1 FROM timesheets t
            WHERE t.id = timesheet_id
            AND t.organization_id = public.organization_id())
  );

CREATE POLICY invoices_select ON invoices
  FOR SELECT USING (organization_id = public.organization_id());

CREATE POLICY invoices_write ON invoices
  FOR ALL USING (
    organization_id = public.organization_id()
    AND public.user_role() IN ('admin', 'finance', 'business_manager')
  );

CREATE POLICY invoice_items_org ON invoice_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM invoices i
            WHERE i.id = invoice_id
            AND i.organization_id = public.organization_id())
  );

-- Messages, Alerts, Activities, Notes
CREATE POLICY messages_org ON messages
  FOR ALL USING (organization_id = public.organization_id());

CREATE POLICY alerts_org ON alerts
  FOR ALL USING (organization_id = public.organization_id());

CREATE POLICY activities_org ON activities
  FOR ALL USING (organization_id = public.organization_id());

CREATE POLICY notes_org ON notes
  FOR ALL USING (organization_id = public.organization_id());
