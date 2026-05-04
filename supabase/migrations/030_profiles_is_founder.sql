-- =============================================================
-- 030_profiles_is_founder.sql
--
-- Ajoute un flag `is_founder` sur les profiles : marque visible des
-- comptes fondateurs de la plateforme (badge UI + futurs accès
-- internes). Distinct de `is_exempt_from_billing` qui se trouve sur
-- subscriptions et concerne l'org entière, pas l'individu.
-- =============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN profiles.is_founder IS
  'TRUE pour les comptes fondateurs (visuel + accès internes futurs). N''affecte pas la facturation, qui est gérée au niveau org via subscriptions.is_exempt_from_billing.';

-- Bootstrap : flag les fondateurs initiaux par email (idempotent).
UPDATE profiles SET is_founder = TRUE
WHERE LOWER(email) IN (
  'alphonse.aroul@quad-core.fr',
  'moustakine.mouhamad@quad-core.fr',
  'hasan.akar@quad-core.fr',
  'salim.elr@quad-core.fr',
  'salim.elrs@gmail.com'
);
