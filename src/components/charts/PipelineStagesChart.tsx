'use client';

import Link from 'next/link';
import { STAGE_BY_ID, type PipelineStageId } from '@/lib/crm/pipeline';
import type { StageSummary } from '@/lib/pilotage/metrics';
import { formatEurCompact } from '@/lib/format';

/**
 * Pipeline par étape : barres horizontales proportionnelles au montant,
 * nombre d'opportunités et valeur pondérée. Rendu HTML (lisible, accessible,
 * sans dépendance de graphique).
 */
export default function PipelineStagesChart({ stages, lang }: { stages: StageSummary[]; lang: 'fr' | 'en' }) {
  const max = Math.max(1, ...stages.map((s) => s.amount));
  return (
    <ul className="space-y-2.5">
      {stages.map((s, i) => {
        const stage = STAGE_BY_ID.get(s.stage as PipelineStageId)!;
        const pct = (s.amount / max) * 100;
        return (
          <li key={s.stage}>
            <Link href={`/crm?stage=${s.stage}`} className="group block rounded-md outline-none focus-visible:shadow-focus">
              <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                <span className="font-medium text-foreground group-hover:text-primary-deep">
                  {stage.label[lang]}
                  <span className="num ml-1.5 text-xs font-normal text-muted-foreground">{s.count}</span>
                </span>
                <span className="num text-xs text-muted-foreground">
                  {formatEurCompact(s.amount, lang)}
                  <span className="ml-1.5 text-foreground">· {formatEurCompact(s.weighted, lang)}</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-sand-100">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out-soft"
                  style={{
                    width: `${Math.max(pct, s.count > 0 ? 3 : 0)}%`,
                    backgroundColor: `hsl(12 53% ${70 - i * 5}%)`,
                  }}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
