'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, X, ArrowRight } from 'lucide-react';

import { useOrganization } from '@/lib/auth/context';
import { useSetupSteps } from '@/hooks/useSetupSteps';
import { usePermissions } from '@/hooks/usePermissions';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const DISMISS_KEY = (org: string) => `centrium-setup-dismissed:${org}`;

/**
 * Mise en route de l'organisation sur le dashboard : étapes RÉELLES
 * (identité, branding, équipe, consultants, clients). Se masque quand tout
 * est fait ou à la demande (mémorisé sur cet appareil).
 */
export function SetupChecklist() {
  const { locale } = useLocale();
  const fr = locale !== 'en';
  const { activeOrgId } = useOrganization();
  const { can } = usePermissions();
  const { steps, doneCount, total, complete, loading } = useSetupSteps();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !activeOrgId) return false;
    try {
      return window.localStorage.getItem(DISMISS_KEY(activeOrgId)) === '1';
    } catch {
      return false;
    }
  });

  if (!can('settings.manage') || loading || complete || dismissed || total === 0) return null;

  function dismiss() {
    try {
      if (activeOrgId) window.localStorage.setItem(DISMISS_KEY(activeOrgId), '1');
    } catch {
      /* stockage indisponible */
    }
    setDismissed(true);
  }

  return (
    <section className="tile-surface relative mb-6 p-5">
      <button
        type="button"
        onClick={dismiss}
        aria-label={fr ? 'Masquer la mise en route' : 'Hide setup'}
        className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex flex-col gap-1 pr-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-[15px] font-semibold tracking-tight">
            {fr ? 'Votre espace est presque prêt' : 'Your workspace is almost ready'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {fr ? `${doneCount} étape${doneCount > 1 ? 's' : ''} sur ${total}` : `${doneCount} of ${total} steps`}
          </p>
        </div>
      </div>
      <Progress value={doneCount} max={total} className="mt-3" label={fr ? 'Progression' : 'Progress'} />
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((s) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className={cn(
                'group flex h-full items-start gap-2.5 rounded-lg border p-3 transition-colors',
                s.done ? 'border-border bg-muted/40' : 'border-border hover:border-sand-300 hover:bg-muted/40',
              )}
            >
              {s.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1">
                <span className={cn('block text-[13px] font-medium', s.done && 'text-muted-foreground line-through')}>
                  {s.label}
                </span>
                {!s.done && <span className="mt-0.5 block text-xs text-muted-foreground">{s.hint}</span>}
              </span>
              {!s.done && (
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              )}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
