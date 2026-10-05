import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { TimesheetCalendar, type CalendarDay } from '@/components/timesheets/TimesheetCalendar';
import { ClientDecisionActions } from '@/components/portal/ClientDecisionActions';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClientPortalContext } from '@/lib/portal/client-context';
import { CLIENT_APPROVAL } from '@/lib/portal/client-labels';
import { periodLabel } from '@/lib/status';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ClientTimesheetPage({ params }: { params: { id: string } }) {
  const ctx = await getClientPortalContext();
  if (!ctx) redirect('/login');
  const admin = createAdminClient('client-portal');
  const { data: ts } = await admin
    .from('timesheets')
    .select('id, organization_id, mission_id, period_month, period_year, days_worked, notes, client_approval_status, client_approved_at, client_comment')
    .eq('id', params.id)
    .maybeSingle();
  if (!ts || ts.organization_id !== ctx.me.organizationId || ts.client_approval_status === 'not_required') notFound();
  const { data: mission } = await admin
    .from('missions')
    .select('title, company_id, consultants(first_name, last_name, job_title)')
    .eq('id', ts.mission_id)
    .maybeSingle();
  if (!mission || mission.company_id !== ctx.me.companyId) notFound();
  const { data: days } = await admin.from('timesheet_days').select('day_date, duration, kind, note, is_remote').eq('timesheet_id', ts.id);

  const consultant = mission.consultants as unknown as { first_name: string; last_name: string; job_title: string | null } | null;
  const st = CLIENT_APPROVAL[ts.client_approval_status] ?? { label: ts.client_approval_status, tone: 'neutral' as const };

  return (
    <div className="space-y-5">
      <div>
        <Link href="/client/timesheets" className="-my-2 inline-block py-2 text-[13px] text-muted-foreground hover:text-foreground">
          ← Comptes rendus d’activité
        </Link>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight sm:text-2xl">CRA {periodLabel(ts.period_month, ts.period_year, 'fr')}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
          <StatusPill tone={st.tone}>{st.label}</StatusPill>
          <span>
            {consultant ? `${consultant.first_name} ${consultant.last_name}` : '—'} · {mission.title}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Jours déclarés</CardTitle>
          <span className="num text-[15px] font-semibold">{Number(ts.days_worked)} j</span>
        </CardHeader>
        <CardContent>
          <TimesheetCalendar year={ts.period_year} month={ts.period_month} days={(days ?? []) as CalendarDay[]} editable={false} />
          {ts.notes && <p className="mt-3 whitespace-pre-wrap rounded-md bg-muted/60 p-3 text-[13px]">{ts.notes}</p>}
        </CardContent>
      </Card>

      {ts.client_approval_status === 'pending' ? (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <p className="text-[13.5px] text-muted-foreground">
              Votre approbation informe votre prestataire que les jours déclarés correspondent à la prestation réalisée.
            </p>
            <ClientDecisionActions endpoint={`/api/client/timesheets/${ts.id}`} kind="timesheet" />
          </CardContent>
        </Card>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          {ts.client_approved_at ? `Réponse envoyée le ${formatDate(ts.client_approved_at, 'fr')}.` : null}
          {ts.client_comment ? ` Commentaire : « ${ts.client_comment} »` : null}
        </p>
      )}
    </div>
  );
}
