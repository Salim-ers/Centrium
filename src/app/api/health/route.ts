import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health — sonde de santé (liveness / readiness).
 *
 * Pour un monitoring d'uptime externe : vérifie que le serveur répond ET que
 * la base est joignable. Public, mais n'expose AUCUNE donnée sensible — juste
 * des statuts. Utilise la clé anon (lecture de `plans`, table publique) pour
 * éviter le bruit de logs du client service_role.
 *
 * 200 { status: 'ok' }        → tout va bien
 * 503 { status: 'degraded' }  → DB injoignable / non configurée
 */
export async function GET() {
  const started = Date.now();
  const checks: Record<string, string> = { server: 'ok', database: 'unknown' };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    checks.database = 'unconfigured';
  } else {
    try {
      const supabase = createClient(url, anon, { auth: { persistSession: false } });
      const { error } = await supabase.from('plans').select('id').limit(1);
      checks.database = error ? 'error' : 'ok';
    } catch {
      checks.database = 'error';
    }
  }

  // Fraîcheur des crons (dead-man switch) : signale une tâche planifiée qui
  // ne s'est plus exécutée dans son délai — sans faire échouer la sonde (un
  // cron périmé est un avertissement, pas une indisponibilité du service).
  let crons: Array<{ name: string; last_run_at: string | null; stale: boolean }> = [];
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && url) {
      const { getCronHealth } = await import('@/lib/observability/heartbeat');
      const { createAdminClient } = await import('@/lib/supabase/admin');
      crons = await getCronHealth(createAdminClient('system-cron'));
    }
  } catch {
    /* heartbeat indisponible — on ne bloque pas la sonde */
  }
  const staleCron = crons.some((c) => c.stale);

  const healthy = checks.database === 'ok';
  return NextResponse.json(
    {
      status: healthy ? (staleCron ? 'warning' : 'ok') : 'degraded',
      checks,
      crons,
      latency_ms: Date.now() - started,
    },
    { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
