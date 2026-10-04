import type { Timesheet, Mission, Consultant, Company } from '@/types';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';
import { QuadCoreSignature } from '@/components/brand/QuadCoreSignature';
import { formatCurrency, formatDate } from '@/lib/utils';

type TimesheetDayKind =
  | 'worked'
  | 'paid_leave'
  | 'sick_leave'
  | 'unpaid_leave'
  | 'holiday';

type TimesheetDay = {
  id: string;
  day_date: string;
  duration: number;
  note: string | null;
  kind?: TimesheetDayKind;
};

export type TimesheetIssuer = {
  brandName: string;
  logoUrl: string | null;
  footerTagline: string | null;
  signatureUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  representativeName: string | null;
  representativeTitle: string | null;
};

const DEFAULT_ISSUER: TimesheetIssuer = {
  brandName: 'QuadCore',
  logoUrl: null,
  footerTagline: 'IT Services & Consulting',
  signatureUrl: null,
  primaryColor: '#C65F46',
  accentColor: '#9D4432',
  representativeName: 'QuadCore SAS',
  representativeTitle: 'Direction commerciale',
};

type Props = {
  timesheet: Timesheet;
  mission: Mission | null;
  consultant: Consultant | null;
  company: Company | null;
  days: TimesheetDay[];
  issuer?: TimesheetIssuer | null;
};

const MONTH_NAMES_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const STATUS_LABEL_FR: Record<Timesheet['status'], string> = {
  draft: 'Brouillon',
  submitted: 'Soumis au client',
  client_validated: 'Validé client',
  rejected: 'Rejeté',
};

