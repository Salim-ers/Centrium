'use client';

import Link from 'next/link';
import { AlertTriangle, ChevronRight, ClipboardCheck, PenLine, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/app/EmptyState';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { fetchMyMissions } from '@/lib/portal/consultant-data';
import { craOverview } from '@/lib/portal/consultant-home';
import { CONSULTANT_TIMESHEET_STATUS, periodLabel, statusOf } from '@/lib/status';
import { missionLabel } from '@/lib/timesheets/approvals';
import { cn } from '@/lib/utils';
import type { PortalMission, Timesheet } from '@/types';
import { usePortalConsultant } from '../portal-context';

type Data = { timesheets: Timesheet[]; missions: PortalMission[] };

async function load(consultantId: string): Promise<Data> {
  const supabase = createClient();
  const [ts, missions] = await Promise.all([
    supabase
      .from('timesheets')
      .select('*')
      .eq('consultant_id', consultantId)
      .eq('archived', false)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(120),
    fetchMyMissions(supabase),
  ]);
  return { timesheets: (ts.data ?? []) as Timesheet[], missions };
}

type Todo = {
  key: string;
  tone: 'danger' | 'warning' | 'brand';
  title: string;
  detail: string | null;
  href: string;
  cta: string;
  sheetId: string | null;
};

const byPeriodDesc = (a: Timesheet, b: Timesheet) => b.period_year - a.period_year || b.period_month - a.period_month;

/**
 * Mes CRA : d'abord ce qu'il reste à faire (à corriger, en retard, mois en
 * cours), puis l'historique, du plus récent au plus ancien.
 */
export default function PortalCraListPage() {
  const { consultantId } = usePortalConsultant();
  const brandName = useBrandName();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { data, loading } = useCachedQuery<Data>(`portal-cra:${consultantId}`, () => load(consultantId));

  const sheets = [...(data?.timesheets ?? [])].sort(byPeriodDesc);
  const missions = data?.missions ?? [];
  const missionById = new Map(missions.map((m) => [m.id, m]));
  const label = (missionId: string | null) => {
    const m = missionId ? missionById.get(missionId) : null;
    return m ? missionLabel(m.title, m.company_name) : null;
  };
  const days = (n: number) => `${n.toLocaleString(fr ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 })} ${fr ? 'j' : 'd'}`;
  const newHref = (missionId: string, month: number, year: number) => `/portal/cra/new?mission=${missionId}&month=${month}&year=${year}`;

  const cra = craOverview(missions, sheets, new Date());
  const todos: Todo[] = [];
  for (const t of cra.rejected.sort(byPeriodDesc)) {
    todos.push({
      key: t.id,
      tone: 'danger',
      title: fr ? `${periodLabel(t.period_month, t.period_year, lang)} · à corriger` : `${periodLabel(t.period_month, t.period_year, lang)} · to fix`,
      detail: t.rejection_reason ?? label(t.mission_id),
      href: `/portal/cra/${t.id}`,
      cta: fr ? 'Corriger' : 'Fix',
      sheetId: t.id,
    });
  }
  for (const { mission, sheet } of cra.previousDue) {
    const period = periodLabel(cra.prev.month, cra.prev.year, lang);
    todos.push({
      key: `prev-${mission.id}`,
      tone: 'warning',
      title: fr ? `${period} · à envoyer` : `${period} · to send`,
      detail: [missionLabel(mission.title, mission.company_name), sheet ? (fr ? `brouillon, ${days(Number(sheet.days_worked))} saisis` : `draft, ${days(Number(sheet.days_worked))} entered`) : null]
        .filter(Boolean)
        .join(' · '),
      href: sheet ? `/portal/cra/${sheet.id}` : newHref(mission.id, cra.prev.month, cra.prev.year),
      cta: sheet ? (fr ? 'Terminer' : 'Finish') : fr ? 'Remplir' : 'Fill in',
      sheetId: sheet?.id ?? null,
    });
  }
  for (const { mission, sheet } of cra.current) {
    if (sheet && sheet.status !== 'draft') continue;
    const period = periodLabel(cra.month, cra.year, lang);
    todos.push({
      key: `cur-${mission.id}`,
      tone: 'brand',
      title: fr ? `${period} · en cours` : `${period} · this month`,
      detail: [missionLabel(mission.title, mission.company_name), sheet ? (fr ? `${days(Number(sheet.days_worked))} saisis` : `${days(Number(sheet.days_worked))} entered`) : null]
        .filter(Boolean)
        .join(' · '),
      href: sheet ? `/portal/cra/${sheet.id}` : newHref(mission.id, cra.month, cra.year),
      cta: sheet ? (fr ? 'Continuer' : 'Continue') : fr ? 'Remplir' : 'Fill in',
      sheetId: sheet?.id ?? null,
    });
  }
  const inTodo = new Set(todos.map((t) => t.sheetId).filter(Boolean));
  const history = sheets.filter((t) => !inTodo.has(t.id));

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">{fr ? 'Mes CRA' : 'My timesheets'}</h1>
          <p className="text-[13.5px] text-muted-foreground">
            {fr ? `Vos jours, télétravail et absences, envoyés chaque mois à ${brandName}.` : `Your days, remote work and absences, sent to ${brandName} every month.`}
          </p>
        </div>
        <Button asChild variant="outline" className="hidden sm:inline-flex">
          <Link href="/portal/cra/new">
            <Plus />
            {fr ? 'Nouveau CRA' : 'New timesheet'}
          </Link>
        </Button>
      </header>

      {loading && !data ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <>
          {todos.length > 0 && (
            <section className="space-y-2" aria-labelledby="cra-todo">
              <h2 id="cra-todo" className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                {fr ? 'À faire' : 'To do'}
              </h2>
              <ul className="space-y-2">
                {todos.map((t) => (
                  <li key={t.key}>
                    <Link
                      href={t.href}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 transition-colors hover:bg-muted/40',
                        t.tone === 'danger' ? 'border-destructive/30' : t.tone === 'warning' ? 'border-warning/40' : 'border-primary/30',
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-9 w-9 shrink-0 place-items-center rounded-xl',
                          t.tone === 'danger' ? 'bg-danger-soft text-destructive' : t.tone === 'warning' ? 'bg-warning-soft text-warning' : 'bg-primary/10 text-primary',
                        )}
                      >
                        {t.tone === 'brand' ? <PenLine className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{t.title}</span>
                        {t.detail && <span className="line-clamp-2 text-[12.5px] text-muted-foreground">{t.detail}</span>}
                      </span>
                      <span className="shrink-0 text-[13px] font-medium text-primary-deep">{t.cta}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {history.length > 0 ? (
            <section className="space-y-2" aria-labelledby="cra-history">
              <h2 id="cra-history" className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                {fr ? 'Historique' : 'History'}
              </h2>
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {history.map((t) => {
                  const st = statusOf(CONSULTANT_TIMESHEET_STATUS, t.status, lang);
                  const mission = label(t.mission_id);
                  const validated = t.status === 'client_validated';
                  return (
                    <li key={t.id}>
                      <Link href={`/portal/cra/${t.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40">
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{periodLabel(t.period_month, t.period_year, lang)}</span>
                            <StatusPill tone={st.tone}>{st.label}</StatusPill>
                          </span>
                          {mission && <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">{mission}</span>}
                        </span>
                        <span className="num shrink-0 text-right text-[13px]">
                          {days(Number(validated ? t.days_validated : t.days_worked))}
                          <span className="block text-[11.5px] text-muted-foreground">{validated ? (fr ? 'validés' : 'approved') : fr ? 'déclarés' : 'declared'}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : (
            todos.length === 0 && (
              <EmptyState
                icon={ClipboardCheck}
                title={fr ? 'Aucun CRA pour l’instant' : 'No timesheet yet'}
                description={fr ? `Vos CRA apparaîtront ici dès votre première mission avec ${brandName}.` : `Your timesheets will show up here from your first ${brandName} mission.`}
              />
            )
          )}

          <Button asChild variant="outline" className="w-full sm:hidden">
            <Link href="/portal/cra/new">
              <Plus />
              {fr ? 'Autre CRA' : 'Another timesheet'}
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}
