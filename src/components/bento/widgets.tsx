'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Delta, TONE_CLASSES, Tile, TileHeader, type TileTone } from './Tile';
import { ActivityChart, ProgressBar, Sparkline, type SeriesPoint } from './charts';

// ── Types de données (identiques pour l'application et le site) ─────────
export type KpiData = {
  label: string;
  value: string;
  delta?: number | null;
  deltaPositiveIsGood?: boolean;
  spark?: number[];
  foot?: React.ReactNode;
  /** 0–100 : barre de progression sous la valeur. */
  progress?: number | null;
  href?: string;
};
export type TodoItem = { id: string; label: string; detail?: string; count?: number; href?: string };
export type StaffRow = {
  id: string;
  name: string;
  initials: string;
  status: 'mission' | 'available' | 'soon' | 'leave';
  detail: string;
  /** Jours restants de mission (ou avant disponibilité). */
  days?: number | null;
  href?: string;
  /** Frise sur la période affichée, en fractions 0–1. */
  segments?: Array<{ from: number; to: number; kind: 'mission' | 'leave' | 'proposed' }>;
};
export type MissionRow = { id: string; client: string; consultant: string; progress: number | null; end: string | null; daysLeft: number | null; marginPct: number | null; href?: string };
export type PipelineStage = { key: string; label: string; amount: number; count: number };
export type ClientRow = { id: string; name: string; revenue: number; share: number; marginPct: number | null; consultants: number; href?: string };
export type ActivityRow = { id: string; label: string; detail?: string; when: string; href?: string };

type Fmt = (n: number) => string;

function MaybeLink({ href, className, children }: { href?: string; className?: string; children: React.ReactNode }) {
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

// ── KPI ─────────────────────────────────────────────────────────────────
export function KpiTile({ data, tone = 'white', index = 0, className }: { data: KpiData; tone?: TileTone; index?: number; className?: string }) {
  const t = TONE_CLASSES[tone];
  const onColor = tone === 'terra' || tone === 'deep' || tone === 'ink';
  return (
    <Tile tone={tone} index={index} className={cn('min-h-[148px] justify-between', className)}>
      <MaybeLink href={data.href} className="flex h-full flex-col justify-between gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-[13px] font-medium', t.muted)}>{data.label}</span>
          {data.href && <ArrowUpRight className={cn('h-4 w-4 opacity-60', t.muted)} />}
        </div>
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className={cn('text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums', t.strong)}>{data.value}</span>
            <Delta value={data.delta ?? null} tone={tone} positiveIsGood={data.deltaPositiveIsGood ?? true} />
          </div>
          {data.progress != null && <ProgressBar value={data.progress} className={cn('mt-3', onColor && 'bg-white/20')} barClassName={onColor ? 'bg-white' : undefined} />}
          {data.spark && data.spark.length > 1 && <Sparkline values={data.spark} className="mt-2" color={onColor ? '#FFFFFF' : '#C65F46'} />}
          {data.foot && <div className={cn('mt-1.5 text-[12px]', t.muted)}>{data.foot}</div>}
        </div>
      </MaybeLink>
    </Tile>
  );
}

// ── À traiter aujourd'hui ───────────────────────────────────────────────
/**
 * Liste d'actions : chaque ligne s'ouvre ; la case permet de la marquer
 * comme vue pour la journée (mémorisé localement, par utilisateur).
 */
export function TodoTile({ title, items, tone = 'peach', index = 0, storageKey, emptyLabel, className }: { title: string; items: TodoItem[]; tone?: TileTone; index?: number; storageKey?: string; emptyLabel: string; className?: string }) {
  const t = TONE_CLASSES[tone];
  const dayKey = storageKey ? `${storageKey}:${new Date().toISOString().slice(0, 10)}` : null;
  const [done, setDone] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!dayKey) return;
    try {
      const raw = window.localStorage.getItem(dayKey);
      if (raw) setDone(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* stockage indisponible : pas de mémorisation */
    }
  }, [dayKey]);
  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (dayKey) {
        try {
          window.localStorage.setItem(dayKey, JSON.stringify([...next]));
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  }
  const open = items.filter((i) => !done.has(i.id)).length;
  return (
    <Tile tone={tone} index={index} className={className}>
      <TileHeader tone={tone} title={title} action={<span className={cn('rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular-nums', tone === 'peach' || tone === 'soft' ? 'bg-terra text-white' : 'bg-white/20')}>{open}</span>} />
      {items.length === 0 ? (
        <p className={cn('text-[13.5px]', t.muted)}>{emptyLabel}</p>
      ) : (
        <ul className="-mx-1 space-y-0.5">
          {items.map((it) => {
            const isDone = done.has(it.id);
            return (
              <li key={it.id} className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5">
                <button
                  type="button"
                  onClick={() => toggle(it.id)}
                  aria-pressed={isDone}
                  aria-label={isDone ? `Rouvrir : ${it.label}` : `Marquer comme vu : ${it.label}`}
                  className={cn('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-colors', isDone ? 'border-terra bg-terra text-white' : 'border-terra-deep/30 bg-white/60 hover:border-terra')}
                >
                  {isDone && <Check className="h-3 w-3" strokeWidth={3} />}
                </button>
                <MaybeLink href={it.href} className={cn('flex min-w-0 flex-1 items-center gap-2 text-[13.5px] transition-opacity', isDone && 'opacity-45 line-through decoration-1')}>
                  {it.count != null && <span className={cn('min-w-[1.5rem] text-[15px] font-semibold tabular-nums', t.strong)}>{it.count}</span>}
                  <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  {it.href && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />}
                </MaybeLink>
              </li>
            );
          })}
        </ul>
      )}
    </Tile>
  );
}

