-- =========================================================================
-- 105 — Rôles Commercial et Opérations (valeurs d'enum)
-- -------------------------------------------------------------------------
--   commercial : pipeline, clients, positionnement, propositions ; ni CRA
--                ni pilotage financier.
--   operations : missions, CRA, contrats, documents, accès portail ;
--                préfacturation en lecture.
--
-- Migration séparée : `ALTER TYPE ... ADD VALUE` ne peut pas être utilisé
-- dans la transaction qui l'ajoute (même raison que 095). La matrice, les
-- policies et le trigger CRA suivent en 106.
--
-- ⚠ À APPLIQUER SUR VALIDATION EXPLICITE (staging d'abord). Tant que 106
-- n'est pas jouée, l'application ne propose pas ces rôles.
-- =========================================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'commercial';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'operations';
