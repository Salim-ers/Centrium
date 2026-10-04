import { redirect } from 'next/navigation';
import { Briefcase } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { EmptyState } from '@/components/app/EmptyState';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClientPortalContext } from '@/lib/portal/client-context';
import { MISSION_STATUS, statusOf } from '@/lib/status';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  title: string;
  status: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  consultants: { first_name: string; last_name: string; job_title: string | null } | null;
};

/** Missions de la société du client et consultants affectés (sans données financières internes). */
export default async function ClientMissionsPage() {
  const ctx = await getClientPortalContext();
  if (!ctx) redirect('/login');
  const admin = createAdminClient('client-portal');
  const { data } = await admin
    .from('missions')
    .select('id, title, status, start_date, end_date, location, consultants(first_name, last_name, job_title)')
    .eq('organization_id', ctx.me.organizationId)
    .eq('company_id', ctx.me.companyId)
    .in('status', ['active', 'suspended', 'ended'])
    .eq('archived', false)
    .order('start_date', { ascending: false });
  const rows = (data ?? []) as unknown as Row[];
  const order: Record<string, number> = { active: 0, suspended: 1, ended: 2 };
  rows.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">Missions</h1>
        <p className="text-[13.5px] text-muted-foreground">Les consultants intervenant chez vous et leurs périodes de mission.</p>
      </header>
      {rows.length === 0 ? (
        <EmptyState icon={Briefcase} title="Aucune mission" description="Les missions en cours apparaîtront ici." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {rows.map((m) => {
                const st = statusOf(MISSION_STATUS, m.status, 'fr');
                return (
                  <li key={m.id} className="px-4 py-3.5 sm:px-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{m.title}</span>
                      <StatusPill tone={st.tone}>{st.label}</StatusPill>
                    </div>
                    <div className="mt-1 text-[12.5px] text-muted-foreground">
                      {m.consultants ? (
                        <span className="text-foreground">
                          {m.consultants.first_name} {m.consultants.last_name}
                          {m.consultants.job_title ? <span className="text-muted-foreground"> · {m.consultants.job_title}</span> : null}
                        </span>
                      ) : (
                        '—'
                      )}
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                      {formatDate(m.start_date, 'fr')} → {m.end_date ? formatDate(m.end_date, 'fr') : 'sans date de fin'}
                      {m.location ? ` · ${m.location}` : ''}
                    </div>
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