export function TimesheetDocument({
  timesheet,
  mission,
  consultant,
  company,
  days,
  issuer,
}: Props) {
  const iss = issuer ?? DEFAULT_ISSUER;
  const primary = iss.primaryColor || '#C65F46';
  const accent = iss.accentColor || '#9D4432';
  const monthName = MONTH_NAMES_FR[timesheet.period_month - 1];
  const periodLabel = `${monthName} ${timesheet.period_year}`;

  const calendarDays = buildCalendar(timesheet.period_year, timesheet.period_month, days);

  const totalHt =
    mission && timesheet.days_validated
      ? Number(mission.daily_rate_eur) * Number(timesheet.days_validated)
      : null;

  return (
    <div
      className="qc-print-doc bg-white text-foreground shadow-2xl mx-auto"
      style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Georgia, serif' }}
    >
      <header className="px-12 pt-10 pb-6">
        <div className="flex items-start justify-between gap-6">
          <QuadCoreLogo size="md" src={iss.logoUrl} alt={iss.brandName} />
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Compte rendu d&apos;activité
            </div>
            <div className="font-sans text-lg font-bold mt-1 text-foreground">{periodLabel}</div>
          </div>
        </div>
        <div
          className="mt-5 h-[2px] w-full"
          style={{ background: `linear-gradient(90deg, ${primary} 0%, ${accent} 55%, transparent 100%)` }}
        />
      </header>

      <section className="px-12 py-4 grid grid-cols-2 gap-8">
        <div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Consultant
          </div>
          <div className="text-sm font-semibold">
            {consultant ? `${consultant.first_name} ${consultant.last_name}` : '—'}
          </div>
          {consultant?.job_title && (
            <div className="text-xs text-muted-foreground mt-1">{consultant.job_title}</div>
          )}
        </div>

        <div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Client</div>
          <div className="text-sm font-semibold">{company?.name ?? '—'}</div>
          {mission?.title && (
            <div className="text-xs text-muted-foreground mt-1">Mission : {mission.title}</div>
          )}
        </div>
      </section>

      <section className="px-12 py-4 grid grid-cols-4 gap-4 text-xs">
        <InfoField label="Période" value={periodLabel} />
        <InfoField label="Jours travaillés" value={String(timesheet.days_worked)} />
        <InfoField label="Jours validés" value={String(timesheet.days_validated)} />
        <InfoField label="Statut" value={STATUS_LABEL_FR[timesheet.status]} />
      </section>

      <section className="px-12 py-4">
        <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
          Détail journalier
        </div>
        <div className="grid grid-cols-7 gap-px bg-muted rounded overflow-hidden text-xs">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
            <div
              key={d}
              className="bg-muted text-center py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold"
            >
              {d}
            </div>
          ))}
          {calendarDays.map((c, i) => {
            const tag = kindTag(c.kind);
            return (
              <div
                key={i}
                className="bg-white px-1.5 py-2 min-h-[52px] flex flex-col justify-between"
                style={{
                  backgroundColor:
                    c.kind === 'worked'
                      ? '#f5f3ff'
                      : c.kind === 'holiday'
                        ? '#fff7ed'
                        : c.kind === 'paid_leave'
                          ? '#fffbeb'
                          : c.kind === 'sick_leave'
                            ? '#fef2f2'
                            : c.kind === 'unpaid_leave'
                              ? '#f1f5f9'
                              : c.isWeekend
                                ? '#fafafa'
                                : 'white',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{c.dayNum ?? ''}</span>
                  {c.kind === 'worked' && c.duration > 0 && (
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: primary }}
                    >
                      {c.duration === 1 ? '1j' : `${c.duration}j`}
                    </span>
                  )}
                  {tag && (
                    <span
                      className="text-[8px] uppercase tracking-wider font-semibold"
                      style={{ color: tag.color }}
                    >
                      {tag.label}
                    </span>
                  )}
                </div>
                {c.note && (
                  <div className="text-[8px] text-muted-foreground leading-tight mt-1 truncate">
                    {c.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {mission?.daily_rate_eur && (
        <section className="px-12 py-4 flex justify-end">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">TJM</span>
              <span className="font-medium">{formatCurrency(mission.daily_rate_eur)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Jours validés</span>
              <span className="font-medium">{timesheet.days_validated}</span>
            </div>
            <div
              className="flex justify-between py-2 border-t-2 text-base font-bold"
              style={{ borderColor: primary }}
            >
              <span>Total HT estimé</span>
              <span style={{ color: accent }}>{formatCurrency(totalHt)}</span>
            </div>
          </div>
        </section>
      )}

      {timesheet.notes && (
        <section className="px-12 py-4">
          <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Notes</div>
          <p className="text-xs text-foreground whitespace-pre-line">{timesheet.notes}</p>
        </section>
      )}

      <section className="px-12 py-6 border-t border-border bg-muted">
        <div className="grid grid-cols-2 gap-8 items-end">
          <div className="text-[10px] text-muted-foreground leading-relaxed">
            <div className="font-semibold text-foreground mb-1">Certification</div>
            Ce compte rendu d&apos;activité atteste du temps réellement passé sur la mission. Il
            fait foi pour la facturation conforme aux conditions contractuelles signées avec le
            client.
          </div>
          <div className="flex justify-end">
            <QuadCoreSignature
              signerName={iss.representativeName ?? 'QuadCore SAS'}
              signerRole={iss.representativeTitle ?? 'Direction commerciale'}
              date={
                timesheet.validated_at
                  ? formatDate(timesheet.validated_at)
                  : formatDate(new Date().toISOString())
              }
              imageUrl={iss.signatureUrl}
              brandName={iss.brandName}
              logoUrl={iss.logoUrl}
            />
          </div>
        </div>
      </section>

      <footer className="px-12 py-4 text-center">
        <div
          className="h-[2px] w-full mb-3"
          style={{ background: `linear-gradient(90deg, transparent 0%, ${accent} 45%, ${primary} 100%)` }}
        />
        <div className="text-[9px] text-muted-foreground tracking-wider">
          {iss.brandName}
          {iss.footerTagline ? ` · ${iss.footerTagline}` : ''} · CRA {periodLabel}
        </div>
      </footer>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-0.5">{label}</div>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  );
}

type CalendarCell = {
  dayNum: number | null;
  duration: number;
  note: string | null;
  isWeekend: boolean;
  kind: TimesheetDayKind | null;
};

function kindTag(
  kind: TimesheetDayKind | null,
): { label: string; color: string } | null {
  switch (kind) {
    case 'holiday':
      return { label: 'Férié', color: '#c2410c' };
    case 'paid_leave':
      return { label: 'Congé', color: '#b45309' };
    case 'sick_leave':
      return { label: 'Maladie', color: '#b91c1c' };
    case 'unpaid_leave':
      return { label: 'Sans solde', color: '#64748b' };
    default:
      return null;
  }
}

function buildCalendar(year: number, month: number, days: TimesheetDay[]): CalendarCell[] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstIso = ((firstDay.getDay() + 6) % 7) + 1;
  const leading = firstIso - 1;

  const byDate = new Map<
    string,
    { duration: number; note: string | null; kind: TimesheetDayKind | null }
  >();
  for (const d of days) {
    byDate.set(d.day_date.slice(0, 10), {
      duration: Number(d.duration),
      note: d.note,
      kind: d.kind ?? (Number(d.duration) > 0 ? 'worked' : null),
    });
  }

  const cells: CalendarCell[] = [];
  for (let i = 0; i < leading; i++) {
    cells.push({ dayNum: null, duration: 0, note: null, isWeekend: false, kind: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const entry = byDate.get(iso);
    const dow = new Date(year, month - 1, d).getDay();
    const isWeekend = dow === 0 || dow === 6;
    cells.push({
      dayNum: d,
      duration: entry?.duration ?? 0,
      note: entry?.note ?? null,
      isWeekend,
      kind: entry?.kind ?? null,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ dayNum: null, duration: 0, note: null, isWeekend: false, kind: null });
  }
  return cells;
}
