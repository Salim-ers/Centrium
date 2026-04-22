-- =========================================================================
-- 016 — Billing (plans + subscriptions Stripe)
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) Plans catalogue
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS plans (
  id                      TEXT PRIMARY KEY,                -- 'free', 'starter', 'pro', 'enterprise'
  name                    TEXT NOT NULL,
  price_monthly_eur       NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly_eur        NUMERIC(10,2),
  stripe_price_id         TEXT,                            -- price_xxx Stripe (monthly)
  stripe_price_yearly_id  TEXT,                            -- price_xxx Stripe (yearly, optionnel)
  max_consultants         INTEGER,                         -- NULL = illimité
  max_users               INTEGER,
  features                JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public               BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order              INTEGER NOT NULL DEFAULT 0
);

INSERT INTO plans (id, name, price_monthly_eur, max_consultants, max_users, features, sort_order) VALUES
  ('free',       'Free',        0,   3,    2,    '["3 consultants","Templates CV","Support email"]'::jsonb,                           0),
  ('starter',    'Starter',     49,  15,   5,    '["Tout Free","Matching IA","Pitch email IA","CRM"]'::jsonb,                          1),
  ('pro',        'Pro',         149, 50,   20,   '["Tout Starter","CRA","Factures","Multi-templates CV","Analyse skills IA"]'::jsonb, 2),
  ('enterprise', 'Enterprise',  0,   NULL, NULL, '["Sur devis","SSO","SLA 99.9%","Support dédié","Data residency"]'::jsonb,             3)
ON CONFLICT (id) DO NOTHING;

-- Plans lisibles par tout le monde (page /pricing publique)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plans_public_select ON plans;
CREATE POLICY plans_public_select ON plans FOR SELECT USING (is_public = TRUE);

-- -------------------------------------------------------------------------
-- 2) Subscriptions : 1 par organisation
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id        UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id                TEXT NOT NULL REFERENCES plans(id) DEFAULT 'free',
  stripe_customer_id     TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status                 TEXT NOT NULL DEFAULT 'trialing',  -- trialing|active|past_due|canceled|incomplete|unpaid
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT FALSE,
  trial_end              TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Les membres d'une org voient sa subscription
DROP POLICY IF EXISTS subs_select ON subscriptions;
CREATE POLICY subs_select ON subscriptions FOR SELECT
  USING (public.is_member_of(organization_id));

-- Aucune policy INSERT/UPDATE/DELETE : ces mutations passent uniquement
-- par le webhook Stripe côté serveur (service_role).

-- -------------------------------------------------------------------------
-- 3) Créer automatiquement une subscription "free/trial" à la création d'org
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO subscriptions (organization_id, plan_id, status)
  VALUES (NEW.id, 'free', 'trialing')
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_organization_created ON organizations;
CREATE TRIGGER on_organization_created
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION public.create_default_subscription();

-- Bootstrap : pour les orgs existantes sans subscription, en créer une
INSERT INTO subscriptions (organization_id, plan_id, status)
SELECT o.id, 'free', 'trialing'
FROM organizations o
LEFT JOIN subscriptions s ON s.organization_id = o.id
WHERE s.id IS NULL
ON CONFLICT (organization_id) DO NOTHING;

-- -------------------------------------------------------------------------
-- 4) Helper pour enforcement côté serveur
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.consultants_count(org_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(*)::INTEGER
  FROM consultants
  WHERE organization_id = org_id AND archived = FALSE;
$$;

COMMENT ON TABLE plans IS 'Catalogue des plans SaaS. Les price_id Stripe doivent être remplis manuellement après création dans le Dashboard.';
COMMENT ON TABLE subscriptions IS 'Subscription par organisation. Source de vérité = webhook Stripe. Pas d''écriture côté client.';
