-- =========================================================================
-- 075 — Tunnel devis → abonnement + essai raccourci à 7 jours
-- -------------------------------------------------------------------------
-- 1. Le prospect choisit sa FORMULE dès /devis (quote_requests.plan_id) ;
--    la super console valide la demande et provisionne avec ce plan —
--    le client reçoit alors l'email d'activation + lien de paiement.
-- 2. L'essai gratuit passe de 14 à 7 jours (décision produit juillet 2026).
--    Le trigger on_organization_created utilise le DEFAULT de la colonne.
-- =========================================================================

alter table public.quote_requests
  add column if not exists plan_id text
    check (plan_id in ('starter', 'growth', 'enterprise'));

comment on column public.quote_requests.plan_id is
  'Formule choisie par le prospect sur /devis (starter | growth | enterprise)';

alter table public.subscriptions
  alter column trial_end set default (now() + interval '7 days');
