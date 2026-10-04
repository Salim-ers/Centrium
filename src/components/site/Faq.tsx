import { Plus } from 'lucide-react';

import { cn } from '@/lib/utils';

/** FAQ éditoriale, accessible (details/summary natifs : clavier et lecteurs d'écran). */
export function Faq({ items, light = false }: { items: Array<{ q: string; a: string }>; light?: boolean }) {
  return (
    <div className={cn('border-t', light ? 'border-ivory/20' : 'border-ink/15')}>
      {items.map((it) => (
        <details key={it.q} className={cn('group border-b', light ? 'border-ivory/20' : 'border-ink/15')}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[17px] font-semibold md:text-[19px] [&::-webkit-details-marker]:hidden">
            {it.q}
            <Plus className="h-5 w-5 shrink-0 transition-transform duration-300 group-open:rotate-45" aria-hidden />
          </summary>
          <p className={cn('max-w-2xl pb-6 text-[15.5px] leading-[1.6]', light ? 'text-ivory/75' : 'text-ink-soft/75')}>{it.a}</p>
        </details>
      ))}
    </div>
  );
}
