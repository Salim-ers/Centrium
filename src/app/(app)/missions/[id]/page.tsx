'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Banknote,
  Briefcase,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  FileSignature,
  FileText,
  Gauge,
  Pause,
  Pencil,
  Play,
  Receipt,
  Square,
  Wallet,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { StatStrip, type StatItem } from '@/components/app/StatStrip';
import { FactList } from '@/components/app/FactList';
import { NotesPanel } from '@/components/app/NotesPanel';
import { ActivityTimeline } from '@/components/app/ActivityTimeline';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { Select } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { MissionDrawer } from '@/components/missions/MissionDrawer';
import { MissionTimeline } from '@/components/missions/MissionTimeline';
import { RenewalPrompt } from '@/components/missions/RenewalPrompt';
import { TaskList } from '@/components/crm/TaskList';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useTeamMembers } from '@/hooks/useOrgDirectory';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { businessDaysBetween } from '@/lib/utils/business-days';
import { daysUntil } from '@/lib/pilotage/metrics';
import { renewalStage } from '@/lib/missions/renewal';
import { REMOTE_POLICY_LABEL, type RemotePolicy } from '@/lib/validators/v2';
import { DOCUMENT_KIND, INVOICE_STATUS, MISSION_STATUS, RENEWAL_STATUS, TIMESHEET_STATUS, periodLabel, statusOf } from '@/lib/status';
import { formatDate, formatEur, formatEurCompact, formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Invoice, LibraryDocument, Mission, Timesheet } from '@/types';

type Detail = {
  mission: Mission & {
    consultants: { id: string; first_name: string; last_name: string; job_title: string | null; contract_type: string | null } | null;
    companies: { id: string; name: string } | null;
  };
  cost: number | null;
  costSource: 'mission' | 'consultant' | null;
  timesheets: Timesheet[];
  documents: LibraryDocument[];
  contracts: Array<{ id: string; title: string | null; status: string; contract_number: string | null; created_at: string }>;
  invoices: Array<Pick<Invoice, 'id' | 'invoice_number' | 'amount_ht' | 'status' | 'period_label' | 'party'>>;
};

type Tab = 'timeline' | 'cra' | 'documents' | 'history';

async function loadMission(id: string, financials: boolean, docs: boolean, finance: boolean): Promise<Detail | null> {
  const supabase = createClient();
  const { data: mission } = await supabase
    .from('missions')
    .select('*, consultants(id, first_name, last_name, job_title, contract_type), companies(id, name)')
    .eq('id', id)
    .maybeSingle();
  if (!mission) return null;
  const tolerant = <T,>(p: PromiseLike<{ data: unknown; error: unknown }>, fallback: T): Promise<T> =>
    Promise.resolve(p).then((r) => (r.error ? fallback : ((r.data as T | null) ?? fallback)));

  const [mf, cf, timesheets, documents, contracts, invoices] = await Promise.all([
    financials ? tolerant(supabase.from('mission_financials').select('daily_cost_eur').eq('mission_id', id).maybeSingle(), null as { daily_cost_eur: number | null } | null) : null,
    financials
      ? tolerant(supabase.from('consultant_financials').select('daily_cost_eur').eq('consultant_id', mission.consultant_id).maybeSingle(), null as { daily_cost_eur: number | null } | null)
      : null,
    tolerant(
      supabase.from('timesheets').select('*').eq('mission_id', id).eq('archived', false).order('period_year', { ascending: false }).order('period_month', { ascending: false }),
      [] as Timesheet[],
    ),
    docs ? tolerant(supabase.from('documents').select('*').eq('mission_id', id).eq('archived', false).order('created_at', { ascending: false }), [] as LibraryDocument[]) : [],
    docs
      ? tolerant(supabase.from('contracts').select('id, title, status, contract_number, created_at').eq('mission_id', id).eq('archived', false), [] as Detail['contracts'])
      : [],
    finance
      ? tolerant(
          supabase.from('invoices').select('id, invoice_number, amount_ht, status, period_label, party').eq('mission_id', id).eq('archived', false).order('issue_date', { ascending: false }),
          [] as Detail['invoices'],
        )
      : [],
  ]);
  const missionCost = mf?.daily_cost_eur ?? null;
  const consultantCost = cf?.daily_cost_eur ?? null;
  return {
    mission: mission as Detail['mission'],
    cost: missionCost ?? consultantCost,
    costSource: missionCost != null ? 'mission' : consultantCost != null ? 'consultant' : null,
    timesheets,
    documents,
    contracts,
    invoices,
  };
}

