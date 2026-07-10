/**
 * Exécution manuelle du moteur d'alertes (hors cron Vercel).
 *
 * Usage :
 *   NODE_OPTIONS=--conditions=react-server npx tsx scripts/run-alerts-engine.ts
 *
 * - Charge .env.local (SUPABASE_SERVICE_ROLE_KEY requis).
 * - Sans RESEND_API_KEY : aucune tentative d'email réel (dégradé loggé).
 * - Idempotent : rejouer ne duplique ni alertes ni notifications.
 * La condition react-server neutralise le guard `import 'server-only'`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Chargement minimal de .env.local (sans dépendance dotenv).
try {
  const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch {
  console.error('.env.local introuvable');
  process.exit(1);
}

async function main() {
  const { runAlertsEngine } = await import('../src/lib/alerts/engine');
  const report = await runAlertsEngine();
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error('ENGINE FAILED:', e);
  process.exit(1);
});
