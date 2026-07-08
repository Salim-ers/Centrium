import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * E2E (niveau API/RLS) — cycle de vie d'un consultant par l'admin de son org.
 * Création → lecture → mise à jour → archivage, le tout scopé à
 * l'organisation de l'admin (RLS). Même style env-gated que
 * multi-tenant-isolation.spec.ts : skip si les variables ne sont pas là.
 *
 * Env attendues :
 *   SUPABASE_URL, SUPABASE_ANON_KEY,
 *   TEST_ORG_A_ADMIN_EMAIL, TEST_ORG_A_ADMIN_PASSWORD, TEST_ORG_A_ID
 */
const KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'TEST_ORG_A_ADMIN_EMAIL',
  'TEST_ORG_A_ADMIN_PASSWORD',
  'TEST_ORG_A_ID',
] as const;

const env = Object.fromEntries(KEYS.map((k) => [k, process.env[k] ?? ''])) as Record<
  (typeof KEYS)[number],
  string
>;
const missing = KEYS.filter((k) => !env[k]);

test.describe('Consultant — cycle de vie (org admin)', () => {
  test.skip(missing.length > 0, `Variables manquantes : ${missing.join(', ')}`);

  test('créer → lire → modifier → archiver un consultant', async () => {
    const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { error: loginErr } = await client.auth.signInWithPassword({
      email: env.TEST_ORG_A_ADMIN_EMAIL,
      password: env.TEST_ORG_A_ADMIN_PASSWORD,
    });
    expect(loginErr).toBeNull();

    const tag = `E2E_${Date.now()}`;
    let id: string | undefined;
    try {
      // CREATE — l'org_id doit être celui de l'admin (RLS WITH CHECK)
      const { data: created, error: createErr } = await client
        .from('consultants')
        .insert({
          organization_id: env.TEST_ORG_A_ID,
          first_name: tag,
          last_name: 'Test',
          job_title: 'QA Engineer',
        })
        .select('id, organization_id, archived')
        .single();
      expect(createErr).toBeNull();
      expect(created?.organization_id).toBe(env.TEST_ORG_A_ID);
      expect(created?.archived).toBe(false);
      id = created!.id;

      // READ — visible pour l'org
      const { data: read, error: readErr } = await client
        .from('consultants')
        .select('id, first_name')
        .eq('id', id)
        .single();
      expect(readErr).toBeNull();
      expect(read?.first_name).toBe(tag);

      // UPDATE
      const { error: updErr } = await client
        .from('consultants')
        .update({ job_title: 'Senior QA' })
        .eq('id', id);
      expect(updErr).toBeNull();

      // ARCHIVE — le trigger sync_archived_at doit poser archived_at
      const { data: archived, error: archErr } = await client
        .from('consultants')
        .update({ archived: true })
        .eq('id', id)
        .select('archived, archived_at')
        .single();
      expect(archErr).toBeNull();
      expect(archived?.archived).toBe(true);
      expect(archived?.archived_at).not.toBeNull();
    } finally {
      if (id) await client.from('consultants').delete().eq('id', id);
    }
  });
});
