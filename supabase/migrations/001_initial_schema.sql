-- =========================================================================
-- QuadCore Platform – Schéma initial
-- Migration: 001_initial_schema.sql
-- =========================================================================

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- ENUMS
-- =========================================================================

CREATE TYPE user_role AS ENUM (
  'admin',
  'business_manager',
  'recruiter',
  'finance',
  'viewer'
);

CREATE TYPE consultant_status AS ENUM (
  'available',
  'on_mission',
  'soon_available',
  'unavailable',
  'archived'
);

CREATE TYPE seniority_level AS ENUM (
  'junior',        -- 0-2 ans
  'confirmed',     -- 3-5 ans
  'senior',        -- 6-9 ans
  'expert',        -- 10+ ans
  'lead',
  'architect'
);

CREATE TYPE contract_type AS ENUM (
  'freelance',
  'cdi',
  'cdd',
  'portage',
  'partner_esn'
);

CREATE TYPE contact_type AS ENUM (
  'recruiter',
  'sales',
  'manager',
  'client_final',
  'esn_partner',
  'buyer',
  'hr',
  'consultant',
  'other'
);

CREATE TYPE opportunity_status AS ENUM (
  'new',
  'contacted',
  'discussion',
  'cv_sent',
  'client_interview',
  'negotiation',
  'won',
  'lost',
  'on_hold'
);

CREATE TYPE alert_type AS ENUM (
  'client_follow_up',
  'unanswered_message',
  'mission_ending',
  'consultant_available',
  'timesheet_pending',
  'invoice_overdue',
  'offer_stale',
  'opportunity_cold'
);

CREATE TYPE alert_priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE alert_status AS ENUM ('new', 'in_progress', 'resolved', 'dismissed');

CREATE TYPE invoice_status AS ENUM (
  'draft',
  'sent',
  'paid',
  'overdue',
  'cancelled'
);

CREATE TYPE timesheet_status AS ENUM (
  'draft',
  'submitted',
  'client_validated',
  'rejected'
);

CREATE TYPE cv_template_id AS ENUM ('standard', 'dense', 'executive');

-- =========================================================================
-- ORGANIZATIONS (multi-tenant)
-- =========================================================================

CREATE TABLE organizations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  logo_url     TEXT,
  address      TEXT,
  city         TEXT,
  postal_code  TEXT,
  country      TEXT DEFAULT 'FR',
  siren        TEXT,
  siret        TEXT,
  vat_number   TEXT,
  rcs          TEXT,
  capital_eur  NUMERIC(12, 2),
  plan         TEXT DEFAULT 'trial',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- PROFILES (étend auth.users Supabase)
-- =========================================================================

CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT UNIQUE NOT NULL,
  first_name      TEXT,
  last_name       TEXT,
  avatar_url      TEXT,
  role            user_role NOT NULL DEFAULT 'viewer',
  phone           TEXT,
  timezone        TEXT DEFAULT 'Europe/Paris',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_org ON profiles(organization_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- =========================================================================
-- CONSULTANTS
-- =========================================================================

CREATE TABLE consultants (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id             UUID REFERENCES profiles(id),          -- BM/recruteur référent
  first_name           TEXT NOT NULL,
  last_name            TEXT NOT NULL,
  initials             TEXT,                                  -- "A. S." pour anonymisation
  email                TEXT,
  phone                TEXT,
  linkedin_url         TEXT,
  job_title            TEXT NOT NULL,                         -- ex: "QA Automation Confirmé"
  sub_title            TEXT,                                  -- ex: "Playwright / TypeScript"
  seniority            seniority_level NOT NULL DEFAULT 'confirmed',
  years_experience     INTEGER NOT NULL DEFAULT 0,
  city                 TEXT,
  country              TEXT DEFAULT 'FR',
  mobility             TEXT,                                  -- ex: "IDF, remote 3j/semaine"
  languages            JSONB DEFAULT '[]'::jsonb,             -- [{code, level}]
  daily_rate_eur       NUMERIC(10, 2),                        -- TJM
  contract_type        contract_type,
  status               consultant_status NOT NULL DEFAULT 'available',
  available_from       DATE,
  current_client       TEXT,
  current_mission_end  DATE,
  summary              TEXT,                                  -- résumé exécutif validé
  internal_notes       TEXT,
  archived             BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consultants_org ON consultants(organization_id);
CREATE INDEX idx_consultants_status ON consultants(status);
CREATE INDEX idx_consultants_seniority ON consultants(seniority);
CREATE INDEX idx_consultants_available ON consultants(available_from) WHERE status IN ('available', 'soon_available');

-- Compétences (catégorisées)
CREATE TABLE consultant_skills (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id   UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,                              -- "languages", "frameworks", "cloud", …
  name            TEXT NOT NULL,                              -- "Playwright", "TypeScript", …
  level           INTEGER CHECK (level BETWEEN 1 AND 5),      -- 1=notions, 5=expert
  years           NUMERIC(3, 1),
  is_highlighted  BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skills_consultant ON consultant_skills(consultant_id);
CREATE INDEX idx_skills_name ON consultant_skills(name);

-- Documents (CV source, attestations, etc.)
CREATE TABLE consultant_documents (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id  UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL,                               -- "cv_source", "certification", "id", …
  file_name      TEXT NOT NULL,
  storage_path   TEXT NOT NULL,                               -- chemin dans Supabase Storage
  mime_type      TEXT,
  size_bytes     BIGINT,
  uploaded_by    UUID REFERENCES profiles(id),
  uploaded_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_docs_consultant ON consultant_documents(consultant_id);

-- Expériences professionnelles structurées
CREATE TABLE consultant_experiences (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id  UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  client_name    TEXT NOT NULL,
  role           TEXT NOT NULL,
  start_date     DATE NOT NULL,
  end_date       DATE,                                         -- NULL = en cours
  context        TEXT,
  tasks          JSONB DEFAULT '[]'::jsonb,                    -- ["bullet 1", "bullet 2"]
  environment    JSONB DEFAULT '[]'::jsonb,                    -- ["Playwright", "Jira"]
  order_index    INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exp_consultant ON consultant_experiences(consultant_id, start_date DESC);

-- Formations
CREATE TABLE consultant_educations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id  UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  year           INTEGER NOT NULL,
  degree         TEXT NOT NULL,
  institution    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- CV TEMPLATES & VERSIONS
-- =========================================================================

CREATE TABLE cv_templates (
  id              cv_template_id PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  preview_url     TEXT,
  is_active       BOOLEAN DEFAULT TRUE
);

CREATE TABLE cv_versions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  consultant_id   UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  template_id     cv_template_id NOT NULL DEFAULT 'standard',
  job_offer_id    UUID,                                        -- fk définie plus bas
  version_label   TEXT,                                        -- ex: "v1 pour BNP Paribas"
  content         JSONB NOT NULL,                              -- CV structuré (sections)
  matching_score  NUMERIC(5, 2),
  matched_skills  JSONB DEFAULT '[]'::jsonb,
  missing_skills  JSONB DEFAULT '[]'::jsonb,
  warnings        JSONB DEFAULT '[]'::jsonb,
  pdf_url         TEXT,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cv_versions_consultant ON cv_versions(consultant_id);
CREATE INDEX idx_cv_versions_offer ON cv_versions(job_offer_id);

-- =========================================================================
-- CLIENTS / COMPANIES / CONTACTS
-- =========================================================================

CREATE TABLE companies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  kind            TEXT DEFAULT 'client',                       -- 'client', 'esn_partner', 'prospect'
  industry        TEXT,
  size            TEXT,
  website         TEXT,
  linkedin_url    TEXT,
  address         TEXT,
  city            TEXT,
  country         TEXT,
  notes           TEXT,
  archived        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_org ON companies(organization_id);
CREATE INDEX idx_companies_kind ON companies(kind);

-- Contacts (recruteurs, commerciaux, clients finaux, …)
CREATE TABLE contacts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_id        UUID REFERENCES companies(id) ON DELETE SET NULL,
  owner_id          UUID REFERENCES profiles(id),
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  contact_type      contact_type NOT NULL DEFAULT 'other',
  job_title         TEXT,
  email             TEXT,
  phone             TEXT,
  linkedin_url      TEXT,
  city              TEXT,
  source            TEXT,                                      -- "LinkedIn", "Salon", "Référence"
  last_interaction  TIMESTAMPTZ,
  notes             TEXT,
  archived          BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_org ON contacts(organization_id);
CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_contacts_type ON contacts(contact_type);

-- Tags pour contacts (et autres entités)
CREATE TABLE tags (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  color           TEXT DEFAULT '#8b5cf6',
  UNIQUE(organization_id, name)
);

CREATE TABLE contact_tags (
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

-- =========================================================================
-- JOB OFFERS (appels d'offres reçus)
-- =========================================================================

CREATE TABLE job_offers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES companies(id),
  contact_id      UUID REFERENCES contacts(id),
  owner_id        UUID REFERENCES profiles(id),
  title           TEXT NOT NULL,
  description     TEXT,
  required_skills JSONB DEFAULT '[]'::jsonb,
  nice_to_have    JSONB DEFAULT '[]'::jsonb,
  seniority       seniority_level,
  daily_rate_min  NUMERIC(10, 2),
  daily_rate_max  NUMERIC(10, 2),
  location        TEXT,
  remote_days     INTEGER,
  start_date      DATE,
  duration_months INTEGER,
  deadline        DATE,
  status          TEXT DEFAULT 'open',                         -- 'open', 'closed', 'won', 'lost'
  source          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offers_org ON job_offers(organization_id);
CREATE INDEX idx_offers_status ON job_offers(status);

-- Lien CV ↔ offre (maintenant que job_offers existe)
ALTER TABLE cv_versions
  ADD CONSTRAINT fk_cv_offer FOREIGN KEY (job_offer_id)
  REFERENCES job_offers(id) ON DELETE SET NULL;

-- =========================================================================
-- OPPORTUNITIES (pipeline commercial)
-- =========================================================================

CREATE TABLE opportunities (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id          UUID REFERENCES profiles(id),
  company_id        UUID REFERENCES companies(id),
  contact_id        UUID REFERENCES contacts(id),
  job_offer_id      UUID REFERENCES job_offers(id),
  title             TEXT NOT NULL,
  status            opportunity_status NOT NULL DEFAULT 'new',
  priority          alert_priority DEFAULT 'medium',
  expected_revenue  NUMERIC(12, 2),
  probability       INTEGER CHECK (probability BETWEEN 0 AND 100),
  expected_close    DATE,
  next_follow_up    DATE,
  last_interaction  TIMESTAMPTZ,
  notes             TEXT,
  lost_reason       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_opps_org ON opportunities(organization_id);
CREATE INDEX idx_opps_status ON opportunities(status);
CREATE INDEX idx_opps_follow_up ON opportunities(next_follow_up);

CREATE TABLE opportunity_consultants (
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  consultant_id  UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  cv_version_id  UUID REFERENCES cv_versions(id),
  pitch          TEXT,
  sent_at        TIMESTAMPTZ,
  client_feedback TEXT,
  PRIMARY KEY (opportunity_id, consultant_id)
);

-- =========================================================================
-- MISSIONS (consultant en mission chez un client)
-- =========================================================================

CREATE TABLE missions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  consultant_id   UUID NOT NULL REFERENCES consultants(id),
  company_id      UUID NOT NULL REFERENCES companies(id),
  opportunity_id  UUID REFERENCES opportunities(id),
  title           TEXT NOT NULL,
  daily_rate_eur  NUMERIC(10, 2) NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE,
  contract_number TEXT,
  status          TEXT DEFAULT 'active',                        -- 'active', 'ended', 'suspended'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_missions_org ON missions(organization_id);
CREATE INDEX idx_missions_consultant ON missions(consultant_id);
CREATE INDEX idx_missions_status ON missions(status);

-- =========================================================================
-- TIMESHEETS (CRA) & INVOICES
-- =========================================================================

CREATE TABLE timesheets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mission_id      UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  consultant_id   UUID NOT NULL REFERENCES consultants(id),
  period_month    INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year     INTEGER NOT NULL,
  days_worked     NUMERIC(4, 2) DEFAULT 0,
  days_validated  NUMERIC(4, 2) DEFAULT 0,
  status          timesheet_status DEFAULT 'draft',
  client_signature_url TEXT,
  submitted_at    TIMESTAMPTZ,
  validated_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mission_id, period_year, period_month)
);

CREATE INDEX idx_ts_org ON timesheets(organization_id);
CREATE INDEX idx_ts_period ON timesheets(period_year, period_month);

CREATE TABLE timesheet_days (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timesheet_id   UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  day_date       DATE NOT NULL,
  duration       NUMERIC(3, 2) DEFAULT 1.0,                    -- 0, 0.5 ou 1.0
  note           TEXT,
  UNIQUE(timesheet_id, day_date)
);

CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id),
  mission_id      UUID REFERENCES missions(id),
  timesheet_id    UUID REFERENCES timesheets(id),
  invoice_number  TEXT NOT NULL,
  issue_date      DATE NOT NULL,
  due_date        DATE NOT NULL,
  period_label    TEXT,                                         -- "Mars 2026"
  amount_ht       NUMERIC(12, 2) NOT NULL,
  vat_rate        NUMERIC(5, 2) DEFAULT 20.0,
  amount_vat      NUMERIC(12, 2) NOT NULL,
  amount_ttc      NUMERIC(12, 2) NOT NULL,
  status          invoice_status DEFAULT 'draft',
  payment_date    DATE,
  payment_method  TEXT,
  pdf_url         TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, invoice_number)
);

CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due ON invoices(due_date) WHERE status IN ('sent', 'overdue');

CREATE TABLE invoice_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC(10, 2) NOT NULL,
  unit        TEXT DEFAULT 'jour',
  unit_price  NUMERIC(10, 2) NOT NULL,
  amount_ht   NUMERIC(12, 2) NOT NULL,
  order_index INTEGER DEFAULT 0
);

-- =========================================================================
-- MESSAGES, ALERTES, ACTIVITÉS, NOTES
-- =========================================================================

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id),
  opportunity_id  UUID REFERENCES opportunities(id),
  direction       TEXT CHECK (direction IN ('inbound', 'outbound')),
  channel         TEXT,                                         -- 'email', 'whatsapp', 'linkedin', 'phone'
  subject         TEXT,
  body            TEXT,
  is_read         BOOLEAN DEFAULT FALSE,
  received_at     TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES profiles(id)
);

