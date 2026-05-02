-- =============================================================
-- 026_timesheet_days_kind.sql
--
-- Calendrier CRA "à la main" : on distingue les jours travaillés
-- des jours fériés et des absences (congés, maladie, sans solde).
-- Auto-population des jours ouvrés à la création du CRA et resync
-- automatique de timesheets.days_worked depuis la somme.
-- =============================================================

-- 1. Colonne kind (worked / paid_leave / sick_leave / unpaid_leave / holiday)
ALTER TABLE timesheet_days
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'worked'
  CHECK (kind IN ('worked', 'paid_leave', 'sick_leave', 'unpaid_leave', 'holiday'));

CREATE INDEX IF NOT EXISTS idx_ts_days_kind ON timesheet_days(timesheet_id, kind);

-- Backfill : les jours existants avec duration > 0 sont "worked", les autres "holiday"
UPDATE timesheet_days SET kind = CASE WHEN duration > 0 THEN 'worked' ELSE 'holiday' END
WHERE kind = 'worked' AND duration = 0;

-- 2. Recompute trigger : days_worked = SUM(duration WHERE kind='worked')
CREATE OR REPLACE FUNCTION recompute_timesheet_days_worked()
RETURNS TRIGGER AS $$
DECLARE
  ts_id UUID;
  total NUMERIC(4, 2);
BEGIN
  ts_id := COALESCE(NEW.timesheet_id, OLD.timesheet_id);
  SELECT COALESCE(SUM(duration), 0) INTO total
  FROM timesheet_days
  WHERE timesheet_id = ts_id AND kind = 'worked';
  UPDATE timesheets SET days_worked = total WHERE id = ts_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS timesheet_days_recompute ON timesheet_days;
CREATE TRIGGER timesheet_days_recompute
AFTER INSERT OR UPDATE OF duration, kind OR DELETE ON timesheet_days
FOR EACH ROW EXECUTE FUNCTION recompute_timesheet_days_worked();

-- 3. Auto-populate des jours ouvrés à la création d'un CRA
CREATE OR REPLACE FUNCTION populate_timesheet_weekdays()
RETURNS TRIGGER AS $$
DECLARE
  cursor_date DATE;
  end_date DATE;
  dow INT;
BEGIN
  cursor_date := make_date(NEW.period_year, NEW.period_month, 1);
  end_date := (cursor_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  WHILE cursor_date <= end_date LOOP
    dow := EXTRACT(DOW FROM cursor_date)::INT; -- 0=dim, 6=sam
    IF dow NOT IN (0, 6) THEN
      INSERT INTO timesheet_days (timesheet_id, day_date, duration, kind, note)
      VALUES (NEW.id, cursor_date, 1.0, 'worked', NULL)
      ON CONFLICT (timesheet_id, day_date) DO NOTHING;
    END IF;
    cursor_date := cursor_date + INTERVAL '1 day';
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS timesheet_auto_populate ON timesheets;
CREATE TRIGGER timesheet_auto_populate
AFTER INSERT ON timesheets
FOR EACH ROW EXECUTE FUNCTION populate_timesheet_weekdays();

-- 4. Backfill : CRA existants qui n'ont AUCUN jour → on les remplit
--    sans déclencher le recompute (pour ne pas écraser un days_worked
--    déjà saisi à la main par l'utilisateur historique).
ALTER TABLE timesheet_days DISABLE TRIGGER timesheet_days_recompute;

INSERT INTO timesheet_days (timesheet_id, day_date, duration, kind)
SELECT t.id, d::DATE, 1.0, 'worked'
FROM timesheets t
CROSS JOIN LATERAL generate_series(
  make_date(t.period_year, t.period_month, 1),
  (make_date(t.period_year, t.period_month, 1) + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
  '1 day'::INTERVAL
) d
WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)
  AND NOT EXISTS (SELECT 1 FROM timesheet_days WHERE timesheet_id = t.id)
ON CONFLICT (timesheet_id, day_date) DO NOTHING;

ALTER TABLE timesheet_days ENABLE TRIGGER timesheet_days_recompute;

COMMENT ON COLUMN timesheet_days.kind IS
  'Type de jour : worked (travaillé), paid_leave (congés payés), sick_leave (maladie), unpaid_leave (sans solde), holiday (jour férié)';
