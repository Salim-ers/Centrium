-- =========================================================================
-- 090 — Scellement de la signature électronique (valeur probante)
-- -------------------------------------------------------------------------
-- La signature portail capturait l'image + le nom + l'horodatage, mais aucun
-- élément de PREUVE opposable : ni IP/appareil du signataire, ni empreinte
-- d'intégrité du document signé. On ajoute un « dossier de preuve » minimal :
--   - signature_ip / signature_user_agent : contexte de signature ;
--   - signature_hash : SHA-256 scellant (id + n° + nom + image + horodatage)
--     → toute altération ultérieure du contrat invalide l'empreinte.
-- Colonnes additives, aucune donnée existante modifiée.
-- =========================================================================

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS signature_ip text,
  ADD COLUMN IF NOT EXISTS signature_user_agent text,
  ADD COLUMN IF NOT EXISTS signature_hash text;
