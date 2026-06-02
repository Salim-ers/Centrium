'use client';

import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  /** Cellule de gauche : avatar / icône / numéro */
  leading?: React.ReactNode;
  /** Titre principal de la ligne */
  primary: React.ReactNode;
  /** Sous-titre / contexte (sous le primary) */
  secondary?: React.ReactNode;
  /** Cellules de droite (badges, montants, actions inline) */
  trailing?: React.ReactNode;
  /** Si défini, rend la ligne cliquable comme un Link */
  href?: string;
  /** Active une bordure rose au hover (mise en évidence des items importants) */
  highlight?: boolean;
  className?: string;
};

/**
 * Ligne de données réutilisable pour les listings — alternative aux tables HTML
 * classiques. Plus mobile-friendly, plus expressive (multi-ligne, avatars, badges).
 *
 * Usage :
 *   <DataRow
 *     leading={<Avatar src={c.photo} />}
 *     primary="Marc Dupont"
 *     secondary="Tech Lead React · Paris"
 *     trailing={<><StatusBadge tone="success">Disponible</StatusBadge><span>650€</span></>}
 *     href={`/consultants/${c.id}`}
 *   />
 */
export function DataRow({ leading, primary, secondary, trailing, href, highlight, className }: Props) {
  const inner = (
    <>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground text-[14px] sm:text-[15px] truncate">
          {primary}
        </div>
        {secondary && (
          <div className="mt-0.5 text-[12.5px] text-muted-foreground truncate">{secondary}</div>
        )}
      </div>
      {trailing && (
        <div className="flex items-center gap-3 shrink-0 text-[13px]">{trailing}</div>
      )}
      {href && (
        <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0 transition group-hover:text-magenta group-hover:translate-x-0.5" />
      )}
    </>
  );

  const base = cn(
    'group flex items-center gap-3 px-4 py-3 border-b border-hairline/60 last:border-b-0 transition-colors',
    href && 'hover:bg-magenta/[0.04] cursor-pointer',
    highlight && 'hover:border-magenta/40',
    className,
  );

  if (href) {
    return (
      <a href={href} className={base}>
        {inner}
      </a>
    );
  }
  return <div className={base}>{inner}</div>;
}
