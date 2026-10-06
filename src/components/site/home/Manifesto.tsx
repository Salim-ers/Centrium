'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { ArrowDown, CalendarClock, FolderOpen, Kanban, Mail, Percent, Sheet, type LucideIcon } from 'lucide-react';

import { CentriumLogo, CentriumType } from '@/components/brand/CentriumLogo';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

import { Kicker, Section, Title, useReducedMotion, Wide } from '../kit';

// ── Les morceaux ─────────────────────────────────────────────────────────
// Une ESN pilotée à la main (aucune marque citée). Chaque morceau a sa
// place dans le désordre (x, y, rotation ; mx, my sur mobile), puis rejoint
// sa tuile dans le cockpit Centrium. Positions en % de la scène.
type PieceId = 'crm' | 'sheet' | 'drive' | 'mail' | 'margin' | 'report';
type Piece = { id: PieceId; label: string; hint: string; module: string; icon: LucideIcon; x: number; y: number; r: number; mx: number; my: number; tint: string; card: string };

const PIECES: Piece[] = [
  { id: 'crm', label: 'Le pipeline dans un CRM', hint: 'relances notées à la main', module: 'Pipeline', icon: Kanban, x: 16, y: 16, r: -4, mx: 28, my: 10, tint: 'bg-terra/15 text-terra-deep', card: 'bg-white' },
  { id: 'sheet', label: 'Le staffing dans un tableur', hint: 'staffing_v12.xlsx', module: 'Staffing', icon: Sheet, x: 83, y: 13, r: 3, mx: 72, my: 25, tint: 'bg-white text-terra-dark', card: 'bg-terra-blush' },
  { id: 'drive', label: 'Les CV dans un drive', hint: 'CV_relu_final.docx', module: 'Dossiers', icon: FolderOpen, x: 13, y: 52, r: 2, mx: 27, my: 43, tint: 'bg-terra-peach/60 text-terra-deep', card: 'bg-white' },
  { id: 'mail', label: 'Les CRA par email', hint: 'RE: RE: CRA de septembre', module: 'CRA', icon: Mail, x: 87, y: 50, r: -3, mx: 73, my: 58, tint: 'bg-white text-terra-deep', card: 'bg-terra-blush' },
  { id: 'margin', label: 'Les marges dans un fichier', hint: 'marges_FINAL_v3.xlsx', module: 'Marges', icon: Percent, x: 19, y: 86, r: 4, mx: 28, my: 76, tint: 'bg-terra-light/35 text-terra-dark', card: 'bg-white' },
  { id: 'report', label: 'Le reporting du lundi', hint: 'lundi, 8 h 30', module: 'Reporting', icon: CalendarClock, x: 81, y: 88, r: -2, mx: 72, my: 91, tint: 'bg-white text-terra-deep', card: 'bg-terra-blush' },
];
const BY_ID = new Map(PIECES.map((p) => [p.id, p]));

// Les coutures entre outils : là où le temps se perd.
const LINKS: Array<{ from: PieceId; to: PieceId; label?: string }> = [
  { from: 'crm', to: 'sheet', label: 'copier-coller' },
  { from: 'sheet', to: 'mail', label: 'ressaisie' },
  { from: 'drive', to: 'crm', label: 'pièce jointe' },
  { from: 'mail', to: 'margin', label: 'export CSV' },
  { from: 'margin', to: 'report', label: 'version finale ?' },
  { from: 'drive', to: 'margin' },
  { from: 'sheet', to: 'report' },
];

// Le cockpit : centre, taille (en % de la scène) et grille des tuiles.
const COCKPIT = { desktop: { cx: 50, cy: 54, w: 54, h: 64, cols: 3 }, mobile: { cx: 50, cy: 52, w: 94, h: 74, cols: 2 } } as const;

/** Centre de la tuile n° i dans la scène, pour que chaque morceau rejoigne la sienne. */
function tileCenter(i: number, mobile: boolean) {
  const c = mobile ? COCKPIT.mobile : COCKPIT.desktop;
  const rows = Math.ceil(PIECES.length / c.cols);
  const top = c.cy - c.h / 2 + c.h * 0.14; // sous l'en-tête du cockpit
  const bodyH = c.h * 0.86;
  const col = i % c.cols;
  const row = Math.floor(i / c.cols);
  return { x: c.cx - c.w / 2 + (c.w / c.cols) * (col + 0.5), y: top + (bodyH / rows) * (row + 0.5) };
}

