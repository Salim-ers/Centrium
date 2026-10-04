import { ChevronDown } from 'lucide-react';

/** FAQ accessible (details/summary natifs : clavier et lecteurs d'écran). */
export function Faq({ items }: { items: Array<{ q: string; a: string }> }) {
  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-card">
      {items.map((it) => (
        <details key={it.q} className="group px-5 py-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
            {it.q}
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" aria-hidden />
          </summary>
          <p className="pb-4 text-[14.5px] leading-relaxed text-muted-foreground">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
