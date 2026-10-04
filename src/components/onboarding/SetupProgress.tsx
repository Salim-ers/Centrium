'use client';

import Link from 'next/link';
import { useSetupSteps } from '@/hooks/useSetupSteps';
import { usePermissions } from '@/hooks/usePermissions';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { Progress } from '@/components/ui/progress';

/**
 * Progression d'onboarding, discrète, en pied de sidebar. Disparaît dès
 * que toutes les étapes sont réellement faites. Réservée aux rôles qui
 * peuvent paramétrer l'organisation.
 */
export function SetupProgress({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = usePermissions();
  const { steps, doneCount, total, complete, loading } = useSetupSteps();
  const { locale } = useLocale();
  if (!can('settings.manage') || loading || total === 0 || complete) return null;
  const next = steps.find((s) => !s.done);

  return (
    <Link
      href={next?.href ?? '/dashboard'}
      onClick={onNavigate}
      className="mb-1 block rounded-lg border border-border bg-card px-3 py-2.5 shadow-xs transition-colors hover:border-sand-300"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">
          {locale === 'en' ? 'Getting started' : 'Mise en route'}
        </span>
        <span className="num text-muted-foreground">
          {doneCount}/{total}
        </span>
      </div>
      <Progress value={doneCount} max={total} className="mt-2" label={locale === 'en' ? 'Setup progress' : 'Progression de la mise en route'} />
      {next && <div className="mt-2 truncate text-[11px] text-muted-foreground">{next.label}</div>}
    </Link>
  );
}