CREATE INDEX idx_messages_org ON messages(organization_id);
CREATE INDEX idx_messages_unread ON messages(organization_id) WHERE is_read = FALSE;

CREATE TABLE alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assignee_id     UUID REFERENCES profiles(id),
  kind            alert_type NOT NULL,
  priority        alert_priority NOT NULL DEFAULT 'medium',
  status          alert_status NOT NULL DEFAULT 'new',
  title           TEXT NOT NULL,
  description     TEXT,
  due_date        DATE,
  -- Liens polymorphiques
  consultant_id   UUID REFERENCES consultants(id),
  opportunity_id  UUID REFERENCES opportunities(id),
  contact_id      UUID REFERENCES contacts(id),
  invoice_id      UUID REFERENCES invoices(id),
  timesheet_id    UUID REFERENCES timesheets(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX idx_alerts_org_status ON alerts(organization_id, status);
CREATE INDEX idx_alerts_priority ON alerts(priority);
CREATE INDEX idx_alerts_due ON alerts(due_date);

CREATE TABLE activities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES profiles(id),
  entity_type     TEXT NOT NULL,                                -- 'consultant', 'opportunity', …
  entity_id       UUID NOT NULL,
  action          TEXT NOT NULL,                                -- 'created', 'updated', 'cv_generated', …
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_activities_org_date ON activities(organization_id, created_at DESC);

CREATE TABLE notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id       UUID REFERENCES profiles(id),
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_entity ON notes(entity_type, entity_id);

-- =========================================================================
-- TRIGGERS updated_at
-- =========================================================================

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%I_updated
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION touch_updated_at()', t, t);
  END LOOP;
END $$;

-- =========================================================================
-- FUNCTION : création automatique du profile à l'inscription
-- =========================================================================
-- IMPORTANT : cette fonction DOIT être robuste, sinon Supabase Auth
-- annule la création de l'utilisateur. On attrape donc toutes les erreurs.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- On log mais on ne plante jamais la création du user
    RAISE WARNING 'handle_new_user failed for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Permissions nécessaires pour que SECURITY DEFINER fonctionne
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
