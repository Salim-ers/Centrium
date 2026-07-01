-- =============================================================================
-- Migration 069 — Rename Growth display → Medium + new prices 75/149
-- =============================================================================
-- POURQUOI
--   Nouveau positionnement commercial : le prix cible devient
--     Starter    75 EUR HT/mois
--     Medium    149 EUR HT/mois  (ex-Growth, id inchangé)
--     Enterprise sur devis
--
--   Le nom "Growth" est remplacé par "Medium" partout dans l'UI, mais l'id
--   interne 'growth' reste (déjà référencé dans le code, dans les Stripe
--   subscription.metadata des abonnés existants, et dans les migrations
--   antérieures). Renommer l'id serait un breaking change massif pour
--   zéro bénéfice fonctionnel.
--
-- STRIPE PRICES
--   Les Price objects Stripe sont immutables. On NULL les stripe_price_id
--   ici — le script scripts/setup-stripe.ts (relancé après migration) crée
--   de nouveaux Prices (lookup_key suffixé v2 pour éviter la collision
--   avec les anciens) et écrit les nouveaux ids dans plans.
-- =============================================================================

UPDATE public.plans
   SET price_monthly_eur      = 75,
       price_yearly_eur       = 720,     -- 75 * 12 * 0.8 (20% discount annuel)
       stripe_price_id        = NULL,    -- reseed par setup-stripe.ts
       stripe_price_yearly_id = NULL
 WHERE id = 'starter';

UPDATE public.plans
   SET name                   = 'Medium',
       price_monthly_eur      = 149,
       price_yearly_eur       = 1430,    -- 149 * 12 * 0.8
       stripe_price_id        = NULL,
       stripe_price_yearly_id = NULL
 WHERE id = 'growth';

-- enterprise : sur devis, prix 0, pas de checkout self-serve. Rien à changer.
-- scale : déjà is_public=false depuis migration 067. Rien à changer.
