/**
 * Pousse les 5 templates email Supabase Auth (versionnés dans
 * supabase/templates/) vers le projet Supabase hosted via Management API.
 *
 * Usage :
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx npx tsx scripts/push-auth-templates.ts
 *
 * Comment générer le token :
 *   https://supabase.com/dashboard/account/tokens → Generate new token
 *   (scope minimal : ce token a accès complet au compte, ne le stocke pas
 *   dans .env.local — usage one-shot puis suppression).
 *
 * Le project ref est lu depuis NEXT_PUBLIC_SUPABASE_URL (.env.local).
 * Les sujets et chemins de fichiers viennent de supabase/config.toml pour
 * rester la source de vérité unique.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TEMPLATES = [
  { key: 'invite', subject: 'Invitation à rejoindre Centrium', file: 'invite.html' },
  { key: 'confirmation', subject: 'Confirmez votre adresse email', file: 'confirmation.html' },
  { key: 'recovery', subject: 'Réinitialisation de votre mot de passe', file: 'recovery.html' },
  { key: 'magic_link', subject: 'Votre lien de connexion Centrium', file: 'magic_link.html' },
  { key: 'email_change', subject: 'Confirmez votre nouvelle adresse email', file: 'email_change.html' },
] as const;

function extractProjectRef(): string {
  const envLocal = readFileSync('.env.local', 'utf-8');
  const match = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (!match?.[1]) {
    throw new Error('Impossible de lire le project ref depuis NEXT_PUBLIC_SUPABASE_URL');
  }
  return match[1];
}

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error('❌ SUPABASE_ACCESS_TOKEN manquant.');
    console.error('   Génère-en un sur https://supabase.com/dashboard/account/tokens');
    console.error('   puis relance : SUPABASE_ACCESS_TOKEN=sbp_xxx npx tsx scripts/push-auth-templates.ts');
    process.exit(1);
  }

  const projectRef = extractProjectRef();
  console.log(`→ Projet Supabase : ${projectRef}`);

  // Construit le body : { mailer_subjects_invite: "...", mailer_templates_invite_content: "<html>...", ... }
  const body: Record<string, string> = {};
  for (const t of TEMPLATES) {
    const content = readFileSync(resolve('supabase/templates', t.file), 'utf-8');
    body[`mailer_subjects_${t.key}`] = t.subject;
    body[`mailer_templates_${t.key}_content`] = content;
    console.log(`  ✓ ${t.key.padEnd(14)} ${(content.length / 1024).toFixed(1)} KB`);
  }

  console.log(`→ PATCH /v1/projects/${projectRef}/config/auth`);
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error(`❌ HTTP ${res.status} ${res.statusText}`);
    console.error(txt);
    process.exit(1);
  }

  console.log('✅ Templates pushés en prod.');
  console.log('   Vérification : Dashboard → Authentication → Email Templates');
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
