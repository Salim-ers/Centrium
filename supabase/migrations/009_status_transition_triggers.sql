-- =========================================================================
-- Migration 009 : Triggers de garde sur le workflow CRA
-- =========================================================================
-- Deux triggers BEFORE UPDATE sur timesheets :
--   1. enforce_timesheet_transition : bloque toute transition de statut
--      non autorisée.
--   2. prevent_consultant_tampering : empêche un consultant de modifier
--      des colonnes réservées à l'admin (validated_by, days_validated,
--      rejection_reason, rejected_at, consultant_id, mission_id).
--
-- Les RLS gèrent le "qui peut lire/écrire la ligne", les triggers gèrent
-- le "quelles valeurs peuvent changer".
-- =========================================================================

-- =========================================================================
-- Trigger 1 : Transitions de statut autorisées
-- =========================================================================
-- Matrice des transitions :
--   draft → submitted                (consultant ou admin)
--   submitted → client_validated     (admin / business_manager uniquement)
--   submitted → rejected             (admin / business_manager uniquement)
--   rejected → draft                 (consultant ou admin)
--   INSERT en draft ou submitted     (admin/BM), INSERT en draft uniquement (consultant)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.check_timesheet_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
BEGIN
  -- auth.user_role() peut être NULL en contexte service_role (migrations, seed, Edge Functions)
  -- On bypass toutes les vérifs dans ce cas.
  BEGIN
    v_role := auth.user_role();
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;

  IF v_role IS NULL THEN
    -- Contexte service_role ou hors session auth : on laisse passer.
    RETURN NEW;
  END IF;

  -- INSERT : contrôle du statut initial
  IF TG_OP = 'INSERT' THEN
    IF v_role = 'consultant' THEN
      IF NEW.status NOT IN ('draft') THEN
        RAISE EXCEPTION 'CRA : un consultant ne peut créer qu''un CRA en statut draft (reçu : %)', NEW.status
          USING ERRCODE = 'check_violation';
      END IF;
    ELSIF v_role IN ('admin', 'business_manager') THEN
      IF NEW.status NOT IN ('draft', 'submitted', 'client_validated') THEN
        RAISE EXCEPTION 'CRA : statut initial invalide (reçu : %)', NEW.status
          USING ERRCODE = 'check_violation';
      END IF;
    ELSE
      RAISE EXCEPTION 'CRA : rôle % non autorisé à créer un CRA', v_role
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE : si le statut ne change pas, RAS
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- UPDATE avec changement de statut : vérifier la transition
  IF OLD.status = 'draft'     AND NEW.status = 'submitted' THEN RETURN NEW; END IF;
  IF OLD.status = 'rejected'  AND NEW.status = 'draft'     THEN RETURN NEW; END IF;

  IF OLD.status = 'submitted' AND NEW.status = 'client_validated' THEN
    IF v_role IN ('admin', 'business_manager') THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'CRA : seul un admin/business_manager peut valider un CRA'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF OLD.status = 'submitted' AND NEW.status = 'rejected' THEN
    IF v_role IN ('admin', 'business_manager') THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'CRA : seul un admin/business_manager peut rejeter un CRA'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RAISE EXCEPTION 'CRA : transition interdite % → %', OLD.status, NEW.status
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS enforce_timesheet_transition ON timesheets;
CREATE TRIGGER enforce_timesheet_transition
  BEFORE INSERT OR UPDATE OF status ON timesheets
  FOR EACH ROW EXECUTE FUNCTION public.check_timesheet_transition();

-- =========================================================================
-- Trigger 2 : Protection anti-tampering (colonnes réservées admin)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.prevent_consultant_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
BEGIN
  BEGIN
    v_role := auth.user_role();
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;

  IF v_role IS DISTINCT FROM 'consultant' THEN
    RETURN NEW;
  END IF;

  -- Un consultant ne peut pas modifier ces colonnes
  IF NEW.consultant_id IS DISTINCT FROM OLD.consultant_id THEN
    RAISE EXCEPTION 'CRA : un consultant ne peut pas changer consultant_id';
  END IF;
  IF NEW.mission_id IS DISTINCT FROM OLD.mission_id THEN
    RAISE EXCEPTION 'CRA : un consultant ne peut pas changer mission_id';
  END IF;
  IF NEW.validated_by IS DISTINCT FROM OLD.validated_by THEN
    RAISE EXCEPTION 'CRA : un consultant ne peut pas modifier validated_by';
  END IF;
  IF NEW.validated_at IS DISTINCT FROM OLD.validated_at THEN
    RAISE EXCEPTION 'CRA : un consultant ne peut pas modifier validated_at';
  END IF;
  IF NEW.rejected_at IS DISTINCT FROM OLD.rejected_at THEN
    RAISE EXCEPTION 'CRA : un consultant ne peut pas modifier rejected_at';
  END IF;
  IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
    RAISE EXCEPTION 'CRA : un consultant ne peut pas modifier rejection_reason';
  END IF;
  IF NEW.days_validated IS DISTINCT FROM OLD.days_validated THEN
    RAISE EXCEPTION 'CRA : un consultant ne peut pas modifier days_validated';
  END IF;
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'CRA : un consultant ne peut pas changer organization_id';
  END IF;

  -- submitted_by : autorisé uniquement lors de la transition draft → submitted
  IF NEW.submitted_by IS DISTINCT FROM OLD.submitted_by THEN
    IF OLD.status <> 'draft' OR NEW.status <> 'submitted' THEN
      RAISE EXCEPTION 'CRA : submitted_by ne peut être modifié que lors de la soumission';
    END IF;
    IF NEW.submitted_by <> auth.uid() THEN
      RAISE EXCEPTION 'CRA : un consultant ne peut soumettre que pour son propre compte';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_consultant_tampering ON timesheets;
CREATE TRIGGER prevent_consultant_tampering
  BEFORE UPDATE ON timesheets
  FOR EACH ROW EXECUTE FUNCTION public.prevent_consultant_tampering();
