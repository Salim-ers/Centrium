'use client';

import Link from 'next/link';
import { Users, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'consultants' | 'prospects';

type Props = {
  active: Tab;
  /** Compteurs optionnels affichés à droite du libellé. */
  counts?: { consultants?: number; prospects?: number };
};

/**
 * Bascule "Bibliothèque consultants" ↔ "Vivier (prospection)".
 *
 * Les deux vues partagent la même entrée de menu sidebar, mais restent
 * sur des routes séparées pour préserver leurs filtres et leur état.
 */
export function TalentTabs({ active, counts }: Props) {
  const tabs: { id: Tab; href: string; label: string; sub: string; Icon: typeof Users }[] = [
    {
      id: 'consultants',
      href: '/consultants',
      label: 'Bibliothèque',
      sub: 'Consultants actifs / onboardés',
      Icon: Users,
    },
    {
      id: 'prospects',
      href: '/prospects',
      label: 'Vivier',
      sub: 'Prospection — consultants à recruter',
      Icon: UserPlus,
    },
  ];

  return (
    <div className="mb-6 flex items-center gap-1 rounded-lg border border-hairline bg-white/[0.02] p-1 w-fit">
      {tabs.map((t) => {
        const isActive = t.id === active;
        const count = counts?.[t.id];
        return (
          <Link
            key={t.id}
            href={t.href}
            className={cn(
              'group inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm transition',
              isActive
                ? 'bg-violet-glow/15 text-violet-glow border border-violet-glow/30 shadow-[0_0_30px_-12px_rgba(139,92,246,0.5)]'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03] border border-transparent',
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
                    ? 'bg-violet-glow/25 text-violet-50'
                    : 'bg-white/[0.05] text-muted-foreground',
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
