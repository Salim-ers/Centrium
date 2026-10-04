import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, Receipt } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { EmptyState } from '@/components/app/EmptyState';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClientPortalContext } from '@/lib/portal/client-context';
import { QUOTE_STATUS, statusOf } from '@/lib/status';
import { formatDate, formatEur } from '@/lib/format';

export const dynamic = 'force-dynamic';

/** Devis transmis à la société (les brouillons ne sont jamais visibles). */
export default async function ClientQuotesPage() {
  const ctx = await getClientPortalContext();
  if (!ctx) redirect('/login');
  const admin = createAdminClient('client-portal');
  const { data } = await admin
    .from('quotes')
    .select('id, number, title, status, total_ht, issue_date, valid_until, version')
    .eq('organization_id', ctx.me.organizationId)
    .eq('company_id', ctx.me.companyId)
    .neq('status', 'draft')
    .order('issue_date', { ascending: false })
    .limit(200);
  const rows = data ?? [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">Devis</h1>
        <p className="text-[13.5px] text-muted-foreground">Consultez, téléchargez et répondez aux devis de votre prestataire.</p>
      </header>
      {rows.length === 0 ? (
        <EmptyState icon={Receipt} title="Aucun devis" description="Les devis qui vous sont adressés apparaîtront ici." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {rows.map((q) => {
                const st = statusOf(QUOTE_STATUS, q.status, 'fr');
                return (
                  <li key={q.id}>
                    <Link href={`/client/quotes/${q.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium">{q.title}</span>
                          <StatusPill tone={st.tone}>{q.status === 'sent' ? 'En attente de votre réponse' : st.label}</StatusPill>
                        </div>
                        <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                          {q.number}
                          {q.version > 1 ? ` · v${q.version}` : ''} · {formatDate(q.issue_date, 'fr')} · <span className="num">{formatEur(Number(q.total_ht), 'fr')} HT</span>
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
