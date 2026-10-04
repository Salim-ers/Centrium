import { cn } from '@/lib/utils';

export type Fact = { label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode };

/** Liste « libellé : valeur » des fiches (colonne latérale des pages 360). */
export function FactList({ facts, className, columns = 1 }: { facts: Fact[]; className?: string; columns?: 1 | 2 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-3', columns === 2 && 'sm:grid-cols-2', className)}>
      {facts.map((f, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{f.label}</dt>
          <dd className="mt-0.5 break-words text-[13.5px] text-foreground">
            {f.value === null || f.value === undefined || f.value === '' ? <span className="text-muted-foreground">—</span> : f.value}
          </dd>
          {f.hint && <dd className="mt-0.5 text-xs text-muted-foreground">{f.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
