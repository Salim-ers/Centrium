'use client';

import { useEffect, useState } from 'react';
import {
  Sparkles,
  Upload,
  Search,
  FileSignature,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

import { useGsapReveal } from '@/hooks/useGsapReveal';

/**
 * Section "Démos vivantes" — 3 mini-démos animées qui montrent un
 * usage concret de Centrium en une boucle de 4-5 secondes. Chaque
 * démo a sa propre animation interne qui se relance toutes les 6 s.
 *
 *   1. CV Optimizer : upload → extraction skills → score
 *   2. Matching : 3 profils qui apparaissent avec score
 *   3. CRA → Facture : calendrier validé → facture générée
 */

export function LiveDemos() {
  const ref = useGsapReveal<HTMLDivElement>();

  return (
    <section
      id="demos"
      ref={ref}
      className="relative py-28 border-t border-white/5"
    >
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16" data-reveal>
          <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-3">
            Démos vivantes
          </div>
          <h2 className="font-display font-light tracking-[-0.03em] leading-[1] text-[clamp(2rem,4vw,3.2rem)] text-white">
            Trois usages,{' '}
            <span className="font-editorial italic">en direct.</span>
          </h2>
          <p className="mt-5 mx-auto max-w-xl text-white/55 text-[15px] leading-relaxed">
            Pas de slides, pas de promesses. Centrium tourne. Voyez par
            vous-même.
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

function DemoFrame({
  title,
  subtitle,
  step,
  totalSteps,
  children,
}: {
  title: string;
  subtitle: string;
  step: number;
  totalSteps: number;
  children: React.ReactNode;
}) {
  return (
    <div className="qc-luminous-static relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-md p-6 overflow-hidden h-full flex flex-col">
      {/* halo radial subtil au coin */}
      <div
        aria-hidden
        className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-magenta/20 blur-3xl"
      />
      <div className="relative flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.25em] uppercase text-white/40 mb-2">
              {subtitle}
            </div>
            <div className="font-editorial italic text-[22px] text-white leading-tight">
              {title}
            </div>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`h-1 w-3 rounded-full transition-all duration-500 ${
                  i === step ? 'bg-magenta w-5' : 'bg-white/15'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

/** Hook qui cycle un index entre 0 et n toutes les `every` ms */
function useCycle(n: number, every = 1800) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const it = setInterval(() => setI((v) => (v + 1) % n), every);
    return () => clearInterval(it);
  }, [n, every]);
  return i;
}

function DemoCvOptimizer() {
  const step = useCycle(4, 1600);
  const skills = [
    { name: 'React.js', score: 96 },
    { name: 'TypeScript strict', score: 91 },
    { name: 'Micro-frontends', score: 78 },
    { name: 'Lead 4 pers.', score: 88 },
  ];
  return (
    <DemoFrame
      subtitle="CV OPTIMIZER"
      title="Du brouillon au CV brandé."
      step={step}
      totalSteps={4}
    >
      <div className="space-y-3">
        {step === 0 && (
          <div className="border-2 border-dashed border-white/15 rounded-xl py-10 text-center text-white/45 text-[13px] animate-in fade-in">
            <Upload className="h-6 w-6 mx-auto mb-2 text-magenta/70" />
            cv-jean-dupont.pdf
          </div>
        )}
        {step >= 1 && (
          <div className="space-y-2">
            {skills.slice(0, step).map((s, i) => (
              <div
                key={s.name}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5 animate-in slide-in-from-left-2 fade-in"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-xs text-white/80">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                    {s.name}
                  </div>
                  <div className="text-[10px] font-mono text-white/50">{s.score}%</div>
                </div>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-violet-glow rounded-full"
                    style={{ width: `${s.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        {step === 3 && (
          <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/[0.08] p-3 text-[11px] text-emerald-200 flex items-center gap-2 animate-in fade-in zoom-in-95">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              <strong>CV prêt</strong> · 0 invention · confiance{' '}
              <span className="font-mono">89 %</span>
            </span>
          </div>
        )}
      </div>
    </DemoFrame>
  );
}

function DemoMatching() {
  const step = useCycle(4, 1600);
  const matches = [
    { initials: 'M.B.', role: 'Tech Lead React', score: 92, color: 'text-emerald-300' },
    { initials: 'A.D.', role: 'Senior Frontend', score: 87, color: 'text-magenta' },
    { initials: 'J.R.', role: 'Full-stack', score: 81, color: 'text-violet-300' },
  ];
  return (
    <DemoFrame
      subtitle="MATCHING IA"
      title="Les bons profils. Tout de suite."
      step={step}
      totalSteps={4}
    >
      <div className="space-y-3">
        {step === 0 && (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40 mb-1.5">
              <Search className="h-3 w-3 text-magenta" />
              Mission Capgemini
            </div>
            <div className="text-[13px] text-white font-medium">
              Tech Lead React · Paris · TJM 650 €
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
              {['React', 'TypeScript', 'Lead', 'Micro-FE'].map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full bg-magenta/15 text-magenta border border-magenta/30"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        {step >= 1 && (
          <div className="space-y-2">
            {matches.slice(0, step).map((m, i) => (
              <div
                key={m.initials}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5 flex items-center gap-3 animate-in slide-in-from-right-2 fade-in"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500/30 to-violet-500/20 border border-white/15 flex items-center justify-center text-[10px] font-mono text-white/90 shrink-0">
                  {m.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-white font-medium truncate">{m.role}</div>
                  <div className="text-[10px] text-white/45">Disponible sous 7j</div>
                </div>
                <div className={`text-base font-display font-medium ${m.color}`}>
                  {m.score}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DemoFrame>
  );
}

function DemoCraInvoice() {
  const step = useCycle(4, 1600);
  return (
    <DemoFrame
      subtitle="CRA → FACTURE"
      title="Le temps devient cash."
      step={step}
      totalSteps={4}
    >
      <div className="space-y-3">
        {/* Mini calendrier toujours visible, jours qui se valident progressivement */}
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              CRA · mai 2026
            </div>
            <div className="text-[10px] text-white/50">
              {Math.min(20, 5 * (step + 1))}/20 j
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 20 }).map((_, i) => {
              const validated = i < 5 * (step + 1);
              return (
                <span
                  key={i}
                  className={`h-5 rounded-sm transition-all duration-300 ${
                    validated
                      ? 'bg-gradient-to-br from-magenta to-violet-glow'
                      : 'bg-white/[0.04]'
                  }`}
                />
              );
            })}
          </div>
        </div>
        {step >= 2 && (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40 mb-1.5">
              <FileSignature className="h-3 w-3 text-magenta" />
              Facture générée
            </div>
            <div className="font-mono text-[11px] text-white/75">FAC-2026-0048</div>
            <div className="mt-1 font-display text-xl text-white">13 000 €</div>
          </div>
        )}
        {step === 3 && (
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/[0.08] p-2.5 text-[11px] text-emerald-200 flex items-center gap-2 animate-in fade-in zoom-in-95">
            <ArrowRight className="h-3.5 w-3.5" />
            Envoyée à Capgemini · échéance 30 j
          </div>
        )}
      </div>
    </DemoFrame>
  );
}
