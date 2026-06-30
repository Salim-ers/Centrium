-- =========================================================================
-- Migration 026 : Fix encoding bug in auto_invoice_from_validated_cra
-- =========================================================================
-- Symptom: invoices created automatically when a CRA is validated have a
-- `notes` field rendered as "G?n?r?e automatiquement ? la validation du CRA
-- Juillet 2026" (U+FFFD replacement characters) instead of the proper
-- "Générée automatiquement à la validation du CRA Juillet 2026".
--
-- Root cause: migrations 024 and 025 were applied through the Supabase
-- Management API channel that mis-decoded the UTF-8 source files and stored
-- U+FFFD in pg_proc. The function body itself contains U+FFFD, so every
-- new auto-invoice keeps inserting corrupted notes.
--
-- Defence: this migration uses Postgres U&'...' unicode escape syntax for
-- every accented character. Source is pure 7-bit ASCII — survives any
-- transport channel — and Postgres decodes it to proper UTF-8 at parse time.
--
-- Apply path: DO NOT use the Management API (`mcp__supabase__apply_migration`)
-- for this file. Apply via `mcp__supabase__execute_sql` or `npx supabase db
-- push` or `psql` — all UTF-8 safe channels.
-- =========================================================================

-- 1) Récréer la fonction du trigger avec des escapes Unicode (indestructibles)
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
  IF NEW.status <> 'client_validated' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'client_validated' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_existing FROM public.invoices WHERE timesheet_id = NEW.id;
  IF v_existing > 0 THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_mission FROM public.missions WHERE id = NEW.mission_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_amount_ht := ROUND(COALESCE(NEW.days_validated, NEW.days_worked, 0) * v_mission.daily_rate_eur, 2);
  v_amount_vat := ROUND(v_amount_ht * v_vat_rate / 100, 2);
  v_amount_ttc := v_amount_ht + v_amount_vat;

  v_period_label := CASE NEW.period_month
    WHEN 1  THEN 'Janvier'
    WHEN 2  THEN U&'F\00E9vrier'
    WHEN 3  THEN 'Mars'
    WHEN 4  THEN 'Avril'
    WHEN 5  THEN 'Mai'
    WHEN 6  THEN 'Juin'
    WHEN 7  THEN 'Juillet'
    WHEN 8  THEN U&'Ao\00FBt'
    WHEN 9  THEN 'Septembre'
    WHEN 10 THEN 'Octobre'
    WHEN 11 THEN 'Novembre'
    WHEN 12 THEN U&'D\00E9cembre'
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
    U&'G\00E9n\00E9r\00E9e automatiquement \00E0 la validation du CRA ' || v_period_label || '.'
  );

  RETURN NEW;
END;
$$;

-- 2) Backfill : récrire proprement les notes des factures déjà corrompues
--    en se basant sur period_label (qui n'est PAS corrompu d'après l'audit).
UPDATE public.invoices
   SET notes = U&'G\00E9n\00E9r\00E9e automatiquement \00E0 la validation du CRA '
     || period_label || '.'
 WHERE notes IS NOT NULL
   AND notes LIKE '%' || chr(65533) || '%';

-- 3) Garde-fou pour la suite : on refuse tout insert avec U+FFFD dans
--    notes ou period_label. Si une migration future re-corrompt, ça fail
--    bruyamment au lieu de polluer les PDFs envoyés aux clients.
CREATE OR REPLACE FUNCTION public.reject_fffd_in_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.notes ~ chr(65533) OR NEW.period_label ~ chr(65533) THEN
    RAISE EXCEPTION 'invoice contains U+FFFD replacement char (encoding bug). notes=%, period_label=%',
      NEW.notes, NEW.period_label;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_fffd_invoice ON public.invoices;
CREATE TRIGGER trg_reject_fffd_invoice
  BEFORE INSERT OR UPDATE OF notes, period_label ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.reject_fffd_in_invoice();
