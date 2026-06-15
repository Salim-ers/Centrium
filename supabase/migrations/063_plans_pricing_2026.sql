-- =========================================================================
-- 063 — Pricing public 2026 : Starter/Growth/Enterprise + palier 20 consultants
-- =========================================================================
-- Aligne la table `plans` avec le pricing public de la page /tarifs :
--   Starter  890 €/mois (12 k€/an avec remise 10%)  · 20 consultants inclus · +39 €/cons
--   Growth   1 690 €/mois (20 k€/an avec remise 10%) · 20 consultants inclus · +29 €/cons
--   Enterprise sur devis (à partir de 3 500 €/mois)  · sur mesure
--
-- Logique pricing :
--   - Pack 20 consultants inclus dans chaque plan (PME 10-30 = Starter, etc.)
--   - Au-delà : prix unitaire mensuel par consultant ACTIF (non archivé)
--   - Facturation Stripe : 1 abonnement par plan + 1 "metered subscription"
--     pour les consultants additionnels (à brancher manuellement dans
--     Stripe Dashboard via Usage-based Pricing)
--
-- Anciens plans supprimés : scale (fusionné dans Enterprise sur devis).
-- =========================================================================

-- 1. Ajout des colonnes "palier" + "consultant additionnel"
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS consultants_included INT,
  ADD COLUMN IF NOT EXISTS price_per_extra_consultant_eur DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS price_yearly_eur INT,
  ADD COLUMN IF NOT EXISTS stripe_extra_consultant_price_id TEXT;

COMMENT ON COLUMN plans.consultants_included IS
  'Nombre de consultants inclus dans le plan (au-delà = facturation à l''unité)';
COMMENT ON COLUMN plans.price_per_extra_consultant_eur IS
  'Prix mensuel HT par consultant additionnel au-delà du palier inclus';
COMMENT ON COLUMN plans.price_yearly_eur IS
  'Prix annuel HT (avec remise 10-15% vs mensuel × 12)';
COMMENT ON COLUMN plans.stripe_extra_consultant_price_id IS
  'Stripe Price ID pour les consultants additionnels (metered subscription item)';

-- 2. Migration des subscriptions sur 'scale' → 'growth' (avant suppression)
UPDATE subscriptions
SET plan_id = 'growth'
WHERE plan_id = 'scale';

-- 3. Mise à jour des plans avec les nouveaux prix publics
UPDATE plans
SET
  name = 'Starter',
  price_monthly_eur = 890,
  price_yearly_eur = 12000,
  consultants_included = 20,
  price_per_extra_consultant_eur = 39,
  max_consultants = NULL, -- plus de cap dur, juste facturation à l'unité au-delà
  max_users = 3,
  features = '[
    "20 consultants inclus",
    "3 utilisateurs administrateurs",
    "Bibliothèque consultants illimitée",
    "CV Optimizer (Claude API)",
    "Matching IA + extraction AO depuis screenshot",
    "CRM kanban realtime",
    "CRA + facturation PDF auto",
    "Dashboard pilotage (intercontrat, CA M+1, TJM)",
    "Branding (logo + couleurs auto)",
    "Hébergement EU + RGPD",
    "Support email (réponse 24h ouvrées)"
  ]'::jsonb,
  sort_order = 1,
  is_public = TRUE
WHERE id = 'starter';

UPDATE plans
SET
  name = 'Growth',
  price_monthly_eur = 1690,
  price_yearly_eur = 20000,
  consultants_included = 20,
  price_per_extra_consultant_eur = 29,
  max_consultants = NULL,
  max_users = 10,
  features = '[
    "Tout Starter inclus",
    "10 utilisateurs administrateurs",
    "Portail consultant dédié (CRA mobile)",
    "Intégration Pennylane (Q3 2026)",
    "Signature électronique Yousign (Q4 2026)",
    "API publique REST + Webhooks (Q1 2027)",
    "MFA TOTP + politique mot de passe configurable",
    "Audit log cross-tenant + export RGPD",
    "Support email prioritaire (réponse 8h ouvrées)",
    "Onboarding accompagné J0 → J+30"
  ]'::jsonb,
  sort_order = 2,
  is_public = TRUE
WHERE id = 'growth';

UPDATE plans
SET
  name = 'Enterprise',
  price_monthly_eur = 3500, -- à partir de — vrai prix sur devis
  price_yearly_eur = 42000,
  consultants_included = 0, -- pas de palier — facturation 100% à l'unité
  price_per_extra_consultant_eur = NULL,
  max_consultants = NULL,
  max_users = NULL,
  features = '[
    "Tout Growth inclus",
    "Utilisateurs admin illimités",
    "SSO SAML/OIDC (Q3 2026)",
    "SLA 99,95% contractuel + crédits SLA",
    "Multi-organisations (groupes, holdings, filiales)",
    "Intégrations sur mesure (Sage, Cegid, LinkedIn Recruiter)",
    "Account Manager dédié",
    "Hotline support 24/7 (Q3 2026)",
    "Audit de sécurité personnalisé",
    "Migration de données accompagnée",
    "Roadmap produit co-construite"
  ]'::jsonb,
  sort_order = 3,
  is_public = TRUE
WHERE id = 'enterprise';

-- 4. Suppression de 'scale' (fusionné dans Enterprise)
DELETE FROM plans WHERE id = 'scale';

-- 5. Commentaire d'aide
COMMENT ON TABLE plans IS
  'Catalogue pricing public 2026. Pour activer les paiements :
   1. Créer les Products + Prices dans Stripe Dashboard
   2. UPDATE plans SET stripe_price_id = ''price_xxx'',
        stripe_price_yearly_id = ''price_yyy'',
        stripe_extra_consultant_price_id = ''price_zzz''
      WHERE id IN (''starter'', ''growth'', ''enterprise'')';
