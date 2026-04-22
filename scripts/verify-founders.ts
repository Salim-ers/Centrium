/**
 * Vérifie que les 4 comptes fondateurs partagent bien la même orga QuadCore
 * et voient les mêmes données (même organization_id, même membership role).
 *
 * Usage : npx tsx scripts/verify-founders.ts
 *
 * Aucune modification, purement diagnostic.
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const FOUNDER_EMAILS = [
  'Salim.elr@quad-core.fr',
  'moustakine.mouhamad@quad-core.fr',
  'alphonse.aroul@quad-core.fr',
  'Hasan.akar@quad-core.fr',
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('env manquante');

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Orga QuadCore
  const { data: org } = await admin
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', 'quadcore')
    .maybeSingle();
  if (!org) {
    console.error('❌ Organisation "quadcore" introuvable.');
    process.exit(1);
  }
  console.log(`Orga  : ${org.name} (${org.id})\n`);

  // Users + profiles + memberships
  const { data: list } = await admin.auth.admin.listUsers();
  const byEmail = new Map(list.users.map((u) => [u.email?.toLowerCase() ?? '', u]));

  const rows: {
    email: string;
    user_id: string;
    profile_org: string | null;
    profile_role: string | null;
    member_role: string | null;
    ok: boolean;
  }[] = [];

  for (const email of FOUNDER_EMAILS) {
    const u = byEmail.get(email.toLowerCase());
    if (!u) {
      rows.push({
        email,
        user_id: '(inexistant)',
        profile_org: null,
        profile_role: null,
        member_role: null,
        ok: false,
      });
      continue;
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', u.id)
      .maybeSingle();

    const { data: member } = await admin
      .from('organization_members')
      .select('role')
      .eq('organization_id', org.id)
      .eq('user_id', u.id)
      .maybeSingle();

    const sameOrg = profile?.organization_id === org.id;
    const isAdmin = profile?.role === 'admin' && member?.role === 'admin';

    rows.push({
      email,
      user_id: u.id,
      profile_org: profile?.organization_id ?? null,
      profile_role: profile?.role ?? null,
      member_role: member?.role ?? null,
      ok: sameOrg && isAdmin,
    });
  }

  console.log('┌─────────────────────────────────────────────┬──────────┬──────────────┬─────┐');
  console.log('│ Email                                       │ profile  │ membership   │ OK  │');
  console.log('├─────────────────────────────────────────────┼──────────┼──────────────┼─────┤');
  for (const r of rows) {
    const orgMatch = r.profile_org === org.id ? '✓ quadcore' : '✗ ' + (r.profile_org ?? 'null').slice(0, 8);
    const line =
      `│ ${r.email.padEnd(43)} │ ${(r.profile_role ?? 'null').padEnd(8)} │ ${(r.member_role ?? 'null').padEnd(12)} │ ${r.ok ? ' ✓ ' : ' ✗ '} │`;
    console.log(line);
    if (!r.ok) {
      console.log(`│   └─ org match : ${orgMatch}`.padEnd(97) + '│');
    }
  }
  console.log('└─────────────────────────────────────────────┴──────────┴──────────────┴─────┘');

  const allOk = rows.every((r) => r.ok);
  if (allOk) {
    console.log('\n✅ Les 4 fondateurs sont tous admins de QuadCore et voient les mêmes données.\n');
  } else {
    console.log('\n⚠ Certains comptes ne sont pas correctement liés. Relance scripts/create-founders.ts pour corriger.\n');
  }

  // Compte les données partagées visibles par l'orga
  const { count: consultantsCount } = await admin
    .from('consultants')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', org.id);
  const { count: offersCount } = await admin
    .from('job_offers')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', org.id);
  const { count: contactsCount } = await admin
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', org.id);

  console.log('Données visibles par tous les membres de QuadCore :');
  console.log(`  • Consultants : ${consultantsCount ?? 0}`);
  console.log(`  • Offres      : ${offersCount ?? 0}`);
  console.log(`  • Contacts    : ${contactsCount ?? 0}`);
  console.log('');
}

main().catch((err) => {
  console.error('❌', err.message ?? err);
  process.exit(1);
});
