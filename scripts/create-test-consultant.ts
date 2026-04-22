/**
 * Bootstrap test : crée l'orga Harmony Solutions + lie ton admin + crée un consultant.
 *
 * Usage : npx tsx scripts/create-test-consultant.ts
 *
 * Rejouable (idempotent). Utilise service_role donc bypass RLS.
 *
 * Variables env nécessaires (.env.local) :
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

// ---------- Config ----------
const ADMIN_EMAIL = 'salim.elrs@gmail.com';

const ORG_SLUG = 'harmony-solutions';
const ORG_NAME = 'Harmony Solutions';
const ORG_CITY = 'Paris';

const CONSULTANT = {
  email: 'moustakine@quad-core.fr',
  password: 'Consultant2026!',
  first_name: 'Mouhamad',
  last_name: 'Moustakine',
  job_title: 'Consultant DevOps',
  seniority: 'confirmed' as const,
  years_experience: 5,
  city: 'Paris',
};
// ---------------------------

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local');
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ===== 1. Trouve ou crée l'organisation =====
  console.log(`→ Organisation "${ORG_NAME}"…`);
  let { data: org } = await admin
    .from('organizations')
    .select('id, name')
    .eq('slug', ORG_SLUG)
    .maybeSingle();

  if (!org) {
    const { data: created, error } = await admin
      .from('organizations')
      .insert({
        name: ORG_NAME,
        slug: ORG_SLUG,
        city: ORG_CITY,
        plan: 'trial',
      })
      .select('id, name')
      .single();
    if (error) throw error;
    org = created;
    console.log(`  ✓ Créée (${org.id})`);
  } else {
    console.log(`  ✓ Déjà existante (${org.id})`);
  }
  const orgId = org.id;

  // ===== 2. Lie l'admin à l'organisation =====
  console.log(`→ Admin "${ADMIN_EMAIL}"…`);
  const { data: userList } = await admin.auth.admin.listUsers();
  const adminUser = userList.users.find((u) => u.email === ADMIN_EMAIL);

  if (!adminUser) {
    console.log(`  ⚠ Aucun user auth trouvé avec cet email.`);
    console.log(`    Inscris-toi sur /signup avec ${ADMIN_EMAIL} d'abord, puis relance.`);
  } else {
    await admin
      .from('organization_members')
      .upsert(
        { organization_id: orgId, user_id: adminUser.id, role: 'admin' },
        { onConflict: 'organization_id,user_id' },
      );
    await admin
      .from('profiles')
      .update({ organization_id: orgId, role: 'admin' })
      .eq('id', adminUser.id);
    console.log(`  ✓ Admin lié (${adminUser.id})`);
  }

  // ===== 3. Crée ou récupère le user auth du consultant =====
  console.log(`→ User consultant "${CONSULTANT.email}"…`);
  let consultantUserId: string;
  const { data: createdAuth, error: authErr } = await admin.auth.admin.createUser({
    email: CONSULTANT.email,
    password: CONSULTANT.password,
    email_confirm: true,
    user_metadata: { first_name: CONSULTANT.first_name, last_name: CONSULTANT.last_name },
  });
  if (authErr) {
    const existing = userList.users.find((u) => u.email === CONSULTANT.email)
      ?? (await admin.auth.admin.listUsers()).data.users.find((u) => u.email === CONSULTANT.email);
    if (!existing) throw authErr;
    consultantUserId = existing.id;
    await admin.auth.admin.updateUserById(consultantUserId, {
      password: CONSULTANT.password,
      email_confirm: true,
    });
    console.log(`  ✓ Déjà existant, password resync (${consultantUserId})`);
  } else {
    consultantUserId = createdAuth.user.id;
    console.log(`  ✓ Créé (${consultantUserId})`);
  }

  // ===== 4. Crée ou met à jour la row consultants =====
  console.log(`→ Fiche consultant…`);
  const { data: existingConsultant } = await admin
    .from('consultants')
    .select('id')
    .eq('organization_id', orgId)
    .eq('email', CONSULTANT.email)
    .maybeSingle();

  let consultantId: string;
  const consultantPayload = {
    organization_id: orgId,
    first_name: CONSULTANT.first_name,
    last_name: CONSULTANT.last_name,
    email: CONSULTANT.email,
    job_title: CONSULTANT.job_title,
    seniority: CONSULTANT.seniority,
    years_experience: CONSULTANT.years_experience,
    city: CONSULTANT.city,
    status: 'available' as const,
  };

  if (existingConsultant) {
    consultantId = existingConsultant.id;
    const { error } = await admin.from('consultants').update(consultantPayload).eq('id', consultantId);
    if (error) throw error;
    console.log(`  ✓ Mise à jour (${consultantId})`);
  } else {
    const { data: inserted, error } = await admin
      .from('consultants')
      .insert(consultantPayload)
      .select('id')
      .single();
    if (error) throw error;
    consultantId = inserted.id;
    console.log(`  ✓ Créée (${consultantId})`);
  }

  // ===== 5. Membership + profile du consultant =====
  console.log(`→ Membership + profile consultant…`);
  await admin
    .from('organization_members')
    .upsert(
      { organization_id: orgId, user_id: consultantUserId, role: 'consultant' },
      { onConflict: 'organization_id,user_id' },
    );
  const { error: profErr } = await admin
    .from('profiles')
    .update({
      role: 'consultant',
      consultant_id: consultantId,
      organization_id: orgId,
      first_name: CONSULTANT.first_name,
      last_name: CONSULTANT.last_name,
    })
    .eq('id', consultantUserId);
  if (profErr) throw profErr;
  console.log(`  ✓ Profile consultant lié`);

  // ===== Récap =====
  console.log('\n✅ Bootstrap terminé.\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ADMIN');
  console.log(`    Email     : ${ADMIN_EMAIL}`);
  console.log(`    Accès     : /dashboard`);
  console.log('');
  console.log('  CONSULTANT');
  console.log(`    Email     : ${CONSULTANT.email}`);
  console.log(`    Password  : ${CONSULTANT.password}`);
  console.log(`    Nom       : ${CONSULTANT.first_name} ${CONSULTANT.last_name}`);
  console.log(`    Accès     : /portal/dashboard`);
  console.log('');
  console.log(`  Organisation : ${ORG_NAME} (${ORG_SLUG})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch((err) => {
  console.error('❌ Erreur :', err.message ?? err);
  process.exit(1);
});
