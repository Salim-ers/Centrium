-- =========================================================================
-- 084 — Système d'alertes/notifications/relances : tables + RLS
-- -------------------------------------------------------------------------
-- Architecture (voir src/lib/alerts/engine.ts) :
--   · Les alertes "état courant" (facture en retard, CRA à valider…) restent
--     CALCULÉES à la volée par compute_org_alerts (029/039) — zéro doublon.
--   · Les alertes "processus" (profil incomplet, doc expirant, CRA manquant,
--     facture oubliée, contrat à signer/expirer…) sont MATÉRIALISÉES dans la
--     table `alerts` par le moteur cron avec un `dedupe_key` unique : le
--     moteur les upsert (jamais 2 alertes actives identiques), les résout
--     automatiquement quand la condition disparaît, et les relance selon la
--     cadence de l'organisation.
--   · `notification_deliveries` journalise chaque envoi (in-app/email/SMS)
--     et sert d'état d'idempotence : "dernier envoi pour (org, dedupe_key,
--     canal)" → décide si une relance est due. Rejouer le cron n'envoie
--     jamais deux fois la même notification le même jour.
--   · `notifications` = boîte personnelle par utilisateur (cloche), y
--     compris consultants du portail. RLS user_id = auth.uid().
--   · Préférences : `org_notification_settings` (admin, cadences/canaux/
--     seuils) + `notification_preferences` (par utilisateur, par catégorie).
--     Les alertes critiques imposées par l'org ignorent l'opt-out user.
-- =========================================================================

-- ── 1. Extension de la table alerts : cycle de vie + relances + dédup ────
ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS dedupe_key text,
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS entity_kind text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS snoozed_until timestamptz,
  ADD COLUMN IF NOT EXISTS next_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_interval_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Jamais deux alertes actives identiques pour le même événement métier.
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_org_dedupe
  ON alerts (organization_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_org_status ON alerts (organization_id, status);

-- Fence consultant : un compte portail ne doit pas lire les alertes
-- internes de l'organisation (la policy historique alerts_org ne
-- distinguait pas les rôles).
DROP POLICY IF EXISTS alerts_org ON alerts;
CREATE POLICY alerts_org ON alerts
  FOR ALL USING (
    organization_id = organization_id()
    AND user_role() <> 'consultant'::user_role
  );

-- ── 2. Notifications personnelles (cloche in-app, portail inclus) ────────
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'alert',
  priority alert_priority NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- Lecture/marquage lu/suppression : uniquement ses propres notifications.
-- Aucune policy INSERT pour authenticated : seul le service_role (moteur) écrit.
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notifications_delete_own ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- ── 3. Préférences de notifications par utilisateur ──────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Canaux globaux de l'utilisateur (l'org peut imposer les critiques).
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  -- Overrides par catégorie : {"cra": {"email": false}, "invoices": {...}}
  categories jsonb NOT NULL DEFAULT '{}'::jsonb,
  digest_daily boolean NOT NULL DEFAULT false,
  digest_weekly boolean NOT NULL DEFAULT true,
  phone text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_prefs_own ON notification_preferences
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── 4. Réglages de notifications de l'organisation (admin) ───────────────
-- settings JSONB = overrides des défauts codés en TS
-- (DEFAULT_ORG_NOTIFICATION_SETTINGS dans src/lib/alerts/config.ts) :
-- cadences de relance, seuils, canaux actifs, digest, relance client auto.
CREATE TABLE IF NOT EXISTS org_notification_settings (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE org_notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_notif_settings_select ON org_notification_settings
  FOR SELECT USING (is_member_of(organization_id) AND user_role() <> 'consultant'::user_role);
CREATE POLICY org_notif_settings_insert ON org_notification_settings
  FOR INSERT WITH CHECK (role_in(organization_id) = 'admin'::user_role);
CREATE POLICY org_notif_settings_update ON org_notification_settings
  FOR UPDATE USING (role_in(organization_id) = 'admin'::user_role)
  WITH CHECK (role_in(organization_id) = 'admin'::user_role);

-- ── 5. Journal des envois (idempotence + suivi de délivrabilité) ─────────
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Clé de l'événement notifié : dedupe_key d'une alerte matérialisée OU
  -- id textuel d'une alerte calculée (ex: 'invoice-overdue:<uuid>') OU
  -- 'digest:daily:<date>' pour les récapitulatifs.
  dedupe_key text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('in_app', 'email', 'sms')),
  -- Destinataire : user connu et/ou coordonnée brute (email/téléphone).
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  consultant_id uuid REFERENCES consultants(id) ON DELETE SET NULL,
  recipient text,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  provider text,
  provider_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deliveries_org_key
  ON notification_deliveries (organization_id, dedupe_key, channel, created_at DESC);

ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
-- Lecture : membres internes de l'org (historique des relances dans l'UI).
-- Écriture : service_role uniquement (moteur cron) — pas de policy INSERT.
CREATE POLICY deliveries_select_member ON notification_deliveries
  FOR SELECT USING (is_member_of(organization_id) AND user_role() <> 'consultant'::user_role);

-- ── 6. Commentaires internes sur les alertes ─────────────────────────────
-- alert_key = alerts.id::text (matérialisée) OU id textuel calculé.
CREATE TABLE IF NOT EXISTS alert_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_key text NOT NULL,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alert_comments_org_key
  ON alert_comments (organization_id, alert_key, created_at);

ALTER TABLE alert_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY alert_comments_select ON alert_comments
  FOR SELECT USING (is_member_of(organization_id) AND user_role() <> 'consultant'::user_role);
CREATE POLICY alert_comments_insert ON alert_comments
  FOR INSERT WITH CHECK (
    is_member_of(organization_id)
    AND user_role() <> 'consultant'::user_role
    AND author_id = auth.uid()
  );
CREATE POLICY alert_comments_delete_own ON alert_comments
  FOR DELETE USING (author_id = auth.uid());

-- ── 7. Exigences documentaires par statut de consultant ──────────────────
-- Overrides par organisation ; les défauts par contract_type (freelance →
-- kbis/urssaf/rc_pro/id/rib, portage → attestation, cdi/cdd → id/rib…)
-- vivent en TS (src/lib/alerts/completeness.ts). contract_type NULL = tous.
CREATE TABLE IF NOT EXISTS document_requirements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_type text,
  kind text NOT NULL,
  label text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_requirements_unique
  ON document_requirements (organization_id, COALESCE(contract_type, '*'), kind);

ALTER TABLE document_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY doc_requirements_select ON document_requirements
  FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY doc_requirements_write ON document_requirements
  FOR ALL USING (role_in(organization_id) = 'admin'::user_role)
  WITH CHECK (role_in(organization_id) = 'admin'::user_role);

-- ── 8. Expiration des documents consultants ──────────────────────────────
ALTER TABLE consultant_documents ADD COLUMN IF NOT EXISTS expires_at date;

-- ── 9. Fix journal d'audit : logAudit() insérait user_id/details alors que
-- la table (001) n'a que actor_id/metadata + entity_id NOT NULL → CHAQUE
-- écriture d'audit échouait silencieusement en prod. On aligne la table sur
-- le code (les colonnes historiques restent pour les anciennes lignes).
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS details jsonb;
ALTER TABLE activities ALTER COLUMN entity_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities (user_id, created_at DESC);

-- ── 10. Realtime : la cloche doit vibrer sans refresh ─────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
