-- =============================================================================
-- Migration 067 — Consolidation vers 3 tiers publics (Starter / Growth / Enterprise)
-- =============================================================================
-- POURQUOI
--   Le DB avait 4 plans (starter, growth, scale, enterprise) avec des prix
--   décorrélés de la page publique /tarifs. Décision produit : 3 tiers
--   uniquement, prix alignés sur /tarifs, `scale` masqué (is_public=false)
--   mais conservé pour ne pas orphaner d'éventuels abonnés historiques
--   (webhook Stripe continuera de mapper une subscription 'scale' → row valide).
--
-- LIMITES FINALES (matrice commerciale)
--
--                       Starter    Growth     Enterprise
--   Prix / mois         890 EUR    1690 EUR   sur devis
--   Prix / an           12000 EUR  20000 EUR  sur devis
--   Users admin         3          10         ∞
--   Consultants         20         50         ∞
--   Opportunités open   100        500        ∞
--   Contacts            500        2000       ∞
--   Missions actives    30         100        ∞
-- =============================================================================

UPDATE public.plans
   SET price_monthly_eur      = 890,
       price_yearly_eur       = 12000,
       max_users              = 3,
       max_consultants        = 20,
       max_open_opportunities = 100,
       max_contacts           = 500,
       max_active_missions    = 30,
       is_public              = true,
       sort_order             = 10
 WHERE id = 'starter';

UPDATE public.plans
   SET price_monthly_eur      = 1690,
       price_yearly_eur       = 20000,
       max_users              = 10,
       max_consultants        = 100,
       max_open_opportunities = 500,
       max_contacts           = 2000,
       max_active_missions    = 100,
       is_public              = true,
       sort_order             = 20
 WHERE id = 'growth';

UPDATE public.plans
   SET price_monthly_eur      = 0,       -- 0 = pas de checkout self-serve, sur devis
       price_yearly_eur       = 0,
       max_users              = NULL,
       max_consultants        = NULL,
       max_open_opportunities = NULL,
       max_contacts           = NULL,
       max_active_missions    = NULL,
       is_public              = true,
       sort_order             = 30
 WHERE id = 'enterprise';

-- Scale : masqué. Toujours en DB pour continuité webhook si un abonné legacy
-- existait. Aucune UI publique n'y référera après cette migration.
UPDATE public.plans
   SET is_public  = false,
       sort_order = 90
 WHERE id = 'scale';