// ── Morceau ──────────────────────────────────────────────────────────────
function PieceCard({ piece, compact = false }: { piece: Piece; compact?: boolean }) {
  const Icon = piece.icon;
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-2xl border border-line shadow-[0_18px_36px_-22px_rgba(113,52,40,.45)]',
        piece.card,
        compact ? 'w-[150px] p-2' : 'w-[150px] p-2 sm:w-max sm:max-w-[320px] sm:gap-3 sm:p-3.5 sm:pr-5',
      )}
    >
      <span className={cn('grid shrink-0 place-items-center rounded-xl', piece.tint, compact ? 'h-8 w-8' : 'h-8 w-8 sm:h-10 sm:w-10')}>
        <Icon className={compact ? 'h-4 w-4' : 'h-4 w-4 sm:h-5 sm:w-5'} strokeWidth={1.9} />
      </span>
      <span className="min-w-0">
        <span className={cn('block font-semibold leading-tight text-ink', compact ? 'text-[11.5px]' : 'text-[11.5px] sm:whitespace-nowrap sm:text-[14.5px]')}>{piece.label}</span>
        <span className={cn('mt-0.5 block truncate font-mono text-taupe', compact ? 'text-[9.5px]' : 'text-[9.5px] sm:text-[11.5px]')}>{piece.hint}</span>
      </span>
    </div>
  );
}