/**
 * Cockpit mission : client, consultant et statut en tête ; TJM, CJM,
 * marge, jours et fin d'un coup d'œil ; frise mois par mois, CRA,
 * documents et historique sans quitter l'écran. À 30 jours de la fin,
 * Centrium pose la question du renouvellement.
 */
export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { byId: members } = useTeamMembers();
  const financials = can('consultants.financials');
  const showRates = financials || can('finance.view');
  const canEdit = can('missions.edit');
  const canDocs = can('documents.view');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const initialTab = params.get('tab');
  const [tab, setTab] = useState<Tab>(initialTab === 'cra' || initialTab === 'documents' || initialTab === 'history' ? initialTab : 'timeline');
  const todayIso = new Date().toISOString().slice(0, 10);

  const { data, loading, reload, setData } = useCachedQuery<Detail | null>(
    `mission-detail:${id}:${financials ? 'f' : 'n'}`,
    () => loadMission(id, financials, canDocs, can('finance.view')),
    { enabled: !!id && ready },
  );

  const stats = useMemo(() => {
    if (!data) return null;
    const m = data.mission;
    const rate = Number(m.daily_rate_eur) || 0;
    const planned = m.planned_days != null ? Number(m.planned_days) : m.end_date ? businessDaysBetween(m.start_date, m.end_date) : null;
    const validatedDays = data.timesheets
      .filter((t) => t.status === 'client_validated')
      .reduce((s, t) => s + Number(t.days_validated || t.days_worked || 0), 0);
    const submittedDays = data.timesheets.filter((t) => t.status === 'submitted').reduce((s, t) => s + Number(t.days_worked || 0), 0);
    const today = new Date();
    const left = m.end_date ? daysUntil(m.end_date, today) : null;
    const remainingDays = m.end_date && m.status === 'active' ? businessDaysBetween(today, m.end_date) : null;
    return {
      rate,
      planned,
      validatedDays,
      submittedDays,
      toApprove: data.timesheets.filter((t) => t.status === 'submitted').length,
      forecast: planned != null ? planned * rate : null,
      realized: validatedDays * rate,
      marginEur: data.cost != null && planned != null ? planned * (rate - data.cost) : null,
      marginPct: data.cost != null && rate > 0 ? ((rate - data.cost) / rate) * 100 : null,
      left,
      remainingDays,
    };
  }, [data]);

  const stage = data ? renewalStage(data.mission, todayIso) : null;

  const alerts = useMemo(() => {
    if (!data || !stats) return [] as Array<{ tone: 'danger' | 'warning'; text: string; href?: string }>;
    const m = data.mission;
    const out: Array<{ tone: 'danger' | 'warning'; text: string; href?: string }> = [];
    // Sous 30 jours, la question du renouvellement prend le relais.
    if (m.status === 'active' && !stage && stats.left != null && stats.left >= 0 && stats.left <= 90) {
      out.push({ tone: 'warning', text: fr ? `La mission se termine dans ${stats.left} jours.` : `The mission ends in ${stats.left} days.` });
    }
    if (m.status === 'active') {
      const now = new Date();
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const started = m.start_date <= `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-28`;
      const has = data.timesheets.some((t) => t.period_year === prev.getFullYear() && t.period_month === prev.getMonth() + 1 && t.status !== 'draft');
      if (started && !has) {
        out.push({
          tone: 'warning',
          text: fr ? `CRA de ${periodLabel(prev.getMonth() + 1, prev.getFullYear(), lang)} non transmis.` : `Timesheet for ${periodLabel(prev.getMonth() + 1, prev.getFullYear(), lang)} not submitted.`,
          href: '/timesheets',
        });
      }
      if (data.contracts.length === 0 && canDocs) {
        out.push({ tone: 'warning', text: fr ? 'Aucun contrat rattaché à cette mission.' : 'No contract linked to this mission.', href: '/contracts' });
      }
    }
    if (m.status === 'active' && financials && data.cost == null) {
      out.push({ tone: 'warning', text: fr ? 'CJM non renseigné : la marge ne peut pas être calculée.' : 'Daily cost missing: margin cannot be computed.' });
    }
    return out;
  }, [data, stats, stage, fr, lang, canDocs, financials]);

  async function patch(body: Record<string, unknown>, success: string) {
    setBusy(true);
    const res = await fetch(`/api/missions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusy(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.message ?? (typeof json.error === 'string' ? json.error : fr ? 'Mise à jour impossible' : 'Update failed'));
      return;
    }
    toast.success(success);
    void reload();
  }

  if (loading && !data) {
    return (
      <AppShell fill>
        <Skeleton className="mb-3 h-5 w-24" />
        <Skeleton className="mb-4 h-8 w-1/2" />
        <Skeleton className="mb-3 h-16 w-full rounded-2xl" />
        <Skeleton className="min-h-0 w-full flex-1 rounded-[22px]" />
      </AppShell>
    );
  }
  if (!data || !stats) {
    return (
      <AppShell>
        <EmptyState
          icon={Briefcase}
          title={fr ? 'Mission introuvable' : 'Mission not found'}
          action={
            <Button asChild variant="secondary">
              <Link href="/missions">{fr ? 'Retour aux missions' : 'Back to missions'}</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const m = data.mission;
  const st = statusOf(MISSION_STATUS, m.status, lang);
  const owner = m.owner_id ? members.get(m.owner_id) : null;
  const consultantName = m.consultants ? `${m.consultants.first_name} ${m.consultants.last_name}` : '—';
  const endingSoon = m.status === 'active' && stats.left != null && stats.left >= 0 && stats.left <= 30;

  const kpis: StatItem[] = [
    ...(showRates ? [{ label: fr ? 'TJM (prix de vente)' : 'Day rate (sell)', value: formatEur(stats.rate, lang), tone: 'terra' as const, icon: Banknote }] : []),
    ...(financials
      ? [
          {
            label: data.costSource === 'consultant' ? (fr ? 'CJM · fiche consultant' : 'Daily cost · consultant profile') : fr ? 'CJM (coût journalier)' : 'Daily cost',
            value: data.cost != null ? formatEur(data.cost, lang) : '—',
            tone: 'ivory' as const,
            icon: Wallet,
          },
          {
            label: stats.marginEur != null ? (fr ? `marge · ${formatEurCompact(stats.marginEur, lang)} sur la mission` : `margin · ${formatEurCompact(stats.marginEur, lang)} over the mission`) : fr ? 'marge' : 'margin',
            value: stats.marginPct != null ? formatPct(stats.marginPct, lang) : '—',
            tone: 'peach' as const,
            icon: Gauge,
          },
        ]
      : []),
    {
      label:
        stats.submittedDays > 0
          ? fr
            ? `jours validés / prévus · ${stats.submittedDays} en attente`
            : `approved / planned days · ${stats.submittedDays} pending`
          : fr
            ? 'jours validés / prévus'
            : 'approved / planned days',
      value: `${stats.validatedDays} / ${stats.planned ?? '—'}`,
      tone: 'white',
      icon: CalendarDays,
    },
    {
      label: m.end_date
        ? m.status === 'active' && stats.left != null && stats.left >= 0
          ? fr
            ? `fin de mission · J-${stats.left}`
            : `mission end · D-${stats.left}`
          : fr
            ? 'fin de mission'
            : 'mission end'
        : fr
          ? 'fin de mission non définie'
          : 'no end date',
      value: m.end_date ? formatDate(m.end_date, lang, 'short') : fr ? 'Sans fin' : 'Open',
      tone: endingSoon ? 'peach' : 'white',
      icon: CalendarClock,
    },
    ...(!showRates ? [{ label: fr ? 'CRA à valider' : 'timesheets to approve', value: stats.toApprove, tone: 'ivory' as const, icon: ClipboardCheck }] : []),
  ];

  const tabs: Array<{ id: Tab; label: React.ReactNode }> = [
    { id: 'timeline', label: fr ? 'Frise' : 'Timeline' },
    { id: 'cra', label: <>CRA <span className="num text-xs font-medium text-muted-foreground">{data.timesheets.length}</span></> },
    ...(canDocs ? [{ id: 'documents' as const, label: <>Documents <span className="num text-xs font-medium text-muted-foreground">{data.contracts.length + data.documents.length}</span></> }] : []),
    { id: 'history', label: fr ? 'Historique' : 'History' },
  ];
  const current = tabs.some((t) => t.id === tab) ? tab : 'timeline';

  return (
    <AppShell fill>
      <PageHeader
        backHref="/missions"
        backLabel="Missions"
        title={m.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusPill tone={st.tone}>{st.label}</StatusPill>
            {m.consultants && (
              <Link href={`/consultants/${m.consultants.id}`} className="font-medium text-foreground hover:text-app-terra-dark">
                {consultantName}
              </Link>
            )}
            {m.companies && (
              <Link href={`/clients/${m.companies.id}`} className="hover:text-foreground">
                {m.companies.name}
              </Link>
            )}
          </span>
        }
        actions={
          canEdit && (
            <>
              {m.status === 'proposed' && (
                <Button onClick={() => void patch({ status: 'active' }, fr ? 'Mission démarrée' : 'Mission started')} loading={busy}>
                  <Play />
                  {fr ? 'Démarrer' : 'Start'}
                </Button>
              )}
              {m.status === 'active' && (
                <>
                  <Button variant="secondary" onClick={() => void patch({ status: 'suspended' }, fr ? 'Mission suspendue' : 'Mission suspended')} disabled={busy}>
                    <Pause />
                    {fr ? 'Suspendre' : 'Suspend'}
                  </Button>
                  <Button variant="secondary" onClick={() => void patch({ status: 'ended' }, fr ? 'Mission terminée' : 'Mission ended')} disabled={busy}>
                    <Square />
                    {fr ? 'Terminer' : 'End'}
                  </Button>
                </>
              )}
              {m.status === 'suspended' && (
                <Button onClick={() => void patch({ status: 'active' }, fr ? 'Mission reprise' : 'Mission resumed')} loading={busy}>
                  <Play />
                  {fr ? 'Reprendre' : 'Resume'}
                </Button>
              )}
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil />
                {fr ? 'Modifier' : 'Edit'}
              </Button>
            </>
          )
        }
      />

      <RenewalPrompt
        className="mb-3 shrink-0"
        mission={m}
        lang={lang}
        today={todayIso}
        canEdit={canEdit}
        showRates={showRates}
        consultantName={m.consultants ? consultantName : undefined}
        ownerName={owner?.name ?? null}
        onChanged={() => void reload()}
      />

      <StatStrip className="mb-3" items={kpis} />

      <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="tile-surface flex min-h-[26rem] flex-col lg:min-h-0">
          <div role="tablist" aria-label={fr ? 'Sections de la mission' : 'Mission sections'} className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-border px-4 pt-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={current === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  '-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 pb-2.5 pt-1.5 text-[13px] font-semibold transition-colors',
                  current === t.id ? 'border-app-terra text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {current === 'timeline' && (
              <div className="space-y-6">
                {stats.planned != null && stats.planned > 0 && (
                  <div>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <h3 className="text-[13px] font-semibold">{fr ? 'Avancement' : 'Progress'}</h3>
                      <span className="num text-xs text-muted-foreground">{formatPct(Math.min(100, (stats.validatedDays / stats.planned) * 100), lang, 0)}</span>
                    </div>
                    <Progress value={stats.validatedDays} max={stats.planned} label={fr ? 'Jours validés sur jours prévus' : 'Approved days out of planned'} />
                    <p className="num mt-1.5 text-xs text-muted-foreground">
                      {stats.validatedDays} / {stats.planned} {fr ? 'jours validés' : 'days approved'}
                      {stats.submittedDays > 0 && ` · ${stats.submittedDays} ${fr ? 'en attente' : 'pending'}`}
                      {stats.remainingDays != null && ` · ${stats.remainingDays} ${fr ? 'jours ouvrés restants' : 'business days left'}`}
                      {showRates && ` · ${fr ? 'CA réalisé' : 'actual revenue'} ${formatEurCompact(stats.realized, lang)}${stats.forecast != null ? ` / ${formatEurCompact(stats.forecast, lang)}` : ''}`}
                    </p>
                  </div>
                )}
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold">{fr ? 'Mois par mois' : 'Month by month'}</h3>
                  <MissionTimeline start={m.start_date} end={m.end_date} sheets={data.timesheets} today={todayIso} lang={lang} />
                </div>
                {data.invoices.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-[13px] font-semibold">{fr ? 'Préfacturation' : 'Pre-invoicing'}</h3>
                    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                      {data.invoices.map((inv) => {
                        const s = statusOf(INVOICE_STATUS, inv.status, lang);
                        return (
                          <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate text-[13.5px]">
                              {inv.invoice_number} · {inv.period_label}
                              <span className="ml-1.5 text-xs text-muted-foreground">{inv.party === 'consultant' ? (fr ? '(sous-traitance)' : '(subcontracting)') : ''}</span>
                            </span>
                            <span className="num text-[13px]">{formatEur(inv.amount_ht, lang)}</span>
                            <StatusPill tone={s.tone}>{s.label}</StatusPill>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {current === 'cra' &&
              (data.timesheets.length === 0 ? (
                <EmptyState
                  size="compact"
                  icon={ClipboardCheck}
                  title={fr ? 'Aucun CRA' : 'No timesheet'}
                  description={fr ? 'Les CRA saisis par le consultant apparaîtront ici.' : 'Timesheets filled by the consultant will appear here.'}
                />
              ) : (
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {data.timesheets.map((t) => {
                    const s = statusOf(TIMESHEET_STATUS, t.status, lang);
                    const days = t.status === 'client_validated' ? t.days_validated : t.days_worked;
                    return (
                      <Link key={t.id} href={`/timesheets/${t.id}`} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50">
                        <span className="min-w-0 flex-1 text-[13.5px] font-medium capitalize">{periodLabel(t.period_month, t.period_year, lang)}</span>
                        <span className="num text-[13px] text-muted-foreground">{days} j</span>
                        {showRates && <span className="num hidden w-24 text-right text-[13px] sm:inline">{formatEur(days * stats.rate, lang)}</span>}
                        <StatusPill tone={s.tone}>{s.label}</StatusPill>
                      </Link>
                    );
                  })}
                </div>
              ))}

            {current === 'documents' && (
              <div className="space-y-5">
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold">{fr ? 'Contrats' : 'Contracts'}</h3>
                  {data.contracts.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">{fr ? 'Aucun contrat.' : 'No contract.'}</p>
                  ) : (
                    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                      {data.contracts.map((c) => (
                        <Link key={c.id} href={`/contracts/${c.id}`} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50">
                          <FileSignature className="h-4 w-4 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-[13.5px]">{c.title ?? c.contract_number ?? (fr ? 'Contrat' : 'Contract')}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(c.created_at, lang, 'short')}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold">{fr ? 'Documents de mission' : 'Mission documents'}</h3>
                  {data.documents.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">{fr ? 'Aucun document.' : 'No document.'}</p>
                  ) : (
                    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                      {data.documents.map((d) => (
                        <Link key={d.id} href={`/documents?doc=${d.id}`} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-[13.5px]">{d.title}</span>
                          <span className="text-xs text-muted-foreground">{DOCUMENT_KIND[d.kind]?.[lang]}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {current === 'history' && (
              <div className="grid gap-6 xl:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold">Notes</h3>
                  <NotesPanel entityType="mission" entityId={m.id} canEdit={canEdit} />
                </div>
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold">{fr ? 'Activité' : 'Activity'}</h3>
                  <ActivityTimeline entityType="mission" entityId={m.id} />
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="no-scrollbar flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto">
          {alerts.length > 0 && (
            <ul className="space-y-1.5">
              {alerts.map((a, i) => (
                <li
                  key={i}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px]',
                    a.tone === 'danger' ? 'bg-danger-soft text-destructive' : 'bg-warning-soft text-warning',
                  )}
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1">{a.text}</span>
                  {a.href && (
                    <Link href={a.href} className="shrink-0 text-xs font-semibold underline-offset-2 hover:underline">
                      {fr ? 'Voir' : 'View'}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="tile-surface p-4">
            <h3 className="mb-3 text-[13px] font-semibold">{fr ? 'Détails' : 'Details'}</h3>
            <FactList
              columns={2}
              facts={[
                { label: fr ? 'Début' : 'Start', value: formatDate(m.start_date, lang, 'short') },
                { label: fr ? 'Fin' : 'End', value: m.end_date ? formatDate(m.end_date, lang, 'short') : fr ? 'Non définie' : 'Not set' },
                { label: fr ? 'Jours prévus' : 'Planned days', value: stats.planned },
                { label: fr ? 'N° de contrat' : 'Contract no.', value: m.contract_number },
                { label: fr ? 'Lieu' : 'Location', value: m.location },
                { label: fr ? 'Télétravail' : 'Remote work', value: m.remote_policy ? REMOTE_POLICY_LABEL[m.remote_policy as RemotePolicy]?.[lang] : null },
              ]}
            />
            {m.status === 'active' && (
              <div className="mt-4 border-t border-border pt-3">
                <label htmlFor="renewal" className="mb-1.5 block text-xs text-muted-foreground">
                  {fr ? 'Renouvellement' : 'Renewal'}
                </label>
                {canEdit ? (
                  <Select
                    id="renewal"
                    value={m.renewal_status ?? 'unknown'}
                    onChange={(e) => {
                      const v = e.target.value as NonNullable<Mission['renewal_status']>;
                      setData({ ...data, mission: { ...m, renewal_status: v } });
                      void patch({ renewal_status: v }, fr ? 'Renouvellement mis à jour' : 'Renewal updated');
                    }}
                  >
                    {Object.entries(RENEWAL_STATUS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label[lang]}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <p className="text-[13.5px]">{statusOf(RENEWAL_STATUS, m.renewal_status ?? 'unknown', lang).label}</p>
                )}
              </div>
            )}
          </div>

          <div className="tile-surface space-y-3 p-4">
            <h3 className="text-[13px] font-semibold">{fr ? 'Équipe' : 'Team'}</h3>
            <div className="flex items-center gap-2.5">
              <Avatar name={consultantName} size="sm" />
              <div className="min-w-0">
                {m.consultants ? (
                  <Link href={`/consultants/${m.consultants.id}`} className="block truncate text-[13.5px] font-medium hover:text-app-terra-dark">
                    {consultantName}
                  </Link>
                ) : (
                  <div className="truncate text-[13.5px] font-medium">{consultantName}</div>
                )}
                <div className="truncate text-xs text-muted-foreground">{m.consultants?.job_title ?? 'Consultant'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Avatar name={owner?.name ?? '?'} size="sm" />
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-medium">{owner?.name ?? (fr ? 'Non assigné' : 'Unassigned')}</div>
                <div className="text-xs text-muted-foreground">Business manager</div>
              </div>
            </div>
          </div>

          <div className="tile-surface p-4">
            <h3 className="mb-2 text-[13px] font-semibold">{fr ? 'Tâches' : 'Tasks'}</h3>
            <TaskList entityType="mission" entityId={m.id} filter="open" compact />
          </div>
        </aside>
      </div>

      <MissionDrawer
        open={editing}
        onOpenChange={setEditing}
        mission={{ ...m, daily_cost_eur: data.costSource === 'mission' ? data.cost : null }}
        onSaved={() => void reload()}
      />
    </AppShell>
  );
}
