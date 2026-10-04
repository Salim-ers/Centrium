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
import { useLocale } from '@/lib/i18n/LocaleProvider';

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
  const { t } = useLocale();
  const sparklineRef = useRef<SVGPathElement>(null);

  const KPIS: { label: string; target: number; suffix?: string; prefix?: string; tone: string }[] = [
    { label: t.productShowcase.dashboard.activeConsultants, target: 87, tone: 'text-success' },
    { label: t.productShowcase.dashboard.openMissions, target: 12, tone: 'text-primary' },
    { label: t.productShowcase.dashboard.benchRate, target: 8, suffix: '%', tone: 'text-warning' },
    { label: t.productShowcase.dashboard.revenueNext, target: 412, prefix: '', suffix: 'k €', tone: 'text-primary' },
  ];

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
    <div className="relative rounded-2xl border border-hairline bg-gradient-to-br from-card via-card to-card/60 shadow-[0_30px_80px_-40px_rgba(225,29,116,0.4)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-hairline bg-foreground/20">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        </div>
        <div className="ml-auto text-[10px] text-muted-foreground font-mono">
          centrium.app/dashboard
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.productShowcase.dashboard.hello}</div>
            <div className="font-display text-base font-semibold text-foreground">{t.productShowcase.dashboard.role}</div>
          </div>
          <div className="text-[10px] px-2 py-1 rounded-full bg-success/15 text-success border border-success/30">
            {t.productShowcase.dashboard.ok}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
          {KPIS.map((k) => (
            <div
              key={k.label}
              className="rounded-lg border border-hairline bg-card p-3"
            >
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
                {k.label}
              </div>
              <div className={`text-xl font-bold ${k.tone}`}>
                <AnimatedNumber target={k.target} prefix={k.prefix} suffix={k.suffix} />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-hairline bg-card p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {t.productShowcase.dashboard.revenue}
            </div>
            <div className="text-[10px] text-success inline-flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" />
              {t.productShowcase.dashboard.growth}
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

        <div className="rounded-lg border border-primary/30 bg-primary/[0.06] p-3 flex items-start gap-3">
          <div className="h-7 w-7 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-[11px] leading-relaxed text-foreground">
            <span className="font-semibold text-primary">{t.productShowcase.dashboard.aiSuggestion} </span>
            {t.productShowcase.dashboard.aiSuggestionBody}{' '}
            Score moyen <span className="text-success font-mono">87 %</span>.
            <button className="ml-1 text-primary hover:underline">{t.productShowcase.dashboard.seeSelection}</button>
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
  const { t } = useLocale();
  return (
    <div className="relative rounded-2xl border border-hairline bg-gradient-to-br from-card to-card/40 shadow-[0_30px_80px_-40px_rgba(168,85,247,0.4)] overflow-hidden p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        </div>
        <div>
          <div className="font-display text-sm font-semibold text-foreground">{t.productShowcase.cvOptimizer.label}</div>
          <div className="text-[10px] text-muted-foreground">{t.productShowcase.cvOptimizer.aligning}</div>
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
            className="rounded-md border border-hairline bg-card p-2.5 animate-in slide-in-from-right-2 fade-in"
            style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                <span className="text-xs text-foreground">{row.label}</span>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                {row.confidence}%
              </div>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary via-primary to-primary rounded-full"
                style={{ width: `${row.confidence}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-md border border-success/30 bg-success/[0.07] p-2.5 text-[11px] text-success">
        <span className="font-semibold">{t.productShowcase.cvOptimizer.ready}</span> · {t.productShowcase.cvOptimizer.readyDesc}
      </div>
    </div>
  );
}

/**
 * Section principale d'aperçu produit.
 * Reveal au scroll via le hook GSAP partagé.
 */
export function ProductShowcase() {
  const { t } = useLocale();
  const ref = useGsapReveal<HTMLDivElement>();

  const gridItems = [
    { icon: Users, label: t.productShowcase.grid.directory.t, desc: t.productShowcase.grid.directory.d },
    { icon: Briefcase, label: t.productShowcase.grid.pipeline.t, desc: t.productShowcase.grid.pipeline.d },
    { icon: FileText, label: t.productShowcase.grid.cv.t, desc: t.productShowcase.grid.cv.d },
    { icon: TrendingUp, label: t.productShowcase.grid.reporting.t, desc: t.productShowcase.grid.reporting.d },
  ];

  return (
    <section
      id="preview"
      ref={ref}
      className="qc-section-divider relative py-16 overflow-hidden"
    >
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14" data-reveal>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-xs font-medium text-primary mb-4">
            <Sparkles className="h-3 w-3" />
            {t.productShowcase.eyebrow}
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            {t.productShowcase.titleA} {t.productShowcase.titleB}
          </h2>
          <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
            {t.productShowcase.sub}
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6 items-center">
          <div className="lg:col-span-3" data-reveal>
            <DashboardMockup />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div data-reveal>
              <CvOptimizerMockup />
            </div>
            <div
              data-reveal
              className="rounded-2xl border border-hairline bg-card p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Search className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{t.productShowcase.matching.title}</div>
                  <div className="text-[10px] text-muted-foreground">{t.productShowcase.matching.sub}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t.productShowcase.matching.desc}
              </p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {gridItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                data-reveal
                className="group rounded-xl border border-hairline bg-card p-5 hover:border-primary/40 hover:bg-muted transition"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="font-semibold text-sm text-foreground">{item.label}</div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
