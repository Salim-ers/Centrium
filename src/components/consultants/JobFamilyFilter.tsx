'use client';

import { JOB_FAMILIES, type JobFamilyId } from '@/lib/consultants/job-family';
import { cn } from '@/lib/utils';
import { useAppT } from '@/lib/i18n/LocaleProvider';

/** Map JobFamilyId → clé i18n dans t.pages.consultants. Centralisé pour
 *  garder le composant 100% data-driven et le dict comme source de vérité. */
const FAMILY_I18N_KEY: Record<JobFamilyId, keyof ReturnType<typeof useAppT>['pages']['consultants']> = {
  qa: 'tab_qa',
  dev: 'tab_dev',
  data: 'tab_data',
  devops: 'tab_devops',
  cyber: 'tab_cyber',
  pm: 'tab_pm',
  ba: 'tab_ba',
  architect: 'tab_architect',
  support: 'tab_support',
  design: 'tab_design',
  other: 'tab_other',
};

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
  const t = useAppT();
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
            ? 'border-primary/60 bg-primary/15 text-primary'
            : 'border-hairline text-muted-foreground hover:border-foreground/25 hover:text-foreground',
        )}
      >
        {t.pages.consultants.tab_all}
        <span className="ml-1.5 text-muted-foreground/60">{total}</span>
      </button>

      {visible.map((fam) => {
        const isActive = active.has(fam.id);
        const count = counts[fam.id] ?? 0;
        const label = t.pages.consultants[FAMILY_I18N_KEY[fam.id]] ?? fam.label;
        return (
          <button
            key={fam.id}
            type="button"
            onClick={() => toggle(fam.id)}
            className={cn(
              'h-7 px-3 rounded-full text-[11px] font-semibold uppercase tracking-wider border transition',
              isActive
                ? 'border-primary/60 bg-primary/15 text-primary'
                : 'border-hairline text-muted-foreground hover:border-foreground/25 hover:text-foreground',
            )}
          >
            {label}
            <span className="ml-1.5 text-muted-foreground/60">{count}</span>
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
              ? 'border-primary/60 bg-primary/15 text-primary'
              : 'border-hairline text-muted-foreground hover:border-foreground/25 hover:text-foreground',
          )}
        >
          {t.pages.consultants.tab_other}
          <span className="ml-1.5 text-muted-foreground/60">{otherCount}</span>
        </button>
      )}
    </div>
  );
}
