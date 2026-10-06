'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, Home, Palmtree, HeartPulse, MinusCircle, Sparkles, Trash2 } from 'lucide-react';

import { useLocale } from '@/lib/i18n/LocaleProvider';
import { inSpan, type MissionSpan } from '@/lib/timesheets/month';

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
  /** Jour travaillé en télétravail. */
  is_remote?: boolean | null;
};

/** Modification d'un jour : type, durée (1 / 0,5), télétravail. */
export type DayChange = { kind: TimesheetDayKind | null; duration?: number; is_remote?: boolean; note?: string | null };

type Props = {
  year: number;
  month: number; // 1..12
  days: CalendarDay[];
  primaryColor?: string;
  /** Si false, cellules non cliquables (lecture seule). */
  editable?: boolean;
  /** Callback à chaque modification. duration optionnel (1 ou 0.5). */
  onChange?: (dayDate: string, next: DayChange) => Promise<void> | void;
  /**
   * Callback pour appliquer un même type à PLUSIEURS jours d'un coup
   * (pinceau + clic-glissé). Permet au parent de batcher les upserts et
   * de ne recharger qu'une seule fois. Fallback : onChange jour par jour.
   */
  onBatchChange?: (dayDates: string[], next: DayChange) => Promise<void> | void;
  /** Légende et totaux sous la grille (masqués quand la page affiche son propre récapitulatif). */
  legend?: boolean;
  /** Période de la mission : les jours ouvrés hors période sont atténués. */
  missionSpan?: MissionSpan;
};

/** Pinceau de remplissage rapide : un type + durée, ou "vider". */
type Brush = {
  id: string;
  kind: TimesheetDayKind | null;
  duration?: number;
  remote?: boolean;
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
    bg: 'bg-primary/15',
    border: 'border-primary/40',
    text: 'text-primary',
    icon: Briefcase,
  },
  paid_leave: {
    label: 'Congés payés',
    bg: 'bg-warning/15',
    border: 'border-warning/40',
    text: 'text-warning',
    icon: Palmtree,
  },
  sick_leave: {
    label: 'Maladie',
    bg: 'bg-destructive/15',
    border: 'border-destructive/40',
    text: 'text-destructive',
    icon: HeartPulse,
  },
  unpaid_leave: {
    label: 'Sans solde',
    bg: 'bg-muted',
    border: 'border-border',
    text: 'text-muted-foreground',
    icon: MinusCircle,
  },
  holiday: {
    label: 'Férié',
    bg: 'bg-warning/15',
    border: 'border-warning/40',
    text: 'text-warning',
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
  /** En dehors de la période de la mission. */
  outside: boolean;
  data: CalendarDay | null;
};

