'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { animate, motion, useInView, useReducedMotion as useReducedMotionRaw, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Préférence « mouvement réduit », appliquée après l'hydratation : le
 * premier rendu client reste identique au rendu serveur (qui ne connaît
 * pas la préférence), sans erreur d'hydratation. Les fondus restants sont
 * neutralisés par <MotionConfig reducedMotion="user"> (layout du site).
 */
export function useReducedMotion(): boolean {
  const reduce = useReducedMotionRaw();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!reduce;
}

// ── Sections et séquences de couleurs ───────────────────────────────────
/**
 * Fond de section. `nav` indique au header la couleur à adopter quand la
 * section passe sous lui (clair sur fond terracotta / charbon).
 */
export type SectionTone = 'ivory' | 'warm' | 'dune' | 'peach' | 'light' | 'terra' | 'deep' | 'dark' | 'charcoal' | 'ink';

const TONES: Record<SectionTone, { bg: string; text: string; nav: 'light' | 'dark' }> = {
  ivory: { bg: 'bg-ivory', text: 'text-ink', nav: 'dark' },
  warm: { bg: 'bg-warm', text: 'text-ink', nav: 'dark' },
  dune: { bg: 'bg-dune', text: 'text-ink', nav: 'dark' },
  peach: { bg: 'bg-terra-peach', text: 'text-ink', nav: 'dark' },
  light: { bg: 'bg-terra-light', text: 'text-ink', nav: 'dark' },
  terra: { bg: 'bg-terra', text: 'text-ivory', nav: 'light' },
  deep: { bg: 'bg-terra-deep', text: 'text-ivory', nav: 'light' },
  dark: { bg: 'bg-terra-dark', text: 'text-ivory', nav: 'light' },
  charcoal: { bg: 'bg-ink-soft', text: 'text-ivory', nav: 'light' },
  ink: { bg: 'bg-ink', text: 'text-ivory', nav: 'light' },
};

export function isDarkTone(tone: SectionTone) {
  return TONES[tone].nav === 'light';
}

export function Section({
  tone,
  id,
  className,
  children,
  'aria-label': ariaLabel,
}: {
  tone: SectionTone;
  id?: string;
  className?: string;
  children: React.ReactNode;
  'aria-label'?: string;
}) {
  return (
    <section id={id} data-nav={TONES[tone].nav} aria-label={ariaLabel} className={cn('relative', TONES[tone].bg, TONES[tone].text, className)}>
      {children}
    </section>
  );
}

/** Conteneur large : l'espace des grands écrans est réellement utilisé. */
export function Wide({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-12 2xl:px-16', className)}>{children}</div>;
}

/** Repère de section : numéro + libellé, en capitales espacées. */
export function Kicker({ n, children, className }: { n?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.22em] opacity-80', className)}>
      {n && <span className="tabular-nums">{n}</span>}
      {n && <span className="h-px w-8 bg-current opacity-50" aria-hidden />}
      <span>{children}</span>
    </div>
  );
}

// ── Titres éditoriaux ───────────────────────────────────────────────────
/** Ligne de titre : texte sans-serif, morceaux `{ em }` en Instrument Serif italique. */
export type TitlePart = string | { em: string };
export type TitleLine = TitlePart[];

// Taille et rythme séparés : une taille passée en className remplace la
// taille par défaut, sans que tailwind-merge n'efface l'interlignage.
const SIZES = {
  hero: { text: 'text-[clamp(3.1rem,9vw,11rem)]', rhythm: 'leading-[0.88] tracking-[-0.055em]' },
  xl: { text: 'text-[clamp(2.6rem,7vw,8.5rem)]', rhythm: 'leading-[0.9] tracking-[-0.05em]' },
  lg: { text: 'text-[clamp(2.2rem,5vw,5.6rem)]', rhythm: 'leading-[0.95] tracking-[-0.045em]' },
  md: { text: 'text-[clamp(1.8rem,3.4vw,3.4rem)]', rhythm: 'leading-[1] tracking-[-0.035em]' },
} as const;

function Parts({ line }: { line: TitleLine }) {
  return (
    <>
      {line.map((p, i) =>
        typeof p === 'string' ? (
          <span key={i}>{p}</span>
        ) : (
          <em key={i} className="font-editorial font-normal normal-case italic tracking-[-0.02em]">
            {p.em}
          </em>
        ),
      )}
    </>
  );
}

/**
 * Titre monumental révélé ligne par ligne (masque + translation). Sans
 * animation si l'utilisateur réduit les mouvements.
 */