// ── Activité & rentabilité ──────────────────────────────────────────────
export function ActivityTile({
  title,
  series,
  format,
  labels,
  tone = 'white',
  index = 0,
  className,
  height = 230,
  summary,
}: {
  title: string;
  series: SeriesPoint[];
  format: Fmt;
  labels: { revenue: string; margin: string; forecast: string };
  tone?: TileTone;
  index?: number;
  className?: string;
  height?: number;
  summary?: React.ReactNode;
}) {
  const [range, setRange] = useState<3 | 6 | 12>(12);
  const data = useMemo(() => series.slice(-range - Math.max(0, series.filter((s) => s.revenue == null).length)), [series, range]);
  const t = TONE_CLASSES[tone];
  const dark = tone === 'ink' || tone === 'deep' || tone === 'terra';
  return (
    <Tile tone={tone} index={index} className={className}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className={cn('text-[13px] font-medium', t.muted)}>{title}</div>
          {summary}
        </div>
        <div className={cn('inline-flex rounded-full p-0.5 text-[12px]', dark ? 'bg-white/10' : 'bg-black/[0.04]')} role="radiogroup" aria-label="Période">
          {([3, 6, 12] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={range === r}
              onClick={() => setRange(r)}
              className={cn('rounded-full px-2.5 py-1 font-medium transition-colors', range === r ? (dark ? 'bg-white text-ink-app' : 'bg-white text-ink-app shadow-sm') : t.muted)}
            >
              {r}M
            </button>
          ))}
        </div>
      </div>
      <div className={cn('mb-1 flex flex-wrap gap-4 text-[12px]', t.muted)}>
        <Legend color={dark ? '#F1C7BA' : '#C65F46'} label={labels.revenue} />
        <Legend color={dark ? '#FFFFFF' : '#191817'} label={labels.margin} />
        <Legend color={dark ? 'rgba(255,255,255,.55)' : '#C65F46'} label={labels.forecast} dashed />
      </div>
      <ActivityChart data={data} format={format} labels={labels} height={height} tone={dark ? 'dark' : 'light'} />
    </Tile>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-0 w-4 border-t-2" style={{ borderColor: color, borderStyle: dashed ? 'dashed' : 'solid' }} />
      {label}
    </span>
  );
}

// ── Staffing ────────────────────────────────────────────────────────────
const STATUS_DOT: Record<StaffRow['status'], string> = {
  mission: 'bg-terra',
  available: 'bg-success',
  soon: 'bg-warning',
  leave: 'bg-sand-400',
};

