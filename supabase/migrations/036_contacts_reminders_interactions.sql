-- =============================================================
-- 036_contacts_reminders_interactions.sql
--
-- Deux briques pour transformer le carnet de contacts en mini-CRM :
--   1. Rappel d'appel par contact (date + note libre) → remonté dans
--      le centre d'alertes via compute_org_alerts.
--   2. Table d'historique des interactions (notes type "Envoyé les CV"
--      avec horodatage + canal call/email/meeting/...).
-- =============================================================

-- 1. Rappel d'appel
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS next_call_reminder TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_call_reminder_note TEXT;

CREATE INDEX IF NOT EXISTS idx_contacts_next_reminder
  ON contacts(organization_id, next_call_reminder)
  WHERE next_call_reminder IS NOT NULL;

COMMENT ON COLUMN contacts.next_call_reminder IS
  'Date / heure du prochain rappel pour ce contact (apparaît dans les alertes).';
COMMENT ON COLUMN contacts.next_call_reminder_note IS
  'Note libre attachée au rappel (ex: "Relancer pour signature", "Envoyer le devis"…).';

-- 2. Historique des interactions (notes ponctuelles)
CREATE TABLE IF NOT EXISTS contact_interactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL DEFAULT 'note'
                     CHECK (kind IN ('call','email','meeting','note','linkedin','sms','other')),
  note            TEXT NOT NULL,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_interactions_contact
  ON contact_interactions(contact_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_org
  ON contact_interactions(organization_id, occurred_at DESC);

ALTER TABLE contact_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contact_interactions_org ON contact_interactions;
CREATE POLICY contact_interactions_org ON contact_interactions
  FOR ALL USING (organization_id = public.organization_id());

COMMENT ON TABLE contact_interactions IS
  'Historique des notes / interactions pour un contact CRM (ex: "Envoyé les CV", "Rdv tel le 12/05").';