function buildBrushes(isEn: boolean): Brush[] {
  return [
    { id: 'worked', kind: 'worked', duration: 1, label: isEn ? 'Worked' : 'Travaillé', icon: Briefcase, activeClass: `${KIND_META.worked.border} ${KIND_META.worked.bg} ${KIND_META.worked.text}` },
    { id: 'remote', kind: 'worked', duration: 1, remote: true, label: isEn ? 'Remote' : 'Télétravail', icon: Home, activeClass: `${KIND_META.worked.border} ${KIND_META.worked.bg} ${KIND_META.worked.text}` },
    { id: 'half', kind: 'worked', duration: 0.5, label: isEn ? 'Half day' : 'Demi-journée', icon: Briefcase, activeClass: `${KIND_META.worked.border} ${KIND_META.worked.bg} ${KIND_META.worked.text}` },
    { id: 'paid_leave', kind: 'paid_leave', label: kindLabel('paid_leave', isEn), icon: Palmtree, activeClass: `${KIND_META.paid_leave.border} ${KIND_META.paid_leave.bg} ${KIND_META.paid_leave.text}` },
    { id: 'sick_leave', kind: 'sick_leave', label: kindLabel('sick_leave', isEn), icon: HeartPulse, activeClass: `${KIND_META.sick_leave.border} ${KIND_META.sick_leave.bg} ${KIND_META.sick_leave.text}` },
    { id: 'unpaid_leave', kind: 'unpaid_leave', label: kindLabel('unpaid_leave', isEn), icon: MinusCircle, activeClass: `${KIND_META.unpaid_leave.border} ${KIND_META.unpaid_leave.bg} ${KIND_META.unpaid_leave.text}` },
    { id: 'holiday', kind: 'holiday', label: kindLabel('holiday', isEn), icon: Sparkles, activeClass: `${KIND_META.holiday.border} ${KIND_META.holiday.bg} ${KIND_META.holiday.text}` },
    { id: 'clear', kind: null, label: isEn ? 'Clear' : 'Vider', icon: Trash2, activeClass: 'border-destructive/40 bg-destructive/10 text-destructive' },
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
  legend = true,
  missionSpan = null,
}: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const BRUSHES = useMemo(() => buildBrushes(isEn), [isEn]);
  const cells = useMemo(() => buildCells(year, month, days, missionSpan), [year, month, days, missionSpan]);
  const [openIso, setOpenIso] = useState<string | null>(null);

  // ============ Pinceau + glissé multi-jours ============
  // brush = null → comportement historique (clic = popover jour par jour).
  // brush actif → pointerdown puis glissé (souris ou doigt) peignent les
  // jours, pointerup commit le lot en un seul batch (une seule sauvegarde,
  // un seul reload).
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
        const next: DayChange = { kind: brush.kind, duration: brush.duration, is_remote: brush.kind === 'worked' && !!brush.remote };
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
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
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
  // Au doigt, le pointeur reste capturé par la première case : on retrouve
  // la case survolée par sa position.
  function paintMove(e: React.PointerEvent) {
    if (!painting) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-paint-iso]');
    const iso = el?.dataset.paintIso;
    if (iso) paintEnter(iso);
  }

  // Totaux
  const totals = useMemo(() => {
    const t = { worked: 0, paid_leave: 0, sick_leave: 0, unpaid_leave: 0, holiday: 0, remote: 0 };
    for (const d of days) {
      if (d.kind === 'worked') {
        t.worked += Number(d.duration);
        if (d.is_remote) t.remote += Number(d.duration);
      } else t[d.kind] += 1;
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
        <div className="space-y-1.5">
          {/* Une ligne qui défile sur mobile, plusieurs lignes au-delà. */}
          <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            <span className="mr-1 hidden shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:inline">
              {isEn ? 'Quick fill' : 'Remplissage rapide'}
            </span>
            {BRUSHES.map((b) => {
              const BI = b.icon;
              const active = brush?.id === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setBrush(active ? null : b)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                    active
                      ? `${b.activeClass} ring-1 ring-current/30`
                      : 'border-hairline text-muted-foreground hover-surface hover:text-foreground'
                  }`}
                  title={
                    active
                      ? isEn ? 'Disable the brush' : 'Désactiver le pinceau'
                      : isEn ? 'Select, then tap or drag over the days' : 'Sélectionner, puis toucher ou glisser sur les jours'
                  }
                >
                  <BI className="h-3 w-3" />
                  {b.label}
                </button>
              );
            })}
          </div>
          {(saving || brush) && (
            <p className="text-[11.5px] text-muted-foreground" aria-live="polite">
              {saving
                ? isEn ? 'Saving…' : 'Enregistrement…'
                : isEn
                  ? `“${brush!.label}”: tap or drag over the days, then tap the button again to stop.`
                  : `« ${brush!.label} » : touchez ou glissez sur les jours, puis touchez à nouveau le bouton pour arrêter.`}
            </p>
          )}
        </div>
      )}

      {/* En-têtes jours */}
      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground sm:gap-1.5">
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
      <div className={`grid grid-cols-7 gap-1 sm:gap-1.5 ${brush ? 'touch-none select-none' : ''}`} onPointerMove={paintMove}>
        {cells.map((cell, i) => (
          <CalendarCell
            key={i}
            col={i % 7}
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
      {legend && (
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
                  {k === 'worked' && totals.remote > 0 ? (isEn ? ` · ${totals.remote} remote` : ` · dont ${totals.remote} en télétravail`) : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}

function CalendarCell({
  col,
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
  /** Colonne (0 = lundi) : le menu du jour s'aligne pour ne pas sortir de l'écran. */
  col: number;
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
      <div className="aspect-[1.1/1] rounded-md border border-hairline surface-1 p-1.5 text-[10px] text-muted-foreground flex flex-col">
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
        ? `${baseClasses} ${KIND_META[brush.kind].border} ${KIND_META[brush.kind].bg} ${KIND_META[brush.kind].text} ring-2 ring-primary/50`
        : `${baseClasses} border-dashed border-destructive/50 bg-destructive/[0.06] text-destructive ring-2 ring-destructive/40`
      : null;
  const cellClasses =
    pendingPreview ??
    (meta
      ? `${baseClasses} ${meta.border} ${meta.bg} ${meta.text}`
      : cell.outside
        ? `${baseClasses} border-dashed border-hairline bg-transparent text-muted-foreground/50`
        : `${baseClasses} border-hairline surface-1 text-muted-foreground`);

  const interactive = editable
    ? brush
      ? 'cursor-crosshair hover:ring-1 hover:ring-primary/50'
      : 'cursor-pointer hover:brightness-125 hover:ring-1 hover:ring-primary/40'
    : '';

  async function handlePick(kind: TimesheetDayKind | null, duration?: number, remote?: boolean) {
    if (!cell.iso || !onChange) return;
    onClose();
    await onChange(cell.iso, { kind, duration, is_remote: kind === 'worked' && !!remote });
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
        onPointerDown={(e) => {
          if (!editable || !brush || !cell.iso) return;
          e.preventDefault();
          onPaintStart(cell.iso);
        }}
        onPointerEnter={() => {
          if (!editable || !brush || !cell.iso) return;
          onPaintEnter(cell.iso);
        }}
        data-paint-iso={editable && cell.iso ? cell.iso : undefined}
        className={`${cellClasses} ${interactive} w-full text-left`}
        aria-label={`${cell.iso} — ${(cell.data ? kindLabel(cell.data.kind, isEn) : null) ?? (cell.outside ? (isEn ? 'outside the mission' : 'hors mission') : isEn ? 'empty' : 'vide')}`}
        title={
          brush
            ? isEn ? `Apply "${brush.label}"` : `Appliquer « ${brush.label} »`
            : (cell.data ? kindLabel(cell.data.kind, isEn) : null) ?? (isEn ? 'Click to edit' : 'Cliquer pour modifier')
        }
      >
        <div className="flex items-baseline justify-between">
          <span className="font-bold">{cell.dayNum}</span>
          {cell.data?.kind === 'worked' && cell.data.is_remote ? (
            <Home className="h-3 w-3" aria-label={isEn ? 'Remote' : 'Télétravail'} />
          ) : (
            Icon && <Icon className="h-3 w-3" />
          )}
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
        {!cell.data && cell.outside && (
          <div className="hidden self-end text-[8px] uppercase tracking-wider sm:block">{isEn ? 'Off mission' : 'Hors mission'}</div>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute z-30 top-full mt-1 w-44 rounded-lg border border-hairline bg-card shadow-2xl overflow-hidden ${
            col <= 1 ? 'left-0' : col >= 5 ? 'right-0' : 'left-1/2 -translate-x-1/2'
          }`}
        >
          {(Object.keys(KIND_META) as TimesheetDayKind[]).map((k) => {
            const km = KIND_META[k];
            const KI = km.icon;
            const isCurrent = cell.data?.kind === k && cell.data.duration === 1 && !(k === 'worked' && cell.data.is_remote);
            return (
              <button
                key={k}
                type="button"
                onClick={() => handlePick(k, k === 'worked' ? 1 : undefined)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs sm:py-2 hover:bg-muted ${km.text} ${isCurrent ? 'bg-card' : ''}`}
              >
                <KI className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">{kindLabel(k, isEn)}</span>
                {isCurrent && <span className="text-[9px] opacity-60">✓</span>}
              </button>
            );
          })}
          {/* Télétravail */}
          <button
            type="button"
            onClick={() => handlePick('worked', 1, true)}
            className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs sm:py-2 hover:bg-muted border-t border-hairline ${KIND_META.worked.text}`}
          >
            <Home className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">{isEn ? 'Remote' : 'Télétravail'}</span>
            {cell.data?.kind === 'worked' && cell.data.is_remote && <span className="text-[9px] opacity-60">✓</span>}
          </button>
          {/* Demi-journée */}
          <button
            type="button"
            onClick={() => handlePick('worked', 0.5)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs sm:py-2 hover:bg-muted text-primary border-t border-hairline"
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
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs sm:py-2 hover:bg-destructive/10 text-destructive border-t border-hairline"
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

function buildCells(year: number, month: number, days: CalendarDay[], span: MissionSpan): Cell[] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstIso = ((firstDay.getDay() + 6) % 7) + 1; // Lun=1..Dim=7
  const leading = firstIso - 1;

  const byDate = new Map<string, CalendarDay>();
  for (const d of days) byDate.set(d.day_date.slice(0, 10), d);

  const cells: Cell[] = [];
  for (let i = 0; i < leading; i++) {
    cells.push({ dayNum: null, iso: null, isWeekend: false, outside: false, data: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dow = new Date(year, month - 1, d).getDay();
    const isWeekend = dow === 0 || dow === 6;
    cells.push({
      dayNum: d,
      iso,
      isWeekend,
      outside: !inSpan(iso, span),
      data: byDate.get(iso) ?? null,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ dayNum: null, iso: null, isWeekend: false, outside: false, data: null });
  }
  return cells;
}