export function StaffingTile({ title, rows, cta, tone = 'ivory', index = 0, className, emptyLabel }: { title: string; rows: StaffRow[]; cta?: { label: string; href?: string }; tone?: TileTone; index?: number; className?: string; emptyLabel: string }) {
  const reduce = useReducedMotion();
  const t = TONE_CLASSES[tone];
  return (
    <Tile tone={tone} index={index} className={className}>
      <TileHeader
        tone={tone}
        title={title}
        action={
          cta?.href ? (
            <Link href={cta.href} className={cn('inline-flex items-center gap-1 text-[12.5px] font-medium text-terra-deep hover:underline')}>
              {cta.label}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          ) : cta ? (
            <span className="text-[12.5px] font-medium text-terra-deep">{cta.label}</span>
          ) : undefined
        }
      />
      {rows.length === 0 ? (
        <p className={cn('text-[13.5px]', t.muted)}>{emptyLabel}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r, i) => (
            <motion.li key={r.id} initial={reduce ? false : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduce ? 0 : 0.15 + i * 0.06 }}>
              <MaybeLink href={r.href} className="flex items-center gap-3">
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-terra-deep ring-1 ring-black/[0.06]">
                  {r.initials}
                  <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white', STATUS_DOT[r.status])} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{r.name}</span>
                  <span className={cn('block truncate text-[12px]', t.muted)}>{r.detail}</span>
                </span>
                {r.segments && (
                  <span className="relative hidden h-2 w-24 shrink-0 overflow-hidden rounded-full bg-black/[0.05] sm:block" aria-hidden>
                    {r.segments.map((s, si) => (
                      <span
                        key={si}
                        className={cn('absolute inset-y-0 rounded-full', s.kind === 'mission' ? 'bg-terra' : s.kind === 'leave' ? 'bg-sand-400' : 'bg-terra-light')}
                        style={{ left: `${s.from * 100}%`, width: `${Math.max(2, (s.to - s.from) * 100)}%` }}
                      />
                    ))}
                  </span>
                )}
                {r.days != null && <span className="w-12 shrink-0 text-right text-[12px] font-semibold tabular-nums">{r.days} j</span>}
              </MaybeLink>
            </motion.li>
          ))}
        </ul>
      )}
    </Tile>
  );
}

