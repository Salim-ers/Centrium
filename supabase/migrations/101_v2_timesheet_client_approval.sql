-- =========================================================================
-- 101 — CRA : approbation client facultative
-- -------------------------------------------------------------------------
-- Après soumission par le consultant, l'ESN peut demander l'approbation du
-- client (portail client). La validation finale reste interne : le statut
-- historique `client_validated` signifie « CRA validé ».
--   not_required → pending → approved | rejected
-- Les colonnes d'approbation ne sont modifiables ni par le consultant, ni
-- en direct par un client : seules les routes serveur (service_role) et les
-- rôles internes peuvent les écrire.
-- =========================================================================

ALTER TABLE public.timesheets
  ADD COLUMN IF NOT EXISTS client_approval_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS client_approval_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_comment text CHECK (client_comment IS NULL OR char_length(client_comment) <= 2000);

ALTER TABLE public.timesheets DROP CONSTRAINT IF EXISTS timesheets_client_approval_status_check;
ALTER TABLE public.timesheets
  ADD CONSTRAINT timesheets_client_approval_status_check
  CHECK (client_approval_status IN ('not_required', 'pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_timesheets_client_approval
  ON public.timesheets (organization_id, client_approval_status)
  WHERE client_approval_status = 'pending';

CREATE OR REPLACE FUNCTION public.guard_timesheet_client_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- service_role (routes serveur, moteur)
  END IF;
  IF public.user_role() IN ('consultant'::user_role, 'client'::user_role)
     AND (NEW.client_approval_status IS DISTINCT FROM OLD.client_approval_status
          OR NEW.client_approved_at IS DISTINCT FROM OLD.client_approved_at
          OR NEW.client_approved_by IS DISTINCT FROM OLD.client_approved_by
          OR NEW.client_comment IS DISTINCT FROM OLD.client_comment
          OR NEW.client_approval_requested_at IS DISTINCT FROM OLD.client_approval_requested_at) THEN
    RAISE EXCEPTION 'Approbation client non modifiable depuis ce compte' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_timesheet_client_approval ON public.timesheets;
CREATE TRIGGER trg_guard_timesheet_client_approval
  BEFORE UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.guard_timesheet_client_approval();
