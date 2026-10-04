import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, ClipboardCheck } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { EmptyState } from '@/components/app/EmptyState';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClientMissionIds, getClientPortalContext } from '@/lib/portal/client-context';
import { CLIENT_APPROVAL } from '@/lib/portal/client-labels';
import { periodLabel } from '@/lib/status';

export const dynamic = 'force-dynamic';

/** CRA transmis par l'ESN pour approbation (uniquement ceux des missions de la société). */
export default async function ClientTimesheetsPage() {
  const ctx = await getClientPortalContext();
  if (!ctx) redirect('/login');
  const missionIds = await getClientMissionIds(ctx.me.organizationId, ctx.me.companyId);
  const admin = createAdminClient('client-portal');
  const [ts, missions] = missionIds.length
    ? await Promise.all([
        admin
          .from('timesheets')
          .select('id, mission_id, period_month, period_year, days_worked, client_approval_status')
          .eq('organization_id', ctx.me.organizationId)
          .in('mission_id', missionIds)
          .neq('client_approval_status', 'not_required')
          .eq('archived', false)
          .order('period_year', { ascending: false })
          .order('period_month', { ascending: false })
          .limit(200),
        admin.from('missions').select('id, title, consultants(first_name, last_name)').in('id', missionIds),
      ])
    : [{ data: [] }, { data: [] }];
  type M = { id: string; title: string; consultants: { first_name: string; last_name: string } | null };
  const byId = new Map(((missions.data ?? []) as unknown as M[]).map((m) => [m.id, m]));
  const rows = (ts.data ?? []) as Array<{ id: string; mission_id: string; period_month: number; period_year: number; days_worked: number; client_approval_status: string }>;
  rows.sort((a, b) => Number(b.client_approval_status === 'pending') - Number(a.client_approval_status === 'pending'));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">Comptes rendus d’activité</h1>
        <p className="text-[13.5px] text-muted-foreground">Les CRA que votre prestataire vous soumet pour approbation.</p>
      </header>
      {rows.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Aucun CRA à approuver" description="Vous serez prévenu par email lorsqu’un CRA vous sera soumis." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {rows.map((t) => {
                const m = byId.get(t.mission_id);
                const st = CLIENT_APPROVAL[t.client_approval_status] ?? { label: t.client_approval_status, tone: 'neutral' as const };
                return (
                  <li key={t.id}>
                    <Link href={`/client/timesheets/${t.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{periodLabel(t.period_month, t.period_year, 'fr')}</span>
                          <StatusPill tone={st.tone}>{st.label}</StatusPill>
                        </div>
                        <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
                          {m?.consultants ? `${m.consultants.first_name} ${m.consultants.last_name} · ` : ''}
                          {m?.title ?? 'Mission'} · <span className="num">{Number(t.days_worked)} j</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
