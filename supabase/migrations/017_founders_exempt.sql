-- =========================================================================
-- 017 — Flag "fondateurs" sur les subscriptions
-- -------------------------------------------------------------------------
-- Certaines organisations (les fondateurs, partenaires, tests internes) ne
-- doivent jamais être facturées. On ajoute un flag explicite plutôt que
-- de le deviner depuis plan_id ou status.
-- =========================================================================

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS is_exempt_from_billing BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN subscriptions.is_exempt_from_billing IS
  'Si TRUE, l''organisation n''est jamais facturée et ne peut pas aller au checkout Stripe. Réservé aux fondateurs / usage interne.';

-- Helper SQL : test simple qui combine accès + exempt
CREATE OR REPLACE FUNCTION public.is_billing_exempt(org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT is_exempt_from_billing FROM subscriptions WHERE organization_id = org_id),
    FALSE
  );
$$;
