'use client';

import { useState } from 'react';
import { ArrowUpToLine, ChevronDown, ChevronUp, Filter, Hash } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { MatchBreakdown } from '@/components/matching/MatchBreakdown';
import { ScoreRing } from '@/components/matching/MatchScore';
import { CRITERIA, type MatchNeed } from '@/lib/matching/engine';
import type { DossierFit } from '@/lib/cv/fit';
import { languageName } from '@/lib/utils/text';
import { cn } from '@/lib/utils';

type Props = {
  fit: DossierFit;
  need: MatchNeed;
  lang: 'fr' | 'en';
  showRates: boolean;
  /** Compétences absentes : assistant d'analyse (IA) en dessous. */
  assistant?: React.ReactNode;
  onRelevantFirst: () => void;
  onKeepRelevant: () => void;
};

/**
 * Pertinence du dossier pour le besoin : score objectif du profil (même
 * moteur que le Matching IA), exigences couvertes ou non, expériences les
 * plus pertinentes, mots-clés du besoin présents dans le dossier envoyé.
 */
export function FitPanel({ fit, need, lang, showRates, assistant, onRelevantFirst, onKeepRelevant }: Props) {
  const fr = lang === 'fr';
  const [details, setDetails] = useState(false);
  const r = fit.match;
  const covered = r.skills.filter((s) => s.mandatory && (s.status === 'matched' || s.status === 'equivalent'));
  const toConfirm = r.skills.filter((s) => s.status === 'partial');
  const missing = r.skills.filter((s) => s.mandatory && s.status === 'missing');
  const name = (s: (typeof r.skills)[number]) => (s.kind === 'language' && s.code ? languageName(s.code, lang) : s.name);
  const totalKw = fit.keywords.found.length + fit.keywords.missing.length;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <ScoreRing score={r.score} size={60} lang={lang} showVerdict />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-muted-foreground">{fr ? 'Pertinence du profil pour' : 'Profile fit for'}</p>
          <p className="truncate text-[13.5px] font-semibold">{need.title}</p>
          <dl className="mt-2 space-y-1">
            {r.criteria.map((c) => {
              const meta = CRITERIA.find((x) => x.id === c.id)!;
              const pct = (c.points / c.max) * 100;
              return (
                <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_3.2rem] items-center gap-2 text-[11px]" title={!showRates && c.redacted ? c.redacted[lang] : c.detail[lang]}>
                  <dt className="flex min-w-0 items-center gap-2">
                    <span className="w-[7.4rem] shrink-0 truncate text-muted-foreground">{meta.label[lang]}</span>
                    <span className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
                      <span className={cn('block h-full rounded-full', !c.evaluated ? 'bg-muted-foreground/40' : pct >= 80 ? 'bg-success' : pct >= 55 ? 'bg-app-terra' : 'bg-warning')} style={{ width: `${pct}%` }} />
                    </span>
                  </dt>
                  <dd className="num text-right font-medium">
                    {c.points.toLocaleString(fr ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 })}/{c.max}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
      {r.caps.length > 0 && (
        <p className="rounded-lg bg-warning-soft px-2.5 py-1.5 text-[11.5px] text-warning">
          {r.caps.map((c) => (fr ? `${c.label.fr} : plafonné à ${c.max}` : `${c.label.en}: capped at ${c.max}`)).join(' · ')}
        </p>
      )}
      <Button size="xs" variant="ghost" onClick={() => setDetails((v) => !v)} aria-expanded={details} className="-ml-2">
        {details ? <ChevronUp /> : <ChevronDown />}
        {details ? (fr ? 'Masquer le détail' : 'Hide details') : fr ? 'Détail du score, forces et écarts' : 'Score details, strengths and gaps'}
      </Button>
      {details && (
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <MatchBreakdown result={r} lang={lang} showRates={showRates} />
        </div>
      )}

      <div>
        <p className="mb-1.5 text-[12px] font-semibold">{fr ? 'Exigences du besoin' : 'Requirements'}</p>
        <div className="flex flex-wrap gap-1">
          {covered.map((s) => (
            <span key={`c-${s.name}`} className="rounded-md bg-success-soft px-1.5 py-0.5 text-[11px] font-medium text-success" title={s.evidence?.[lang]}>
              {name(s)}
              {s.status === 'equivalent' && ' ≈'}
            </span>
          ))}
          {toConfirm.map((s) => (
            <span key={`p-${s.name}`} className="rounded-md bg-warning-soft px-1.5 py-0.5 text-[11px] font-medium text-warning" title={s.evidence?.[lang]}>
              {name(s)} ?
            </span>
          ))}
          {missing.map((s) => (
            <span key={`m-${s.name}`} className="rounded-md border border-dashed border-border px-1.5 py-0.5 text-[11px] text-muted-foreground" title={fr ? 'Absente du profil' : 'Not in the profile'}>
              {name(s)}
            </span>
          ))}
          {r.skills.length === 0 && <span className="text-[11.5px] text-muted-foreground">{fr ? 'Aucune exigence renseignée.' : 'No requirement listed.'}</span>}
        </div>
        {assistant && <div className="mt-2">{assistant}</div>}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[12px] font-semibold">{fr ? 'Expériences pertinentes' : 'Relevant experience'}</p>
          <span className="num text-[11px] text-muted-foreground">{fit.relevant.length}</span>
        </div>
        {fit.relevant.length === 0 ? (
          <p className="text-[11.5px] text-muted-foreground">{fr ? 'Aucune expérience ne cite les exigences du besoin.' : 'No experience mentions the requirements.'}</p>
        ) : (
          <>
            <ul className="space-y-1.5">
              {fit.relevant.slice(0, 5).map((x) => (
                <li key={x.id} className="rounded-lg border border-border px-2.5 py-1.5 text-[11.5px]">
                  <span className="block truncate font-medium">
                    {x.client} · <span className="text-muted-foreground">{x.role}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-muted-foreground">
                    {[x.shared.length ? x.shared.join(', ') : null, x.similarRole ? (fr ? 'rôle proche' : 'similar role') : null, x.recent ? (fr ? 'récente' : 'recent') : null].filter(Boolean).join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button size="xs" variant="secondary" onClick={onRelevantFirst}>
                <ArrowUpToLine />
                {fr ? 'Pertinentes en premier' : 'Relevant first'}
              </Button>
              <Button size="xs" variant="ghost" onClick={onKeepRelevant}>
                <Filter />
                {fr ? 'Ne garder que celles-ci' : 'Keep only these'}
              </Button>
            </div>
          </>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold">
            <Hash className="h-3.5 w-3.5 text-app-terra" />
            {fr ? 'Mots-clés dans le dossier' : 'Keywords in the dossier'}
          </p>
          <span className="num text-[11px] text-muted-foreground">
            {fit.keywords.found.length}/{totalKw}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {fit.keywords.found.map((k) => (
            <span key={`f-${k}`} className="rounded-md bg-app-peach-light px-1.5 py-0.5 text-[11px] font-medium text-app-terra-dark">
              {k}
            </span>
          ))}
          {fit.keywords.missing.map((k) => (
            <span key={`x-${k}`} className="rounded-md border border-dashed border-border px-1.5 py-0.5 text-[11px] text-muted-foreground" title={fr ? 'Absent du dossier tel qu’il sera envoyé' : 'Not in the dossier as it will be sent'}>
              {k}
            </span>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
          {fr
            ? 'Compté sur le dossier tel qu’il sera envoyé : masquer une expérience peut retirer un mot-clé.'
            : 'Counted on the dossier as it will be sent: hiding an experience can remove a keyword.'}
        </p>
      </div>
    </div>
  );
}
