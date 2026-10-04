'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Upload,
  Search,
  FileSignature,
  CheckCircle2,
  ArrowRight,
  Pause,
  Play,
} from 'lucide-react';

import { useGsapReveal } from '@/hooks/useGsapReveal';
import { useLandingDict } from '@/components/marketing/MarketingShell';

/**
 * Section "Démos vivantes" — 3 cartes stables qui défilent étape par
 * étape (4 étapes chacune).
 *
 * Améliorations vs v1 :
 *   - Cadres extérieurs FIXES (h-full, position des éléments stables,
 *     pas de re-layout qui fait sauter le contenu)
 *   - Cross-fade entre étapes (opacity, pas de slide-in chaotique)
 *   - Dots CLIQUABLES en haut → pilotage manuel à n'importe quelle
 *     étape
 *   - Bouton play/pause discret en bas-droite
 *   - Auto-cycle ralenti à 3.5 s
 *   - Pause au hover automatique
 *   - Reset du timer quand on clique sur un dot
 */

export function LiveDemos() {
  const ref = useGsapReveal<HTMLDivElement>();
  const { t } = useLandingDict();

  return (
    <section
      id="demos"
      ref={ref}
      className="qc-section-divider relative py-20"
    >
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16" data-reveal>
          <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-primary mb-3">
            {t.liveDemos.kicker}
          </div>
          <h2 className="font-display font-light tracking-[-0.03em] leading-[1] text-[clamp(2rem,4vw,3.2rem)] text-foreground">
            {t.liveDemos.titleA}{' '}
            <span className="text-primary font-display ">{t.liveDemos.titleB}</span>
          </h2>
          <p className="mt-5 mx-auto max-w-xl text-muted-foreground text-[15px] leading-relaxed">
            {t.liveDemos.sub}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div data-reveal>
            <DemoCvOptimizer />
          </div>
          <div data-reveal>
            <DemoMatching />
          </div>
          <div data-reveal>
            <DemoCraInvoice />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Hook qui cycle un index 0..n-1 toutes les `every` ms.
 * - Pause externe via `paused`
 * - Set manuel via `setIndex` (réinitialise le timer)
 */
function useCycle(n: number, every = 3500, paused = false) {
  const [i, setI] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const stop = useCallback(() => {
    if (timer.current !== undefined) {
      window.clearInterval(timer.current);
      timer.current = undefined;
    }
  }, []);
  const start = useCallback(() => {
    stop();
    timer.current = window.setInterval(() => {
      setI((v) => (v + 1) % n);
    }, every);
  }, [n, every, stop]);

  useEffect(() => {
    if (paused) {
      stop();
    } else {
      start();
    }
    return stop;
  }, [paused, start, stop]);

  const setIndex = useCallback(
    (idx: number) => {
      setI(idx);
      // Reset timer pour ne pas avancer juste après le clic
      if (!paused) start();
    },
    [paused, start],
  );

  return { i, setIndex };
}

/**
 * Frame partagé : cadre stable avec en-tête + dots cliquables +
 * pause/play, et zone de contenu cross-faded.
 */
function DemoFrame({
  subtitle,
  title,
  step,
  totalSteps,
  onStep,
  paused,
  onTogglePause,
  onPointerEnter,
  onPointerLeave,
  children,
}: {
  subtitle: string;
  title: string;
  step: number;
  totalSteps: number;
  onStep: (i: number) => void;
  paused: boolean;
  onTogglePause: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  children: React.ReactNode;
}) {
  const { t } = useLandingDict();
  return (
    <div
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className="qc-luminous-static relative rounded-3xl border border-border bg-gradient-to-br from-transparent to-transparent p-6 overflow-hidden h-full flex flex-col"
    >
      <div
        aria-hidden
        className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-primary/20 blur-3xl hidden"
      />
      <div className="relative flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-5 gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-2">
              {subtitle}
            </div>
            <div className="text-primary font-display text-[22px] leading-tight">
              {title}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div role="tablist" aria-label={t.liveDemos.aria.steps} className="flex gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => {
                const active = i === step;
                return (
                  <button
                    key={i}
                    role="tab"
                    aria-selected={active}
                    aria-label={t.liveDemos.aria.stepOf(i, totalSteps)}
                    onClick={() => onStep(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      active
                        ? 'w-6 bg-primary'
                        : 'w-2.5 bg-muted hover:bg-muted'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Zone de contenu — hauteur min fixe pour que le cadre ne saute pas */}
        <div className="relative flex-1 min-h-[260px]">{children}</div>

        {/* Bouton play/pause en bas-droite */}
        <div className="mt-3 flex items-center justify-end">
          <button
            type="button"
            onClick={onTogglePause}
            aria-label={paused ? t.liveDemos.aria.resume : t.liveDemos.aria.pause}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-card hover:bg-muted text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition"
          >
            {paused ? (
              <>
                <Play className="h-3 w-3" />
                {t.liveDemos.cta.resume}
              </>
            ) : (
              <>
                <Pause className="h-3 w-3" />
                {t.liveDemos.cta.pause}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Helper pour fade entre étapes — chaque enfant est visible si step matche */
function Step({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden={!active}
      className="absolute inset-0 transition-opacity duration-500"
      style={{ opacity: active ? 1 : 0, pointerEvents: active ? 'auto' : 'none' }}
    >
      {children}
    </div>
  );
}

function DemoCvOptimizer() {
  const { t } = useLandingDict();
  const [hovering, setHovering] = useState(false);
  const [forcedPause, setForcedPause] = useState(false);
  const { i: step, setIndex } = useCycle(4, 3500, hovering || forcedPause);

  const skills = [
    { name: 'React.js', score: 96 },
    { name: 'TypeScript strict', score: 91 },
    { name: 'Micro-frontends', score: 78 },
    { name: 'Lead 4 pers.', score: 88 },
  ];

  return (
    <DemoFrame
      subtitle="CV OPTIMIZER"
      title={t.liveDemos.cvDraft.title}
      step={step}
      totalSteps={4}
      onStep={setIndex}
      paused={forcedPause}
      onTogglePause={() => setForcedPause((v) => !v)}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
    >
      {/* Step 0 : Upload */}
      <Step active={step === 0}>
        <div className="border-2 border-dashed border-border rounded-xl py-12 text-center text-muted-foreground text-[13px] h-full flex flex-col items-center justify-center">
          <Upload className="h-7 w-7 mb-3 text-primary" />
          cv-jean-dupont.pdf
          <div className="text-[10px] mt-2 text-muted-foreground">{t.liveDemos.cvDraft.dropAccepted}</div>
        </div>
      </Step>

      {/* Step 1-3 : Skills affichées progressivement */}
      {[1, 2, 3].map((s) => (
        <Step key={s} active={step === s}>
          <div className="space-y-2 h-full">
            {skills.slice(0, s + 1).map((skill) => (
              <div
                key={skill.name}
                className="rounded-lg border border-border bg-card p-2.5"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    {skill.name}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {skill.score}%
                  </div>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary rounded-full transition-all duration-700"
                    style={{ width: `${skill.score}%` }}
                  />
                </div>
              </div>
            ))}
            {s === 3 && (
              <div className="mt-3 rounded-lg border border-success/30 bg-success/[0.08] p-3 text-[11px] text-success flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                <span>
                  <strong>{t.liveDemos.cvDraft.cvReady}</strong> · {t.liveDemos.cvDraft.noInvention} · confiance{' '}
                  <span className="font-mono">89 %</span>
                </span>
              </div>
            )}
          </div>
        </Step>
      ))}
    </DemoFrame>
  );
}

function DemoMatching() {
  const { t } = useLandingDict();
  const [hovering, setHovering] = useState(false);
  const [forcedPause, setForcedPause] = useState(false);
  const { i: step, setIndex } = useCycle(4, 3500, hovering || forcedPause);

  const matches = [
    { initials: 'M.B.', role: 'Tech Lead React', score: 92, color: 'text-success' },
    { initials: 'A.D.', role: 'Senior Frontend', score: 87, color: 'text-primary' },
    { initials: 'J.R.', role: 'Full-stack', score: 81, color: 'text-primary' },
  ];

  return (
    <DemoFrame
      subtitle="MATCHING IA"
      title={t.liveDemos.matching.title}
      step={step}
      totalSteps={4}
      onStep={setIndex}
      paused={forcedPause}
      onTogglePause={() => setForcedPause((v) => !v)}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
    >
      {/* Step 0 : brief de la mission */}
      <Step active={step === 0}>
        <div className="rounded-lg border border-border bg-card p-4 h-full flex flex-col justify-center">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
            <Search className="h-3 w-3 text-primary" />
            {t.liveDemos.matching.mission}
          </div>
          <div className="text-[14px] text-foreground font-medium">
            {t.liveDemos.matching.profile}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
            {['React', 'TypeScript', 'Lead', 'Micro-FE'].map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </Step>

      {/* Step 1-3 : profils s'affichent */}
      {[1, 2, 3].map((s) => (
        <Step key={s} active={step === s}>
          <div className="space-y-2 h-full">
            {matches.slice(0, s).map((m) => (
              <div
                key={m.initials}
                className="rounded-lg border border-border bg-card p-2.5 flex items-center gap-3"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/20 border border-border flex items-center justify-center text-[11px] font-mono text-foreground shrink-0">
                  {m.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-foreground font-medium truncate">
                    {m.role}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {t.liveDemos.matching.available}
                  </div>
                </div>
                <div className={`text-lg font-display font-medium ${m.color}`}>
                  {m.score}
                </div>
              </div>
            ))}
          </div>
        </Step>
      ))}
    </DemoFrame>
  );
}

function DemoCraInvoice() {
  const { t } = useLandingDict();
  const [hovering, setHovering] = useState(false);
  const [forcedPause, setForcedPause] = useState(false);
  const { i: step, setIndex } = useCycle(4, 3500, hovering || forcedPause);

  // Tous les jours sont affichés en permanence, "validés" selon step
  const totalDays = 20;
  const validatedDays = (step + 1) * 5; // 5, 10, 15, 20

  return (
    <DemoFrame
      subtitle="CRA → FACTURE"
      title={t.liveDemos.cra.title}
      step={step}
      totalSteps={4}
      onStep={setIndex}
      paused={forcedPause}
      onTogglePause={() => setForcedPause((v) => !v)}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
    >
      {/* Contenu STABLE — toujours affiché, juste l'état change selon step */}
      <div className="space-y-3 h-full flex flex-col">
        {/* Calendrier CRA — visible en permanence */}
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t.liveDemos.cra.craMonth}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              {Math.min(totalDays, validatedDays)}/{totalDays} j
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: totalDays }).map((_, i) => {
              const validated = i < validatedDays;
              return (
                <span
                  key={i}
                  className={`h-5 rounded-sm transition-all duration-500 ${
                    validated
                      ? 'bg-gradient-to-br from-primary to-primary'
                      : 'bg-card'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Facture — apparaît step 2+ */}
        <div
          className="rounded-lg border border-border bg-card p-3 transition-opacity duration-500"
          style={{ opacity: step >= 2 ? 1 : 0.25 }}
        >
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
            <FileSignature className="h-3 w-3 text-primary" />
            {t.liveDemos.cra.invoiceGenerated}
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">{t.liveDemos.cra.ref}</div>
          <div className="mt-1 font-display text-xl text-foreground">{t.liveDemos.cra.amount}</div>
        </div>

        {/* Envoyé — apparaît step 3 */}
        <div
          className="rounded-lg border border-success/30 bg-success/[0.08] p-2.5 text-[11px] text-success flex items-center gap-2 transition-opacity duration-500"
          style={{ opacity: step >= 3 ? 1 : 0 }}
        >
          <ArrowRight className="h-3.5 w-3.5" />
          {t.liveDemos.cra.sentTo}
        </div>
      </div>
    </DemoFrame>
  );
}
