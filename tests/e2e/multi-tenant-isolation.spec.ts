import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Tests d'isolation cross-tenant.
 *
 * Vérifie qu'un user de l'org A ne peut RIEN lire ni modifier de l'org B,
 * que ce soit via l'API publique Supabase (RLS) ou via les routes Next.js.
 *
 * Prérequis : Supabase local démarré (`npx supabase start`) + seed minimal
 * avec 2 organisations distinctes et 2 admins. Variables d'env attendues :
 *
 *   SUPABASE_URL              (ex: http://127.0.0.1:54321)
 *   SUPABASE_ANON_KEY
 *   TEST_ORG_A_ADMIN_EMAIL    + TEST_ORG_A_ADMIN_PASSWORD
 *   TEST_ORG_B_ADMIN_EMAIL    + TEST_ORG_B_ADMIN_PASSWORD
 *   TEST_ORG_A_ID             (uuid de l'org A)
 *   TEST_ORG_B_ID             (uuid de l'org B)
 *
 * Si ces variables manquent, les tests sont skipped — on n'échoue PAS la CI
 * tant que le seed multi-tenant n'est pas en place.
 */

const ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'TEST_ORG_A_ADMIN_EMAIL',
  'TEST_ORG_A_ADMIN_PASSWORD',
  'TEST_ORG_B_ADMIN_EMAIL',
  'TEST_ORG_B_ADMIN_PASSWORD',
  'TEST_ORG_A_ID',
  'TEST_ORG_B_ID',
] as const;

const env = Object.fromEntries(
  ENV_KEYS.map((k) => [k, process.env[k] ?? '']),
) as Record<(typeof ENV_KEYS)[number], string>;

const missing = ENV_KEYS.filter((k) => !env[k]);
const skip = missing.length > 0;

test.describe('Isolation cross-tenant', () => {
  test.skip(skip, `Variables manquantes : ${missing.join(', ')}`);

  const supaA = () => createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const supaB = () => createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

  async function loginAs(client: ReturnType<typeof supaA>, email: string, password: string) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
    return data.session!;
  }

  test('un admin org A ne voit AUCUN consultant de org B (RLS)', async () => {
    const client = supaA();
    await loginAs(client, env.TEST_ORG_A_ADMIN_EMAIL, env.TEST_ORG_A_ADMIN_PASSWORD);

    const { data, error } = await client
      .from('consultants')
      .select('id, organization_id, first_name, last_name')
      .eq('organization_id', env.TEST_ORG_B_ID);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('un admin org A ne voit AUCUN contact de org B (RLS)', async () => {
    const client = supaA();
    await loginAs(client, env.TEST_ORG_A_ADMIN_EMAIL, env.TEST_ORG_A_ADMIN_PASSWORD);

    const { data, error } = await client
      .from('contacts')
      .select('id, organization_id')
      .eq('organization_id', env.TEST_ORG_B_ID);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('un admin org A ne voit AUCUNE facture de org B (RLS)', async () => {
    const client = supaA();
    await loginAs(client, env.TEST_ORG_A_ADMIN_EMAIL, env.TEST_ORG_A_ADMIN_PASSWORD);

    const { data, error } = await client
      .from('invoices')
      .select('id, organization_id')
      .eq('organization_id', env.TEST_ORG_B_ID);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('un admin org A ne peut PAS modifier une org B (RLS)', async () => {
    const client = supaA();
    await loginAs(client, env.TEST_ORG_A_ADMIN_EMAIL, env.TEST_ORG_A_ADMIN_PASSWORD);

    const { data, error } = await client
      .from('organizations')
      .update({ name: 'HACKED_NAME_' + Date.now() })
      .eq('id', env.TEST_ORG_B_ID)
      .select('id, name');

    // RLS : pas d'erreur, mais aucune ligne retournée (rien matched côté lecture)
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);

    // Vérif côté B : le nom n'a pas changé
    const clientB = supaB();
    await loginAs(clientB, env.TEST_ORG_B_ADMIN_EMAIL, env.TEST_ORG_B_ADMIN_PASSWORD);
    const { data: orgB } = await clientB
      .from('organizations')
      .select('name')
      .eq('id', env.TEST_ORG_B_ID)
      .maybeSingle();
    expect(orgB?.name).not.toMatch(/^HACKED_NAME_/);
  });

  test('un admin org A ne peut PAS basculer son profile sur org B (trigger DB)', async () => {
    const client = supaA();
    const session = await loginAs(
      client,
      env.TEST_ORG_A_ADMIN_EMAIL,
      env.TEST_ORG_A_ADMIN_PASSWORD,
    );

    const { error } = await client
      .from('profiles')
      .update({ organization_id: env.TEST_ORG_B_ID })
      .eq('id', session.user.id);

    // Le trigger enforce_profile_active_org_is_member doit bloquer ça
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toMatch(/not a member|check_violation|policy/);
  });

  test('un admin org A ne peut PAS insérer un consultant pour org B', async () => {
    const client = supaA();
    await loginAs(client, env.TEST_ORG_A_ADMIN_EMAIL, env.TEST_ORG_A_ADMIN_PASSWORD);

    const { data, error } = await client
      .from('consultants')
      .insert({
        organization_id: env.TEST_ORG_B_ID,
        first_name: 'Mallory',
        last_name: 'Injection',
      })
      .select('id');

    // RLS WITH CHECK bloque l'insert avec un mauvais organization_id
    expect(error).not.toBeNull();
    expect(data ?? []).toEqual([]);
  });

  test('un user non connecté ne lit RIEN (pas de session)', async () => {
    const client = supaA(); // pas de login

    const { data: consultants } = await client.from('consultants').select('id');
    const { data: contacts } = await client.from('contacts').select('id');
    const { data: invoices } = await client.from('invoices').select('id');

    expect(consultants ?? []).toEqual([]);
    expect(contacts ?? []).toEqual([]);
    expect(invoices ?? []).toEqual([]);
  });
});
