-- =========================================================================
-- 082 — Registre des demandes de suppression de compte (droit à l'effacement)
-- =========================================================================
-- Avant : la demande était journalisée dans `activities` (org_id NOT NULL) →
-- un compte SANS organisation (super_admin) recevait « demande reçue » mais
-- RIEN n'était enregistré → demande perdue. Ici : un registre dédié, sans
-- dépendance à une org, source de vérité pour le traitement RGPD (30 jours).
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  reason TEXT,
  ip TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'processed', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

COMMENT ON TABLE public.account_deletion_requests IS
  'Demandes de suppression de compte (RGPD art. 17). Traitées manuellement sous 30 j. Indépendant de l''org (couvre les comptes super_admin).';

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status
  ON public.account_deletion_requests (status, requested_at DESC);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_requests FORCE ROW LEVEL SECURITY;

-- Lecture : le demandeur voit sa propre demande ; les fondateurs (super_admin)
-- voient tout (ils traitent). Écriture serveur uniquement (service_role).
DROP POLICY IF EXISTS "adr_select_self_or_founder" ON public.account_deletion_requests;
CREATE POLICY "adr_select_self_or_founder" ON public.account_deletion_requests
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  );
