-- =========================================================================
-- 099 — Centrium V2 : nouvelle grille tarifaire
-- -------------------------------------------------------------------------
--   Starter  49 € HT/mois   2 managers   10 consultants
--   Team     99 € HT/mois   5 managers   30 consultants   (mise en avant)
--   Growth  179 € HT/mois  10 managers  100 consultants
--   Scale   dès 299 € HT/mois, sur mesure (pas de Checkout self-service)
-- Annuel : 10 mois facturés pour 12 (≈ 2 mois offerts).
-- Licences : seuls les membres internes comptent (max_users). Les
-- utilisateurs des portails consultant et client ne sont jamais comptés.
--
-- Les plans historiques (starter / growth / enterprise) sont CONSERVÉS tels
-- quels pour les abonnés existants (limites et prix inchangés) et retirés de
-- la page publique. Les Price IDs Stripe des nouveaux plans sont créés
-- depuis la super-console (« Créer les prix Stripe »), jamais ici.
-- =========================================================================

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS ai_monthly_quota integer,
  ADD COLUMN IF NOT EXISTS self_service boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS highlighted boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.plans.ai_monthly_quota IS
  'Nombre de générations IA incluses par mois (dossiers de compétences, analyses). NULL = usage raisonnable sur devis.';

-- Plans historiques : hors catalogue public, intacts pour leurs abonnés.
UPDATE public.plans SET is_public = false WHERE id IN ('starter', 'growth', 'enterprise');

INSERT INTO public.plans (
  id, name, price_monthly_eur, price_yearly_eur, max_consultants, max_users,
  max_open_opportunities, max_contacts, max_active_missions, ai_monthly_quota,
  self_service, highlighted, is_public, sort_order, features
) VALUES
  ('v2_starter', 'Starter', 49, 490, 10, 2, NULL, NULL, NULL, 50, true, false, true, 110,
   '["Jusqu''à 2 managers","Jusqu''à 10 consultants","CRM, clients et opportunités","Missions, CRA et préfacturation","Portails consultant et client inclus"]'::jsonb),
  ('v2_team', 'Team', 99, 990, 30, 5, NULL, NULL, NULL, 200, true, true, true, 120,
   '["Jusqu''à 5 managers","Jusqu''à 30 consultants","Tout Starter","Staffing et matching explicable","Automatisations","Devis et bibliothèque de documents"]'::jsonb),
  ('v2_growth', 'Growth', 179, 1790, 100, 10, NULL, NULL, NULL, 800, true, false, true, 130,
   '["Jusqu''à 10 managers","Jusqu''à 100 consultants","Tout Team","Analytics et rentabilité avancés","Permissions personnalisées","Support prioritaire"]'::jsonb),
  ('v2_scale', 'Scale', 299, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, true, 140,
   '["Managers et consultants au-delà de Growth","Tout Growth","Accompagnement à la reprise des données","Intégrations sur mesure","Interlocuteur dédié"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly_eur = EXCLUDED.price_monthly_eur,
  price_yearly_eur = EXCLUDED.price_yearly_eur,
  max_consultants = EXCLUDED.max_consultants,
  max_users = EXCLUDED.max_users,
  max_open_opportunities = EXCLUDED.max_open_opportunities,
  max_contacts = EXCLUDED.max_contacts,
  max_active_missions = EXCLUDED.max_active_missions,
  ai_monthly_quota = EXCLUDED.ai_monthly_quota,
  self_service = EXCLUDED.self_service,
  highlighted = EXCLUDED.highlighted,
  is_public = EXCLUDED.is_public,
  sort_order = EXCLUDED.sort_order,
  features = EXCLUDED.features;

-- Nouvelles organisations : essai de 14 jours sur Team.
ALTER TABLE public.subscriptions ALTER COLUMN trial_end SET DEFAULT (now() + interval '14 days');

CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.subscriptions (organization_id, plan_id, status, trial_end)
  VALUES (NEW.id, 'v2_team', 'trialing', now() + interval '14 days')
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Demandes de démo / devis Centrium : nouveaux identifiants de plan.
ALTER TABLE public.quote_requests DROP CONSTRAINT IF EXISTS quote_requests_plan_id_check;
ALTER TABLE public.quote_requests
  ADD CONSTRAINT quote_requests_plan_id_check
  CHECK (plan_id IS NULL OR plan_id IN ('starter', 'growth', 'enterprise', 'v2_starter', 'v2_team', 'v2_growth', 'v2_scale'));
