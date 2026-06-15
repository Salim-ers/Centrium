import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, Activity, ArrowRight } from 'lucide-react';

import { MarketingShell } from '@/components/marketing/MarketingShell';

export const metadata: Metadata = {
  title: 'Status — Centrium',
  description:
    'Disponibilité en temps réel de la plateforme Centrium, de ses sous-systèmes et de ses intégrations.',
};

export const dynamic = 'force-static';

type SystemStatus = {
  name: string;
  state: 'operational' | 'degraded' | 'down' | 'maintenance';
  description: string;
};

const SYSTEMS: SystemStatus[] = [
  { name: 'Application web (centrium-platform.com)', state: 'operational', description: 'Frontend Next.js + edge Vercel CDG1 Paris' },
  { name: 'API REST + Webhooks', state: 'operational', description: 'Routes /api/* serveur Vercel Pro' },
  { name: 'Base de données Postgres', state: 'operational', description: 'Supabase EU Francfort, PITR 7 jours' },
  { name: 'Stockage fichiers (CV, logos)', state: 'operational', description: 'Supabase Storage avec RLS par organisation' },
  { name: 'Authentification', state: 'operational', description: 'Supabase Auth + MFA TOTP' },
  { name: 'IA — Génération CV & Matching', state: 'operational', description: 'Anthropic Claude haiku 4.5 (US sous CCT)' },
  { name: 'Facturation Stripe', state: 'operational', description: 'Stripe Ireland — paiements + webhooks' },
  { name: 'Email transactionnel', state: 'operational', description: 'Resend EU' },
];

function StatusBadge({ state }: { state: SystemStatus['state'] }) {
  const labels = {
    operational: { text: 'Opérationnel', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30' },
    degraded: { text: 'Performances dégradées', cls: 'bg-amber-500/10 text-amber-300 border-amber-400/30' },
    down: { text: 'Indisponible', cls: 'bg-rose-500/10 text-rose-300 border-rose-400/30' },
    maintenance: { text: 'Maintenance planifiée', cls: 'bg-violet-500/10 text-violet-300 border-violet-400/30' },
  } as const;
  const l = labels[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${l.cls}`}>
      {state === 'operational' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      {l.text}
    </span>
  );
}

export default function StatusPage() {
  const allOperational = SYSTEMS.every((s) => s.state === 'operational');

  return (
    <MarketingShell>
      <section className="pt-16 pb-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 mb-4">
            <Activity className="h-3 w-3" />
            État système temps réel
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-light tracking-[-0.04em] mb-4">
            Status
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Disponibilité de Centrium et de ses dépendances.
          </p>
        </div>

        <div
          className={`rounded-2xl border p-6 mb-10 ${
            allOperational
              ? 'border-emerald-400/30 bg-emerald-500/[0.04]'
              : 'border-amber-400/30 bg-amber-500/[0.04]'
          }`}
        >
          <div className="flex items-center gap-3">
            {allOperational ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-300" />
            ) : (
              <AlertCircle className="h-6 w-6 text-amber-300" />
            )}
            <div>
              <h2 className="text-lg font-semibold">
                {allOperational
                  ? 'Tous les systèmes sont opérationnels'
                  : 'Incident en cours — voir détails ci-dessous'}
              </h2>
              <p className="text-sm text-white/60 mt-0.5">
                Dernière vérification statique : page mise à jour à chaque déploiement.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-16">
          {SYSTEMS.map((s) => (
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

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold mb-3">Monitoring temps réel</h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            Cette page reflète l&apos;état au dernier déploiement. Pour
            l&apos;uptime en temps réel (sondes synthétiques toutes les minutes,
            historique incidents, abonnement aux notifications), une status
            page externe est en cours d&apos;activation.
          </p>
          {process.env.NEXT_PUBLIC_STATUS_PAGE_URL ? (
            <Link
              href={process.env.NEXT_PUBLIC_STATUS_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-violet-500/10 border border-violet-400/30 px-4 py-2 text-sm font-medium text-violet-200 hover:bg-violet-500/20 transition"
            >
              Status page temps réel
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <p className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/10 px-4 py-2 text-sm text-white/60">
              Status page externe : en cours d&apos;activation
            </p>
          )}
          <p className="text-xs text-white/40 mt-4">
            Engagement SLA : voir <Link href="/tarifs" className="underline">tarifs</Link> et{' '}
            <Link href="/legal/cgu" className="underline">CGU</Link>.
          </p>
        </div>

        <div className="mt-16 text-center text-sm text-white/50">
          <p>
            Incident détecté ?{' '}
            <a
              href="mailto:support@centrium-platform.com"
              className="underline hover:text-white"
            >
              support@centrium-platform.com
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
