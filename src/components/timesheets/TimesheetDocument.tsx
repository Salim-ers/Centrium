import type { Timesheet, Mission, Consultant, Company } from '@/types';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';
import { QuadCoreSignature } from '@/components/brand/QuadCoreSignature';
import { formatCurrency, formatDate } from '@/lib/utils';

type TimesheetDay = {
  id: string;
  day_date: string;
  duration: number;
  note: string | null;
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
  primaryColor: '#6d28d9',
  accentColor: '#e11d74',
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
  const primary = iss.primaryColor || '#6d28d9';
  const accent = iss.accentColor || '#e11d74';
  const monthName = MONTH_NAMES_FR[timesheet.period_month - 1];
  const periodLabel = `${monthName} ${timesheet.period_year}`;

  const calendarDays = buildCalendar(timesheet.period_year, timesheet.period_month, days);

  const totalHt =
    mission && timesheet.days_validated
      ? Number(mission.daily_rate_eur) * Number(timesheet.days_validated)
      : null;

  return (
    <div
      className="qc-print-doc bg-white text-neutral-900 shadow-2xl mx-auto"
      style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Georgia, serif' }}
    >
      <header className="px-12 pt-10 pb-6">
        <div className="flex items-start justify-between gap-6">
          <QuadCoreLogo size="md" src={iss.logoUrl} alt={iss.brandName} />
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
              Compte rendu d&apos;activité
            </div>
            <div className="font-sans text-lg font-bold mt-1 text-neutral-900">{periodLabel}</div>
          </div>
        </div>
        <div
          className="mt-5 h-[2px] w-full"
          style={{ background: `linear-gradient(90deg, ${primary} 0%, ${accent} 55%, transparent 100%)` }}
        />
      </header>

      <section className="px-12 py-4 grid grid-cols-2 gap-8">
        <div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-2">
            Consultant
          </div>
          <div className="text-sm font-semibold">
            {consultant ? `${consultant.first_name} ${consultant.last_name}` : '—'}
          </div>
          {consultant?.job_title && (
            <div className="text-xs text-neutral-600 mt-1">{consultant.job_title}</div>
          )}
        </div>

        <div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-2">Client</div>
          <div className="text-sm font-semibold">{company?.name ?? '—'}</div>
          {mission?.title && (
            <div className="text-xs text-neutral-600 mt-1">Mission : {mission.title}</div>
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
        <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-3">
          Détail journalier
        </div>
        <div className="grid grid-cols-7 gap-px bg-neutral-200 rounded overflow-hidden text-xs">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
            <div
              key={d}
              className="bg-neutral-100 text-center py-1.5 text-[10px] uppercase tracking-wider text-neutral-500 font-semibold"
            >
              {d}
            </div>
          ))}
          {calendarDays.map((c, i) => (
            <div
              key={i}
              className="bg-white px-1.5 py-2 min-h-[52px] flex flex-col justify-between"
              style={{
                backgroundColor: c.duration > 0 ? '#f5f3ff' : c.isWeekend ? '#fafafa' : 'white',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-500">{c.dayNum ?? ''}</span>
                {c.duration > 0 && (
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: primary }}
                  >
                    {c.duration === 1 ? '1j' : `${c.duration}j`}
                  </span>
                )}
              </div>
              {c.note && (
                <div className="text-[8px] text-neutral-500 leading-tight mt-1 truncate">
                  {c.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {mission?.daily_rate_eur && (
        <section className="px-12 py-4 flex justify-end">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-neutral-600">TJM</span>
              <span className="font-medium">{formatCurrency(mission.daily_rate_eur)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-neutral-600">Jours validés</span>
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
          <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-1">Notes</div>
          <p className="text-xs text-neutral-700 whitespace-pre-line">{timesheet.notes}</p>
        </section>
      )}

      <section className="px-12 py-6 border-t border-neutral-100 bg-neutral-50/40">
        <div className="grid grid-cols-2 gap-8 items-end">
          <div className="text-[10px] text-neutral-500 leading-relaxed">
            <div className="font-semibold text-neutral-700 mb-1">Certification</div>
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
              accentColor={accent}
            />
          </div>
        </div>
      </section>

      <footer className="px-12 py-4 text-center">
        <div
          className="h-[2px] w-full mb-3"
          style={{ background: `linear-gradient(90deg, transparent 0%, ${accent} 45%, ${primary} 100%)` }}
        />
        <div className="text-[9px] text-neutral-400 tracking-wider">
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
      <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-0.5">{label}</div>
      <div className="font-medium text-neutral-900">{value}</div>
    </div>
  );
}

type CalendarCell = {
  dayNum: number | null;
  duration: number;
  note: string | null;
  isWeekend: boolean;
};

function buildCalendar(year: number, month: number, days: TimesheetDay[]): CalendarCell[] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  // ISO weekday Mon=1…Sun=7 ; JS getDay Sun=0…Sat=6
  const firstIso = ((firstDay.getDay() + 6) % 7) + 1;
  const leading = firstIso - 1;

  const byDate = new Map<string, { duration: number; note: string | null }>();
  for (const d of days) {
    byDate.set(d.day_date.slice(0, 10), { duration: Number(d.duration), note: d.note });
  }

  const cells: CalendarCell[] = [];
  for (let i = 0; i < leading; i++) {
    cells.push({ dayNum: null, duration: 0, note: null, isWeekend: false });
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
    });
  }
  // Pad trailing to complete the last week
  while (cells.length % 7 !== 0) {
    cells.push({ dayNum: null, duration: 0, note: null, isWeekend: false });
  }
  return cells;
}
