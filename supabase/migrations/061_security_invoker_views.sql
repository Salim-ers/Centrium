-- =========================================================================
-- 061 — Hardening : SECURITY INVOKER sur les vues publiques
-- =========================================================================
-- Problème : par défaut, une vue Postgres s'exécute avec les droits de son
-- créateur (SECURITY DEFINER) — elle bypass les RLS du user qui la consulte.
-- C'est dangereux : un bug dans le WHERE de la vue peut exposer des données
-- cross-org.
--
-- Fix : forcer SECURITY INVOKER sur toutes les vues exposées au schéma
-- public. La vue applique alors les RLS du user appelant — défense en
-- profondeur, même si on a déjà des WHERE explicites.
--
-- Détecté par Supabase Advisor sur la vue my_organizations.
-- =========================================================================

ALTER VIEW public.my_organizations SET (security_invoker = true);

-- Si d'autres vues sont ajoutées plus tard, les passer aussi en
-- security_invoker = true via une migration suivante.
