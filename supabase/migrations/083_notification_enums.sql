-- =========================================================================
-- 083 — Système d'alertes/notifications : extension des enums
-- -------------------------------------------------------------------------
-- POURQUOI une migration séparée : `ALTER TYPE ... ADD VALUE` ne peut pas
-- être UTILISÉ (dans une policy, un insert, une fonction) dans la même
-- transaction que son ajout. Les tables/fonctions qui consomment ces
-- valeurs arrivent en 084/085.
--
-- alert_status : cycle de vie complet demandé par le centre d'alertes
--   new → (read_at) → in_progress (prise en charge) → resolved
--                   → snoozed (reportée)             → dismissed (ignorée)
--                   → expired (échéance dépassée sans action)
--
-- alert_type : nouvelles détections du moteur d'alertes (cron quotidien).
-- =========================================================================

ALTER TYPE alert_status ADD VALUE IF NOT EXISTS 'snoozed';
ALTER TYPE alert_status ADD VALUE IF NOT EXISTS 'expired';

ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'profile_incomplete';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'document_expiring';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'timesheet_missing';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'invoice_forgotten';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'invoice_draft_stale';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'contract_pending_signature';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'contract_expiring';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'mission_no_contract';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'mission_overrun';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'invitation_pending';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'system_issue';
