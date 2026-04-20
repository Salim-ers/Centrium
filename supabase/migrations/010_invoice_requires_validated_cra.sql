-- =========================================================================
-- Migration 010 : Une facture ne peut être liée qu'à un CRA validé
-- =========================================================================
-- Trigger BEFORE INSERT/UPDATE sur invoices : si timesheet_id est renseigné,
-- le CRA pointé doit être en statut 'client_validated'.
--
-- Cas particuliers :
--   - Factures sans timesheet_id (ex: facture ad-hoc) : pas de contrôle.
--   - Modification d'une facture sans toucher timesheet_id : pas de
--     revalidation (pour éviter de bloquer un simple update de notes).
-- =========================================================================

CREATE OR REPLACE FUNCTION public.check_invoice_requires_validated_cra()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  -- Pas de CRA associé : on laisse passer (facture ad-hoc possible).
  IF NEW.timesheet_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- UPDATE qui ne change pas le timesheet_id : pas de revalidation nécessaire.
  IF TG_OP = 'UPDATE'
     AND OLD.timesheet_id IS NOT DISTINCT FROM NEW.timesheet_id THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_status
  FROM public.timesheets
  WHERE id = NEW.timesheet_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Facture : CRA introuvable (id=%)', NEW.timesheet_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF v_status <> 'client_validated' THEN
    RAISE EXCEPTION
      'Facture : le CRA doit être validé client avant facturation (statut actuel : %)',
      v_status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_invoice_requires_validated_cra ON invoices;
CREATE TRIGGER enforce_invoice_requires_validated_cra
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION public.check_invoice_requires_validated_cra();
