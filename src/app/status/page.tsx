import type { Metadata } from 'next';

import { StatusContent, type State } from './StatusContent';

export const metadata: Metadata = {
  title: 'Status — Centrium',
  description:
    'Disponibilité en temps réel de la plateforme Centrium et de ses sous-systèmes.',
};

// Dynamique : l'état est mesuré À CHAQUE VISITE (plus de « tout opérationnel »
// codé en dur qui mentirait pendant une panne réelle).
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Mesure réelle de l'état via la sonde /api/health (serveur + base). */
async function probe(): Promise<{ db: State; server: State; latencyMs: number | null }> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/api/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    const json = (await res.json().catch(() => null)) as {
      checks?: { server?: string; database?: string };
      latency_ms?: number;
    } | null;
    const map = (v?: string): State => (v === 'ok' ? 'operational' : v ? 'degraded' : 'unknown');
    return {
      server: res.ok ? map(json?.checks?.server) : 'degraded',
      db: map(json?.checks?.database),
      latencyMs: json?.latency_ms ?? null,
    };
  } catch {
    // La sonde n'a pas répondu — mais cette page EST servie, donc le front
    // tourne ; on signale la base/l'API comme indéterminées, pas « vertes ».
    return { db: 'unknown', server: 'degraded', latencyMs: null };
  }
}

export default async function StatusPage() {
  const { db, server, latencyMs } = await probe();

  return (
    <StatusContent
      server={server}
      db={db}
      latencyMs={latencyMs}
      integrations={{
        stripe: !!process.env.STRIPE_SECRET_KEY,
        resend: !!process.env.RESEND_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
      }}
      statusPageUrl={process.env.NEXT_PUBLIC_STATUS_PAGE_URL}
      measuredAt={new Date().toISOString()}
    />
  );
}
