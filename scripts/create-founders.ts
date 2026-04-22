/**
 * Bootstrap QuadCore (fondateurs) : crée l'orga + les 4 admins + flag exempt.
 *
 * Usage : npx tsx scripts/create-founders.ts
 *
 * Prérequis : la migration 017_founders_exempt.sql doit avoir été appliquée
 * (Dashboard Supabase → SQL Editor). Le script vérifie la présence du flag
 * is_exempt_from_billing avant de continuer.
 *
 * Rejouable (idempotent) : les users auth existants voient leur password
 * resync et leur role mis à 'admin'.
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const ORG_SLUG = 'quadcore';
const ORG_NAME = 'QuadCore';
const ORG_CITY = 'Paris';

const FOUNDERS: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}[] = [
  { email: 'Salim.elr@quad-core.fr',            password: 'El52sa73&*',    first_name: 'Salim',    last_name: 'El R.' },
  { email: 'moustakine.mouhamad@quad-core.fr',  password: 'Mousspro60!',   first_name: 'Mouhamad', last_name: 'Moustakine' },
  { email: 'alphonse.aroul@quad-core.fr',       password: 'Quadcore4!',    first_name: 'Alphonse', last_name: 'Aroul' },
  { email: 'Hasan.akar@quad-core.fr',           password: 'Quadcore4!',    first_name: 'Hasan',    last_name: 'Akar' },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local');
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Pre-flight : la migration 017 est-elle appliquée ?
  console.log(`→ Vérification migration 017…`);
  const { error: probeErr } = await admin
    .from('subscriptions')
    .select('is_exempt_from_billing')
    .limit(1);
  if (probeErr && probeErr.message.includes('is_exempt_from_billing')) {
    console.error(`\n❌ Migration 017 non appliquée.`);
    console.error(`   Va dans Dashboard Supabase → SQL Editor et exécute le contenu de`);
    console.error(`   supabase/migrations/017_founders_exempt.sql, puis relance ce script.\n`);
    process.exit(1);
  }
  console.log(`  ✓ OK`);

  // ===== 1. Orga QuadCore =====
  console.log(`\n→ Organisation "${ORG_NAME}"…`);
  let { data: org } = await admin
    .from('organizations')
    .select('id, name')
    .eq('slug', ORG_SLUG)
    .maybeSingle();

  if (!org) {
    const { data: created, error } = await admin
      .from('organizations')
      .insert({ name: ORG_NAME, slug: ORG_SLUG, city: ORG_CITY, plan: 'founder' })
      .select('id, name')
      .single();
    if (error) throw error;
    org = created;
    console.log(`  ✓ Créée (${org.id})`);
  } else {
    console.log(`  ✓ Déjà existante (${org.id})`);
  }
  const orgId = org.id;

  // ===== 2. Flag billing exempt =====
  console.log(`→ Flag is_exempt_from_billing=TRUE sur la subscription…`);
  const { error: subErr } = await admin
    .from('subscriptions')
    .update({ is_exempt_from_billing: true, status: 'active' })
    .eq('organization_id', orgId);
  if (subErr) throw subErr;
  console.log(`  ✓ QuadCore ne sera jamais facturée`);

  // ===== 3. Les 4 admins =====
  const { data: listRes } = await admin.auth.admin.listUsers();
  const usersByEmail = new Map(
    (listRes.users ?? []).map((u) => [u.email?.toLowerCase() ?? '', u]),
  );

  for (const f of FOUNDERS) {
    const key = f.email.toLowerCase();
    console.log(`\n→ Admin ${f.email}…`);
    let userId: string;

    const existing = usersByEmail.get(key);
    if (existing) {
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, {
        password: f.password,
        email_confirm: true,
        user_metadata: { first_name: f.first_name, last_name: f.last_name },
      });
      console.log(`  ✓ User existant, password resync (${userId})`);
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: f.email,
        password: f.password,
        email_confirm: true,
        user_metadata: { first_name: f.first_name, last_name: f.last_name },
      });
      if (error) throw error;
      userId = created.user.id;
      console.log(`  ✓ Créé (${userId})`);
    }

    // Membership + profile admin
    await admin
      .from('organization_members')
      .upsert(
        { organization_id: orgId, user_id: userId, role: 'admin' },
        { onConflict: 'organization_id,user_id' },
      );
    await admin
      .from('profiles')
      .update({
        role: 'admin',
        organization_id: orgId,
        first_name: f.first_name,
        last_name: f.last_name,
      })
      .eq('id', userId);
  }

  // ===== Récap =====
  console.log('\n\n✅ Bootstrap QuadCore terminé.\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Organisation : ${ORG_NAME} (${ORG_SLUG})`);
  console.log(`  Billing      : EXEMPTÉE (aucune facturation)`);
  console.log('');
  console.log('  ADMINS (tous role=admin sur QuadCore) :');
  for (const f of FOUNDERS) {
    console.log(`    • ${f.email}  /  ${f.password}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch((err) => {
  console.error('❌ Erreur :', err.message ?? err);
  process.exit(1);
});
