'use client';

import { useState } from 'react';
import { ArrowRight, Briefcase, Loader2, UserRound } from 'lucide-react';

import { markSessionActive } from '@/hooks/useSessionPresence';
import { cn } from '@/lib/utils';

type Kind = 'esn' | 'consultant';

const SPACES: Array<{ kind: Kind; title: string; lead: string; items: string[]; icon: typeof Briefcase }> = [
  {
    kind: 'esn',
    title: 'Démo ESN',
    lead: 'Le poste de pilotage d’une ESN de 22 consultants, vu par sa direction.',
    items: ['Tableau de bord', 'CRM et pipeline', 'Talents et Matching IA', 'Staffing et missions', 'Opérations : CRA, documents, préfacturation', 'Analytics et paramètres'],
    icon: Briefcase,
  },
  {
    kind: 'consultant',
    title: 'Démo Consultant',
    lead: 'L’espace d’une consultante en mission, sur mobile comme sur ordinateur.',
    items: ['Accueil', 'Ma mission', 'Mes CRA : saisie, envoi, correction', 'Mes documents', 'Mon profil et ma disponibilité'],
    icon: UserRound,
  },
];

/**
 * Accès immédiat aux deux espaces de démonstration. La session est ouverte
 * côté serveur (/api/demo/session) sur des comptes dédiés à une
 * organisation fictive ; rien n'est demandé au visiteur.
 */
export function DemoAccess() {
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function open(kind: Kind) {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch('/api/demo/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ as: kind }),
      });
      const body = (await res.json().catch(() => ({}))) as { data?: { redirect?: string }; message?: string };
      if (!res.ok || !body.data?.redirect) {
        setError(body.message ?? 'La démo est momentanément indisponible. Réessayez dans un instant.');
        setBusy(null);
        return;
      }
      markSessionActive();
      window.location.assign(body.data.redirect);
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau puis réessayez.');
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {SPACES.map((s) => {
          const Icon = s.icon;
          return (
            <article key={s.kind} className="flex flex-col rounded-[28px] bg-warm p-6 ring-1 ring-ink/[0.06] sm:p-8">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-terra/10 text-terra-deep">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-[22px] font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-[15px] text-ink-soft/80">{s.lead}</p>
              <ul className="mt-5 flex-1 space-y-2 text-[14.5px]">
                {s.items.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-terra" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => void open(s.kind)}
                disabled={busy !== null}
                className={cn(
                  'mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-terra px-6 text-[13px] font-semibold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90 disabled:opacity-60',
                )}
              >
                {busy === s.kind ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {`Ouvrir la ${s.title.toLowerCase()}`}
                {busy !== s.kind && <ArrowRight className="h-4 w-4" />}
              </button>
            </article>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-4 text-[14px] text-terra-deep">
          {error}
        </p>
      )}
      <p className="mt-4 text-[13.5px] text-ink-soft/70">
        Données fictives, partagées entre visiteurs et réinitialisées régulièrement. N’y saisissez aucune information réelle.
      </p>
    </div>
  );
}
