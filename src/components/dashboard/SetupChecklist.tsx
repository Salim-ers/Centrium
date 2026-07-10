'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, X, Rocket, ArrowRight } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { cn } from '@/lib/utils';

// =========================================================================
// Checklist d'accueil sur le dashboard : guide le nouvel admin dans la
// configuration initiale (identité légale, équipe, consultant, offre). Se
// masque automatiquement quand tout est fait, ou manuellement (mémorisé en
// localStorage). Détection RÉELLE de l'état, pas de faux « à faire ».
// =========================================================================

type Setup = {
  identity: boolean;
  team: boolean;
  consultant: boolean;
  offer: boolean;
};

const DISMISS_KEY = (org: string) => `centrium-setup-dismissed:${org}`;

export function SetupChecklist() {
  const { activeOrgId } = useOrganization();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !activeOrgId) return false;
    return window.localStorage.getItem(DISMISS_KEY(activeOrgId)) === '1';
  });

  const { data } = useCachedQuery<Setup>(
    `setup-checklist:${activeOrgId ?? 'none'}`,
    async () => {
      const supabase = createClient();
      const [org, members, consultants, offers] = await Promise.all([
        supabase.from('organizations').select('siren, address').eq('id', activeOrgId!).maybeSingle(),
        supabase.from('organization_members').select('user_id', { count: 'exact', head: true }).eq('organization_id', activeOrgId!),
        supabase.from('consultants').select('id', { count: 'exact', head: true }).eq('organization_id', activeOrgId!).eq('archived', false),
        supabase.from('job_offers').select('id', { count: 'exact', head: true }).eq('organization_id', activeOrgId!),
      ]);
      return {
        identity: !!org.data?.siren && !!org.data?.address,
        team: (members.count ?? 0) > 1,
        consultant: (consultants.count ?? 0) > 0,
        offer: (offers.count ?? 0) > 0,
      };
    },
    { enabled: !!activeOrgId },
  );

  if (!data || dismissed) return null;

  const steps = [
    { key: 'identity', done: data.identity, label: 'Renseigner l’identité de l’ESN', hint: 'SIREN, adresse, RIB — requis pour facturer', href: '/settings/facturation' },
    { key: 'team', done: data.team, label: 'Inviter l’équipe', hint: 'Business managers, recruteurs, finance', href: '/settings/team' },
    { key: 'consultant', done: data.consultant, label: 'Ajouter un premier consultant', hint: 'Importe un CV pour pré-remplir le profil', href: '/consultants' },
    { key: 'offer', done: data.offer, label: 'Créer une offre', hint: 'Lance le matching consultant ↔ mission', href: '/offers' },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null; // tout est fait → on n'affiche rien

  const pct = Math.round((doneCount / steps.length) * 100);

  function dismiss() {
    if (activeOrgId) window.localStorage.setItem(DISMISS_KEY(activeOrgId), '1');
    setDismissed(true);
  }

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="qc-premium relative mb-6 overflow-hidden rounded-2xl border p-5"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Masquer la checklist"
          className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-hairline bg-violet-glow/10 text-violet-glow">
            <Rocket className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-light leading-tight">Bien démarrer</h2>
            <p className="text-[11px] text-muted-foreground">
              {doneCount} / {steps.length} étapes · {pct} %
            </p>
          </div>
        </div>

        <div className="my-3 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full rounded-full bg-violet-glow transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {steps.map((s) => (
            <Link
              key={s.key}
              href={s.href}
              className={cn(
                'group flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors',
                s.done
                  ? 'border-emerald-500/25 bg-emerald-500/[0.04]'
                  : 'border-hairline hover:border-violet-glow/40 hover:bg-violet-glow/[0.04]',
              )}
            >
              {s.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <div className={cn('text-sm font-medium', s.done && 'text-muted-foreground line-through')}>
                  {s.label}
                </div>
                {!s.done && <div className="text-[11px] text-muted-foreground mt-0.5">{s.hint}</div>}
              </div>
              {!s.done && (
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              )}
            </Link>
          ))}
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
