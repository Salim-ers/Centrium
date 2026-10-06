import { cn } from '@/lib/utils';

type Chip = { id: string; name: string; level: number | null; years: number | null; matched?: boolean; is_highlighted?: boolean | null };

/** Niveau 1 à 5 en barres, lisible d'un coup d'œil. */
function LevelBars({ level }: { level: number }) {
  return (
    <span aria-hidden className="flex items-end gap-px">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn('w-[3px] rounded-[1px]', i <= level ? 'bg-current' : 'bg-current opacity-25')} style={{ height: 4 + i * 1.4 }} />
      ))}
    </span>
  );
}

/**
 * Compétences d'un profil : les recherchées en terracotta, le niveau en
 * barres (1 à 5) et les années en infobulle ; « +N » pour le reste.
 */
export function SkillChips({ skills, max = 4, lang, className }: { skills: Chip[]; max?: number; lang: 'fr' | 'en'; className?: string }) {
  const fr = lang === 'fr';
  if (skills.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const shown = skills.slice(0, max);
  const rest = skills.length - shown.length;
  return (
    <span className={cn('flex flex-wrap items-center gap-1', className)}>
      {shown.map((s) => {
        const level = s.level != null ? Math.max(1, Math.min(5, Math.round(s.level))) : null;
        const title = [
          s.name,
          level != null ? (fr ? `niveau ${level}/5` : `level ${level}/5`) : null,
          s.years ? (fr ? `${s.years} an${s.years > 1 ? 's' : ''}` : `${s.years} yr${s.years > 1 ? 's' : ''}`) : null,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <span
            key={s.id}
            title={title}
            className={cn(
              'inline-flex h-6 max-w-[11rem] items-center gap-1.5 rounded-md px-1.5 text-[11.5px] font-medium',
              s.matched ? 'bg-app-terra text-white' : s.is_highlighted ? 'bg-app-peach-light text-app-terra-dark' : 'bg-muted text-foreground/80',
            )}
          >
            <span className="truncate">{s.name}</span>
            {level != null && <LevelBars level={level} />}
          </span>
        );
      })}
      {rest > 0 && (
        <span className="text-[11.5px] font-medium text-muted-foreground" title={skills.slice(max).map((s) => s.name).join(', ')}>
          +{rest}
        </span>
      )}
    </span>
  );
}
