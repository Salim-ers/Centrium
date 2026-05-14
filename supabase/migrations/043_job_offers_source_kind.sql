-- =============================================================
-- 043_job_offers_source_kind.sql
--
-- Une mission peut venir :
--   - d'un client final  (banque, retailer, etc.)        → source_kind='client'
--   - d'un ESN partenaire (Hays, Open, Sopra, etc.)      → source_kind='esn'
--
-- Le champ `source` (existant, free-text) sert à porter le NOM de la
-- structure. Un champ `source_kind` typé permet de filtrer / colorer
-- côté UI et de générer le bon wording dans la fiche de poste.
-- =============================================================

ALTER TABLE job_offers
  ADD COLUMN IF NOT EXISTS source_kind TEXT
    CHECK (source_kind IS NULL OR source_kind IN ('client', 'esn'));

COMMENT ON COLUMN job_offers.source_kind IS
  'Origine du besoin : ''client'' (client direct) ou ''esn'' (ESN partenaire qui sous-traite). Le nom va dans source.';
