// =========================================================================
// Comptes « Démo ESN » et « Démo Consultant » : crée (ou met à jour) les deux
// comptes et les relie à l'organisation de démo. À lancer APRÈS le seed
// (supabase/seed/demo.sql), et de nouveau après chaque réinitialisation.
//
// Variables (jamais dans le code ni dans Git) :
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   DEMO_ESN_EMAIL, DEMO_ESN_PASSWORD
//   DEMO_CONSULTANT_EMAIL, DEMO_CONSULTANT_PASSWORD
//   DEMO_SEED_TARGET : référence du projet visé (xxxx dans xxxx.supabase.co),
//                      confirmation explicite ; sans elle, rien n'est fait.
// Conseil : des adresses en .invalid (ex. demo-esn@demo.centrium.invalid),
// jamais délivrables ; l'application n'envoie rien à ces domaines.
//
// Usage : npx tsx scripts/demo/create-demo-users.ts
// =========================================================================

import { createClient, type User } from '@supabase/supabase-js';

import { DEMO_CONSULTANT_ID, DEMO_ORG_ID } from '../../src/lib/demo/config';

function need(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Variable manquante : ${name}`);
    process.exit(1);
  }
  return value;
}

const url = need('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = need('SUPABASE_SERVICE_ROLE_KEY');
const target = need('DEMO_SEED_TARGET');
const projectRef = new URL(url).hostname.split('.')[0];
if (projectRef !== target) {
  console.error(`Projet visé : ${projectRef}. DEMO_SEED_TARGET vaut « ${target} » : rien n'est fait.`);
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function findUser(email: string): Promise<User | null> {
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser(email: string, password: string, meta: Record<string, string>): Promise<string> {
  const existing = await findUser(email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true, user_metadata: meta });
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta });
  if (error || !data.user) throw error ?? new Error('Création du compte impossible');
  return data.user.id;
}

async function check<T>(label: string, run: PromiseLike<{ error: { message: string } | null; data?: T }>): Promise<void> {
  const { error } = await run;
  if (error) throw new Error(`${label} : ${error.message}`);
}

async function main() {
  const { data: org } = await admin.from('organizations').select('id, name').eq('id', DEMO_ORG_ID).maybeSingle();
  if (!org) {
    console.error('Organisation de démo absente : jouez d’abord supabase/seed/demo.sql.');
    process.exit(1);
  }

  const esnEmail = need('DEMO_ESN_EMAIL');
  const consultantEmail = need('DEMO_CONSULTANT_EMAIL');
  const esnId = await ensureUser(esnEmail, need('DEMO_ESN_PASSWORD'), { first_name: 'Camille', last_name: 'Démo' });
  const consultantId = await ensureUser(consultantEmail, need('DEMO_CONSULTANT_PASSWORD'), { first_name: 'Inès', last_name: 'Morel' });

  // Garde-fou : un compte de démo n'appartient qu'à l'organisation de démo.
  for (const userId of [esnId, consultantId]) {
    const { data: other } = await admin.from('organization_members').select('organization_id').eq('user_id', userId).neq('organization_id', DEMO_ORG_ID);
    if (other?.length) {
      console.error(`Le compte ${userId} est membre d'une autre organisation : refus, rien n'est relié.`);
      process.exit(1);
    }
  }

  // Direction : voit tout le produit, sans pouvoir administrer l'équipe ni l'abonnement.
  await check(
    'membre ESN',
    admin.from('organization_members').upsert({ organization_id: DEMO_ORG_ID, user_id: esnId, role: 'direction', is_owner: false }, { onConflict: 'organization_id,user_id' }),
  );
  await check(
    'membre consultant',
    admin.from('organization_members').upsert({ organization_id: DEMO_ORG_ID, user_id: consultantId, role: 'consultant', is_owner: false }, { onConflict: 'organization_id,user_id' }),
  );
  await check(
    'profil ESN',
    admin.from('profiles').update({ organization_id: DEMO_ORG_ID, role: 'direction', consultant_id: null, first_name: 'Camille', last_name: 'Démo', password_set: true }).eq('id', esnId),
  );
  await check(
    'profil consultant',
    admin
      .from('profiles')
      .update({ organization_id: DEMO_ORG_ID, role: 'consultant', consultant_id: DEMO_CONSULTANT_ID, first_name: 'Inès', last_name: 'Morel', password_set: true })
      .eq('id', consultantId),
  );
  await check('fiche consultant', admin.from('consultants').update({ email: consultantEmail }).eq('id', DEMO_CONSULTANT_ID));

  // Le compte ESN est responsable des comptes clients, missions et talents.
  for (const table of ['opportunities', 'missions', 'contacts', 'consultants']) {
    await check(`responsable (${table})`, admin.from(table).update({ owner_id: esnId }).eq('organization_id', DEMO_ORG_ID));
  }

  console.log(`Démo prête dans « ${org.name} » :`);
  console.log(`  Démo ESN        ${esnEmail} (direction)`);
  console.log(`  Démo Consultant ${consultantEmail} (portail consultant)`);
  console.log('Pour ouvrir l’accès public : DEMO_ACCESS=on et les quatre identifiants dans l’environnement de l’application.');
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
