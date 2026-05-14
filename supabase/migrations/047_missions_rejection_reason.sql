-- =============================================================
-- 047_missions_rejection_reason.sql
--
-- Quand un CV poussé est refusé, on capture la raison (libre) pour
-- garder une trace de pourquoi le client a dit non. Lecture seule
-- après coup — sert au reporting (motifs récurrents = signal sur
-- la qualité du sourcing ou du positionnement).
-- =============================================================

ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

COMMENT ON COLUMN missions.rejection_reason IS
  'Motif libre du refus (renseigné quand status passe à rejected).';
COMMENT ON COLUMN missions.rejected_at IS
  'Timestamp du passage à rejected, stampé automatiquement côté API.';
