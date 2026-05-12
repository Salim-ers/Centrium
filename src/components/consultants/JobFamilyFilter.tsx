'use client';

import { JOB_FAMILIES, type JobFamilyId } from '@/lib/consultants/job-family';
import { cn } from '@/lib/utils';

type Props = {
  /** Comptes par famille (et "other") déjà calculés depuis la liste source. */
  counts: Record<JobFamilyId, number>;
  total: number;
  active: Set<JobFamilyId>;
  onChange: (next: Set<JobFamilyId>) => void;
};

/**
 * Chips de filtre par corps de métier (QA, Dev, DevOps…).
 * Multi-select OR. "Tous" désactive tout.
 */
export function JobFamilyFilter({ counts, total, active, onChange }: Props) {
  const toggle = (id: JobFamilyId) => {
    const next = new Set(active);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const visible = JOB_FAMILIES.filter((f) => (counts[f.id] ?? 0) > 0);
  const otherCount = counts.other ?? 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(new Set())}
        className={cn(
          'h-7 px-3 rounded-full text-[11px] font-semibold uppercase tracking-wider border transition',
          active.size === 0
            ? 'border-violet-glow/60 bg-violet-glow/15 text-violet-glow'
            : 'border-hairline text-white/60 hover:border-white/25 hover:text-white/80',
        )}
      >
        Tous
        <span className="ml-1.5 text-white/40">{total}</span>
      </button>

      {visible.map((fam) => {
        const isActive = active.has(fam.id);
        const count = counts[fam.id] ?? 0;
        return (
          <button
            key={fam.id}
            type="button"
            onClick={() => toggle(fam.id)}
            className={cn(
              'h-7 px-3 rounded-full text-[11px] font-semibold uppercase tracking-wider border transition',
              isActive
                ? 'border-violet-glow/60 bg-violet-glow/15 text-violet-glow'
                : 'border-hairline text-white/60 hover:border-white/25 hover:text-white/80',
            )}
          >
            {fam.label}
            <span className="ml-1.5 text-white/40">{count}</span>
          </button>
        );
      })}

      {otherCount > 0 && (
        <button
          type="button"
          onClick={() => toggle('other')}
          className={cn(
            'h-7 px-3 rounded-full text-[11px] font-semibold uppercase tracking-wider border transition',
            active.has('other')
              ? 'border-violet-glow/60 bg-violet-glow/15 text-violet-glow'
              : 'border-hairline text-white/60 hover:border-white/25 hover:text-white/80',
          )}
        >
          Autres
          <span className="ml-1.5 text-white/40">{otherCount}</span>
        </button>
      )}
    </div>
  );
}
