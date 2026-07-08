import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * E2E (niveau API) — LE flux de facturation critique : la validation d'un CRA
 * doit générer automatiquement la facture CLIENT (trigger DB
 * trg_auto_invoice_from_validated_cra).
 *
 * On monte les données minimales (consultant + mission + CRA), on fait passer
 * le CRA en `client_validated` en respectant les transitions
 * (enforce_timesheet_transition : draft → submitted → client_validated), puis
 * on vérifie qu'une facture client reliée au CRA apparaît. Tout est nettoyé.
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

test.describe('CRA → facture client (auto)', () => {
  test.skip(missing.length > 0, `Variables manquantes : ${missing.join(', ')}`);

  test('valider un CRA génère une facture client reliée', async () => {
    const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { error: loginErr } = await client.auth.signInWithPassword({
      email: env.TEST_ORG_A_ADMIN_EMAIL,
      password: env.TEST_ORG_A_ADMIN_PASSWORD,
    });
    expect(loginErr).toBeNull();

    const org = env.TEST_ORG_A_ID;
    const tag = `E2E_${Date.now()}`;
    const cleanup: Array<() => Promise<unknown>> = [];

    try {
      // Consultant
      const { data: c, error: cErr } = await client
        .from('consultants')
        .insert({ organization_id: org, first_name: tag, last_name: 'CRA', job_title: 'Dev' })
        .select('id')
        .single();
      expect(cErr).toBeNull();
      cleanup.push(() => client.from('consultants').delete().eq('id', c!.id));

      // Mission (daily_rate_eur requis → base du montant facturé)
      const { data: m, error: mErr } = await client
        .from('missions')
        .insert({
          organization_id: org,
          consultant_id: c!.id,
          title: `${tag} mission`,
          daily_rate_eur: 500,
          start_date: '2026-01-01',
        })
        .select('id')
        .single();
      expect(mErr).toBeNull();
      cleanup.push(() => client.from('missions').delete().eq('id', m!.id));

      // CRA (draft par défaut)
      const { data: ts, error: tsErr } = await client
        .from('timesheets')
        .insert({
          organization_id: org,
          mission_id: m!.id,
          consultant_id: c!.id,
          period_month: 1,
          period_year: 2026,
          days_worked: 20,
        })
        .select('id, status')
        .single();
      expect(tsErr).toBeNull();
      cleanup.push(() => client.from('timesheets').delete().eq('id', ts!.id));

      // Transitions draft → submitted → client_validated
      const { error: subErr } = await client
        .from('timesheets')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', ts!.id);
      expect(subErr).toBeNull();

      const { error: valErr } = await client
        .from('timesheets')
        .update({
          status: 'client_validated',
          validated_at: new Date().toISOString(),
          days_validated: 20,
        })
        .eq('id', ts!.id);
      expect(valErr).toBeNull();

      // La facture CLIENT doit avoir été créée par le trigger, reliée au CRA.
      const { data: inv, error: invErr } = await client
        .from('invoices')
        .select('id, organization_id, timesheet_id, party')
        .eq('timesheet_id', ts!.id)
        .maybeSingle();
      expect(invErr).toBeNull();
      expect(inv, 'une facture client doit être générée à la validation du CRA').not.toBeNull();
      expect(inv?.organization_id).toBe(org);
      expect(inv?.party).toBe('client');
      if (inv?.id) cleanup.push(() => client.from('invoices').delete().eq('id', inv.id));
    } finally {
      // Nettoyage en ordre inverse (contraintes FK) — best-effort.
      for (const fn of cleanup.reverse()) {
        await fn().catch(() => {});
      }
    }
  });
});
