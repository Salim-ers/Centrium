-- =========================================================================
-- Création d'un compte consultant de test : Alex S.
-- =========================================================================
-- Usage :
--   docker exec -i supabase_db_quadcore-platform psql -U postgres -d postgres < scripts/create-test-consultant.sql
--
-- Identifiants générés :
--   Email    : alex.s@quad-core.fr
--   Password : Consultant2026!
--
-- Pré-remplit aussi :
--   - email du consultant Alex S.
--   - 3 CRA (Janv / Fév / Mars 2026) en statuts draft / submitted / client_validated
--   - 1 facture payée liée au CRA Mars 2026 (pour tester /portal/invoices)
-- =========================================================================

DO $$
DECLARE
  v_email       TEXT := 'alex.s@quad-core.fr';
  v_password    TEXT := 'Consultant2026!';
  v_first_name  TEXT := 'Alex';
  v_last_name   TEXT := 'S.';
  v_org_id      UUID := '11111111-1111-1111-1111-111111111111';
  v_consultant_id UUID := 'c0000001-0000-0000-0000-000000000001';
  v_mission_id  UUID;
  v_company_id  UUID;
  v_daily_rate  NUMERIC;
  v_user_id     UUID;

  v_ts_draft      UUID;
  v_ts_submitted  UUID;
  v_ts_validated  UUID;
  v_invoice_paid  UUID;
BEGIN
  -- 0. Assigner un email sur la fiche consultant (sinon NULL)
  UPDATE consultants
     SET email = v_email,
         updated_at = NOW()
   WHERE id = v_consultant_id;

  -- 1. Charger la mission active d'Alex
  SELECT id, company_id, daily_rate_eur
    INTO v_mission_id, v_company_id, v_daily_rate
    FROM missions
   WHERE consultant_id = v_consultant_id AND status = 'active'
   LIMIT 1;

  IF v_mission_id IS NULL THEN
    RAISE EXCEPTION 'Aucune mission active pour Alex S. — impossible de créer des CRA';
  END IF;

  -- 2. Créer ou mettre à jour le user auth
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_email);

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      NOW(), NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('first_name', v_first_name, 'last_name', v_last_name),
      NOW(), NOW(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email',
      NOW(), NOW(), NOW()
    );
  ELSE
    UPDATE auth.users
       SET encrypted_password = crypt(v_password, gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
           banned_until = NULL,
           updated_at = NOW()
     WHERE id = v_user_id;
  END IF;

  -- 3. Upsert profile (role=consultant + lien consultant_id)
  -- Attention : la contrainte profiles_consultant_role_match exige que
  -- role='consultant' ⇔ consultant_id IS NOT NULL. On fait donc les deux
  -- dans le même UPDATE (ou INSERT).
  INSERT INTO profiles (id, email, first_name, last_name, role, organization_id, consultant_id)
  VALUES (v_user_id, v_email, v_first_name, v_last_name, 'consultant', v_org_id, v_consultant_id)
  ON CONFLICT (id) DO UPDATE
    SET first_name      = EXCLUDED.first_name,
        last_name       = EXCLUDED.last_name,
        role            = 'consultant',
        organization_id = v_org_id,
        consultant_id   = v_consultant_id,
        updated_at      = NOW();

  RAISE NOTICE 'Compte consultant créé : % → consultant % (user %)', v_email, v_consultant_id, v_user_id;

  -- 4. Seed : 3 CRA de test (on ne recrée pas s'ils existent déjà)
  --   a. CRA draft (avril 2026)
  SELECT id INTO v_ts_draft
    FROM timesheets
   WHERE consultant_id = v_consultant_id
     AND mission_id = v_mission_id
     AND period_month = 4 AND period_year = 2026;
  IF v_ts_draft IS NULL THEN
    INSERT INTO timesheets (
      organization_id, mission_id, consultant_id,
      period_month, period_year, days_worked, days_validated, status, notes
    ) VALUES (
      v_org_id, v_mission_id, v_consultant_id,
      4, 2026, 18, 0, 'draft', 'Avril 2026 — en cours de saisie'
    ) RETURNING id INTO v_ts_draft;
    RAISE NOTICE 'CRA draft créé : %', v_ts_draft;
  END IF;

  --   b. CRA submitted (mars 2026) — transition explicite
  SELECT id INTO v_ts_submitted
    FROM timesheets
   WHERE consultant_id = v_consultant_id
     AND mission_id = v_mission_id
     AND period_month = 3 AND period_year = 2026;
  IF v_ts_submitted IS NULL THEN
    INSERT INTO timesheets (
      organization_id, mission_id, consultant_id,
      period_month, period_year, days_worked, days_validated, status, notes
    ) VALUES (
      v_org_id, v_mission_id, v_consultant_id,
      3, 2026, 21, 0, 'draft', 'Mars 2026'
    ) RETURNING id INTO v_ts_submitted;
    -- transition draft → submitted (trigger bypass en service_role)
    UPDATE timesheets
       SET status = 'submitted',
           submitted_by = v_user_id,
           submitted_at = NOW()
     WHERE id = v_ts_submitted;
    RAISE NOTICE 'CRA submitted créé : %', v_ts_submitted;
  END IF;

  --   c. CRA validé (février 2026)
  SELECT id INTO v_ts_validated
    FROM timesheets
   WHERE consultant_id = v_consultant_id
     AND mission_id = v_mission_id
     AND period_month = 2 AND period_year = 2026;
  IF v_ts_validated IS NULL THEN
    INSERT INTO timesheets (
      organization_id, mission_id, consultant_id,
      period_month, period_year, days_worked, days_validated, status, notes
    ) VALUES (
      v_org_id, v_mission_id, v_consultant_id,
      2, 2026, 20, 0, 'draft', 'Février 2026'
    ) RETURNING id INTO v_ts_validated;
    UPDATE timesheets
       SET status = 'submitted',
           submitted_by = v_user_id,
           submitted_at = NOW()
     WHERE id = v_ts_validated;
    UPDATE timesheets
       SET status = 'client_validated',
           days_validated = 20,
           validated_at = NOW()
     WHERE id = v_ts_validated;
    RAISE NOTICE 'CRA validé créé : %', v_ts_validated;
  END IF;

  -- 5. Seed : 1 facture payée pour le CRA validé
  SELECT id INTO v_invoice_paid
    FROM invoices
   WHERE timesheet_id = v_ts_validated;
  IF v_invoice_paid IS NULL THEN
    INSERT INTO invoices (
      organization_id, company_id, mission_id, timesheet_id,
      invoice_number, issue_date, due_date, period_label,
      amount_ht, vat_rate, amount_vat, amount_ttc,
      status, payment_date, notes
    ) VALUES (
      v_org_id, v_company_id, v_mission_id, v_ts_validated,
      'FAC-2026-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0'),
      '2026-03-01', '2026-03-01', 'Février 2026',
      20 * v_daily_rate,
      20,
      (20 * v_daily_rate) * 0.20,
      (20 * v_daily_rate) * 1.20,
      'paid',
      '2026-03-15',
      'Facture démo — générée pour le compte de test.'
    ) RETURNING id INTO v_invoice_paid;
    RAISE NOTICE 'Facture payée créée : %', v_invoice_paid;
  END IF;

  RAISE NOTICE '=== Compte de test prêt ===';
  RAISE NOTICE '  Email    : %', v_email;
  RAISE NOTICE '  Password : %', v_password;
  RAISE NOTICE '  Profil   : Alex S. (QA Automation chez LVMH – Dior)';
END $$;
