import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Briefcase, ChevronRight, ClipboardCheck, FileText, MessageSquarePlus, Plus, Receipt, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClientMissionIds, getClientPortalContext } from '@/lib/portal/client-context';
import { CLIENT_REQUEST_STATUS_PUBLIC, periodLabel, statusOf } from '@/lib/status';
import { PortalNotifications } from '@/components/portal/PortalNotifications';
import { formatDate, formatEur } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const OPEN_REQUEST = ['new', 'in_review'];
const TODO_CRA = 4;
const TODO_QUOTES = 3;

/**
 * Portail client : un tableau de bord très simple (missions, consultants,
 * CRA à approuver, documents, demandes) et une action principale,
 * exprimer un nouveau besoin.
 */
export default async function ClientHomePage() {
  const ctx = await getClientPortalContext();
  if (!ctx) redirect('/login');
  const { me } = ctx;
  const admin = createAdminClient('client-portal');
  const missionIds = await getClientMissionIds(me.organizationId, me.companyId);

  const [missions, pendingTs, quotes, requests, documents] = await Promise.all([
    admin
      .from('missions')
      .select('id, title, status, end_date, consultant_id, consultants(first_name, last_name, job_title)')
      .eq('organization_id', me.organizationId)
      .eq('company_id', me.companyId)
      .order('start_date', { ascending: false })
      .limit(500),
    missionIds.length
      ? admin
          .from('timesheets')
          .select('id, period_month, period_year, mission_id')
          .eq('organization_id', me.organizationId)
          .in('mission_id', missionIds)
          .eq('client_approval_status', 'pending')
          .order('period_year', { ascending: false })
          .order('period_month', { ascending: false })
      : Promise.resolve({ data: [] as Array<{ id: string; period_month: number; period_year: number; mission_id: string }> }),
    admin
      .from('quotes')
      .select('id, number, title, total_ht, valid_until')
      .eq('organization_id', me.organizationId)
      .eq('company_id', me.companyId)
      .eq('status', 'sent')
      .order('issue_date', { ascending: false }),
    admin
      .from('client_requests')
      .select('id, title, status, created_at')
      .eq('organization_id', me.organizationId)
      .eq('company_id', me.companyId)
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('documents')
      .select('id, root_id')
      .eq('organization_id', me.organizationId)
      .eq('company_id', me.companyId)
      .eq('visibility', 'client')
      .eq('archived', false)
      .limit(1000),
  ]);

  type MissionRow = { id: string; title: string; status: string; end_date: string | null; consultant_id: string; consultants: { first_name: string; last_name: string; job_title: string | null } | null };
  const allMissions = (missions.data ?? []) as unknown as MissionRow[];
  const missionById = new Map(allMissions.map((m) => [m.id, m]));
  const activeMissions = allMissions.filter((m) => m.status === 'active');
  const consultants = [...new Map(activeMissions.filter((m) => m.consultants).map((m) => [m.consultant_id, m.consultants!])).values()];
  const toApprove = pendingTs.data ?? [];
  const toAnswer = quotes.data ?? [];
  const reqs = requests.data ?? [];
  const openRequests = reqs.filter((r) => OPEN_REQUEST.includes(r.status));
  const docCount = new Set(((documents.data ?? []) as Array<{ id: string; root_id: string | null }>).map((d) => d.root_id ?? d.id)).size;

  const tiles = [
    { href: '/client/missions', label: 'Missions en cours', value: activeMissions.length, icon: Briefcase, strong: false },
    { href: '/client/missions', label: 'Consultants', value: consultants.length, icon: Users, strong: false },
    { href: '/client/timesheets', label: 'CRA à approuver', value: toApprove.length, icon: ClipboardCheck, strong: toApprove.length > 0 },
    { href: '/client/documents', label: 'Documents', value: docCount, icon: FileText, strong: false },
    { href: '/client/requests', label: 'Demandes en cours', value: openRequests.length, icon: MessageSquarePlus, strong: false },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">{ctx.companyName ? `Bonjour, ${ctx.companyName}` : 'Bonjour'}</h1>
          <p className="text-[13.5px] text-muted-foreground">Vos missions, les validations attendues et vos demandes.</p>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/client/requests?new=1">
            <Plus />
            Nouveau besoin
          </Link>
        </Button>
      </header>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map((t, i) => (
          <li key={t.label} className={cn(i === tiles.length - 1 && 'col-span-2 lg:col-span-1')}>
            <Link
              href={t.href}
              className={cn(
                'flex h-full flex-col justify-between gap-2.5 rounded-2xl border p-3.5 transition-colors sm:gap-3 sm:p-4',
                t.strong ? 'border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90' : 'border-border bg-card hover:bg-muted/40',
              )}
            >
              <t.icon className={cn('h-5 w-5', t.strong ? 'text-primary-foreground' : 'text-primary')} />
              <span>
                <span className="num block text-[26px] font-semibold leading-none">{t.value}</span>
                <span className={cn('mt-1 block text-[12.5px]', t.strong ? 'text-primary-foreground/85' : 'text-muted-foreground')}>{t.label}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {(toApprove.length > 0 || toAnswer.length > 0) && (
        <section className="rounded-2xl border border-border bg-card">
          <h2 className="px-5 pb-2 pt-4 text-[14px] font-semibold">À traiter</h2>
          <ul className="divide-y divide-border border-t border-border">
            {toApprove.slice(0, TODO_CRA).map((t) => {
              const m = missionById.get(t.mission_id);
              return (
                <li key={t.id}>
                  <Link href={`/client/timesheets/${t.id}`} className="flex items-center gap-3 px-5 py-3 text-[13.5px] hover:bg-muted/50">
                    <ClipboardCheck className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">CRA {periodLabel(t.period_month, t.period_year, 'fr')} à approuver</span>
                      <span className="block truncate text-[12.5px] text-muted-foreground">
                        {m?.consultants ? `${m.consultants.first_name} ${m.consultants.last_name} · ` : ''}
                        {m?.title ?? 'Mission'}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
            {toApprove.length > TODO_CRA && <MoreRow href="/client/timesheets" label={`Voir les ${toApprove.length} CRA à approuver`} />}
            {toAnswer.slice(0, TODO_QUOTES).map((q) => (
              <li key={q.id}>
                <Link href={`/client/quotes/${q.id}`} className="flex items-center gap-3 px-5 py-3 text-[13.5px] hover:bg-muted/50">
                  <Receipt className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      Devis {q.number} · {formatEur(Number(q.total_ht), 'fr')} HT
                    </span>
                    <span className="block truncate text-[12.5px] text-muted-foreground">
                      {q.title}
                      {q.valid_until ? ` · valable jusqu’au ${formatDate(q.valid_until, 'fr')}` : ''}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
            {toAnswer.length > TODO_QUOTES && <MoreRow href="/client/quotes" label={`Voir les ${toAnswer.length} devis à examiner`} />}
          </ul>
        </section>
      )}

      <PortalNotifications userId={me.userId} />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 pb-2 pt-4">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold">
              <Briefcase className="h-4 w-4 text-primary" />
              Missions et consultants
            </h2>
            <Link href="/client/missions" className="text-[13px] text-primary-deep hover:underline">
              Tout voir
            </Link>
          </div>
          {activeMissions.length === 0 ? (
            <p className="px-5 pb-5 text-[13.5px] text-muted-foreground">Aucune mission en cours.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {activeMissions.slice(0, 5).map((m) => (
                <li key={m.id} className="px-5 py-3 text-[13.5px]">
                  <div className="font-medium">{m.title}</div>
                  <div className="text-[12.5px] text-muted-foreground">
                    {m.consultants ? `${m.consultants.first_name} ${m.consultants.last_name}${m.consultants.job_title ? ` · ${m.consultants.job_title}` : ''}` : '—'}
                    {m.end_date ? ` · jusqu’au ${formatDate(m.end_date, 'fr')}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 pb-2 pt-4">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold">
              <MessageSquarePlus className="h-4 w-4 text-primary" />
              Vos demandes
            </h2>
            <Link href="/client/requests" className="text-[13px] text-primary-deep hover:underline">
              Tout voir
            </Link>
          </div>
          {reqs.length === 0 ? (
            <p className="px-5 pb-5 text-[13.5px] text-muted-foreground">Besoin d’un profil ? Décrivez-le : votre interlocuteur vous recontacte.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {reqs.slice(0, 5).map((r) => {
                const st = statusOf(CLIENT_REQUEST_STATUS_PUBLIC, r.status, 'fr');
                return (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3 text-[13.5px]">
                    <span className="min-w-0 flex-1 truncate">{r.title}</span>
                    <StatusPill tone={st.tone}>{st.label}</StatusPill>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function MoreRow({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center justify-between px-5 py-2.5 text-[13px] font-medium text-primary-deep hover:bg-muted/50">
        {label}
        <ChevronRight className="h-4 w-4" />
      </Link>
    </li>
  );
}
