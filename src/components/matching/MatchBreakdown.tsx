'use client';

import { AlertTriangle, CheckCircle2, CircleDashed, Info, MinusCircle, XCircle } from 'lucide-react';

import { CRITERIA, type MatchResult, type Note, type SkillEvidence } from '@/lib/matching/engine';
import { languageName } from '@/lib/utils/text';
import { cn } from '@/lib/utils';

const STATUS: Record<SkillEvidence['status'], { icon: typeof CheckCircle2; className: string; label: { fr: string; en: string } }> = {
  matched: { icon: CheckCircle2, className: 'text-success', label: { fr: 'couverte', en: 'covered' } },
  equivalent: { icon: CheckCircle2, className: 'text-success/80', label: { fr: 'équivalence', en: 'equivalent' } },
  partial: { icon: CircleDashed, className: 'text-warning', label: { fr: 'à confirmer', en: 'to confirm' } },
  missing: { icon: XCircle, className: 'text-muted-foreground/70', label: { fr: 'absente', en: 'missing' } },
};

export function noteText(n: Note, lang: 'fr' | 'en', showRates: boolean): string {
  return !showRates && n.redacted ? n.redacted[lang] : n[lang];
}

/** Forces et écarts d'un résultat, en deux listes courtes. */
export function MatchHighlights({ result, lang, showRates, max = 3, className }: { result: MatchResult; lang: 'fr' | 'en'; showRates: boolean; max?: number; className?: string }) {
  const strengths = result.strengths.slice(0, max);
  const gaps = result.gaps.slice(0, max);
  if (!strengths.length && !gaps.length) return null;
  return (
    <ul className={cn('flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]', className)}>
      {strengths.map((s, i) => (
        <li key={`s${i}`} className="flex min-w-0 items-start gap-1.5 text-foreground/85">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
          <span>{noteText(s, lang, showRates)}</span>
        </li>
      ))}
      {gaps.map((g, i) => (
        <li key={`g${i}`} className="flex min-w-0 items-start gap-1.5 text-foreground/85">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <span>{noteText(g, lang, showRates)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Détail d'un score : les six critères (points, barre, explication), les
 * exigences du besoin une par une avec leur preuve dans le profil, les
 * plafonds appliqués et les critères non évalués faute de données.
 */
export function MatchBreakdown({ result, lang, showRates }: { result: MatchResult; lang: 'fr' | 'en'; showRates: boolean }) {
  const fr = lang === 'fr';
  const groups: Array<{ title: string; items: SkillEvidence[] }> = [
    { title: fr ? 'Exigences obligatoires' : 'Mandatory requirements', items: result.skills.filter((s) => s.mandatory) },
    { title: fr ? 'Compétences appréciées' : 'Nice-to-have skills', items: result.skills.filter((s) => !s.mandatory) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {result.criteria.map((c) => {
          const meta = CRITERIA.find((x) => x.id === c.id)!;
          const pct = c.max > 0 ? (c.points / c.max) * 100 : 0;
          return (
            <div key={c.id} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                <dt className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
                  {meta.label[lang]}
                  {!c.evaluated && (
                    <span className="rounded-full bg-muted px-1.5 text-[10.5px] font-medium text-muted-foreground" title={fr ? 'Donnée manquante : note neutre' : 'Missing data: neutral score'}>
                      {fr ? 'non évalué' : 'not assessed'}
                    </span>
                  )}
                </dt>
                <dd className="num shrink-0 font-semibold text-foreground">
                  {c.points.toLocaleString(fr ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 })}
                  <span className="font-normal text-muted-foreground"> / {c.max}</span>
                </dd>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[0.06]" aria-hidden>
                <div className={cn('h-full rounded-full', c.evaluated ? (pct >= 80 ? 'bg-success' : pct >= 55 ? 'bg-app-terra' : 'bg-warning') : 'bg-muted-foreground/40')} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <dd className="mt-1 text-[11.5px] leading-snug text-muted-foreground">{!showRates && c.redacted ? c.redacted[lang] : c.detail[lang]}</dd>
            </div>
          );
        })}
      </dl>

      {(result.strengths.length > 0 || result.gaps.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 text-xs font-semibold text-foreground">{fr ? 'Points forts' : 'Strengths'}</div>
            {result.strengths.length ? (
              <ul className="space-y-1 text-[12.5px]">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                    {noteText(s, lang, showRates)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-muted-foreground">—</p>
            )}
          </div>
          <div>
            <div className="mb-1.5 text-xs font-semibold text-foreground">{fr ? 'Écarts et points à vérifier' : 'Gaps and checks'}</div>
            {result.gaps.length ? (
              <ul className="space-y-1 text-[12.5px]">
                {result.gaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                    {noteText(g, lang, showRates)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-muted-foreground">{fr ? 'Aucun écart relevé.' : 'No gap found.'}</p>
            )}
          </div>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.title}>
          <div className="mb-1.5 text-xs font-semibold text-foreground">{g.title}</div>
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {g.items.map((s) => {
              const st = STATUS[s.status];
              return (
                <li key={`${s.kind}:${s.name}`} className="flex min-w-0 items-start gap-1.5 text-[12.5px]">
                  <st.icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', st.className)} aria-label={st.label[lang]} />
                  <span className="min-w-0">
                    <span className={cn('font-medium', s.status === 'missing' && 'text-muted-foreground')}>{s.kind === 'language' && s.code ? languageName(s.code, lang) : s.name}</span>
                    {s.evidence ? <span className="text-muted-foreground"> — {s.evidence[lang]}</span> : s.status === 'missing' ? <span className="text-muted-foreground"> — {fr ? 'absente du profil' : 'not in the profile'}</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {result.caps.length > 0 && (
        <ul className="space-y-1 rounded-lg bg-warning-soft px-3 py-2 text-[12px] text-warning">
          {result.caps.map((c) => (
            <li key={c.id} className="flex items-start gap-1.5">
              <MinusCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {fr ? `${c.label.fr} : score plafonné à ${c.max}` : `${c.label.en}: score capped at ${c.max}`}
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" />
        {fr
          ? 'Calcul déterministe sur les seules données saisies : compétences (niveau, années), certifications, expériences, missions, disponibilité, lieu et TJM. Un critère sans donnée est noté au neutre ; aucune compétence n’est supposée.'
          : 'Deterministic, computed only from recorded data: skills (level, years), certifications, experiences, missions, availability, location and day rate. A criterion without data gets a neutral score; no skill is assumed.'}
      </p>
    </div>
  );
}
