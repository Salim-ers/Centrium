'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  ClipboardCheck,
  FileSignature,
  FileText,
  Pause,
  Pencil,
  Play,
  Receipt,
  Square,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, KPICard } from '@/components/app';
import { FactList } from '@/components/app/FactList';
import { NotesPanel } from '@/components/app/NotesPanel';
import { ActivityTimeline } from '@/components/app/ActivityTimeline';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusPill } from '@/components/ui/status-pill';
import { Select } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { MissionDrawer } from '@/components/missions/MissionDrawer';
import { TaskList } from '@/components/crm/TaskList';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useTeamMembers } from '@/hooks/useOrgDirectory';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { businessDaysBetween } from '@/lib/utils/business-days';
import { daysUntil } from '@/lib/pilotage/metrics';
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

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { byId: members } = useTeamMembers();
  const financials = can('consultants.financials');
  const showRates = financials || can('finance.view');
  const canEdit = can('missions.edit');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data, loading, reload, setData } = useCachedQuery<Detail | null>(
    `mission-detail:${id}:${financials ? 'f' : 'n'}`,
    () => loadMission(id, financials, can('documents.view'), can('finance.view')),
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
    const submittedDays = data.timesheets
      .filter((t) => t.status === 'submitted')
      .reduce((s, t) => s + Number(t.days_worked || 0), 0);
    const today = new Date();
    const left = m.end_date ? daysUntil(m.end_date, today) : null;
    const remainingDays = m.end_date && m.status === 'active' ? businessDaysBetween(today, m.end_date) : null;
    return {
      rate,
      planned,
      validatedDays,
      submittedDays,
      forecast: planned != null ? planned * rate : null,
      realized: validatedDays * rate,
      marginEur: data.cost != null && planned != null ? planned * (rate - data.cost) : null,
      marginRealized: data.cost != null ? validatedDays * (rate - data.cost) : null,
      marginPct: data.cost != null && rate > 0 ? ((rate - data.cost) / rate) * 100 : null,
      left,
      remainingDays,
      progress: planned ? Math.min(100, (validatedDays / planned) * 100) : null,
    };
  }, [data]);

  const alerts = useMemo(() => {
    if (!data || !stats) return [] as Array<{ tone: 'danger' | 'warning'; text: string; href?: string }>;
    const m = data.mission;
    const out: Array<{ tone: 'danger' | 'warning'; text: string; href?: string }> = [];
    if (m.status === 'active' && stats.left != null && stats.left >= 0 && stats.left <= 90) {
      out.push({
        tone: stats.left <= 30 ? 'danger' : 'warning',
        text: fr ? `La mission se termine dans ${stats.left} jours.` : `The mission ends in ${stats.left} days.`,
      });
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
      if (data.contracts.length === 0 && can('documents.view')) {
        out.push({ tone: 'warning', text: fr ? 'Aucun contrat rattaché à cette mission.' : 'No contract linked to this mission.', href: '/contracts' });
      }
    }
    if (m.status === 'active' && financials && data.cost == null) {
      out.push({ tone: 'warning', text: fr ? 'CJM non renseigné : la marge ne peut pas être calculée.' : 'Daily cost missing: margin cannot be computed.' });
    }
    return out;
  }, [data, stats, fr, lang, can, financials]);

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
      toast.error(json.message ?? json.error ?? (fr ? 'Mise à jour impossible' : 'Update failed'));
      return;
    }
    toast.success(success);
    void reload();
  }

  if (loading && !data) {
    return (
      <AppShell>
        <Skeleton className="mb-3 h-5 w-24" />
        <Skeleton className="mb-6 h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
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

  return (
    <AppShell>
      <PageHeader
        backHref="/missions"
        backLabel="Missions"
        title={m.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusPill tone={st.tone}>{st.label}</StatusPill>
            {m.consultants && (
              <Link href={`/consultants/${m.consultants.id}`} className="text-foreground hover:text-primary-deep">
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

      {alerts.length > 0 && (
        <ul className="mb-5 space-y-2">
          {alerts.map((a, i) => (
            <li
              key={i}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px]',
                a.tone === 'danger' ? 'border-destructive/20 bg-danger-soft text-destructive' : 'border-warning/20 bg-warning-soft text-warning',
              )}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="flex-1">{a.text}</span>
              {a.href && (
                <Link href={a.href} className="shrink-0 text-xs font-medium underline-offset-2 hover:underline">
                  {fr ? 'Voir' : 'View'}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {showRates && <KPICard label="TJM" valueText={formatEur(stats.rate, lang)} />}
        {financials && (
          <KPICard
            label="CJM"
            valueText={data.cost != null ? formatEur(data.cost, lang) : '—'}
            hint={data.costSource === 'consultant' ? (fr ? 'Hérité de la fiche consultant' : 'From consultant profile') : undefined}
          />
        )}
        {showRates && (
          <KPICard
            label={fr ? 'CA prévisionnel' : 'Forecast revenue'}
            valueText={stats.forecast != null ? formatEurCompact(stats.forecast, lang) : '—'}
            hint={stats.planned != null ? `${stats.planned} ${fr ? 'jours prévus' : 'planned days'}` : fr ? 'Sans date de fin' : 'No end date'}
          />
        )}
        {showRates && (
          <KPICard
            label={fr ? 'CA réalisé' : 'Actual revenue'}
            valueText={formatEurCompact(stats.realized, lang)}
            hint={`${stats.validatedDays} ${fr ? 'jours validés' : 'approved days'}`}
          />
        )}
        {financials && (
          <KPICard
            label={fr ? 'Marge' : 'Margin'}
            valueText={stats.marginPct != null ? formatPct(stats.marginPct, lang) : '—'}
            hint={stats.marginEur != null ? `${formatEurCompact(stats.marginEur, lang)} ${fr ? 'sur la mission' : 'over the mission'}` : undefined}
            tone="emerald"
          />
        )}
        {!showRates && (
          <KPICard label={fr ? 'Jours validés' : 'Approved days'} value={stats.validatedDays} hint={stats.planned != null ? `/ ${stats.planned}` : undefined} />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <Tabs defaultValue="overview">
            <TabsList variant="underline">
              <TabsTrigger value="overview">{fr ? 'Aperçu' : 'Overview'}</TabsTrigger>
              <TabsTrigger value="cra">
                CRA <span className="num text-xs text-muted-foreground">{data.timesheets.length}</span>
              </TabsTrigger>
              {can('documents.view') && <TabsTrigger value="documents">Documents</TabsTrigger>}
              <TabsTrigger value="tasks">{fr ? 'Tâches' : 'Tasks'}</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="history">{fr ? 'Historique' : 'History'}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-5">
              {stats.planned != null && (
                <Card>
                  <CardHeader>
                    <CardTitle>{fr ? 'Avancement' : 'Progress'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Progress value={stats.validatedDays} max={stats.planned} label={fr ? 'Jours validés sur jours prévus' : 'Approved days out of planned'} />
                    <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                      <span className="num">
                        {stats.validatedDays} / {stats.planned} {fr ? 'jours validés' : 'days approved'}
                        {stats.submittedDays > 0 && ` · ${stats.submittedDays} ${fr ? 'en attente' : 'pending'}`}
                      </span>
                      {stats.remainingDays != null && (
                        <span className="num">
                          {stats.remainingDays} {fr ? 'jours ouvrés restants' : 'business days left'}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              {m.status === 'active' && canEdit && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-muted-foreground" />
                      {fr ? 'Renouvellement' : 'Renewal'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Select
                      value={m.renewal_status ?? 'unknown'}
                      onChange={(e) => {
                        const v = e.target.value as NonNullable<Mission['renewal_status']>;
                        setData({ ...data, mission: { ...m, renewal_status: v } });
                        void patch({ renewal_status: v }, fr ? 'Renouvellement mis à jour' : 'Renewal updated');
                      }}
                      className="sm:w-72"
                      aria-label={fr ? 'Statut de renouvellement' : 'Renewal status'}
                    >
                      {Object.entries(RENEWAL_STATUS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label[lang]}
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {fr ? 'Des alertes sont envoyées au Business Manager à 90, 60, 30 et 15 jours de la fin.' : 'Alerts are sent to the business manager 90, 60, 30 and 15 days before the end.'}
                    </p>
                  </CardContent>
                </Card>
              )}
              {data.invoices.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{fr ? 'Préfacturation' : 'Pre-invoicing'}</CardTitle>
                  </CardHeader>
                  <div className="divide-y divide-border border-t border-border">
                    {data.invoices.map((inv) => {
                      const s = statusOf(INVOICE_STATUS, inv.status, lang);
                      return (
                        <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/50">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-[13.5px]">
                            {inv.invoice_number} · {inv.period_label}
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              {inv.party === 'consultant' ? (fr ? '(sous-traitance)' : '(subcontracting)') : ''}
                            </span>
                          </span>
                          <span className="num text-[13px]">{formatEur(inv.amount_ht, lang)}</span>
                          <StatusPill tone={s.tone}>{s.label}</StatusPill>
                        </Link>
                      );
                    })}
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="cra">
              {data.timesheets.length === 0 ? (
                <EmptyState
                  size="compact"
                  icon={ClipboardCheck}
                  title={fr ? 'Aucun CRA' : 'No timesheet'}
                  description={fr ? 'Les CRA saisis par le consultant apparaîtront ici.' : 'Timesheets filled by the consultant will appear here.'}
                />
              ) : (
                <Card>
                  <div className="divide-y divide-border">
                    {data.timesheets.map((t) => {
                      const s = statusOf(TIMESHEET_STATUS, t.status, lang);
                      return (
                        <Link key={t.id} href={`/timesheets/${t.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
                          <span className="min-w-0 flex-1 text-[13.5px] font-medium">{periodLabel(t.period_month, t.period_year, lang)}</span>
                          <span className="num text-[13px] text-muted-foreground">
                            {t.status === 'client_validated' ? t.days_validated : t.days_worked} j
                          </span>
                          {showRates && (
                            <span className="num hidden w-24 text-right text-[13px] sm:inline">
                              {formatEur((t.status === 'client_validated' ? t.days_validated : t.days_worked) * stats.rate, lang)}
                            </span>
                          )}
                          <StatusPill tone={s.tone}>{s.label}</StatusPill>
                        </Link>
                      );
                    })}
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{fr ? 'Contrats' : 'Contracts'}</CardTitle>
                </CardHeader>
                {data.contracts.length === 0 ? (
                  <CardContent>
                    <p className="text-[13px] text-muted-foreground">{fr ? 'Aucun contrat.' : 'No contract.'}</p>
                  </CardContent>
                ) : (
                  <div className="divide-y divide-border border-t border-border">
                    {data.contracts.map((c) => (
                      <Link key={c.id} href={`/contracts/${c.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/50">
                        <FileSignature className="h-4 w-4 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-[13.5px]">{c.title ?? c.contract_number ?? (fr ? 'Contrat' : 'Contract')}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(c.created_at, lang, 'short')}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{fr ? 'Documents de mission' : 'Mission documents'}</CardTitle>
                </CardHeader>
                {data.documents.length === 0 ? (
                  <CardContent>
                    <p className="text-[13px] text-muted-foreground">{fr ? 'Aucun document.' : 'No document.'}</p>
                  </CardContent>
                ) : (
                  <div className="divide-y divide-border border-t border-border">
                    {data.documents.map((d) => (
                      <Link key={d.id} href={`/documents?doc=${d.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/50">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-[13.5px]">{d.title}</span>
                        <span className="text-xs text-muted-foreground">{DOCUMENT_KIND[d.kind]?.[lang]}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="tasks">
              <TaskList entityType="mission" entityId={m.id} filter="all" compact />
            </TabsContent>
            <TabsContent value="notes">
              <NotesPanel entityType="mission" entityId={m.id} canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="history">
              <ActivityTimeline entityType="mission" entityId={m.id} />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{fr ? 'Détails' : 'Details'}</CardTitle>
            </CardHeader>
            <CardContent>
              <FactList
                facts={[
                  { label: fr ? 'Début' : 'Start', value: formatDate(m.start_date, lang) },
                  {
                    label: fr ? 'Fin' : 'End',
                    value: m.end_date ? formatDate(m.end_date, lang) : fr ? 'Non définie' : 'Not set',
                    hint: stats.left != null && stats.left >= 0 && m.status === 'active' ? (fr ? `Dans ${stats.left} jours` : `In ${stats.left} days`) : undefined,
                  },
                  { label: fr ? 'Jours prévisionnels' : 'Planned days', value: stats.planned },
                  { label: fr ? 'Lieu' : 'Location', value: m.location },
                  { label: fr ? 'Télétravail' : 'Remote work', value: m.remote_policy ? REMOTE_POLICY_LABEL[m.remote_policy as RemotePolicy]?.[lang] : null },
                  { label: fr ? 'N° de contrat' : 'Contract no.', value: m.contract_number },
                  {
                    label: fr ? 'Renouvellement' : 'Renewal',
                    value: statusOf(RENEWAL_STATUS, m.renewal_status ?? 'unknown', lang).label,
                  },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{fr ? 'Équipe' : 'Team'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2.5">
                <Avatar name={consultantName} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-medium">{consultantName}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.consultants?.job_title}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Avatar name={owner?.name ?? '?'} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-medium">{owner?.name ?? (fr ? 'Non assigné' : 'Unassigned')}</div>
                  <div className="text-xs text-muted-foreground">Business Manager</div>
                </div>
              </div>
            </CardContent>
          </Card>
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

