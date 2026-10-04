'use client';

import Link from 'next/link';
import { Users, Send, BriefcaseBusiness } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';

type Tab = 'consultants' | 'cv-pushed' | 'on-mission';

type Props = {
  active: Tab;
  /** Compteurs optionnels affichés à droite du libellé. */
  counts?: { consultants?: number; cvPushed?: number; onMission?: number };
};

/**
 * Switcher 3 onglets — un profil est dans UN SEUL onglet à la fois,
 * piloté par l'état de ses missions :
 *
 * - Consultants  : bibliothèque + vivier confondus, aucune mission "proposed/active"
 * - CV poussés   : a au moins une mission "proposed" (CV envoyé sur une offre, TJM négocié)
 * - En Mission   : a au moins une mission "active" (validée, comptée dans le dashboard)
 */
export function TalentTabs({ active, counts }: Props) {
  const ti = useAppT();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const tabs: {
    id: Tab;
    href: string;
    label: string;
    sub: string;
    Icon: typeof Users;
    countKey: keyof NonNullable<Props['counts']>;
  }[] = [
    {
      id: 'consultants',
      href: '/consultants',
      label: ti.pages.consultants.tabs_library,
      sub: isEn
        ? 'Library + talent pool — profiles available to position'
        : 'Bibliothèque + vivier — profils disponibles à positionner',
      Icon: Users,
      countKey: 'consultants',
    },
    {
      id: 'cv-pushed',
      href: '/cv-pushed',
      label: ti.pages.consultants.tabs_cv_pushed,
      sub: isEn
        ? 'CV sent on an offer, awaiting client validation'
        : 'CV envoyé sur une offre, en attente de validation client',
      Icon: Send,
      countKey: 'cvPushed',
    },
    {
      id: 'on-mission',
      href: '/en-mission',
      label: ti.pages.consultants.tabs_on_mission,
      sub: isEn
        ? 'Validated missions — counted in the dashboard'
        : 'Missions validées — comptées dans le dashboard',
      Icon: BriefcaseBusiness,
      countKey: 'onMission',
    },
  ];

  return (
    <div className="mb-6 flex items-center gap-1 rounded-lg border border-hairline bg-card p-1 w-fit">
      {tabs.map((t) => {
        const isActive = t.id === active;
        const count = counts?.[t.countKey];
        return (
          <Link
            key={t.id}
            href={t.href}
            className={cn(
              'group inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm transition',
              isActive
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent',
            )}
            title={t.sub}
          >
            <t.Icon className="h-4 w-4 shrink-0" />
            <span className="font-medium">{t.label}</span>
            {typeof count === 'number' && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                  isActive
                    ? 'bg-primary/25 text-primary'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
