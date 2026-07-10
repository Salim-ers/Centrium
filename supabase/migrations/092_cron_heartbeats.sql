-- =========================================================================
-- 092 — Heartbeat des tâches planifiées (dead-man switch)
-- -------------------------------------------------------------------------
-- PROBLÈME : un cron mal configuré (CRON_SECRET absent → 403) ou qui ne se
-- déclenche pas ne produisait AUCUN signal. On ajoute un battement de cœur :
-- chaque cron enregistre sa dernière exécution ; /api/health signale un cron
-- « périmé » (pas de run depuis > seuil) → détection d'une panne silencieuse.
-- Écrit par le service_role (crons). RLS active, aucune policy client.
-- =========================================================================

CREATE TABLE IF NOT EXISTS cron_heartbeats (
  name text PRIMARY KEY,
  last_run_at timestamptz NOT NULL DEFAULT now(),
  last_status text NOT NULL DEFAULT 'ok',
  detail jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cron_heartbeats ENABLE ROW LEVEL SECURITY;
