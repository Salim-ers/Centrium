'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, Palmtree, HeartPulse, MinusCircle, Sparkles, Trash2 } from 'lucide-react';

import { useLocale } from '@/lib/i18n/LocaleProvider';

export type TimesheetDayKind =
  | 'worked'
  | 'paid_leave'
  | 'sick_leave'
  | 'unpaid_leave'
  | 'holiday';

export type CalendarDay = {
  day_date: string; // 'YYYY-MM-DD'
  duration: number;
  kind: TimesheetDayKind;
  note: string | null;
};

type Props = {
  year: number;
  month: number; // 1..12
  days: CalendarDay[];
  primaryColor?: string;
  /** Si false, cellules non cliquables (lecture seule). */
  editable?: boolean;
  /** Callback à chaque modification. duration optionnel (1 ou 0.5). */
  onChange?: (
    dayDate: string,
    next: { kind: TimesheetDayKind | null; duration?: number; note?: string | null },
  ) => Promise<void> | void;
  /**
   * Callback pour appliquer un même type à PLUSIEURS jours d'un coup
   * (pinceau + clic-glissé). Permet au parent de batcher les upserts et
   * de ne recharger qu'une seule fois. Fallback : onChange jour par jour.
   */
  onBatchChange?: (
    dayDates: string[],
    next: { kind: TimesheetDayKind | null; duration?: number },
  ) => Promise<void> | void;
};

/** Pinceau de remplissage rapide : un type + durée, ou "vider". */
type Brush = {
  id: string;
  kind: TimesheetDayKind | null;
  duration?: number;
  label: string;
  icon: typeof Briefcase;
  activeClass: string;
};

const KIND_META: Record<
  TimesheetDayKind,
  { label: string; bg: string; border: string; text: string; icon: typeof Briefcase }
> = {
  worked: {
    label: 'Travaillé',
    bg: 'bg-violet-500/15',
    border: 'border-violet-500/40',
    text: 'text-violet-300',
    icon: Briefcase,
  },
  paid_leave: {
    label: 'Congés payés',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/40',
    text: 'text-amber-300',
    icon: Palmtree,
  },
  sick_leave: {
    label: 'Maladie',
    bg: 'bg-red-500/15',
    border: 'border-red-500/40',
    text: 'text-red-300',
    icon: HeartPulse,
  },
  unpaid_leave: {
    label: 'Sans solde',
    bg: 'bg-slate-500/15',
    border: 'border-slate-500/40',
    text: 'text-slate-300',
    icon: MinusCircle,
  },
  holiday: {
    label: 'Férié',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/40',
    text: 'text-orange-300',
    icon: Sparkles,
  },
};

const KIND_LABEL_EN: Record<TimesheetDayKind, string> = {
  worked: 'Worked',
  paid_leave: 'Paid leave',
  sick_leave: 'Sick leave',
  unpaid_leave: 'Unpaid leave',
  holiday: 'Public holiday',
};

function kindLabel(kind: TimesheetDayKind, isEn: boolean): string {
  return isEn ? KIND_LABEL_EN[kind] : KIND_META[kind].label;
}

type Cell = {
  dayNum: number | null;
  iso: string | null;
  isWeekend: boolean;
  data: CalendarDay | null;
};

function buildBrushes(isEn: boolean): Brush[] {
  return [
    { id: 'worked', kind: 'worked', duration: 1, label: isEn ? 'Worked' : 'Travaillé', icon: Briefcase, activeClass: `${KIND_META.worked.border} ${KIND_META.worked.bg} ${KIND_META.worked.text}` },
    { id: 'half', kind: 'worked', duration: 0.5, label: isEn ? 'Half day' : 'Demi-journée', icon: Briefcase, activeClass: `${KIND_META.worked.border} ${KIND_META.worked.bg} ${KIND_META.worked.text}` },
    { id: 'paid_leave', kind: 'paid_leave', label: kindLabel('paid_leave', isEn), icon: Palmtree, activeClass: `${KIND_META.paid_leave.border} ${KIND_META.paid_leave.bg} ${KIND_META.paid_leave.text}` },
    { id: 'sick_leave', kind: 'sick_leave', label: kindLabel('sick_leave', isEn), icon: HeartPulse, activeClass: `${KIND_META.sick_leave.border} ${KIND_META.sick_leave.bg} ${KIND_META.sick_leave.text}` },
    { id: 'unpaid_leave', kind: 'unpaid_leave', label: kindLabel('unpaid_leave', isEn), icon: MinusCircle, activeClass: `${KIND_META.unpaid_leave.border} ${KIND_META.unpaid_leave.bg} ${KIND_META.unpaid_leave.text}` },
    { id: 'holiday', kind: 'holiday', label: kindLabel('holiday', isEn), icon: Sparkles, activeClass: `${KIND_META.holiday.border} ${KIND_META.holiday.bg} ${KIND_META.holiday.text}` },
    { id: 'clear', kind: null, label: isEn ? 'Clear' : 'Vider', icon: Trash2, activeClass: 'border-red-500/40 bg-red-500/10 text-red-300' },
  ];
}

