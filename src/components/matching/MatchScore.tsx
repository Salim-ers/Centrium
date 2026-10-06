import { verdictOf, VERDICT_LABEL } from '@/lib/matching/engine';
import { cn } from '@/lib/utils';

const STROKE: Record<ReturnType<typeof verdictOf>, string> = {
  excellent: 'hsl(var(--success))',
  good: '#C65F46',
  possible: 'hsl(var(--warning))',
  weak: '#A8A09A',
};

export function scoreTone(score: number): string {
  const v = verdictOf(score);
  if (v === 'excellent') return 'bg-success-soft text-success border-success/20';
  if (v === 'good') return 'bg-app-peach-light text-app-terra-dark border-app-terra/20';
  if (v === 'possible') return 'bg-warning-soft text-warning border-warning/20';
  return 'bg-muted text-muted-foreground border-border';
}

/** Score compact (listes denses). */
export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn('num inline-flex h-7 min-w-[2.75rem] items-center justify-center rounded-md border px-1.5 text-[13px] font-semibold', scoreTone(score), className)}
      aria-label={`Score ${Math.round(score)} sur 100`}
    >
      {Math.round(score)}
    </span>
  );
}

/** Jauge circulaire du score sur 100, colorée selon le verdict. */
export function ScoreRing({ score, size = 52, lang, showVerdict = false }: { score: number; size?: number; lang: 'fr' | 'en'; showVerdict?: boolean }) {
  const v = verdictOf(score);
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <span className="inline-flex shrink-0 flex-col items-center gap-1" aria-label={`${lang === 'fr' ? 'Score' : 'Score'} ${Math.round(score)}/100 — ${VERDICT_LABEL[v][lang]}`}>
      <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-black/[0.06]" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={STROKE[v]} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} />
        </svg>
        <span className="num absolute text-[15px] font-semibold tracking-[-0.02em] text-foreground">{Math.round(score)}</span>
      </span>
      {showVerdict && <span className={cn('whitespace-nowrap text-[11px] font-semibold', v === 'excellent' ? 'text-success' : v === 'good' ? 'text-app-terra-dark' : v === 'possible' ? 'text-warning' : 'text-muted-foreground')}>{VERDICT_LABEL[v][lang]}</span>}
    </span>
  );
}
