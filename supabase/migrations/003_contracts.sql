-- =========================================================================
-- QuadCore Platform – Module Contrats
-- Migration: 003_contracts.sql
-- =========================================================================

CREATE TYPE contract_status AS ENUM (
  'draft',           -- brouillon en rédaction
  'pending_review',  -- en attente de relecture interne
  'sent',            -- envoyé au fournisseur
  'signed',          -- signé par les deux parties
  'active',          -- en cours d'exécution
  'ended',           -- terminé normalement
  'terminated',      -- résilié avant échéance
  'cancelled'        -- annulé avant signature
);

CREATE TYPE contract_kind AS ENUM (
  'assistance_technique',  -- contrat d'AT (type QuadCore fourni)
  'apport_affaire',        -- apport d'affaires
  'sous_traitance',        -- sous-traitance
  'freelance_mission',     -- ordre de mission freelance
  'nda',                   -- accord de confidentialité
  'amendment'              -- avenant
);

-- =========================================================================
-- CONTRACTS
-- =========================================================================

CREATE TABLE contracts (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by             UUID REFERENCES profiles(id),

  -- Identification
  contract_number        TEXT NOT NULL,               -- ex: CT-2026-0042
  kind                   contract_kind NOT NULL DEFAULT 'assistance_technique',
  status                 contract_status NOT NULL DEFAULT 'draft',
  title                  TEXT NOT NULL,

  -- Parties
  consultant_id          UUID REFERENCES consultants(id),
  -- Fournisseur (société portage/freelance du consultant) :
  supplier_company_name  TEXT,
  supplier_address       TEXT,
  supplier_postal_code   TEXT,
  supplier_city          TEXT,
  supplier_rcs           TEXT,
  supplier_representative TEXT,
  supplier_email         TEXT,

  -- Mission
  mission_id             UUID REFERENCES missions(id),
  mission_title          TEXT,
  client_name            TEXT,                         -- client final
  client_address         TEXT,
  work_location          TEXT,                         -- adresse du lieu d'exécution
  remote_days_per_week   INTEGER DEFAULT 0,

  -- Période
  start_date             DATE NOT NULL,
  duration_months        INTEGER DEFAULT 3,
  end_date               DATE,

  -- Conditions financières
  daily_rate_eur         NUMERIC(10, 2) NOT NULL,
  payment_terms_days     INTEGER DEFAULT 30,           -- ex: 30, 45, 60
  billing_email          TEXT,

  -- Clauses particulières
  non_compete_months     INTEGER DEFAULT 12,
  non_compete_penalty    TEXT DEFAULT 'Indemnité égale au total des 6 dernières factures mensuelles',
  jurisdiction_city      TEXT DEFAULT 'Paris',

  -- Documents
  pdf_url                TEXT,
  signed_pdf_url         TEXT,
  signed_at              TIMESTAMPTZ,

  -- Métadonnées
  notes                  TEXT,
  archived               BOOLEAN DEFAULT FALSE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, contract_number)
);

CREATE INDEX idx_contracts_org ON contracts(organization_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_consultant ON contracts(consultant_id);
CREATE INDEX idx_contracts_mission ON contracts(mission_id);
CREATE INDEX idx_contracts_end_date ON contracts(end_date) WHERE status = 'active';

-- Trigger updated_at
CREATE TRIGGER trg_contracts_updated
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- =========================================================================
-- HISTORIQUE DES VERSIONS DE CONTRAT
-- =========================================================================

CREATE TABLE contract_versions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id  UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  version_num  INTEGER NOT NULL,
  changes      TEXT,                                   -- résumé des modifications
  snapshot     JSONB NOT NULL,                         -- snapshot complet du contrat
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, version_num)
);

CREATE INDEX idx_contract_versions ON contract_versions(contract_id, version_num DESC);

-- =========================================================================
-- RLS
-- =========================================================================

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY contracts_select ON contracts
  FOR SELECT USING (organization_id = auth.organization_id());

CREATE POLICY contracts_write ON contracts
  FOR ALL USING (
    organization_id = auth.organization_id()
    AND auth.user_role() IN ('admin', 'business_manager')
  );

CREATE POLICY contract_versions_org ON contract_versions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM contracts c
            WHERE c.id = contract_id
            AND c.organization_id = auth.organization_id())
  );

-- Seed des contrats de démo dans supabase/seed.sql (pas dans la migration)

