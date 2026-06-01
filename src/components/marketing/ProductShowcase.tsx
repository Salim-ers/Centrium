'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Users,
  Briefcase,
  TrendingUp,
  Sparkles,
  Bot,
  CheckCircle2,
  Search,
  FileText,
  ArrowUpRight,
} from 'lucide-react';

import { useGsapReveal } from '@/hooks/useGsapReveal';

const KPIS: { label: string; target: number; suffix?: string; prefix?: string; tone: string }[] = [
  { label: 'Consultants actifs', target: 87, tone: 'text-emerald-300' },
  { label: 'Missions ouvertes', target: 12, tone: 'text-violet-300' },
  { label: 'Taux d’intercontrat', target: 8, suffix: '%', tone: 'text-amber-300' },
  { label: 'CA M+1', target: 412, prefix: '', suffix: 'k €', tone: 'text-pink-300' },
];

function AnimatedNumber({
  target,
  duration = 1400,
  prefix = '',
  suffix = '',
}: {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let started = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (started) return;
        const [entry] = entries;
        if (entry?.isIntersecting) {
          started = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setValue(Math.round(target * eased));
            if (p < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {value}
      {suffix}
    </span>
  );
}

/**
 * Dashboard mocké — pas de données réelles, juste un aperçu visuel
 * de ce que voit un BM dans Centrium. Animé au scroll via GSAP.
 */
function DashboardMockup() {
  const sparklineRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!sparklineRef.current) return;
    const path = sparklineRef.current;
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          path.animate(
            [{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
            { duration: 1600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
          );
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(path);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative rounded-2xl border border-hairline bg-gradient-to-br from-card via-card to-card/60 backdrop-blur-xl shadow-[0_30px_80px_-40px_rgba(225,29,116,0.4)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-hairline bg-black/20">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <div className="ml-auto text-[10px] text-white/40 font-mono">
          centrium.app/dashboard
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/40">Bonjour,</div>
            <div className="font-display text-base font-semibold text-white">Marc, BM senior</div>
          </div>
          <div className="text-[10px] px-2 py-1 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">
            Tout va bien · 0 alerte
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
          {KPIS.map((k) => (
            <div
              key={k.label}
              className="rounded-lg border border-hairline bg-white/[0.02] p-3"
            >
              <div className="text-[9px] text-white/50 uppercase tracking-wider mb-1">
                {k.label}
              </div>
              <div className={`text-xl font-bold ${k.tone}`}>
                <AnimatedNumber target={k.target} prefix={k.prefix} suffix={k.suffix} />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-hairline bg-white/[0.02] p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest text-white/50">
              CA mensuel
            </div>
            <div className="text-[10px] text-emerald-300 inline-flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" />
              +18 %
            </div>
          </div>
          <svg viewBox="0 0 320 60" className="w-full h-12">
            <defs>
              <linearGradient id="sparkline" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <path
              ref={sparklineRef}
              d="M0,45 L40,40 L80,42 L120,30 L160,32 L200,22 L240,18 L280,12 L320,8"
              fill="none"
              stroke="url(#sparkline)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="rounded-lg border border-violet-glow/30 bg-violet-glow/[0.06] p-3 flex items-start gap-3">
          <div className="h-7 w-7 rounded-md bg-violet-glow/20 border border-violet-glow/40 flex items-center justify-center shrink-0">
            <Bot className="h-3.5 w-3.5 text-violet-200" />
          </div>
          <div className="text-[11px] leading-relaxed text-white/85">
            <span className="font-semibold text-violet-200">Suggestion IA — </span>
            3 consultants correspondent à la mission « Tech Lead React » de Capgemini.
            Score moyen <span className="text-emerald-300 font-mono">87 %</span>.
            <button className="ml-1 text-magenta hover:underline">Voir la sélection</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * CV Optimizer mocké — la moitié droite du showcase, avec animation
 * "extraction → réécriture" pour montrer le mécanisme IA.
 */
function CvOptimizerMockup() {
  return (
    <div className="relative rounded-2xl border border-hairline bg-gradient-to-br from-card to-card/40 backdrop-blur-xl shadow-[0_30px_80px_-40px_rgba(168,85,247,0.4)] overflow-hidden p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-magenta/15 border border-magenta/30 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-magenta animate-pulse" />
        </div>
        <div>
          <div className="font-display text-sm font-semibold text-white">CV Optimizer</div>
          <div className="text-[10px] text-white/50">en train d’aligner sur l’offre…</div>
        </div>
      </div>

      <div className="space-y-2.5">
        {[
          {
            label: 'React.js (8 ans)',
            confidence: 96,
            status: 'matched',
          },
          {
            label: 'TypeScript strict',
            confidence: 91,
            status: 'matched',
          },
          {
            label: 'Architecture micro-frontends',
            confidence: 78,
            status: 'rephrased',
          },
          {
            label: 'Lead technique (4 personnes)',
            confidence: 88,
            status: 'highlighted',
          },
        ].map((row, i) => (
          <div
            key={row.label}
            className="rounded-md border border-hairline bg-white/[0.02] p-2.5 animate-in slide-in-from-right-2 fade-in"
            style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                <span className="text-xs text-white/85">{row.label}</span>
              </div>
              <div className="text-[10px] font-mono text-white/50">
                {row.confidence}%
              </div>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 via-magenta to-violet-glow rounded-full"
                style={{ width: `${row.confidence}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-md border border-emerald-400/30 bg-emerald-400/[0.07] p-2.5 text-[11px] text-emerald-200">
        <span className="font-semibold">CV prêt</span> · 4 sections optimisées,
        0 invention détectée, conforme contraintes Centrium.
      </div>
    </div>
  );
}

/**
 * Section principale d'aperçu produit.
 * Reveal au scroll via le hook GSAP partagé.
 */
export function ProductShowcase() {
  const ref = useGsapReveal<HTMLDivElement>();

  return (
    <section
      id="preview"
      ref={ref}
      className="qc-section-divider relative py-16 overflow-hidden"
    >
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14" data-reveal>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-magenta/30 bg-magenta/10 text-xs font-medium text-magenta mb-4">
            <Sparkles className="h-3 w-3" />
            Aperçu produit
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            La salle de pilotage de votre ESN.
          </h2>
          <p className="mt-4 text-white/65 text-lg leading-relaxed">
            Toute votre activité — consultants, missions, intercontrat, CA —
            visible en 3 secondes. L’IA travaille en arrière-plan, vous décidez.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-3" data-reveal>
            <DashboardMockup />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div data-reveal>
              <CvOptimizerMockup />
            </div>
            <div
              data-reveal
              className="rounded-2xl border border-hairline bg-white/[0.02] p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-lg bg-violet-glow/15 border border-violet-glow/30 flex items-center justify-center">
                  <Search className="h-4 w-4 text-violet-300" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">Matching consultant ↔ mission</div>
                  <div className="text-[10px] text-white/50">scoring multi-critères</div>
                </div>
              </div>
              <p className="text-xs text-white/65 leading-relaxed">
                Le matching combine compétences déclarées, expériences extraites,
                disponibilité et TJM cible — avec un niveau de confiance affiché et
                des justifications cliquables. Jamais d’invention.
              </p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {[
            { icon: Users, label: 'Annuaire consultants', desc: 'Bibliothèque interne + freelances + portage.' },
            { icon: Briefcase, label: 'Pipeline AO', desc: 'CRM commercial, opportunités, ROI par client.' },
            { icon: FileText, label: 'Templates CV', desc: '3 variantes brandées, export PDF/DOCX.' },
            { icon: TrendingUp, label: 'Reporting', desc: 'TJM, marge, intercontrat, CA prévisionnel.' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                data-reveal
                className="group rounded-xl border border-hairline bg-white/[0.02] p-5 hover:border-magenta/40 hover:bg-white/[0.04] transition"
              >
                <div className="h-9 w-9 rounded-lg bg-magenta/15 border border-magenta/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Icon className="h-4 w-4 text-magenta" />
                </div>
                <div className="font-semibold text-sm text-white">{item.label}</div>
                <p className="text-xs text-white/60 mt-1.5 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
