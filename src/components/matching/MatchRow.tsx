'use client';

import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { MatchBreakdown, MatchHighlights } from '@/components/matching/MatchBreakdown';
import { ScoreRing } from '@/components/matching/MatchScore';
import type { MatchResult } from '@/lib/matching/engine';
import { cn } from '@/lib/utils';

type Props = {
  rank: number;
  result: MatchResult;
  /** Nom du profil ou intitulé du besoin (souvent un lien). */
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Pastilles à droite du titre (disponibilité, TJM, démarrage). */
  aside?: React.ReactNode;
  /** Pourquoi ce résultat devance le suivant. */
  lead?: string | null;
  actions?: React.ReactNode;
  lang: 'fr' | 'en';
  showRates: boolean;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
};

/**
 * Un résultat de matching classé : rang, score sur 100 et verdict, forces
 * et écarts principaux, raison du classement, actions ; le détail complet
 * des critères se déplie sur place.
 */
export function MatchRow({ rank, result, title, subtitle, aside, lead, actions, lang, showRates, expanded, onToggle, className }: Props) {
  const fr = lang === 'fr';
  return (
    <li className={cn('rounded-2xl border border-black/[0.06] bg-card p-3.5 shadow-[0_1px_2px_rgba(25,22,20,.04)] sm:p-4', expanded && 'border-app-terra/25', className)}>
      <div className="flex items-start gap-3">
        <span className="num hidden w-6 shrink-0 pt-4 text-right text-[12px] font-semibold text-muted-foreground sm:block">#{rank}</span>
        <ScoreRing score={result.score} lang={lang} showVerdict />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="min-w-0 text-[14px] font-semibold text-foreground">{title}</span>
            {aside}
          </div>
          {subtitle && <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{subtitle}</div>}
          <MatchHighlights result={result} lang={lang} showRates={showRates} max={2} className="mt-2" />
          {lead && (
            <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-muted-foreground">
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-terra" />
              {lead}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {actions}
            <Button variant="ghost" size="sm" onClick={onToggle} aria-expanded={expanded}>
              {expanded ? <ChevronUp /> : <ChevronDown />}
              {expanded ? (fr ? 'Masquer le détail' : 'Hide details') : fr ? 'Détail du score' : 'Score details'}
            </Button>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 rounded-xl border border-border bg-muted/30 p-4">
          <MatchBreakdown result={result} lang={lang} showRates={showRates} />
        </div>
      )}
    </li>
  );
}
