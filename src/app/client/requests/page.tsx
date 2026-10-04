import { redirect } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { ClientRequestForm } from '@/components/portal/ClientRequestForm';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClientPortalContext } from '@/lib/portal/client-context';
import { CLIENT_REQUEST_STATUS_PUBLIC, statusOf } from '@/lib/status';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ClientRequestsPage() {
  const ctx = await getClientPortalContext();
  if (!ctx) redirect('/login');
  const admin = createAdminClient('client-portal');
  const { data } = await admin
    .from('client_requests')
    .select('id, title, status, created_at, start_date, duration_months')
    .eq('organization_id', ctx.me.organizationId)
    .eq('company_id', ctx.me.companyId)
    .order('created_at', { ascending: false })
    .limit(100);
  const rows = data ?? [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">Demandes</h1>
        <p className="text-[13.5px] text-muted-foreground">Décrivez un besoin de renfort : votre interlocuteur le prend en charge et revient vers vous.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Nouvelle demande</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientRequestForm />
        </CardContent>
      </Card>
      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historique</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border border-t border-border">
              {rows.map((r) => {
                const st = statusOf(CLIENT_REQUEST_STATUS_PUBLIC, r.status, 'fr');
                return (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3 text-[13.5px]">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{r.title}</span>
                      <span className="block text-[12.5px] text-muted-foreground">
                        Envoyée le {formatDate(r.created_at, 'fr')}
                        {r.start_date ? ` · démarrage ${formatDate(r.start_date, 'fr')}` : ''}
                        {r.duration_months ? ` · ${r.duration_months} mois` : ''}
                      </span>
                    </span>
                    <StatusPill tone={st.tone}>{st.label}</StatusPill>
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
