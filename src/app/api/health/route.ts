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

  const healthy = checks.database === 'ok';
  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', checks, latency_ms: Date.now() - started },
    { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
