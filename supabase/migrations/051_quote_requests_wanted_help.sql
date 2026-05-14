-- =============================================================
-- 051_quote_requests_wanted_help.sql
--
-- Permet au prospect de cocher ce avec quoi il veut de l'aide :
-- template CV, contrat, logo, charte graphique… On le stocke en
-- tableau de strings pour pouvoir afficher des chips dans
-- /admin/clients sans dépendre d'un enum figé.
-- =============================================================

ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS wanted_help TEXT[];

COMMENT ON COLUMN quote_requests.wanted_help IS
  'Liste libre des "j''ai besoin d''aide pour" cochés sur le formulaire devis (cv_template, contract_template, logo, brand_colors, mentions_legales, autre…).';
