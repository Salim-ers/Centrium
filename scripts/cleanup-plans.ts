import 'dotenv/config';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// Plans actifs dans notre grille tarifaire courante
const ACTIVE = ['starter', 'growth', 'scale', 'enterprise'];

async function main() {
  // Tout ce qui n'est pas dans ACTIVE → masqué (is_public=false)
  const { data: obsolete } = await supabase
    .from('plans')
    .select('id, name')
    .not('id', 'in', `(${ACTIVE.map((id) => `"${id}"`).join(',')})`);

  if (obsolete && obsolete.length > 0) {
    console.log(`Masquage de ${obsolete.length} plans obsolètes :`);
    for (const p of obsolete) console.log(`  - ${p.id} (${p.name})`);
    await supabase
      .from('plans')
      .update({ is_public: false })
      .in('id', obsolete.map((p) => p.id));
  } else {
    console.log('Aucun plan obsolète.');
  }

  const { data: visible } = await supabase
    .from('plans')
    .select('id, name, price_monthly_eur, is_public')
    .eq('is_public', true)
    .order('sort_order');
  console.log('\nPlans visibles en /pricing :');
  console.table(visible);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
