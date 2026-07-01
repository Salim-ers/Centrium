-- =============================================================================
-- Migration 066 — Hard limits per plan on opportunities / contacts / missions
-- =============================================================================
-- POURQUOI
--   Jusqu'à présent seuls consultants et users étaient limités par plan. Toutes
--   les autres entités (opportunités CRM, contacts, missions) étaient illimitées
--   sur tous les plans. Résultat : aucun levier d'upsell entre Starter et Growth
--   au-delà du nombre de sièges.
--
--   Cette migration ajoute 3 colonnes nullables (NULL = unlimited) sur `plans`
--   et seed les 3 plans avec des paliers commerciaux clairs :
--
--                    Starter   Growth    Enterprise
--   opps ouvertes    100       500       ∞
--   contacts         500       2 000     ∞
--   missions actives 30        100       ∞
--
-- IDEMPOTENCE
--   Colonnes créées avec IF NOT EXISTS. Seeds via UPDATE ciblés par id — pas de
--   TRUNCATE, pas de touche aux Stripe price ids.
-- =============================================================================

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS max_open_opportunities INTEGER;
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS max_contacts INTEGER;
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS max_active_missions INTEGER;

COMMENT ON COLUMN public.plans.max_open_opportunities IS
  'Nb max d''opportunités CRM en statut open (non closed/lost/won). NULL = illimité. Enforce.ts bloque la création au delà.';
COMMENT ON COLUMN public.plans.max_contacts IS
  'Nb max de contacts dans le carnet. NULL = illimité.';
COMMENT ON COLUMN public.plans.max_active_missions IS
  'Nb max de missions en statut actif (pas draft, pas ended). NULL = illimité.';

-- Seed 3 plans — respecte les valeurs commerciales décidées.
-- On UPDATE only, ne crée pas de plan (setup-stripe.ts s'en charge à l'onboarding).
UPDATE public.plans
   SET max_open_opportunities = 100,
       max_contacts           = 500,
       max_active_missions    = 30
 WHERE id = 'starter';

UPDATE public.plans
   SET max_open_opportunities = 500,
       max_contacts           = 2000,
       max_active_missions    = 100
 WHERE id = 'growth';

UPDATE public.plans
   SET max_open_opportunities = NULL,
       max_contacts           = NULL,
       max_active_missions    = NULL
 WHERE id = 'enterprise';