export function TimesheetCalendar({
  year,
  month,
  days,
  editable = false,
  onChange,
  onBatchChange,
  primaryColor,
}: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const BRUSHES = useMemo(() => buildBrushes(isEn), [isEn]);
  const cells = useMemo(() => buildCells(year, month, days), [year, month, days]);
  const [openIso, setOpenIso] = useState<string | null>(null);

  // ============ Pinceau + clic-glissé multi-jours ============
  // brush = null → comportement historique (clic = popover jour par jour).
  // brush actif → mousedown/mouseenter peignent les jours, mouseup commit
  // le lot en un seul batch (une seule sauvegarde, un seul reload).
  const [brush, setBrush] = useState<Brush | null>(null);
  const [painting, setPainting] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!painting) return;
    async function commit() {
      setPainting(false);
      const isos = Array.from(pending);
      if (!brush || isos.length === 0) {
        setPending(new Set());
        return;
      }
      setSaving(true);
      try {
        const next = { kind: brush.kind, duration: brush.duration };
        if (onBatchChange) {
          await onBatchChange(isos, next);
        } else if (onChange) {
          for (const iso of isos) await onChange(iso, next);
        }
      } finally {
        setSaving(false);
        setPending(new Set());
      }
    }
    const up = () => void commit();
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [painting, pending, brush, onBatchChange, onChange]);

  function startPaint(iso: string) {
    if (!brush || saving) return;
    setPainting(true);
    setPending(new Set([iso]));
  }
  function paintEnter(iso: string) {
    if (!painting) return;
    setPending((prev) => (prev.has(iso) ? prev : new Set(prev).add(iso)));
  }

  // Totaux
  const totals = useMemo(() => {
    const t = { worked: 0, paid_leave: 0, sick_leave: 0, unpaid_leave: 0, holiday: 0 };
    for (const d of days) {
      if (d.kind === 'worked') t.worked += Number(d.duration);
      else t[d.kind] += 1;
    }
    return t;
  }, [days]);

  // Clic en dehors → ferme le popover
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!openIso) return;
    function onDocClick(e: MouseEvent) {
      const root = containerRef.current;
      if (!root) return;
      if (!(e.target instanceof Node)) return;
      if (!root.contains(e.target)) setOpenIso(null);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openIso]);

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Barre de remplissage rapide : choisis un type, puis clique OU
          clique-glisse sur les jours pour les remplir en lot. */}
      {editable && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {isEn ? 'Quick fill' : 'Remplissage rapide'}
          </span>
          {BRUSHES.map((b) => {
            const BI = b.icon;
            const active = brush?.id === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setBrush(active ? null : b)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  active
                    ? `${b.activeClass} ring-1 ring-current/30`
                    : 'border-hairline text-muted-foreground hover-surface hover:text-foreground'
                }`}
                title={
                  active
                    ? isEn ? 'Disable the brush' : 'Désactiver le pinceau'
                    : isEn ? 'Select then click-drag over the days' : 'Sélectionner puis cliquer-glisser sur les jours'
                }
              >
                <BI className="h-3 w-3" />
                {b.label}
              </button>
            );
          })}
          <span className="ml-1 text-[11px] text-muted-foreground">
            {saving
              ? isEn ? 'Saving…' : 'Enregistrement…'
              : brush
                ? isEn ? 'Click or drag over the days to fill' : 'Clique ou glisse sur les jours à remplir'
                : ''}
          </span>
        </div>
      )}

      {/* En-têtes jours */}
      <div className="grid grid-cols-7 gap-1.5 text-[10px] uppercase tracking-wider text-neutral-500">
        {(isEn
          ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
        ).map((d) => (
          <div key={d} className="text-center font-semibold py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grille jours */}
      <div className={`grid grid-cols-7 gap-1.5 ${brush ? 'select-none' : ''}`}>
        {cells.map((cell, i) => (
          <CalendarCell
            key={i}
            cell={cell}
            editable={!!editable && cell.dayNum !== null && !cell.isWeekend}
            isOpen={openIso !== null && openIso === cell.iso}
            onOpen={() => setOpenIso(cell.iso)}
            onClose={() => setOpenIso(null)}
            onChange={onChange}
            primaryColor={primaryColor}
            brush={brush}
            isEn={isEn}
            isPending={cell.iso !== null && pending.has(cell.iso)}
            onPaintStart={startPaint}
            onPaintEnter={paintEnter}
          />
        ))}
      </div>

      {/* Légende + totaux */}
      <div className="flex items-center justify-between gap-3 flex-wrap text-xs pt-2">
        <div className="flex items-center gap-3 flex-wrap">
          {(Object.keys(KIND_META) as TimesheetDayKind[]).map((k) => {
            const meta = KIND_META[k];
            const Icon = meta.icon;
            const count = totals[k];
            return (
              <div
                key={k}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 ${meta.border} ${meta.bg} ${meta.text}`}
              >
                <Icon className="h-3 w-3" />
                <span className="font-medium">{kindLabel(k, isEn)}</span>
                <span className="text-[10px] opacity-80">
                  {k === 'worked' ? `${count} ${isEn ? 'd' : 'j'}` : count > 0 ? `· ${count}` : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CalendarCell({
  cell,
  editable,
  isOpen,
  onOpen,
  onClose,
  onChange,
  primaryColor,
  brush,
  isEn,
  isPending,
  onPaintStart,
  onPaintEnter,
}: {
  cell: Cell;
  editable: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange?: Props['onChange'];
  primaryColor?: string;
  brush: Brush | null;
  isEn: boolean;
  isPending: boolean;
  onPaintStart: (iso: string) => void;
  onPaintEnter: (iso: string) => void;
}) {
  if (cell.dayNum === null) {
    return <div className="aspect-[1.1/1] rounded-md surface-1" />;
  }

  const meta = cell.data ? KIND_META[cell.data.kind] : null;
  const Icon = meta?.icon;

  if (cell.isWeekend) {
    return (
      <div className="aspect-[1.1/1] rounded-md border border-hairline surface-1 p-1.5 text-[10px] text-neutral-600 flex flex-col">
        <div className="flex items-baseline justify-between">
          <span>{cell.dayNum}</span>
          <span className="text-[8px] uppercase tracking-wider">WE</span>
        </div>
      </div>
    );
  }

  const baseClasses = `aspect-[1.1/1] rounded-md border p-1.5 text-[11px] flex flex-col justify-between relative transition`;
  // Aperçu "pinceau" : les jours balayés prennent la couleur du type choisi
  // avant même le commit — feedback immédiat du lot en cours.
  const pendingPreview =
    isPending && brush
      ? brush.kind
        ? `${baseClasses} ${KIND_META[brush.kind].border} ${KIND_META[brush.kind].bg} ${KIND_META[brush.kind].text} ring-2 ring-violet-glow/50`
        : `${baseClasses} border-dashed border-red-500/50 bg-red-500/[0.06] text-red-300 ring-2 ring-red-500/40`
      : null;
  const cellClasses =
    pendingPreview ??
    (meta
      ? `${baseClasses} ${meta.border} ${meta.bg} ${meta.text}`
      : `${baseClasses} border-hairline surface-1 text-neutral-400`);

  const interactive = editable
    ? brush
      ? 'cursor-crosshair hover:ring-1 hover:ring-violet-glow/50'
      : 'cursor-pointer hover:brightness-125 hover:ring-1 hover:ring-violet-glow/40'
    : '';

  async function handlePick(
    kind: TimesheetDayKind | null,
    duration?: number,
  ) {
    if (!cell.iso || !onChange) return;
    onClose();
    await onChange(cell.iso, { kind, duration });
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={!editable}
        onClick={() => {
          // Pinceau actif → le clic est géré par mousedown/mouseup (paint).
          if (editable && !brush) onOpen();
        }}
        onMouseDown={(e) => {
          if (!editable || !brush || !cell.iso) return;
          e.preventDefault();
          onPaintStart(cell.iso);
        }}
        onMouseEnter={() => {
          if (!editable || !brush || !cell.iso) return;
          onPaintEnter(cell.iso);
        }}
        className={`${cellClasses} ${interactive} w-full text-left`}
        aria-label={`${cell.iso} — ${(cell.data ? kindLabel(cell.data.kind, isEn) : null) ?? (isEn ? 'empty' : 'vide')}`}
        title={
          brush
            ? isEn ? `Apply "${brush.label}"` : `Appliquer « ${brush.label} »`
            : (cell.data ? kindLabel(cell.data.kind, isEn) : null) ?? (isEn ? 'Click to edit' : 'Cliquer pour modifier')
        }
      >
        <div className="flex items-baseline justify-between">
          <span className="font-bold">{cell.dayNum}</span>
          {Icon && <Icon className="h-3 w-3" />}
        </div>
        {cell.data && cell.data.kind === 'worked' && (
          <div
            className="text-[10px] font-bold self-end"
            style={primaryColor ? { color: primaryColor } : undefined}
          >
            {cell.data.duration === 1 ? (isEn ? '1 d' : '1 j') : `${cell.data.duration} ${isEn ? 'd' : 'j'}`}
          </div>
        )}
        {cell.data && cell.data.kind !== 'worked' && (
          <div className="text-[8px] uppercase tracking-wider opacity-70 self-end">
            {kindLabel(cell.data.kind, isEn)}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-1 w-44 rounded-lg border border-hairline bg-card shadow-2xl overflow-hidden">
          {(Object.keys(KIND_META) as TimesheetDayKind[]).map((k) => {
            const km = KIND_META[k];
            const KI = km.icon;
            const isCurrent = cell.data?.kind === k && cell.data.duration === 1;
            return (
              <button
                key={k}
                type="button"
                onClick={() => handlePick(k, k === 'worked' ? 1 : undefined)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/[0.04] ${km.text} ${isCurrent ? 'bg-white/[0.04]' : ''}`}
              >
                <KI className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">{kindLabel(k, isEn)}</span>
                {isCurrent && <span className="text-[9px] opacity-60">✓</span>}
              </button>
            );
          })}
          {/* Demi-journée */}
          <button
            type="button"
            onClick={() => handlePick('worked', 0.5)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/[0.04] text-violet-200 border-t border-hairline"
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">{isEn ? 'Half day' : 'Demi-journée'}</span>
            {cell.data?.kind === 'worked' && cell.data.duration === 0.5 && (
              <span className="text-[9px] opacity-60">✓</span>
            )}
          </button>
          {/* Vider */}
          {cell.data && (
            <button
              type="button"
              onClick={() => handlePick(null)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-red-500/10 text-red-300 border-t border-hairline"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="flex-1 text-left">{isEn ? 'Clear' : 'Vider'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function buildCells(year: number, month: number, days: CalendarDay[]): Cell[] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstIso = ((firstDay.getDay() + 6) % 7) + 1; // Lun=1..Dim=7
  const leading = firstIso - 1;

  const byDate = new Map<string, CalendarDay>();
  for (const d of days) byDate.set(d.day_date.slice(0, 10), d);

  const cells: Cell[] = [];
  for (let i = 0; i < leading; i++) {
    cells.push({ dayNum: null, iso: null, isWeekend: false, data: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dow = new Date(year, month - 1, d).getDay();
    const isWeekend = dow === 0 || dow === 6;
    cells.push({
      dayNum: d,
      iso,
      isWeekend,
      data: byDate.get(iso) ?? null,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ dayNum: null, iso: null, isWeekend: false, data: null });
  }
  return cells;
}
