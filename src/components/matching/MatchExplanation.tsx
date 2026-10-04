'use client';

import { cn } from '@/lib/utils';
import type { ScoreBreakdown } from '@/lib/ai/matching/score';

const COMPONENTS: Array<{ key: keyof ScoreBreakdown['components']; fr: string; en: string }> = [
  { key: 'skillsRequired', fr: 'Compétences requises', en: 'Required skills' },
  { key: 'skillsNice', fr: 'Compétences appréciées', en: 'Nice-to-have skills' },
  { key: 'seniority', fr: 'Séniorité', en: 'Seniority' },
  { key: 'availability', fr: 'Disponibilité', en: 'Availability' },
  { key: 'dailyRate', fr: 'TJM', en: 'Day rate' },
  { key: 'languages', fr: 'Langues', en: 'Languages' },
  { key: 'location', fr: 'Localisation', en: 'Location' },
];

const GATE_LABEL: Record<string, { fr: string; en: string }> = {
  unavailable: { fr: 'Indisponible à la date de démarrage : score plafonné', en: 'Not available at start date: score capped' },
  'seniority-mismatch': { fr: 'Écart de séniorité important : score plafonné', en: 'Large seniority gap: score capped' },
  'skills-too-low': { fr: 'Moins de 20 % des compétences requises : score plafonné', en: 'Under 20% of required skills: score capped' },
};

export function scoreTone(score: number): string {
  if (score >= 75) return 'bg-success-soft text-success border-success/20';
  if (score >= 55) return 'bg-brand-50 text-primary-deep border-brand-100';
  if (score >= 35) return 'bg-warning-soft text-warning border-warning/20';
  return 'bg-muted text-muted-foreground border-border';
}

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

/**
 * Explication d'un score de matching : composantes pondérées, compétences
 * couvertes / manquantes / partielles, plafonds appliqués. Tout ce qui est
 * affiché provient des données saisies (fiche consultant + besoin).
 */
export function MatchExplanation({ breakdown, lang }: { breakdown: ScoreBreakdown; lang: 'fr' | 'en' }) {
  const fr = lang === 'fr';
  const exact = breakdown.matchedSkills.filter((s) => !breakdown.equivalentSkills.includes(s));
  return (
    <div className="space-y-4">
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {COMPONENTS.map(({ key, fr: lf, en: le }) => {
          const c = breakdown.components[key];
          const pct = c.max > 0 ? (c.points / c.max) * 100 : 0;
          return (
            <div key={key}>
              <div className="flex items-baseline justify-between text-xs">
                <dt className="text-muted-foreground">{fr ? lf : le}</dt>
                <dd className="num font-medium text-foreground">
                  {c.points.toLocaleString(fr ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 })} / {c.max}
                </dd>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sand-100" aria-hidden>
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
            </div>
          );
        })}
      </dl>

      {(exact.length > 0 || breakdown.equivalentSkills.length > 0) && (
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">{fr ? 'Compétences couvertes' : 'Covered skills'}</div>
          <div className="flex flex-wrap gap-1.5">
            {exact.map((s) => (
              <span key={s} className="rounded-md border border-success/20 bg-success-soft px-1.5 py-0.5 text-xs text-success">
                {s}
              </span>
            ))}
            {breakdown.equivalentSkills.map((s) => (
              <span
                key={s}
                className="rounded-md border border-success/20 bg-success-soft px-1.5 py-0.5 text-xs text-success"
                title={fr ? 'Couverte par une compétence équivalente du profil' : 'Covered by an equivalent skill in the profile'}
              >
                {s} ≈
              </span>
            ))}
          </div>
        </div>
      )}

      {breakdown.partialSkills.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">{fr ? 'Indices partiels, à confirmer' : 'Partial evidence, to confirm'}</div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {breakdown.partialSkills.map((p) => (
              <li key={p.skill}>
                <span className="font-medium text-warning">{p.skill}</span> — {fr ? 'profil :' : 'profile:'} {p.evidence.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {breakdown.missingSkills.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs font-medium text-foreground">{fr ? 'Non présentes dans le profil' : 'Not in the profile'}</div>
          <div className="flex flex-wrap gap-1.5">
            {breakdown.missingSkills.map((s) => (
              <span key={s} className="rounded-md border border-dashed border-border px-1.5 py-0.5 text-xs text-muted-foreground">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {breakdown.gates.length > 0 && (
        <ul className="space-y-1 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
          {breakdown.gates.map((g) => (
            <li key={g}>{GATE_LABEL[g]?.[lang] ?? g}</li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-muted-foreground">
        {fr
          ? 'Score calculé uniquement à partir des compétences, de la séniorité, de la disponibilité, du TJM, des langues et de la localisation saisis. Aucune compétence n’est supposée.'
          : 'Computed only from the skills, seniority, availability, day rate, languages and location on record. No skill is assumed.'}
      </p>
    </div>
  );
}
