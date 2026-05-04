-- =============================================================
-- 033_invoices_unit_price_quantity.sql
--
-- Permet de stocker le détail TJM × jours sur une facture saisie
-- manuellement, pour que la facture imprimée affiche Qté et Prix
-- unitaire au lieu d'un simple total HT en forfait.
-- =============================================================

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(8, 2);

COMMENT ON COLUMN invoices.unit_price IS
  'Prix unitaire HT pour la ligne de facturation (TJM ou prix forfaitaire). Optionnel : si absent, on retombe sur amount_ht en quantity = 1.';

COMMENT ON COLUMN invoices.quantity IS
  'Quantité (nombre de jours travaillés ou nb d''unités). Optionnel : par défaut 1.';
