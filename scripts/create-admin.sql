-- =========================================================================
-- Création / promotion des admins QuadCore
-- =========================================================================
-- Usage (Supabase local) :
--   docker exec -i supabase_db_quadcore-platform psql -U postgres -d postgres < scripts/create-admin.sql
--
-- Tous les users déclarés ici sont promus admin et rattachés à l'org QuadCore.
-- Idempotent : relance après un `supabase db reset` pour tout recréer.
-- =========================================================================

DO $$
DECLARE
  v_org_id UUID := '11111111-1111-1111-1111-111111111111';
  v_user_id UUID;
  v_user RECORD;
  v_users JSONB := '[
    {"email":"salim.elr@quad-core.fr",      "password":"El52sa73&*", "first_name":"Salim",    "last_name":"EL RHALMANI"},
    {"email":"hasan.akar@quad-core.fr",     "password":"El52sa73&*", "first_name":"Hasan",    "last_name":"AKAR"},
    {"email":"alphonse.aroul@quad-core.fr", "password":"El52sa73&*", "first_name":"Alphonse", "last_name":"AROUL"},
    {"email":"moustakine.mouhamad@quad-core.fr","password":"El52sa73&*","first_name":"Moustakine","last_name":"MOUHAMAD"}
  ]'::jsonb;
BEGIN
  FOR v_user IN SELECT * FROM jsonb_to_recordset(v_users)
    AS x(email TEXT, password TEXT, first_name TEXT, last_name TEXT)
  LOOP
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_user.email);

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
        v_user.email,
        crypt(v_user.password, gen_salt('bf')),
        NOW(), NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('first_name', v_user.first_name, 'last_name', v_user.last_name),
        NOW(), NOW(), '', '', '', ''
      );

      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        v_user_id,
        v_user_id::text,
        jsonb_build_object('sub', v_user_id::text, 'email', v_user.email, 'email_verified', true),
        'email',
        NOW(), NOW(), NOW()
      );
    ELSE
      UPDATE auth.users
         SET encrypted_password = crypt(v_user.password, gen_salt('bf')),
             email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
             updated_at = NOW()
       WHERE id = v_user_id;
    END IF;

    INSERT INTO profiles (id, email, first_name, last_name, role, organization_id)
    VALUES (v_user_id, v_user.email, v_user.first_name, v_user.last_name, 'admin', v_org_id)
    ON CONFLICT (id) DO UPDATE
      SET first_name      = EXCLUDED.first_name,
          last_name       = EXCLUDED.last_name,
          role            = 'admin',
          organization_id = v_org_id,
          updated_at      = NOW();

    RAISE NOTICE 'Admin OK : % (%)', v_user.email, v_user_id;
  END LOOP;
END $$;
