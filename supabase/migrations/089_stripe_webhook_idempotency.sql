-- =========================================================================
-- 089 — Idempotence des webhooks Stripe
-- -------------------------------------------------------------------------
-- FAILLE : le handler webhook renvoyait 200 même en cas d'échec (« pour
-- éviter les retries »). Conséquence : un événement critique
-- (checkout.session.completed d'un nouvel abonné payant) qui échoue sur une
-- erreur DB transitoire était acquitté à Stripe et PERDU définitivement →
-- client qui a payé mais n'est jamais provisionné.
--
-- CORRECTIF : cette table journalise chaque event.id RÉELLEMENT traité. Le
-- webhook peut désormais :
--   1. ignorer un event déjà traité (dédup — Stripe peut renvoyer 2×) ;
--   2. renvoyer 500 sur échec pour que Stripe RETENTE, sans risque de
--      double-application (les handlers sont idempotents + ce journal).
-- Écrit uniquement par le service_role (webhook). RLS active, aucune policy.
-- =========================================================================

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id text PRIMARY KEY,
  type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