export function Title({
  lines,
  size = 'lg',
  as = 'h2',
  className,
  upper = true,
  delay = 0,
  immediate = false,
}: {
  lines: TitleLine[];
  size?: keyof typeof SIZES;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  upper?: boolean;
  delay?: number;
  /**
   * Titre de haut de page : révélé au chargement, en CSS (classes
   * `.hero-line`), pour ne pas attendre l'hydratation — c'est souvent
   * l'élément LCP.
   */
  immediate?: boolean;
}) {
  const reduce = useReducedMotion();
  const Tag = as;
  const base = cn('font-sans font-extrabold', SIZES[size].text, upper && 'uppercase', className, SIZES[size].rhythm);
  if (immediate) {
    return (
      <Tag className={base}>
        {lines.map((line, i) => (
          <span key={i} className="hero-line">
            <span style={{ ['--i' as string]: i + delay * 10 }}>
              <Parts line={line} />
            </span>
          </span>
        ))}
      </Tag>
    );
  }
  // Le déclencheur « dans la vue » est porté par le masque de chaque ligne :
  // le texte, translaté sous son masque (overflow hidden), est entièrement
  // rogné et ne serait jamais vu par l'IntersectionObserver.
  return (
    <Tag className={base}>
      {lines.map((line, i) =>
        reduce ? (
          <span key={i} className="-mt-[0.14em] block overflow-hidden pb-[0.08em] pt-[0.14em]">
            <span className="block">
              <Parts line={line} />
            </span>
          </span>
        ) : (
          <motion.span key={i} className="-mt-[0.14em] block overflow-hidden pb-[0.08em] pt-[0.14em]" initial="hidden" whileInView="shown" viewport={{ once: true, margin: '-8% 0px' }}>
            <motion.span
              className="block"
              variants={{ hidden: { y: '105%' }, shown: { y: '0%', transition: { duration: 0.9, delay: delay + i * 0.09, ease: EASE } } }}
            >
              <Parts line={line} />
            </motion.span>
          </motion.span>
        ),
      )}
    </Tag>
  );
}

/** Paragraphe d'accompagnement, apparition douce. */
export function Lead({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.p
      className={cn('max-w-xl text-[17px] leading-[1.55] opacity-80 md:text-[19px]', className)}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.p>
  );
}

/** Apparition générique au scroll. */
export function Appear({ children, className, delay = 0, y = 18 }: { children: React.ReactNode; className?: string; delay?: number; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

// ── Boutons ─────────────────────────────────────────────────────────────
type CtaVariant = 'terra' | 'ink' | 'ivory' | 'outline-dark' | 'outline-light';
const CTA: Record<CtaVariant, { button: string; icon: string }> = {
  terra: { button: 'bg-terra text-white hover:bg-terra-deep', icon: 'bg-white/15' },
  ink: { button: 'bg-ink text-ivory hover:bg-ink-soft', icon: 'bg-white/10' },
  ivory: { button: 'bg-ivory text-ink hover:bg-white', icon: 'bg-ink/[0.07]' },
  'outline-dark': { button: 'border border-ink/20 text-ink hover:border-ink hover:bg-ink hover:text-ivory', icon: 'bg-ink/[0.06] group-hover:bg-white/10' },
  'outline-light': { button: 'border border-ivory/30 text-ivory hover:border-ivory hover:bg-ivory hover:text-ink', icon: 'bg-ivory/10 group-hover:bg-ink/[0.07]' },
};

export function Cta({ href, children, variant = 'terra', className, cursor = 'Ouvrir' }: { href: string; children: React.ReactNode; variant?: CtaVariant; className?: string; cursor?: string }) {
  return (
    <Link
      href={href}
      data-cursor={cursor}
      className={cn(
        'group inline-flex h-12 items-center gap-3 rounded-full pl-6 pr-2 text-[13px] font-semibold uppercase tracking-[0.12em] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra focus-visible:ring-offset-2',
        CTA[variant].button,
        className,
      )}
    >
      {children}
      <span className={cn('flex h-8 w-8 items-center justify-center rounded-full transition-[transform,background-color] duration-300 group-hover:translate-x-0.5', CTA[variant].icon)}>
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

/** Lien texte souligné, avec flèche. */
export function TextLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} data-cursor="Ouvrir" className={cn('group inline-flex items-center gap-2 text-[14px] font-semibold uppercase tracking-[0.12em]', className)}>
      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-500 group-hover:bg-[length:100%_1px]">{children}</span>
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}

// ── Photographie : révélation par masque ────────────────────────────────
/**
 * Image révélée par un masque qui s'ouvre au scroll (clip-path), avec un
 * très léger parallaxe. Statique en mouvement réduit.
 */
export function MaskImage({
  src,
  alt,
  className,
  sizes = '100vw',
  priority = false,
  caption,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  caption?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const inset = useTransform(scrollYProgress, [0, 0.35], ['inset(18% 12% 18% 12% round 28px)', 'inset(0% 0% 0% 0% round 0px)']);
  const y = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);
  const image = <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />;
  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)} data-cursor="Voir">
      {reduce ? (
        <div className="absolute inset-0">{image}</div>
      ) : (
        <motion.div className="absolute inset-0" style={{ clipPath: inset }}>
          <motion.div className="absolute inset-[-8%]" style={{ y }}>
            {image}
          </motion.div>
        </motion.div>
      )}
      {caption}
    </div>
  );
}

