-- =========================================================================
-- Migration 025 : sync consultant.status ↔ missions, encoding fixes
-- =========================================================================
-- 1. Recrée le trigger d'auto-facture avec un encodage UTF-8 propre
--    (la version 024 a été appliquée via l'API Management qui a mangé les
--    accents — résultat : "Gï¿½nï¿½rï¿½e" au lieu de "Générée").
-- 2. Ajoute un trigger qui synchronise consultants.status :
--    - 'available' → 'on_mission' à la création/activation d'une mission
--    - 'on_mission' → 'available' à la fin/refus de la dernière mission active
-- 3. Backfill : repasse les consultants ayant une mission active en
--    'on_mission', et corrige les notes mojibake de la facture FAC-2026-5927.
-- =========================================================================

-- 1) Recréer la fonction du trigger 024 avec accents propres
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
    WHEN 1 THEN 'Janvier' WHEN 2 THEN E'Février' WHEN 3 THEN 'Mars'
    WHEN 4 THEN 'Avril' WHEN 5 THEN 'Mai' WHEN 6 THEN 'Juin'
    WHEN 7 THEN 'Juillet' WHEN 8 THEN E'Août' WHEN 9 THEN 'Septembre'
    WHEN 10 THEN 'Octobre' WHEN 11 THEN 'Novembre' WHEN 12 THEN E'Décembre'
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
    E'Générée automatiquement à la validation du CRA ' || v_period_label || '.'
  );

  RETURN NEW;
END;
$$;

-- 2) Trigger sync consultant.status
CREATE OR REPLACE FUNCTION public.sync_consultant_status_from_missions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consultant_id UUID;
  v_active_count INT;
  v_current_status TEXT;
BEGIN
  -- Identifier le consultant concerné (NEW pour insert/update, OLD pour delete)
  v_consultant_id := COALESCE(NEW.consultant_id, OLD.consultant_id);
  IF v_consultant_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*) INTO v_active_count
  FROM public.missions
  WHERE consultant_id = v_consultant_id
    AND status IN ('proposed', 'active');

  SELECT status INTO v_current_status
  FROM public.consultants
  WHERE id = v_consultant_id;

  IF v_active_count > 0 THEN
    -- Au moins une mission active → on_mission (sauf si déjà unavailable)
    IF v_current_status IN ('available', 'soon_available') THEN
      UPDATE public.consultants
         SET status = 'on_mission'
       WHERE id = v_consultant_id;
    END IF;
  ELSE
    -- Plus de mission active → available (sauf si déjà unavailable/archived)
    IF v_current_status = 'on_mission' THEN
      UPDATE public.consultants
         SET status = 'available'
       WHERE id = v_consultant_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_consultant_status ON public.missions;
CREATE TRIGGER trg_sync_consultant_status
  AFTER INSERT OR UPDATE OF status, consultant_id OR DELETE ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.sync_consultant_status_from_missions();

-- 3) Backfill données existantes
-- 3a) Corriger les notes mojibake déjà insérées
UPDATE public.invoices
   SET notes = REGEXP_REPLACE(
     REPLACE(REPLACE(REPLACE(notes,
       'ï¿½nï¿½rï¿½e', E'énérée'),
       'Gï¿½', 'G'),
       'ï¿½ la validation', E'à la validation'),
     'ï¿½', '', 'g')
 WHERE notes LIKE '%ï¿½%';

-- Récrire proprement le label "Générée automatiquement à la validation du CRA <period>."
UPDATE public.invoices
   SET notes = E'Générée automatiquement à la validation du CRA '
     || period_label || '.'
 WHERE notes IS NOT NULL
   AND notes LIKE '%automatiquement%'
   AND period_label IS NOT NULL;

-- 3b) Sync status pour tous les consultants existants
UPDATE public.consultants c
   SET status = 'on_mission'
 WHERE c.status IN ('available', 'soon_available')
   AND EXISTS (
     SELECT 1 FROM public.missions m
      WHERE m.consultant_id = c.id
        AND m.status IN ('proposed', 'active')
   );

UPDATE public.consultants c
   SET status = 'available'
 WHERE c.status = 'on_mission'
   AND NOT EXISTS (
     SELECT 1 FROM public.missions m
      WHERE m.consultant_id = c.id
        AND m.status IN ('proposed', 'active')
   );
