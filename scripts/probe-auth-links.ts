/**
 * Sondes E2E des liens email auth : reconstitue les liens EXACTS rendus par
 * les templates (token_hash) via admin.generateLink (AUCUN email envoyé) et
 * suit les redirections contre la PROD. Permet de tester tout le parcours
 * sans boîte mail — c'est ce qui a permis de diagnostiquer les invitations
 * cassées de juillet 2026.
 *
 *   A. invite neuf (sans it/next)   → /auth/first-password?welcome=invited
 *   B. recovery                     → /auth/reset-password
 *   C. invite org PENDING + it=<token> → /invite/accept → ACCEPTE réellement
 *      l'invitation → /auth/first-password (sondé seulement si une
 *      invitation pending existe pour PROBE_EXISTING_EMAIL)
 *
 * Usage :
 *   npx tsx scripts/probe-auth-links.ts [email-existant]
 *   (défaut : salim.eljc+68@gmail.com — compte de test)
 * Nettoie le user sonde créé par A.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf-8');
const get = (k: string) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim() ?? '';

const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SITE = get('NEXT_PUBLIC_APP_URL') || 'https://centrium-platform.com';
const PROBE_EXISTING_EMAIL = process.argv[2] ?? 'salim.eljc+68@gmail.com';

async function follow(label: string, startUrl: string, maxHops = 6) {
  console.log(`\n=== ${label} ===`);
  let current = startUrl;
  const cookies = new Map<string, string>();
  for (let hop = 1; hop <= maxHops; hop++) {
    const cookieHeader = [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(current, {
      redirect: 'manual',
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    });
    for (const sc of res.headers.getSetCookie?.() ?? []) {
      const [pair] = sc.split(';');
      const eq = pair.indexOf('=');
      cookies.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
    const loc = res.headers.get('location');
    const u = new URL(current);
    console.log(`hop ${hop}: ${res.status} ${u.pathname}${u.search ? '?…' : ''}`);
    if (!loc || res.status < 300 || res.status >= 400) {
      console.log(`  FIN sur: ${u.pathname}${u.search}`);
      return `${u.pathname}${u.search}`;
    }
    console.log(`  → ${loc.length > 110 ? loc.slice(0, 110) + '…' : loc}`);
    current = new URL(loc, current).toString();
  }
  return null;
}

async function main() {
  // --- A. invitation NEUVE, sans next explicite → défaut first-password ---
  const probeEmail = 'probe-e2e-claude@centrium-platform.com';
  const a = await admin.auth.admin.generateLink({ type: 'invite', email: probeEmail });
  if (a.error) {
    console.log('A generateLink ERROR:', a.error.message);
  } else {
    const link = `${SITE}/auth/callback?token_hash=${a.data.properties!.hashed_token}&type=invite&rt=${new URL(a.data.properties!.action_link).searchParams.get('redirect_to')}`;
    await follow('A. invite neuf → first-password attendu', link);
    if (a.data.user?.id) await admin.auth.admin.deleteUser(a.data.user.id);
    console.log('probe user A supprimé ✓');
  }

  // --- B. recovery → reset-password ---
  const b = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: PROBE_EXISTING_EMAIL,
  });
  if (b.error) {
    console.log('B generateLink ERROR:', b.error.message);
  } else {
    const link = `${SITE}/auth/callback?token_hash=${b.data.properties!.hashed_token}&type=recovery`;
    await follow('B. recovery → reset-password attendu', link);
  }

  // --- C. invitation réelle PENDING de +71 : magiclink + it=<token org> ---
  const { data: inv } = await admin
    .from('organization_invitations')
    .select('token, email')
    .is('accepted_at', null)
    .eq('email', PROBE_EXISTING_EMAIL)
    .maybeSingle();
  if (!inv) {
    console.log(`\nC. pas d’invitation pending pour ${PROBE_EXISTING_EMAIL} — sonde sautée`);
    return;
  }
  const c = await admin.auth.admin.generateLink({ type: 'magiclink', email: inv.email });
  if (c.error) {
    console.log('C generateLink ERROR:', c.error.message);
    return;
  }
  const link = `${SITE}/auth/callback?token_hash=${c.data.properties!.hashed_token}&type=magiclink&it=${inv.token}`;
  await follow('C. invite existant via it= → accept → first-password attendu', link);
  const { data: after } = await admin
    .from('profiles')
    .select('role, organization_id, password_set')
    .eq('id', c.data.user?.id ?? '')
    .maybeSingle();
  console.log('profil après accept:', JSON.stringify(after));
}

main();
