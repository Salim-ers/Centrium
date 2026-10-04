'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { usePermissions } from '@/hooks/usePermissions';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { Permission } from '@/lib/auth/permissions';

export type RelatedLink = { href: string; label: { fr: string; en: string }; permission?: Permission };

/**
 * « Voir aussi » : accès aux écrans complémentaires d'un module (offres,
 * appels d'offres, journal comptable…) sans les remonter dans la barre
 * latérale.
 */
export function RelatedLinks({ links }: { links: RelatedLink[] }) {
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const { can } = usePermissions();
  const visible = links.filter((l) => !l.permission || can(l.permission));
  if (!visible.length) return null;
  return (
    <nav aria-label={lang === 'fr' ? 'Voir aussi' : 'See also'} className="-mt-3 mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
      <span className="text-muted-foreground">{lang === 'fr' ? 'Voir aussi' : 'See also'}</span>
      {visible.map((l) => (
        <Link key={l.href} href={l.href} className="inline-flex items-center gap-0.5 text-primary-deep hover:underline">
          {l.label[lang]}
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      ))}
    </nav>
  );
}
