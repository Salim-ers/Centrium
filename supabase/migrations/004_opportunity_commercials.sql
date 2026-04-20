-- =========================================================================
-- Migration 004 : TJM + durée mission sur les opportunités
-- =========================================================================

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS daily_rate_eur NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS duration_months INTEGER;

COMMENT ON COLUMN opportunities.daily_rate_eur IS 'TJM visé pour la mission issue de cette opportunité';
COMMENT ON COLUMN opportunities.duration_months IS 'Durée prévisionnelle de la mission en mois';
