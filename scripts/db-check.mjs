// =========================================================================
// Vérification de la base sans Docker : rejoue toutes les migrations
// Supabase dans PGlite (Postgres compilé en WASM) avec des stubs des
// schémas auth / storage / cron, puis exécute les tests SQL de
// supabase/tests/*.sql (assertions RLS, RBAC, portails).
//
// Usage : npm run db:check
//         node scripts/db-check.mjs <migrationsDir> [tests.sql...]
//
// Limites : PGlite n'est pas Supabase (pas de GoTrue, Storage ni Realtime
// réels). Ce contrôle valide le SQL et la RLS ; il ne remplace pas un
// passage en staging avant la production.
// =========================================================================
import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STUBS = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role supabase_admin;
create role supabase_auth_admin;
create role authenticator;
create role dashboard_user;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(), email text, phone text,
  raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}',
  created_at timestamptz default now(), updated_at timestamptz default now(),
  email_confirmed_at timestamptz, last_sign_in_at timestamptz, encrypted_password text,
  deleted_at timestamptz, is_anonymous boolean default false, banned_until timestamptz
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid, status text, factor_type text);
create schema storage;
create table storage.buckets (
  id text primary key, name text, owner uuid, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now(),
  updated_at timestamptz default now(), avif_autodetection boolean default false
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
  name text, owner uuid, owner_id text, metadata jsonb, created_at timestamptz default now(),
  updated_at timestamptz default now(), last_accessed_at timestamptz, path_tokens text[], version text
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
create function storage.filename(name text) returns text language sql immutable as $$
  select (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)] $$;
create function storage.extension(name text) returns text language sql immutable as $$
  select reverse(split_part(reverse(name), '.', 1)) $$;
create schema cron;
create function cron.schedule(a text, b text, c text) returns bigint language sql as $$ select 1::bigint $$;
create function cron.unschedule(a text) returns boolean language sql as $$ select true $$;
create schema extensions;
create publication supabase_realtime;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
grant all on storage.objects, storage.buckets to authenticated, service_role;
`;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.argv[2] ?? path.join(ROOT, 'supabase', 'migrations');
const testsDir = path.join(ROOT, 'supabase', 'tests');
const tests = process.argv[2]
  ? process.argv.slice(3)
  : fs.readdirSync(testsDir).filter((f) => f.endsWith('.sql')).sort().map((f) => path.join(testsDir, f));
const db = await PGlite.create({ extensions: { uuid_ossp, pgcrypto } });
await db.exec(STUBS);

let failures = 0;
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
// Dérive connue entre les fichiers et la prod : colonnes présentes en prod
// avant que la migration qui les crée ne soit jouée (ordre historique).
const DRIFT = {
  '060': `alter table activities add column if not exists user_id uuid, add column if not exists details jsonb;`,
  '062': `alter table opportunities add column if not exists archived boolean not null default false, add column if not exists archived_at timestamptz;
          alter table consultants add column if not exists archived_at timestamptz;
          alter table contacts add column if not exists archived_at timestamptz;
          alter table contracts add column if not exists archived_at timestamptz, add column if not exists reference text;`,
};
for (const f of files) {
  const sql = fs.readFileSync(path.join(dir, f), 'utf8');
  const drift = DRIFT[f.slice(0, 3)];
  if (drift) await db.exec(drift);
  try {
    await db.exec(sql);
  } catch (e) {
    failures++;
    console.log(`FAIL ${f}: ${e.message}`);
  }
}
console.log(`Migrations : ${files.length - failures}/${files.length} OK`);

// Seed de l'espace de démonstration : doit rester compatible avec le schéma
// et rejouable (joué deux fois). Il ne touche que l'organisation de démo.
const demoSeed = path.join(ROOT, 'supabase', 'seed', 'demo.sql');
if (!process.argv[2] && fs.existsSync(demoSeed)) {
  try {
    const seed = fs.readFileSync(demoSeed, 'utf8');
    await db.exec(seed);
    await db.exec(seed);
    console.log('Seed démo : OK (rejoué deux fois)');
  } catch (e) {
    failures++;
    console.log(`FAIL seed démo : ${e.message}`);
  }
}

for (const t of tests) {
  const sql = fs.readFileSync(t, 'utf8');
  try {
    const res = await db.exec(sql);
    for (const r of res) {
      if (r.rows?.length) for (const row of r.rows) console.log(JSON.stringify(row));
    }
    console.log(`TEST OK ${path.basename(t)}`);
  } catch (e) {
    failures++;
    console.log(`TEST FAIL ${path.basename(t)}: ${e.message}`);
  }
}
process.exitCode = failures ? 1 : 0;