function MovingPiece({ piece, index, p, mobile }: { piece: Piece; index: number; p: MotionValue<number>; mobile: boolean }) {
  const from = { x: mobile ? piece.mx : piece.x, y: mobile ? piece.my : piece.y };
  const to = tileCenter(index, mobile);
  const t0 = 0.03 + index * 0.032;
  const appear = useTransform(p, [t0, t0 + 0.06], [0, 1]);
  const rise = useTransform(p, [t0, t0 + 0.06], [18, 0]);
  const left = useTransform(p, [0.42, 0.62], [`${from.x}%`, `${to.x}%`]);
  const top = useTransform(p, [0.42, 0.62], [`${from.y}%`, `${to.y}%`]);
  const scale = useTransform(p, [0.42, 0.62], [1, mobile ? 0.7 : 0.62]);
  const rotate = useTransform(p, [0.42, 0.6], [piece.r, 0]);
  const leave = useTransform(p, [0.58, 0.66], [1, 0]);
  return (
    <motion.div style={{ left, top, scale, rotate, opacity: leave, x: '-50%', y: '-50%' }} className="absolute z-20">
      <motion.div style={{ opacity: appear, y: rise }}>
        <div className="site-float" style={{ '--float-delay': `${-index * 1.15}s` } as React.CSSProperties}>
          <PieceCard piece={piece} />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Coutures ─────────────────────────────────────────────────────────────
function Seams({ p, mobile }: { p: MotionValue<number> }  & { mobile: boolean }) {
  const opacity = useTransform(p, [0.12, 0.24, 0.36, 0.44], [0, 1, 1, 0]);
  const pos = (id: PieceId) => {
    const piece = BY_ID.get(id)!;
    return { x: mobile ? piece.mx : piece.x, y: mobile ? piece.my : piece.y };
  };
  return (
    <motion.div style={{ opacity }} aria-hidden className="pointer-events-none absolute inset-0 z-10">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {LINKS.map((l) => {
          const a = pos(l.from);
          const b = pos(l.to);
          return <line key={`${l.from}-${l.to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="site-dash" stroke="#C65F46" strokeOpacity={0.5} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      {LINKS.filter((l) => l.label).map((l) => {
        const a = pos(l.from);
        const b = pos(l.to);
        return (
          <span
            key={`${l.from}-${l.to}-label`}
            style={{ left: `${(a.x + b.x) / 2}%`, top: `${(a.y + b.y) / 2}%` }}
            className="absolute hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-terra/25 bg-ivory px-2.5 py-1 text-[11.5px] font-medium text-terra-deep shadow-sm sm:inline-flex"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-terra" />
            {l.label}
          </span>
        );
      })}
    </motion.div>
  );
}

// ── Cockpit ──────────────────────────────────────────────────────────────
function MiniVisual({ id }: { id: PieceId }) {
  switch (id) {
    case 'crm':
      return (
        <div className="flex h-full gap-1">
          {[3, 2, 2, 1].map((n, c) => (
            <div key={c} className="flex flex-1 flex-col gap-0.5 rounded-md bg-terra/10 p-0.5">
              {Array.from({ length: n }).map((_, k) => (
                <span key={k} className={cn('h-2 shrink-0 rounded-[3px]', c === 3 ? 'bg-terra' : 'bg-white ring-1 ring-terra/20')} />
              ))}
            </div>
          ))}
        </div>
      );
    case 'sheet':
      return (
        <div className="flex h-full flex-col justify-center gap-1">
          {[
            [0, 70],
            [20, 55],
            [8, 85],
          ].map(([l, w], k) => (
            <span key={k} className="relative h-1.5 rounded-full bg-terra/10">
              <span className={cn('absolute inset-y-0 rounded-full', k === 1 ? 'bg-terra-light' : 'bg-terra')} style={{ left: `${l}%`, width: `${w}%` }} />
            </span>
          ))}
        </div>
      );
    case 'drive':
      return (
        <div className="flex h-full items-center gap-1.5">
          {[0, 1].map((k) => (
            <span key={k} className={cn('flex h-full max-h-9 flex-1 flex-col gap-0.5 rounded-md border p-1', k ? 'border-terra/25 bg-white' : 'border-terra/40 bg-terra/5')}>
              <span className="h-1 w-2/3 rounded-full bg-terra/60" />
              <span className="h-0.5 w-full rounded-full bg-terra/20" />
              <span className="h-0.5 w-5/6 rounded-full bg-terra/20" />
            </span>
          ))}
        </div>
      );
    case 'mail':
      return (
        <div className="grid h-full grid-cols-7 content-center gap-0.5">
          {Array.from({ length: 21 }).map((_, k) => (
            <span key={k} className={cn('aspect-square rounded-[2px]', k % 7 > 4 ? 'bg-terra/10' : k < 15 ? 'bg-terra' : 'bg-terra/35')} />
          ))}
        </div>
      );
    case 'margin':
      return (
        <svg viewBox="0 0 60 32" className="h-full w-full" aria-hidden>
          <path d="M6 30 A24 24 0 0 1 54 30" fill="none" stroke="#F1D3C9" strokeWidth="6" strokeLinecap="round" />
          <path d="M6 30 A24 24 0 0 1 44 12" fill="none" stroke="#C65F46" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
    case 'report':
      return (
        <svg viewBox="0 0 60 30" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
          <polyline points="2,24 12,20 22,22 32,14 42,16 52,8 58,6" fill="none" stroke="#C65F46" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          <polyline points="2,28 58,28" stroke="#F1D3C9" strokeWidth="1.5" />
        </svg>
      );
  }
}

function CockpitTile({ piece, lit }: { piece: Piece; lit?: MotionValue<number> }) {
  const Icon = piece.icon;
  return (
    <motion.div style={lit ? { opacity: lit } : undefined} className="flex min-h-0 flex-col gap-1.5 rounded-xl bg-[#FBF6F2] p-2 ring-1 ring-terra/10 sm:p-2.5">
      <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-ink sm:text-[12px]">
        <Icon className="h-3.5 w-3.5 text-terra" strokeWidth={2} />
        {piece.module}
      </span>
      <div className="min-h-0 flex-1">
        <MiniVisual id={piece.id} />
      </div>
    </motion.div>
  );
}

function CockpitFrame({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.ComponentProps<typeof motion.div>['style'] }) {
  return (
    <motion.div style={style} className={cn('flex flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_40px_90px_-40px_rgba(113,52,40,.55)] ring-1 ring-terra/15', className)}>
      <div className="flex shrink-0 items-center justify-between border-b border-line px-3 py-2 sm:px-4 sm:py-2.5">
        <span className="flex items-center gap-2 text-[#A84B37]">
          <CentriumLogo className="h-5 w-5 sm:h-6 sm:w-6" color="currentColor" />
          <CentriumType className="h-[9px] sm:h-[11px]" />
        </span>
        <span className="rounded-full bg-terra px-2.5 py-0.5 text-[10px] font-semibold text-ivory sm:text-[11px]">Un seul cockpit</span>
      </div>
      {children}
    </motion.div>
  );
}

function MovingCockpit({ p, mobile }: { p: MotionValue<number>; mobile: boolean }) {
  const c = mobile ? COCKPIT.mobile : COCKPIT.desktop;
  const opacity = useTransform(p, [0.46, 0.58], [0, 1]);
  const scale = useTransform(p, [0.46, 0.64], [0.88, 1]);
  return (
    <CockpitFrame
      style={{ opacity, scale, left: `${c.cx}%`, top: `${c.cy}%`, width: `${c.w}%`, height: `${c.h}%`, x: '-50%', y: '-50%' }}
      className="absolute z-10"
    >
      <div className={cn('grid min-h-0 flex-1 gap-2 p-2 sm:gap-3 sm:p-3.5', c.cols === 3 ? 'grid-cols-3 grid-rows-2' : 'grid-cols-2 grid-rows-3')}>
        {PIECES.map((piece, i) => (
          <LitTile key={piece.id} piece={piece} index={i} p={p} />
        ))}
      </div>
    </CockpitFrame>
  );
}

function LitTile({ piece, index, p }: { piece: Piece; index: number; p: MotionValue<number> }) {
  const lit = useTransform(p, [0.58 + index * 0.012, 0.66 + index * 0.012], [0.3, 1]);
  return <CockpitTile piece={piece} lit={lit} />;
}

// ── Section ──────────────────────────────────────────────────────────────
/**
 * Manifeste. Avant : six outils séparés, reliés par des coutures (copier-
 * coller, ressaisies, exports, versions). Au scroll, les coutures tombent,
 * chaque morceau rejoint sa tuile et le cockpit Centrium se forme. Version
 * statique avant / après si le mouvement est réduit.
 */
export function Manifesto() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const mobile = useIsMobile();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const before = useTransform(p, [0.04, 0.12, 0.38, 0.45], [0, 1, 1, 0]);
  const after = useTransform(p, [0.64, 0.74], [0, 1]);
  const afterY = useTransform(p, [0.64, 0.74], [24, 0]);

  if (reduce) {
    return (
      <Section tone="dune" aria-label="Manifeste" className="py-24 md:py-36">
        <Wide>
          <Kicker className="text-terra-deep">Manifeste</Kicker>
          <Title size="lg" className="mt-8 max-w-[16ch]" lines={[['Une ESN ne devrait pas se piloter ', { em: 'en morceaux.' }]]} />
          <div className="mt-14 grid items-center gap-10 lg:grid-cols-[1fr_auto_1.2fr]">
            <div>
              <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-terra-deep">Aujourd’hui</p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {PIECES.map((piece) => (
                  <li key={piece.id}>
                    <PieceCard piece={piece} compact />
                  </li>
                ))}
              </ul>
            </div>
            <ArrowDown className="mx-auto h-8 w-8 text-terra lg:-rotate-90" aria-hidden />
            <div>
              <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-terra-deep">Avec Centrium</p>
              <CockpitFrame className="aspect-[16/10]">
                <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-3 gap-2.5 p-3 sm:grid-cols-3 sm:grid-rows-2">
                  {PIECES.map((piece) => (
                    <CockpitTile key={piece.id} piece={piece} />
                  ))}
                </div>
              </CockpitFrame>
            </div>
          </div>
          <p className="mt-16 text-[clamp(2.2rem,5vw,5.6rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.045em]">
            Tout, <em className="font-editorial font-normal normal-case italic tracking-[-0.02em] text-terra">au même endroit.</em>
          </p>
        </Wide>
      </Section>
    );
  }

  return (
    <Section tone="dune" aria-label="Manifeste">
      <p className="sr-only">
        Aujourd’hui, le pipeline vit dans un CRM, le staffing dans un tableur, les CV dans un drive, les CRA par email, les marges dans un fichier et le reporting le
        lundi. Avec Centrium, ces six morceaux sont réunis dans un seul cockpit.
      </p>
      <div ref={ref} className="relative h-[330vh]">
        <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden pb-8 pt-24 md:pt-28">
          {/* Halo terracotta discret derrière la scène. */}
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-[56%] h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(198,95,70,.16),rgba(198,95,70,0)_65%)]" />
          <Wide>
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
              <div>
                <Kicker className="text-terra-deep">Manifeste</Kicker>
                <Title size="md" className="mt-5 max-w-[22ch] text-[clamp(1.8rem,3.6vw,4rem)]" lines={[['Une ESN ne devrait pas'], ['se piloter ', { em: 'en morceaux.' }]]} />
              </div>
              <div aria-hidden className="relative h-11 min-w-[17rem] max-w-[22rem] text-[13px] font-semibold sm:text-[14px]">
                <motion.p style={{ opacity: before }} className="absolute inset-0 flex items-center gap-2 text-terra-deep">
                  <span className="h-2 w-2 rounded-full bg-terra" />
                  Aujourd’hui : six outils, aucune vue d’ensemble.
                </motion.p>
                <motion.p style={{ opacity: after, y: afterY }} className="absolute inset-0 flex items-center gap-2 text-ink">
                  <span className="h-2 w-2 rounded-full bg-terra-deep" />
                  Avec Centrium : tout est relié.
                </motion.p>
              </div>
            </div>
          </Wide>

          <div aria-hidden className="relative mx-auto my-5 w-full max-w-[1280px] flex-1 px-5">
            <div className="relative h-full w-full">
              <Seams p={p} mobile={mobile} />
              <MovingCockpit p={p} mobile={mobile} />
              {PIECES.map((piece, i) => (
                <MovingPiece key={`${piece.id}-${mobile}`} piece={piece} index={i} p={p} mobile={mobile} />
              ))}
            </div>
          </div>

          <Wide>
            <motion.p
              style={{ opacity: after, y: afterY }}
              className="text-right text-[clamp(2rem,5vw,5.8rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.05em] text-ink"
            >
              Tout, <em className="font-editorial font-normal normal-case italic tracking-[-0.02em] text-terra">au même endroit.</em>
            </motion.p>
          </Wide>
        </div>
      </div>
    </Section>
  );
}
