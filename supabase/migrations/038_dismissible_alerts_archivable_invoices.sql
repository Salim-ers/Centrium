-- =============================================================
-- 038_dismissible_alerts_archivable_invoices.sql
--
-- 1) Permet de masquer ("dismiss") les alertes calculées (compute_org_alerts)
--    qui ne sont pas backées par une row alerts. On stocke juste leur ID
--    textuel ("invoice_overdue_<uuid>", etc.) + l'org + l'horodatage.
--
-- 2) Ajoute `archived` aux factures. On NE SUPPRIME PAS de facture en dur
--    (artefact comptable) — on archive pour les sortir des listes
--    actives. Hard delete reste possible côté API pour les drafts.
-- =============================================================

-- ============ 1) dismissed_alerts ============

CREATE TABLE IF NOT EXISTS public.dismissed_alerts (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_id TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dismissed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (organization_id, alert_id)
);

COMMENT ON TABLE public.dismissed_alerts IS
  'Alertes calculées masquées par l''utilisateur. alert_id est l''ID textuel renvoyé par compute_org_alerts (ex: "invoice_overdue_<uuid>").';

ALTER TABLE public.dismissed_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dismissed_alerts_select_member" ON public.dismissed_alerts;
CREATE POLICY "dismissed_alerts_select_member" ON public.dismissed_alerts
  FOR SELECT USING (public.is_member_of(organization_id));

DROP POLICY IF EXISTS "dismissed_alerts_insert_member" ON public.dismissed_alerts;
CREATE POLICY "dismissed_alerts_insert_member" ON public.dismissed_alerts
  FOR INSERT WITH CHECK (public.is_member_of(organization_id));

DROP POLICY IF EXISTS "dismissed_alerts_delete_member" ON public.dismissed_alerts;
CREATE POLICY "dismissed_alerts_delete_member" ON public.dismissed_alerts
  FOR DELETE USING (public.is_member_of(organization_id));

-- ============ 2) invoices.archived ============

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN public.invoices.archived IS
  'Facture archivée — exclue des listes actives par défaut. Pas une suppression : la donnée reste pour la comptabilité.';

CREATE INDEX IF NOT EXISTS idx_invoices_org_archived
  ON public.invoices (organization_id, archived);
