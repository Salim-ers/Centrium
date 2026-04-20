-- =========================================================================
-- Migration 007 : Enrichissement workflow CRA
-- =========================================================================
-- Ajoute les colonnes traçant qui a soumis / validé / rejeté un CRA et
-- la raison du rejet. Le statut lui-même existe déjà.
-- =========================================================================

ALTER TABLE timesheets
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN timesheets.submitted_by IS
  'Profile ayant soumis le CRA (consultant ou admin pour le compte du consultant).';
COMMENT ON COLUMN timesheets.validated_by IS
  'Profile admin/BM ayant validé le CRA.';
COMMENT ON COLUMN timesheets.rejected_at IS
  'Date de rejet. Permet au consultant de voir le rejet et d''éditer à nouveau.';
COMMENT ON COLUMN timesheets.rejection_reason IS
  'Motif du rejet renseigné par l''admin.';
