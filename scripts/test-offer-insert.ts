import 'dotenv/config';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('slug', 'quadcore')
    .single();

  const payload = {
    organization_id: org!.id,
    title: 'TEST — diagnostic',
    description: 'Insert test via service_role',
    required_skills: ['Recette', 'Comptabilité'],
    nice_to_have: ['Jira'],
    seniority: 'confirmed',
    daily_rate_min: 400,
    daily_rate_max: 450,
    location: 'Paris',
    remote_days: 1,
    start_date: '2026-05-18',
    duration_months: 2,
    deadline: '2026-05-13',
    status: 'open',
  };

  console.log('→ Insert…');
  const { data, error } = await admin.from('job_offers').insert(payload).select().single();
  if (error) {
    console.error('❌ DB error:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
  console.log('✓ Insert OK, id =', data.id);
  await admin.from('job_offers').delete().eq('id', data.id);
  console.log('✓ Cleaned up');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