// ── Missions ────────────────────────────────────────────────────────────
export function MissionsTile({ title, rows, tone = 'white', index = 0, className, emptyLabel, cta }: { title: string; rows: MissionRow[]; tone?: TileTone; index?: number; className?: string; emptyLabel: string; cta?: { label: string; href: string } }) {
  const t = TONE_CLASSES[tone];
  return (
    <Tile tone={tone} index={index} className={className}>
      <TileHeader
        tone={tone}
        title={title}
        action={
          cta && (
            <Link href={cta.href} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-terra-deep hover:underline">
              {cta.label}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )
        }
      />
      {rows.length === 0 ? (
        <p className={cn('text-[13.5px]', t.muted)}>{emptyLabel}</p>
      ) : (
        <ul className={cn('divide-y', tone === 'white' || tone === 'ivory' ? 'divide-black/[0.05]' : 'divide-white/10')}>
          {rows.map((m) => {
            const soon = m.daysLeft != null && m.daysLeft >= 0 && m.daysLeft < 30;
            return (
              <li key={m.id} className="py-2.5 first:pt-0 last:pb-0">
                <MaybeLink href={m.href} className="block">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{m.client}</span>
                    {m.marginPct != null && <span className={cn('text-[12px] tabular-nums', t.muted)}>{m.marginPct.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %</span>}
                    {m.end && (
                      <span className={cn('rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums', soon ? 'bg-terra text-white' : cn('bg-black/[0.04]', t.muted))}>
                        {soon ? `J-${m.daysLeft}` : m.end}
                      </span>
                    )}
                  </div>
                  <div className={cn('mt-0.5 flex items-center gap-2 text-[12px]', t.muted)}>
                    <span className="truncate">{m.consultant}</span>
                  </div>
                  {m.progress != null && <ProgressBar value={m.progress} className="mt-1.5 h-1" barClassName={soon ? 'bg-terra' : 'bg-ink-app/70'} />}
                </MaybeLink>
              </li>
            );
          })}
        </ul>
      )}
    </Tile>
  );
}

// ── Pipeline ────────────────────────────────────────────────────────────
export function PipelineTile({
  title,
  stages,
  total,
  weighted,
  count,
  format,
  labels,
  tone = 'soft',
  index = 0,
  className,
  href,
}: {
  title: string;
  stages: PipelineStage[];
  total: number;
  weighted: number;
  count: number;
  format: Fmt;
  labels: { total: string; weighted: string; count: string };
  tone?: TileTone;
  index?: number;
  className?: string;
  href?: string;
}) {
  const reduce = useReducedMotion();
  const t = TONE_CLASSES[tone];
  const max = Math.max(1, ...stages.map((s) => s.amount));
  return (
    <Tile tone={tone} index={index} className={className}>
      <TileHeader
        tone={tone}
        title={title}
        action={
          href && (
            <Link href={href} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-terra-deep hover:underline">
              CRM <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )
        }
      />
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          [labels.total, format(total)],
          [labels.weighted, format(weighted)],
          [labels.count, String(count)],
        ].map(([k, v]) => (
          <div key={k}>
            <div className={cn('text-[11.5px]', t.muted)}>{k}</div>
            <div className={cn('text-[19px] font-semibold tracking-tight tabular-nums', t.strong)}>{v}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {stages.map((s, i) => (
          <div key={s.key} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-2 text-[12px]">
            <span className={cn('truncate', t.muted)}>{s.label}</span>
            <span className="h-5 overflow-hidden rounded-md bg-white/50">
              <motion.span
                className={cn('block h-full rounded-md', s.key === 'won' ? 'bg-terra-deep' : 'bg-terra')}
                style={{ opacity: 0.45 + (i / Math.max(1, stages.length - 1)) * 0.55 }}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${Math.max(2, (s.amount / max) * 100)}%` }}
                transition={{ duration: 0.8, delay: reduce ? 0 : 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
            <span className="w-16 text-right font-medium tabular-nums">{format(s.amount)}</span>
          </div>
        ))}
      </div>
    </Tile>
  );
}

// ── Top clients ─────────────────────────────────────────────────────────
export function TopClientsTile({ title, rows, format, tone = 'white', index = 0, className, emptyLabel, labels }: { title: string; rows: ClientRow[]; format: Fmt; tone?: TileTone; index?: number; className?: string; emptyLabel: string; labels: { share: string; margin: string; consultants: string } }) {
  const t = TONE_CLASSES[tone];
  return (
    <Tile tone={tone} index={index} className={className}>
      <TileHeader tone={tone} title={title} />
      {rows.length === 0 ? (
        <p className={cn('text-[13.5px]', t.muted)}>{emptyLabel}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => (
            <li key={c.id}>
              <MaybeLink href={c.href} className="block">
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{c.name}</span>
                  <span className="text-[13.5px] font-semibold tabular-nums">{format(c.revenue)}</span>
                </div>
                <div className={cn('mt-1 flex items-center gap-3 text-[11.5px]', t.muted)}>
                  <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
                    <span className="absolute inset-y-0 left-0 rounded-full bg-terra" style={{ width: `${Math.min(100, c.share)}%` }} />
                  </span>
                  <span className="tabular-nums" title={labels.share}>
                    {c.share.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %
                  </span>
                  {c.marginPct != null && (
                    <span className="tabular-nums" title={labels.margin}>
                      {labels.margin} {c.marginPct.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %
                    </span>
                  )}
                  <span className="tabular-nums" title={labels.consultants}>
                    {c.consultants} {labels.consultants}
                  </span>
                </div>
              </MaybeLink>
            </li>
          ))}
        </ul>
      )}
    </Tile>
  );
}

// ── Activité récente ────────────────────────────────────────────────────
export function ActivityFeedTile({ title, rows, tone = 'white', index = 0, className, emptyLabel }: { title: string; rows: ActivityRow[]; tone?: TileTone; index?: number; className?: string; emptyLabel: string }) {
  const t = TONE_CLASSES[tone];
  return (
    <Tile tone={tone} index={index} className={className}>
      <TileHeader tone={tone} title={title} />
      {rows.length === 0 ? (
        <p className={cn('text-[13.5px]', t.muted)}>{emptyLabel}</p>
      ) : (
        <ol className="relative space-y-3 pl-4">
          <span className={cn('absolute bottom-1 left-[3px] top-1 w-px', t.line)} aria-hidden />
          {rows.map((r) => (
            <li key={r.id} className="relative">
              <span className="absolute -left-4 top-1.5 h-[7px] w-[7px] rounded-full bg-terra ring-2 ring-white" aria-hidden />
              <MaybeLink href={r.href} className="block">
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">{r.label}</span>
                  <span className={cn('shrink-0 text-[11.5px] tabular-nums', t.muted)}>{r.when}</span>
                </div>
                {r.detail && <div className={cn('truncate text-[12px]', t.muted)}>{r.detail}</div>}
              </MaybeLink>
            </li>
          ))}
        </ol>
      )}
    </Tile>
  );
}
