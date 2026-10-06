'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import { useOrganizationSafe } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { DEMO_ORG_ID } from '@/lib/demo/config';
import { cn } from '@/lib/utils';

/**
 * Bandeau de l'espace de démonstration : partout où l'on navigue, il dit
 * que les données sont fictives. Rien ne s'affiche hors de l'organisation
 * de démo.
 */
export function DemoBanner({ className }: { className?: string }) {
  const org = useOrganizationSafe();
  const { locale } = useLocale();
  if (!org?.activeOrgId || org.activeOrgId !== DEMO_ORG_ID) return null;
  const fr = locale !== 'en';
  return (
    <div
      role="note"
      className={cn(
        'flex shrink-0 items-center justify-center gap-x-2 gap-y-0.5 border-b border-primary/20 bg-primary/10 px-4 py-1.5 text-center text-[12.5px] text-primary-deep',
        className,
      )}
    >
      <Sparkles className="hidden h-3.5 w-3.5 shrink-0 sm:block" aria-hidden />
      <span>{fr ? 'Espace de démonstration : données fictives, partagées et réinitialisées régulièrement.' : 'Demo space: fictitious data, shared and reset regularly.'}</span>
      <Link href="/essai" className="shrink-0 font-semibold underline-offset-2 hover:underline">
        {fr ? 'Créer mon espace' : 'Create my space'}
      </Link>
    </div>
  );
}
