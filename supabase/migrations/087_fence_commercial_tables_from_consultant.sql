-- =========================================================================
-- 087 — CORRECTIF SÉCURITÉ : fence consultant sur les tables commerciales
-- -------------------------------------------------------------------------
-- FAILLE : companies, contacts, job_offers, opportunities, tags (+ jonctions
-- contact_tags, opportunity_consultants) avaient des policies FOR ALL basees
-- uniquement sur organization_id(), SANS fence consultant. Or un compte
-- PORTAIL consultant est membre de l'org (profiles.organization_id renseigne)
-- → via PostgREST (clé anon + son JWT), il pouvait LIRE et ÉCRIRE tout le CRM
-- de l'ESN (contacts clients, sociétés, opportunités, appels d'offres),
-- alors que son UI ne l'expose pas. Exposition de données intra-tenant.
--
-- CORRECTIF : on aligne ces tables sur le modèle deja applique a `consultants`
-- (migration 012) et `consultant_documents` : acces reserve aux roles INTERNES
-- (user_role() <> 'consultant'). Non-regressif pour admin/business_manager/
-- recruiter/finance/viewer qui continuent d'operer normalement.
-- =========================================================================

DROP POLICY IF EXISTS companies_org ON companies;
CREATE POLICY companies_org ON companies
  FOR ALL USING (organization_id = organization_id() AND user_role() <> 'consultant'::user_role);

DROP POLICY IF EXISTS contacts_org ON contacts;
CREATE POLICY contacts_org ON contacts
  FOR ALL USING (organization_id = organization_id() AND user_role() <> 'consultant'::user_role);

DROP POLICY IF EXISTS offers_org ON job_offers;
CREATE POLICY offers_org ON job_offers
  FOR ALL USING (organization_id = organization_id() AND user_role() <> 'consultant'::user_role);

DROP POLICY IF EXISTS opps_org ON opportunities;
CREATE POLICY opps_org ON opportunities
  FOR ALL USING (organization_id = organization_id() AND user_role() <> 'consultant'::user_role);

DROP POLICY IF EXISTS tags_org ON tags;
CREATE POLICY tags_org ON tags
  FOR ALL USING (organization_id = organization_id() AND user_role() <> 'consultant'::user_role);

DROP POLICY IF EXISTS contact_tags_org ON contact_tags;
CREATE POLICY contact_tags_org ON contact_tags
  FOR ALL USING (
    user_role() <> 'consultant'::user_role
    AND EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_tags.contact_id AND c.organization_id = organization_id()
    )
  );

DROP POLICY IF EXISTS opp_consultants_org ON opportunity_consultants;
CREATE POLICY opp_consultants_org ON opportunity_consultants
  FOR ALL USING (
    user_role() <> 'consultant'::user_role
    AND EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = opportunity_consultants.opportunity_id AND o.organization_id = organization_id()
    )
  );
