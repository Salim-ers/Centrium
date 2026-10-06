import { formatDate } from '@/lib/format';
import type { Availability } from '@/lib/talents/filters';
import { cn } from '@/lib/utils';

const TONE: Record<Availability['kind'], string> = {
  now: 'bg-success-soft text-success',
  soon: 'bg-warning-soft text-warning',
  later: 'bg-muted text-muted-foreground',
  unknown: 'bg-muted text-muted-foreground',
  unavailable: 'bg-danger-soft text-destructive',
};

/** Libellé court de la disponibilité (« Disponible », « Libre dans 12 j »…). */
export function availabilityText(a: Availability, lang: 'fr' | 'en'): string {
  const fr = lang === 'fr';
  switch (a.kind) {
    case 'now':
      return fr ? 'Disponible' : 'Available';
    case 'soon':
      return a.days === 1 ? (fr ? 'Libre demain' : 'Free tomorrow') : fr ? `Libre dans ${a.days} j` : `Free in ${a.days} d`;
    case 'later':
      return fr ? `Libre le ${formatDate(a.date, lang, 'short')}` : `Free on ${formatDate(a.date, lang, 'short')}`;
    case 'unknown':
      return fr ? 'En mission' : 'On mission';
    case 'unavailable':
      return fr ? 'Indisponible' : 'Unavailable';
  }
}

/** Pastille de disponibilité : verte si disponible, ambre sous 30 jours. */
export function AvailabilityBadge({ availability, lang, className }: { availability: Availability; lang: 'fr' | 'en'; className?: string }) {
  const fr = lang === 'fr';
  const title =
    availability.kind === 'soon' || availability.kind === 'later'
      ? formatDate(availability.date, lang)
      : availability.kind === 'unknown'
        ? fr
          ? 'Date de fin de mission non renseignée'
          : 'Mission end date not set'
        : undefined;
  return (
    <span title={title} className={cn('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[12px] font-medium', TONE[availability.kind], className)}>
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full bg-current', availability.kind === 'now' && 'shadow-[0_0_0_3px_hsl(var(--success)/0.18)]')} />
      {availabilityText(availability, lang)}
    </span>
  );
}
