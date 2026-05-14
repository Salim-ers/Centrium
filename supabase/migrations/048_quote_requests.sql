-- =============================================================
-- 048_quote_requests.sql
--
-- 1) Ajoute le rôle 'super_admin' à l'enum user_role. Le super_admin
--    est l'opérateur de la plateforme (toi) — il crée les comptes
--    clients manuellement via /admin/clients après une demande de
--    devis. Aucune organisation ne lui est rattachée.
--
-- 2) Crée la table quote_requests pour collecter les demandes
--    publiques (formulaire /devis, sans auth). Insertable par anon,
--    lisible/éditable uniquement par super_admin.
-- =============================================================

-- 1) Enum user_role : ajout de 'super_admin'
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2) Table quote_requests
CREATE TABLE IF NOT EXISTS quote_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name    TEXT NOT NULL,
  industry        TEXT,
  team_size       TEXT,
  consultants_count TEXT,
  contact_name    TEXT NOT NULL,
  contact_email   TEXT NOT NULL,
  contact_phone   TEXT,
  contact_role    TEXT,
  message         TEXT,
  source          TEXT,
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'contacted', 'quoted', 'won', 'lost')),
  converted_to_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS quote_requests_status_idx
  ON quote_requests (status, created_at DESC);

ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE quote_requests IS
  'Demandes de devis publiques (prospects). Insertable sans auth via /devis. Le suivi vit dans le statut + converted_to_organization_id.';
