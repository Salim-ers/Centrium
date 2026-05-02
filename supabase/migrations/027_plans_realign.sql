-- =============================================================
-- 027_plans_realign.sql
--
-- Aligne le catalogue de plans sur le pricing public Centrium :
--   starter   149€/mois  → 10 consultants, 3 utilisateurs internes
--   growth    399€/mois  → 30 consultants, 10 utilisateurs internes
--   scale     899€/mois  → 100 consultants, 30 utilisateurs internes
--   enterprise sur devis → illimité
--
-- Supprime les anciens plans "free" et "pro" (migrés vers starter/growth).
-- Le trial 14 jours reste géré par subscriptions.trial_end ; pendant cette
-- période, l'org est sur "starter" (limites les plus basses, pour pousser
-- à l'upgrade rapide une fois la valeur prouvée).
-- =============================================================

-- 1. Migrer les subscriptions existantes AVANT de toucher plans
--    (la FK plan_id → plans(id) bloquerait sinon)

-- 'free' → 'starter' avec trial 14j depuis maintenant si pas déjà commencé
UPDATE subscriptions
SET plan_id = 'starter',
    trial_end = COALESCE(trial_end, NOW() + INTERVAL '14 days')
WHERE plan_id = 'free';

-- 'pro' → 'growth'
UPDATE subscriptions
SET plan_id = 'growth'
WHERE plan_id = 'pro';

-- 2. Insérer les nouveaux plans (upsert pour idempotence)
INSERT INTO plans (id, name, price_monthly_eur, max_consultants, max_users, features, sort_order, is_public)
VALUES
  ('starter', 'Starter', 149, 10, 3,
    '["Jusqu''à 10 consultants","3 utilisateurs internes","CV Optimizer IA (Claude)","Matching consultant ↔ offre","CRM pipeline","Templates CV Centrium","Support email"]'::jsonb,
    1, TRUE),
  ('growth', 'Growth', 399, 30, 10,
    '["Jusqu''à 30 consultants","10 utilisateurs internes","Tout Starter, plus :","Réponses AO IA (pitch commercial)","Analyse skills IA","CRA + validation workflow","Factures automatiques","Support prioritaire"]'::jsonb,
    2, TRUE),
  ('scale', 'Scale', 899, 100, 30,
    '["Jusqu''à 100 consultants","30 utilisateurs internes","Tout Growth, plus :","Exports avancés (Excel, API)","Intégrations webhook sortants","Onboarding personnalisé","Success manager dédié","SLA 99.5%"]'::jsonb,
    3, TRUE),
  ('enterprise', 'Enterprise', 0, NULL, NULL,
    '["Consultants & utilisateurs illimités","SSO (SAML / OIDC)","SLA 99.9% contractuel","Data residency dédiée","Audit logs exportables","Support 24/7 + CSM dédié"]'::jsonb,
    4, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly_eur = EXCLUDED.price_monthly_eur,
  max_consultants = EXCLUDED.max_consultants,
  max_users = EXCLUDED.max_users,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order,
  is_public = EXCLUDED.is_public;

-- 3. Changer le DEFAULT du plan_id avant de supprimer 'free'
ALTER TABLE subscriptions ALTER COLUMN plan_id SET DEFAULT 'starter';

-- 4. Update trigger qui crée la subscription par défaut → 'starter'
CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO subscriptions (organization_id, plan_id, status)
  VALUES (NEW.id, 'starter', 'trialing')
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 5. Supprimer les anciens plans (plus aucune subscription ne les référence)
DELETE FROM plans WHERE id IN ('free', 'pro');

COMMENT ON TABLE plans IS
  'Catalogue Centrium : starter / growth / scale / enterprise. Les stripe_price_id doivent être renseignés manuellement après création dans le Dashboard Stripe.';
