import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

import type { MissionHealth } from '@/lib/missions/health';
import { cn } from '@/lib/utils';

const DOT = { critical: 'bg-destructive', watch: 'bg-warning', ok: 'bg-success' } as const;

/** Cellule de liste : le signal le plus urgent, et combien d'autres. */
export function MissionHealthCell({ health, lang }: { health: MissionHealth; lang: 'fr' | 'en' }) {
  const fr = lang === 'fr';
  if (health.signals.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-success">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {fr ? 'À jour' : 'Up to date'}
      </span>
    );
  }
  const [first, ...rest] = health.signals;
  return (
    <span className="flex min-w-0 max-w-[13rem] items-center gap-1.5 text-[12.5px]" title={health.signals.map((s) => s.label[lang]).join('\n')}>
      <span aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full', DOT[health.level])} />
      <span className={cn('min-w-0 truncate', health.level === 'critical' ? 'font-medium text-destructive' : 'text-foreground')}>{first!.label[lang]}</span>
      {rest.length > 0 && <span className="num shrink-0 rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">+{rest.length}</span>}
    </span>
  );
}

/** Liste des signaux (aperçu, cockpit), chacun menant à l'écran où agir. */
export function MissionHealthList({ health, lang, className }: { health: MissionHealth; lang: 'fr' | 'en'; className?: string }) {
  const fr = lang === 'fr';
  if (health.signals.length === 0) return null;
  return (
    <ul className={cn('space-y-1.5', className)}>
      {health.signals.map((s) => (
        <li
          key={s.id}
          className={cn(
            'flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px]',
            s.tone === 'danger' ? 'bg-danger-soft text-destructive' : s.tone === 'warning' ? 'bg-warning-soft text-warning' : 'bg-muted text-muted-foreground',
          )}
        >
          {s.tone === 'info' ? <Info className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
          <span className="flex-1">{s.label[lang]}</span>
          {s.href && (
            <Link href={s.href} className="shrink-0 text-xs font-semibold underline-offset-2 hover:underline">
              {fr ? 'Agir' : 'Act'}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