// ── Signature : la ligne du cycle d'une mission ─────────────────────────
export const CYCLE = ['Prospect', 'Opportunité', 'Mission', 'CRA', 'Marge'] as const;

/**
 * Ligne terracotta qui traverse la section et représente le cycle
 * Prospect → Opportunité → Mission → CRA → Marge. `active` allume les
 * étapes atteintes ; sans `active`, la ligne se dessine au scroll.
 */
export function FlowLine({
  active,
  orientation = 'horizontal',
  className,
  light = false,
  steps = CYCLE,
}: {
  active?: number;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  light?: boolean;
  /** Libellés des cinq étapes (traduction). */
  steps?: readonly string[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 40%'] });
  const scale = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const vertical = orientation === 'vertical';
  const lineColor = light ? 'bg-ivory' : 'bg-terra';
  return (
    <div ref={ref} className={cn('relative', vertical ? 'flex h-full flex-col justify-between py-1' : 'flex items-center justify-between', className)} aria-hidden>
      <span className={cn('absolute opacity-20', lineColor, vertical ? 'bottom-0 left-[5px] top-0 w-px' : 'left-0 right-0 top-[5px] h-px')} />
      {active != null || reduce ? (
        <motion.span
          className={cn('absolute', lineColor, vertical ? 'left-[5px] top-0 h-full w-px origin-top' : 'left-0 top-[5px] h-px w-full origin-left')}
          initial={false}
          animate={vertical ? { scaleY: active != null ? active / (steps.length - 1) : 1 } : { scaleX: active != null ? active / (steps.length - 1) : 1 }}
          transition={{ duration: 0.6, ease: EASE }}
        />
      ) : (
        <motion.span
          className={cn('absolute', lineColor, vertical ? 'left-[5px] top-0 h-full w-px origin-top' : 'left-0 top-[5px] h-px w-full origin-left')}
          style={vertical ? { scaleY: scale } : { scaleX: scale }}
        />
      )}
      {steps.map((step, i) => {
        const on = active == null || i <= active;
        const align = i === 0 ? 'items-start' : i === steps.length - 1 ? 'items-end' : 'items-center';
        return (
          <span key={step} className={cn('relative flex gap-2', vertical ? 'flex-row items-center' : cn('flex-col', align))}>
            <span className={cn('h-[11px] w-[11px] rounded-full border-2 transition-colors duration-500', on ? (light ? 'border-ivory bg-ivory' : 'border-terra bg-terra') : light ? 'border-ivory/40 bg-transparent' : 'border-terra/40 bg-transparent')} />
            <span className={cn('whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.2em] transition-opacity duration-500', on ? 'opacity-90' : 'opacity-40', vertical ? '' : 'mt-1')}>{step}</span>
          </span>
        );
      })}
    </div>
  );
}

/**
 * Compteur animé à l'entrée dans la vue. La valeur finale est exposée aux
 * lecteurs d'écran ; le décompte visuel leur est masqué.
 */
export function Counter({ value, suffix = '', decimals = 0, className, duration = 1.4 }: { value: number; suffix?: string; decimals?: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setN(value);
      return;
    }
    const controls = animate(0, value, { duration, ease: EASE, onUpdate: setN });
    return () => controls.stop();
  }, [inView, value, reduce, duration]);
  const fmt = (v: number) => v.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      <span aria-hidden>
        {fmt(n)}
        {suffix}
      </span>
      <span className="sr-only">
        {fmt(value)}
        {suffix}
      </span>
    </span>
  );
}
