'use client';

import Link from 'next/link';
import { CheckCircle2, AlertCircle, Activity, ArrowRight } from 'lucide-react';

import { MarketingShell } from '@/components/marketing/MarketingShell';
import { useLocale } from '@/lib/i18n/LocaleProvider';

export type State = 'operational' | 'degraded' | 'down' | 'unknown';

type Props = {
  server: State;
  db: State;
  latencyMs: number | null;
  /** État de configuration des prestataires (dérivé côté serveur des env). */
  integrations: { stripe: boolean; resend: boolean; anthropic: boolean };
  statusPageUrl?: string;
  /** Instant de mesure (ISO) — formaté côté client selon la locale. */
  measuredAt: string;
};

function StatusBadge({ state, isEn }: { state: State; isEn: boolean }) {
  const labels: Record<State, { fr: string; en: string; cls: string }> = {
    operational: { fr: 'Opérationnel', en: 'Operational', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30' },
    degraded: { fr: 'Dégradé', en: 'Degraded', cls: 'bg-amber-500/10 text-amber-300 border-amber-400/30' },
    down: { fr: 'Indisponible', en: 'Down', cls: 'bg-rose-500/10 text-rose-300 border-rose-400/30' },
    unknown: { fr: 'Non mesuré', en: 'Not measured', cls: 'bg-white/5 text-white/50 border-white/15' },
  };
  const l = labels[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${l.cls}`}>
      {state === 'operational' ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <AlertCircle className="h-3 w-3" />
      )}
      {isEn ? l.en : l.fr}
    </span>
  );
}

export function StatusContent({ server, db, latencyMs, integrations, statusPageUrl, measuredAt }: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';

  const systems: { name: string; state: State; description: string }[] = [
    {
      name: isEn ? 'Web application' : 'Application web',
      state: 'operational',
      description: isEn
        ? 'Next.js frontend on Vercel (this page is served live).'
        : 'Frontend Next.js sur Vercel (cette page est servie en direct).',
    },
    {
      name: 'API + Webhooks',
      state: server,
      description: isEn
        ? 'Routes /api/* — measured via the /api/health probe.'
        : 'Routes /api/* — mesuré via la sonde /api/health.',
    },
    {
      name: isEn ? 'Database' : 'Base de données',
      state: db,
      description:
        (isEn ? 'Supabase Postgres (EU)' : 'Supabase Postgres (UE)') +
        (latencyMs != null ? (isEn ? ` — latency ${latencyMs} ms` : ` — latence ${latencyMs} ms`) : '') +
        '.',
    },
    {
      name: isEn ? 'Authentication' : 'Authentification',
      state: db,
      description: isEn
        ? 'Supabase Auth (same infrastructure as the database).'
        : 'Supabase Auth (même infrastructure que la base).',
    },
  ];

  const integrationRows = [
    { name: isEn ? 'Payments (Stripe)' : 'Paiements (Stripe)', configured: integrations.stripe },
    { name: 'Email (Resend)', configured: integrations.resend },
    { name: isEn ? 'AI (Anthropic)' : 'IA (Anthropic)', configured: integrations.anthropic },
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
            {isEn ? 'Measured right now' : 'État mesuré à l\'instant'}
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-light tracking-[-0.04em] mb-4">Status</h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            {isEn
              ? 'Centrium availability, checked on every load of this page.'
              : 'Disponibilité de Centrium, vérifiée à chaque chargement de cette page.'}
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
                  ? isEn ? 'All measured systems are operational' : 'Tous les systèmes mesurés sont opérationnels'
                  : isEn ? 'One or more systems are not nominal' : 'Un ou plusieurs systèmes ne sont pas nominaux'}
              </h2>
              <p className="text-sm text-white/60 mt-0.5">
                {isEn ? 'Live measurement via the health probe — ' : 'Mesure en direct via la sonde de santé — '}
                {new Date(measuredAt).toLocaleString(isEn ? 'en-GB' : 'fr-FR')}.
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
              <StatusBadge state={s.state} isEn={isEn} />
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 mb-10">
          <h2 className="text-sm font-semibold mb-3 text-white/80">
            {isEn ? 'Third-party integrations' : 'Intégrations tierces'}
          </h2>
          <div className="space-y-2">
            {integrationRows.map((i) => (
              <div key={i.name} className="flex items-center justify-between text-sm">
                <span className="text-white/70">{i.name}</span>
                <span className="text-xs text-white/50">
                  {i.configured
                    ? isEn ? 'Configured · status per provider' : 'Configurée · état selon prestataire'
                    : isEn ? 'Not configured' : 'Non configurée'}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/40 mt-4">
            {isEn ? (
              <>
                The real-time status of these providers is published on their own status pages. An
                external aggregated status page (synthetic probes, incident history) can be connected
                via <code className="text-white/60">NEXT_PUBLIC_STATUS_PAGE_URL</code>.
              </>
            ) : (
              <>
                L&apos;état temps réel de ces prestataires est publié sur leurs propres pages de
                statut. Une status page externe agrégée (sondes synthétiques, historique
                d&apos;incidents) pourra être branchée via <code className="text-white/60">NEXT_PUBLIC_STATUS_PAGE_URL</code>.
              </>
            )}
          </p>
          {statusPageUrl && (
            <Link
              href={statusPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-500/10 border border-violet-400/30 px-4 py-2 text-sm font-medium text-violet-200 hover:bg-violet-500/20 transition"
            >
              {isEn ? 'Real-time status page' : 'Status page temps réel'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="text-center text-sm text-white/50">
          <p>
            {isEn ? 'Incident detected?' : 'Incident détecté ?'}{' '}
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
