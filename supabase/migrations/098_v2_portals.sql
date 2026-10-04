-- =========================================================================
-- 098 — Centrium V2 : portail client + confidentialité du portail consultant
-- -------------------------------------------------------------------------
-- PORTAIL CLIENT
--   Un utilisateur client n'est PAS membre de l'organisation et n'a pas
--   d'organisation active : la RLS existante lui refuse tout par défaut.
--   Son périmètre (une organisation, une société) est porté par
--   client_portal_users. Les pages du portail lisent les données côté
--   serveur, filtrées sur ce périmètre, avec une liste blanche de colonnes.
--
-- PORTAIL CONSULTANT
--   Le consultant ne lit plus la table missions en direct (elle contient le
--   TJM de vente). Il passe par portal_my_missions(), qui ne renvoie que des
--   colonnes non confidentielles. La policy d'insertion de CRA, qui
--   s'appuyait sur cette lecture, utilise désormais my_mission_ids().
-- =========================================================================

-- ── 1. Accès portail client ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_portal_users (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id      uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  email           text NOT NULL,
  invited_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz,
  revoked_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_client_portal_users_org ON public.client_portal_users (organization_id, company_id);

-- La société doit appartenir à l'organisation déclarée.
CREATE OR REPLACE FUNCTION public.check_client_portal_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.companies WHERE id = NEW.company_id AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'La société n''appartient pas à cette organisation' USING ERRCODE = '23514';
  END IF;
  IF NEW.contact_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.contacts WHERE id = NEW.contact_id AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Le contact n''appartient pas à cette organisation' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_client_portal_scope ON public.client_portal_users;
CREATE TRIGGER trg_client_portal_scope BEFORE INSERT OR UPDATE ON public.client_portal_users
  FOR EACH ROW EXECUTE FUNCTION public.check_client_portal_scope();

ALTER TABLE public.client_portal_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS client_portal_users_self ON public.client_portal_users;
CREATE POLICY client_portal_users_self ON public.client_portal_users
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS client_portal_users_manage ON public.client_portal_users;
CREATE POLICY client_portal_users_manage ON public.client_portal_users
  FOR SELECT USING (organization_id = public.organization_id() AND public.has_permission('portals.manage'));
-- Création / révocation : routes serveur (service_role) après contrôle
-- de permission ; aucune écriture directe depuis le navigateur.

CREATE OR REPLACE FUNCTION public.client_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT organization_id FROM public.client_portal_users
   WHERE user_id = auth.uid() AND revoked_at IS NULL
$$;

CREATE OR REPLACE FUNCTION public.client_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT company_id FROM public.client_portal_users
   WHERE user_id = auth.uid() AND revoked_at IS NULL
$$;

REVOKE ALL ON FUNCTION public.client_org_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.client_company_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_company_id() TO authenticated;

-- ── 2. Demandes clients ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_requests (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title           text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  description     text CHECK (description IS NULL OR char_length(description) <= 8000),
  skills          jsonb NOT NULL DEFAULT '[]'::jsonb,
  seniority       text,
  location        text,
  remote_policy   text,
  start_date      date,
  duration_months integer CHECK (duration_months IS NULL OR duration_months BETWEEN 1 AND 120),
  budget_eur      numeric(12, 2) CHECK (budget_eur IS NULL OR budget_eur >= 0),
  daily_rate_eur  numeric(10, 2) CHECK (daily_rate_eur IS NULL OR daily_rate_eur >= 0),
  status          text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'converted', 'declined')),
  opportunity_id  uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_requests_org ON public.client_requests (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_requests_company ON public.client_requests (company_id, created_at DESC);

ALTER TABLE public.opportunities DROP CONSTRAINT IF EXISTS opportunities_client_request_fk;
ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_client_request_fk
  FOREIGN KEY (client_request_id) REFERENCES public.client_requests(id) ON DELETE SET NULL;

ALTER TABLE public.client_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS client_requests_internal_read ON public.client_requests;
CREATE POLICY client_requests_internal_read ON public.client_requests
  FOR SELECT USING (organization_id = public.organization_id() AND public.has_permission('opportunities.view'));
DROP POLICY IF EXISTS client_requests_internal_update ON public.client_requests;
CREATE POLICY client_requests_internal_update ON public.client_requests
  FOR UPDATE USING (organization_id = public.organization_id() AND public.has_permission('opportunities.edit'))
  WITH CHECK (organization_id = public.organization_id() AND public.has_permission('opportunities.edit'));
DROP POLICY IF EXISTS client_requests_client_read ON public.client_requests;
CREATE POLICY client_requests_client_read ON public.client_requests
  FOR SELECT USING (
    organization_id = public.client_org_id() AND company_id = public.client_company_id()
  );
-- Création : route serveur du portail (crée aussi l'opportunité).

DROP TRIGGER IF EXISTS trg_client_requests_updated ON public.client_requests;
CREATE TRIGGER trg_client_requests_updated BEFORE UPDATE ON public.client_requests
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── 3. Portail consultant : missions sans données de vente ───────────────
CREATE OR REPLACE FUNCTION public.my_mission_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.missions WHERE consultant_id = public.consultant_id()
$$;
REVOKE ALL ON FUNCTION public.my_mission_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_mission_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_my_missions()
RETURNS TABLE (
  id              uuid,
  title           text,
  status          text,
  start_date      date,
  end_date        date,
  company_id      uuid,
  company_name    text,
  location        text,
  remote_policy   text,
  planned_days    numeric,
  contract_number text,
  -- Tarif du consultant (CJM), affiché uniquement aux indépendants.
  consultant_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT m.id, m.title, m.status, m.start_date, m.end_date, m.company_id, c.name,
         m.location, m.remote_policy, m.planned_days, m.contract_number,
         CASE WHEN k.contract_type IN ('freelance', 'portage', 'partner_esn') THEN f.daily_cost_eur END
    FROM public.missions m
    JOIN public.consultants k ON k.id = m.consultant_id
    LEFT JOIN public.companies c ON c.id = m.company_id
    LEFT JOIN public.mission_financials f ON f.mission_id = m.id
   WHERE m.consultant_id = public.consultant_id()
     AND public.consultant_id() IS NOT NULL
   ORDER BY m.start_date DESC
$$;
REVOKE ALL ON FUNCTION public.portal_my_missions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_my_missions() TO authenticated;

DROP POLICY IF EXISTS timesheets_self_insert ON public.timesheets;
CREATE POLICY timesheets_self_insert ON public.timesheets
  FOR INSERT WITH CHECK (
    public.user_role() = 'consultant'::user_role
    AND consultant_id = public.consultant_id()
    AND status = 'draft'::timesheet_status
    AND mission_id IN (SELECT public.my_mission_ids())
  );

-- Plus de lecture directe de missions par le consultant.
DROP POLICY IF EXISTS missions_self_select ON public.missions;
