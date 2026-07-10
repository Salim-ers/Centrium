import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, Activity, ArrowRight } from 'lucide-react';

import { MarketingShell } from '@/components/marketing/MarketingShell';

export const metadata: Metadata = {
  title: 'Status — Centrium',
  description:
    'Disponibilité en temps réel de la plateforme Centrium et de ses sous-systèmes.',
};

// Dynamique : l'état est mesuré À CHAQUE VISITE (plus de « tout opérationnel »
// codé en dur qui mentirait pendant une panne réelle).
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type State = 'operational' | 'degraded' | 'down' | 'unknown';
type SystemStatus = { name: string; state: State; description: string };

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

function StatusBadge({ state }: { state: State }) {
  const labels: Record<State, { text: string; cls: string }> = {
    operational: { text: 'Opérationnel', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30' },
    degraded: { text: 'Dégradé', cls: 'bg-amber-500/10 text-amber-300 border-amber-400/30' },
    down: { text: 'Indisponible', cls: 'bg-rose-500/10 text-rose-300 border-rose-400/30' },
    unknown: { text: 'Non mesuré', cls: 'bg-white/5 text-white/50 border-white/15' },
  };
  const l = labels[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${l.cls}`}>
      {state === 'operational' ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <AlertCircle className="h-3 w-3" />
      )}
      {l.text}
    </span>
  );
}

export default async function StatusPage() {
  const { db, server, latencyMs } = await probe();

  const systems: SystemStatus[] = [
    { name: 'Application web', state: 'operational', description: 'Frontend Next.js sur Vercel (cette page est servie en direct).' },
    { name: 'API + Webhooks', state: server, description: 'Routes /api/* — mesuré via la sonde /api/health.' },
    {
      name: 'Base de données',
      state: db,
      description:
        'Supabase Postgres (UE)' + (latencyMs != null ? ` — latence ${latencyMs} ms` : '') + '.',
    },
    { name: 'Authentification', state: db, description: 'Supabase Auth (même infrastructure que la base).' },
  ];

  // Intégrations dont l'état dépend d'un prestataire tiers non sondé ici :
  // on affiche honnêtement « selon prestataire » plutôt qu'un faux vert.
  const integrations = [
    { name: 'Paiements (Stripe)', configured: !!process.env.STRIPE_SECRET_KEY },
    { name: 'Email (Resend)', configured: !!process.env.RESEND_API_KEY },
    { name: 'IA (Anthropic)', configured: !!process.env.ANTHROPIC_API_KEY },
  ];

  const worst: State = systems.some((s) => s.state === 'down')
    ? 'down'
    : systems.some((s) => s.state === 'degraded')
      ? 'degraded'
      : systems.some((s) => s.state === 'unknown')
        ? 'unknown'
        : 'operational';
  const allOk = worst === 'operational';

  return (
    <MarketingShell>
      <section className="pt-16 pb-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 mb-4">
            <Activity className="h-3 w-3" />
            État mesuré à l&apos;instant
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-light tracking-[-0.04em] mb-4">Status</h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Disponibilité de Centrium, vérifiée à chaque chargement de cette page.
          </p>
        </div>

        <div
          className={`rounded-2xl border p-6 mb-10 ${
            allOk
              ? 'border-emerald-400/30 bg-emerald-500/[0.04]'
              : 'border-amber-400/30 bg-amber-500/[0.04]'
          }`}
        >
          <div className="flex items-center gap-3">
            {allOk ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-300" />
            ) : (
              <AlertCircle className="h-6 w-6 text-amber-300" />
            )}
            <div>
              <h2 className="text-lg font-semibold">
                {allOk
                  ? 'Tous les systèmes mesurés sont opérationnels'
                  : 'Un ou plusieurs systèmes ne sont pas nominaux'}
              </h2>
              <p className="text-sm text-white/60 mt-0.5">
                Mesure en direct via la sonde de santé — {new Date().toLocaleString('fr-FR')}.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-10">
          {systems.map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm">{s.name}</h3>
                <p className="text-xs text-white/50 mt-0.5">{s.description}</p>
              </div>
              <StatusBadge state={s.state} />
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 mb-10">
          <h2 className="text-sm font-semibold mb-3 text-white/80">Intégrations tierces</h2>
          <div className="space-y-2">
            {integrations.map((i) => (
              <div key={i.name} className="flex items-center justify-between text-sm">
                <span className="text-white/70">{i.name}</span>
                <span className="text-xs text-white/50">
                  {i.configured ? 'Configurée · état selon prestataire' : 'Non configurée'}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/40 mt-4">
            L&apos;état temps réel de ces prestataires est publié sur leurs propres pages de
            statut. Une status page externe agrégée (sondes synthétiques, historique
            d&apos;incidents) pourra être branchée via <code className="text-white/60">NEXT_PUBLIC_STATUS_PAGE_URL</code>.
          </p>
          {process.env.NEXT_PUBLIC_STATUS_PAGE_URL && (
            <Link
              href={process.env.NEXT_PUBLIC_STATUS_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-500/10 border border-violet-400/30 px-4 py-2 text-sm font-medium text-violet-200 hover:bg-violet-500/20 transition"
            >
              Status page temps réel
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="text-center text-sm text-white/50">
          <p>
            Incident détecté ?{' '}
            <a href="mailto:contact@centrium-platform.com" className="underline hover:text-white">
              contact@centrium-platform.com
            </a>
            {' · '}
            <Link href="/trust" className="underline hover:text-white">
              Trust Center
            </Link>
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
