import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Briefcase, ChevronRight, ClipboardCheck, MessageSquarePlus, Receipt } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClientMissionIds, getClientPortalContext } from '@/lib/portal/client-context';
import { CLIENT_REQUEST_STATUS_PUBLIC, periodLabel, statusOf } from '@/lib/status';
import { PortalNotifications } from '@/components/portal/PortalNotifications';
import { formatDate, formatEur } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ClientHomePage() {
  const ctx = await getClientPortalContext();
  if (!ctx) redirect('/login');
  const { me } = ctx;
  const admin = createAdminClient('client-portal');
  const missionIds = await getClientMissionIds(me.organizationId, me.companyId);

  const [missions, pendingTs, quotes, requests] = await Promise.all([
    admin
      .from('missions')
      .select('id, title, end_date, consultants(first_name, last_name)')
      .eq('organization_id', me.organizationId)
      .eq('company_id', me.companyId)
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(6),
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
      .limit(5),
  ]);

  type MissionRow = { id: string; title: string; end_date: string | null; consultants: { first_name: string; last_name: string } | null };
  const activeMissions = (missions.data ?? []) as unknown as MissionRow[];
  const titleById = new Map(activeMissions.map((m) => [m.id, m.title]));
  const toApprove = pendingTs.data ?? [];
  const toAnswer = quotes.data ?? [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">{ctx.companyName ? `Bonjour, ${ctx.companyName}` : 'Bonjour'}</h1>
        <p className="text-[13.5px] text-muted-foreground">Vos missions en cours, les validations attendues et vos demandes.</p>
      </header>

      {(toApprove.length > 0 || toAnswer.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>À traiter</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border border-t border-border">
              {toApprove.map((t) => (
                <li key={t.id}>
                  <Link href={`/client/timesheets/${t.id}`} className="flex items-center gap-3 px-5 py-3 text-[13.5px] hover:bg-muted/50">
                    <ClipboardCheck className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">CRA {periodLabel(t.period_month, t.period_year, 'fr')} à approuver</span>
                      <span className="block truncate text-[12.5px] text-muted-foreground">{titleById.get(t.mission_id) ?? 'Mission'}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
              {toAnswer.map((q) => (
                <li key={q.id}>
                  <Link href={`/client/quotes/${q.id}`} className="flex items-center gap-3 px-5 py-3 text-[13.5px] hover:bg-muted/50">
                    <Receipt className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        Devis {q.number} — {formatEur(Number(q.total_ht), 'fr')} HT
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
            </ul>
          </CardContent>
        </Card>
      )}

      <PortalNotifications userId={me.userId} />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Missions en cours
          </CardTitle>
          <Link href="/client/missions" className="text-[13px] text-primary-deep hover:underline">
            Tout voir
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {activeMissions.length === 0 ? (
            <p className="px-5 pb-5 text-[13.5px] text-muted-foreground">Aucune mission en cours.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {activeMissions.map((m) => (
                <li key={m.id} className="px-5 py-3 text-[13.5px]">
                  <div className="font-medium">{m.title}</div>
                  <div className="text-[12.5px] text-muted-foreground">
                    {m.consultants ? `${m.consultants.first_name} ${m.consultants.last_name}` : '—'}
                    {m.end_date ? ` · jusqu’au ${formatDate(m.end_date, 'fr')}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-primary" />
            Vos demandes
          </CardTitle>
          <Button asChild size="sm">
            <Link href="/client/requests?new=1">Exprimer un besoin</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {(requests.data ?? []).length === 0 ? (
            <p className="px-5 pb-5 text-[13.5px] text-muted-foreground">Besoin d’un profil ? Décrivez-le, votre interlocuteur vous recontacte.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {(requests.data ?? []).map((r) => {
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
        </CardContent>
      </Card>
    </div>
  );
}
