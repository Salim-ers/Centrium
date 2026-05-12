'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, Palmtree, HeartPulse, MinusCircle, Sparkles, Trash2 } from 'lucide-react';

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

type Cell = {
  dayNum: number | null;
  iso: string | null;
  isWeekend: boolean;
  data: CalendarDay | null;
};

export function TimesheetCalendar({
  year,
  month,
  days,
  editable = false,
  onChange,
  primaryColor,
}: Props) {
  const cells = useMemo(() => buildCells(year, month, days), [year, month, days]);
  const [openIso, setOpenIso] = useState<string | null>(null);

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
      {/* En-têtes jours */}
      <div className="grid grid-cols-7 gap-1.5 text-[10px] uppercase tracking-wider text-neutral-500">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
          <div key={d} className="text-center font-semibold py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grille jours */}
      <div className="grid grid-cols-7 gap-1.5">
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
                <span className="font-medium">{meta.label}</span>
                <span className="text-[10px] opacity-80">
                  {k === 'worked' ? `${count} j` : count > 0 ? `· ${count}` : ''}
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
}: {
  cell: Cell;
  editable: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange?: Props['onChange'];
  primaryColor?: string;
}) {
  if (cell.dayNum === null) {
    return <div className="aspect-[1.1/1] rounded-md bg-white/[0.015]" />;
  }

  const meta = cell.data ? KIND_META[cell.data.kind] : null;
  const Icon = meta?.icon;

  if (cell.isWeekend) {
    return (
      <div className="aspect-[1.1/1] rounded-md border border-hairline bg-white/[0.015] p-1.5 text-[10px] text-neutral-600 flex flex-col">
        <div className="flex items-baseline justify-between">
          <span>{cell.dayNum}</span>
          <span className="text-[8px] uppercase tracking-wider">WE</span>
        </div>
      </div>
    );
  }

  const baseClasses = `aspect-[1.1/1] rounded-md border p-1.5 text-[11px] flex flex-col justify-between relative transition`;
  const cellClasses = meta
    ? `${baseClasses} ${meta.border} ${meta.bg} ${meta.text}`
    : `${baseClasses} border-hairline bg-white/[0.02] text-neutral-400`;

  const interactive = editable
    ? 'cursor-pointer hover:brightness-125 hover:ring-1 hover:ring-violet-glow/40'
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
        onClick={() => editable && onOpen()}
        className={`${cellClasses} ${interactive} w-full text-left`}
        aria-label={`${cell.iso} — ${meta?.label ?? 'vide'}`}
        title={meta?.label ?? 'Cliquer pour modifier'}
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
            {cell.data.duration === 1 ? '1 j' : `${cell.data.duration} j`}
          </div>
        )}
        {cell.data && cell.data.kind !== 'worked' && (
          <div className="text-[8px] uppercase tracking-wider opacity-70 self-end">
            {meta?.label}
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
                <span className="flex-1 text-left">{km.label}</span>
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
            <span className="flex-1 text-left">Demi-journée</span>
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
              <span className="flex-1 text-left">Vider</span>
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
