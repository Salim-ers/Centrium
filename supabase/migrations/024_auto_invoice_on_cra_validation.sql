-- =========================================================================
-- Migration 024 : Auto-génération de facture quand un CRA passe à client_validated
-- =========================================================================
-- Avant 024 la création de facture vivait uniquement côté service client
-- (timesheetService.validateAndInvoice). Si le statut du CRA était changé
-- par un autre chemin (portail consultant, bouton "Marquer validé" sur la
-- liste, SQL direct), aucune facture n'était créée et le CA ne remontait
-- pas.
--
-- Le trigger AFTER UPDATE ci-dessous garantit qu'une facture est insérée
-- dès que timesheets.status devient 'client_validated' (idempotent : ne
-- duplique pas si une facture existe déjà pour ce CRA).
-- =========================================================================

-- Une mission libre (sans AO/client) doit pouvoir générer une facture aussi.
-- On relâche la contrainte company_id NOT NULL — l'UI affiche déjà "—"
-- gracefully quand company est absent.
ALTER TABLE public.invoices ALTER COLUMN company_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.auto_invoice_from_validated_cra()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mission RECORD;
  v_amount_ht NUMERIC;
  v_vat_rate NUMERIC := 20;
  v_amount_vat NUMERIC;
  v_amount_ttc NUMERIC;
  v_period_label TEXT;
  v_existing INT;
  v_invoice_number TEXT;
BEGIN
  -- Fire only on transition INTO client_validated
  IF NEW.status <> 'client_validated' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'client_validated' THEN
    RETURN NEW;
  END IF;

  -- Idempotent : skip si une facture existe déjà
  SELECT COUNT(*) INTO v_existing FROM public.invoices WHERE timesheet_id = NEW.id;
  IF v_existing > 0 THEN
    RETURN NEW;
  END IF;

  -- Mission (TJM, organization, company)
  SELECT * INTO v_mission FROM public.missions WHERE id = NEW.mission_id;
  IF NOT FOUND THEN
    -- Pas de mission liée : on ne peut pas calculer la facture, on laisse passer
    RETURN NEW;
  END IF;

  -- Montants
  v_amount_ht := ROUND(COALESCE(NEW.days_validated, NEW.days_worked, 0) * v_mission.daily_rate_eur, 2);
  v_amount_vat := ROUND(v_amount_ht * v_vat_rate / 100, 2);
  v_amount_ttc := v_amount_ht + v_amount_vat;

  v_period_label := CASE NEW.period_month
    WHEN 1 THEN 'Janvier' WHEN 2 THEN 'Février' WHEN 3 THEN 'Mars'
    WHEN 4 THEN 'Avril' WHEN 5 THEN 'Mai' WHEN 6 THEN 'Juin'
    WHEN 7 THEN 'Juillet' WHEN 8 THEN 'Août' WHEN 9 THEN 'Septembre'
    WHEN 10 THEN 'Octobre' WHEN 11 THEN 'Novembre' WHEN 12 THEN 'Décembre'
  END || ' ' || NEW.period_year;

  v_invoice_number := 'FAC-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT
    || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

  INSERT INTO public.invoices (
    organization_id, company_id, mission_id, timesheet_id,
    invoice_number, issue_date, due_date, period_label,
    amount_ht, vat_rate, amount_vat, amount_ttc,
    status, payment_date, notes
  ) VALUES (
    v_mission.organization_id, v_mission.company_id, v_mission.id, NEW.id,
    v_invoice_number, CURRENT_DATE, CURRENT_DATE, v_period_label,
    v_amount_ht, v_vat_rate, v_amount_vat, v_amount_ttc,
    'paid', CURRENT_DATE,
    'Générée automatiquement à la validation du CRA ' || v_period_label || '.'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_invoice_from_validated_cra ON public.timesheets;
CREATE TRIGGER trg_auto_invoice_from_validated_cra
  AFTER INSERT OR UPDATE OF status ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.auto_invoice_from_validated_cra();

-- =========================================================================
-- Backfill : pour chaque CRA déjà 'client_validated' sans facture, on tape
-- un UPDATE no-op du status pour déclencher le trigger ci-dessus.
-- =========================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT t.id
    FROM public.timesheets t
    WHERE t.status = 'client_validated'
      AND NOT EXISTS (SELECT 1 FROM public.invoices i WHERE i.timesheet_id = t.id)
  LOOP
    UPDATE public.timesheets
       SET status = 'submitted'
     WHERE id = r.id;
    UPDATE public.timesheets
       SET status = 'client_validated'
     WHERE id = r.id;
  END LOOP;
END $$;
