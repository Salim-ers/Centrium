/**
 * Crée le compte consultant Abdelhamid MESSAOUDI dans l'orga QuadCore.
 *
 * Usage : npx tsx scripts/create-consultant-abdelhamid.ts
 *
 * Rejouable (idempotent) : password resync si user existe, fiche consultant
 * mise à jour, membership re-upsert.
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const ORG_SLUG = 'quadcore';
const CONSULTANT = {
  email: 'Abdelhamid.MESSAOUDI@quad-core.fr',
  password: 'Quadcore4!',
  first_name: 'Abdelhamid',
  last_name: 'MESSAOUDI',
  job_title: 'Consultant',
  seniority: 'confirmed' as const,
  years_experience: 5,
  city: 'Paris',
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('env manquante dans .env.local');

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Org QuadCore
  const { data: org } = await admin
    .from('organizations')
    .select('id, name')
    .eq('slug', ORG_SLUG)
    .maybeSingle();
  if (!org) throw new Error(`Orga "${ORG_SLUG}" introuvable.`);
  const orgId = org.id;
  console.log(`Orga : ${org.name} (${orgId})\n`);

  // 1) User auth
  console.log(`→ User auth ${CONSULTANT.email}…`);
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list.users.find((u) => u.email?.toLowerCase() === CONSULTANT.email.toLowerCase());

  let userId: string;
  if (existing) {
    userId = existing.id;
    await admin.auth.admin.updateUserById(userId, {
      password: CONSULTANT.password,
      email_confirm: true,
      user_metadata: { first_name: CONSULTANT.first_name, last_name: CONSULTANT.last_name },
    });
    console.log(`  ✓ Existant, password resync (${userId})`);
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: CONSULTANT.email,
      password: CONSULTANT.password,
      email_confirm: true,
      user_metadata: { first_name: CONSULTANT.first_name, last_name: CONSULTANT.last_name },
    });
    if (error) throw error;
    userId = created.user.id;
    console.log(`  ✓ Créé (${userId})`);
  }

  // 2) Fiche consultant
  console.log(`→ Fiche consultant…`);
  const { data: existingConsultant } = await admin
    .from('consultants')
    .select('id')
    .eq('organization_id', orgId)
    .eq('email', CONSULTANT.email)
    .maybeSingle();

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

  let consultantId: string;
  if (existingConsultant) {
    consultantId = existingConsultant.id;
    await admin.from('consultants').update(consultantPayload).eq('id', consultantId);
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

  // 3) Membership + profile consultant
  console.log(`→ Membership + profile…`);
  await admin
    .from('organization_members')
    .upsert(
      { organization_id: orgId, user_id: userId, role: 'consultant' },
      { onConflict: 'organization_id,user_id' },
    );
  const { error: profileErr } = await admin
    .from('profiles')
    .update({
      role: 'consultant',
      consultant_id: consultantId,
      organization_id: orgId,
      first_name: CONSULTANT.first_name,
      last_name: CONSULTANT.last_name,
    })
    .eq('id', userId);
  if (profileErr) throw profileErr;
  console.log(`  ✓ Profile lié`);

  console.log('\n✅ Compte consultant prêt.\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Email     : ${CONSULTANT.email}`);
  console.log(`  Password  : ${CONSULTANT.password}`);
  console.log(`  Nom       : ${CONSULTANT.first_name} ${CONSULTANT.last_name}`);
  console.log(`  Orga      : ${org.name}`);
  console.log(`  Portail   : http://localhost:3000/portal/dashboard`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch((err) => {
  console.error('❌', err.message ?? err);
  process.exit(1);
});
