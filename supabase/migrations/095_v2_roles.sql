-- =========================================================================
-- 095 — Centrium V2 : nouveaux rôles
-- -------------------------------------------------------------------------
--   direction : lecture complète + pilotage (dashboard, finance, analytics)
--   client    : contact d'une société cliente avec accès au portail client.
--               Un utilisateur client n'a JAMAIS d'organisation active
--               (profiles.organization_id = NULL) : toutes les policies
--               « organization_id = organization_id() » le refusent par
--               défaut. Son périmètre passe par client_portal_users (098).
--
-- Migration séparée : `ALTER TYPE ... ADD VALUE` ne peut pas être utilisé
-- dans la transaction qui l'ajoute.
-- =========================================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'direction';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'client';
