-- ============================================================================
-- 070 — Nouveaux tarifs (juillet 2026) + plan "Illimité" self-service
-- ----------------------------------------------------------------------------
--   Starter          75,00 → 74,99 € HT/mois
--   Medium (growth) 149,00 → 149,99 € HT/mois
--   Enterprise      sur devis → "Illimité" 299,99 € HT/mois, achetable en
--                   self-service via Stripe Checkout comme les deux autres.
--
-- L'id 'enterprise' est CONSERVÉ (références en dur dans le code + metadata
-- Stripe des abonnés existants) — seul le nom d'affichage devient "Illimité".
-- Les limites de 'enterprise' restent NULL (= illimité) partout.
--
-- Les stripe_price_id sont resynchronisés par scripts/setup-stripe.ts
-- (nouvelles Prices Stripe : les subscriptions existantes restent sur leur
-- ancienne Price, Stripe ne migre jamais automatiquement).
-- ============================================================================

UPDATE public.plans
SET price_monthly_eur = 74.99,
    price_yearly_eur  = 720   -- 74,99 × 12 × 0,8 arrondi
WHERE id = 'starter';

UPDATE public.plans
SET price_monthly_eur = 149.99,
    price_yearly_eur  = 1440  -- 149,99 × 12 × 0,8 arrondi
WHERE id = 'growth';

UPDATE public.plans
SET name              = 'Illimité',
    price_monthly_eur = 299.99,
    price_yearly_eur  = 2880, -- 299,99 × 12 × 0,8 arrondi
    max_consultants          = NULL,
    max_users                = NULL,
    max_open_opportunities   = NULL,
    max_contacts             = NULL,
    max_active_missions      = NULL,
    is_public   = TRUE,
    sort_order  = 30,
    features = '[
      "Utilisateurs & consultants illimités",
      "Opportunités, contacts & missions illimités",
      "Tout Medium",
      "SSO SAML/OIDC",
      "API publique + Webhooks",
      "Account Manager dédié",
      "Support prioritaire 24/7"
    ]'::jsonb
WHERE id = 'enterprise';
