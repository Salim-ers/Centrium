'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Circle, Rocket } from 'lucide-react';

import { useOrganization } from '@/lib/auth/context';
import { useIsoLayoutEffect } from '@/hooks/useIsoLayoutEffect';
import { useSetupSteps } from '@/hooks/useSetupSteps';
import { usePermissions } from '@/hooks/usePermissions';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const DISMISS_KEY = (org: string) => `centrium-setup-dismissed:${org}`;

/**
 * Mise en route de l'organisation (organisation, branding, équipe,
 * consultants, premier client) : un bouton compact dans l'en-tête du
 * dashboard, la liste des étapes RÉELLES s'ouvre au clic. Se masque quand
 * tout est fait ou à la demande (mémorisé sur cet appareil).
 */
export function SetupChecklist() {
  const { locale } = useLocale();
  const fr = locale !== 'en';
  const { activeOrgId } = useOrganization();
  const { can } = usePermissions();
  const { steps, doneCount, total, complete, loading } = useSetupSteps();
  // Relu à chaque organisation (connue après le premier rendu), avant la peinture.
  const [dismissed, setDismissed] = useState(false);
  useIsoLayoutEffect(() => {
    if (!activeOrgId) return;
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY(activeOrgId)) === '1');
    } catch {
      /* stockage indisponible */
    }
  }, [activeOrgId]);

  if (!can('settings.manage') || loading || complete || dismissed || total === 0) return null;

  function dismiss() {
    try {
      if (activeOrgId) window.localStorage.setItem(DISMISS_KEY(activeOrgId), '1');
    } catch {
      /* stockage indisponible */
    }
    setDismissed(true);
  }

  const pct = Math.round((doneCount / total) * 100);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2.5 rounded-xl bg-app-peach-light px-3 text-[12.5px] font-semibold text-app-terra-dark ring-1 ring-app-terra/15 transition-colors hover:bg-app-peach focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-terra/50"
        >
          <Rocket className="h-3.5 w-3.5" />
          {fr ? 'Mise en route' : 'Setup'}
          <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-white">
            <span className="absolute inset-y-0 left-0 rounded-full bg-app-terra" style={{ width: `${pct}%` }} />
          </span>
          <span className="tabular-nums">
            {doneCount}/{total}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[340px] rounded-2xl p-2">
        <div className="px-2 pb-2 pt-1">
          <div className="text-[13.5px] font-semibold">{fr ? 'Votre espace est presque prêt' : 'Your workspace is almost ready'}</div>
          <div className="text-[12px] text-muted-foreground">{fr ? `${doneCount} étape${doneCount > 1 ? 's' : ''} sur ${total}` : `${doneCount} of ${total} steps`}</div>
        </div>
        <ol className="space-y-0.5">
          {steps.map((s) => (
            <li key={s.key}>
              <Link
                href={s.href}
                className={cn('group flex items-start gap-2.5 rounded-xl p-2.5 transition-colors', s.done ? 'opacity-60' : 'hover:bg-app-peach-light')}
              >
                {s.done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-app-terra" />}
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-[13px] font-medium', s.done && 'line-through')}>{s.label}</span>
                  {!s.done && <span className="mt-0.5 block text-[12px] text-muted-foreground">{s.hint}</span>}
                </span>
                {!s.done && <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />}
              </Link>
            </li>
          ))}
        </ol>
        <button type="button" onClick={dismiss} className="mt-1 w-full rounded-lg px-2 py-1.5 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground">
          {fr ? 'Masquer la mise en route' : 'Hide setup'}
        </button>
      </PopoverContent>
    </Popover>
  );
}
