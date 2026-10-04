import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Card, CardContent } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { QuoteDocument } from '@/components/documents/QuoteDocument';
import { ClientDecisionActions } from '@/components/portal/ClientDecisionActions';
import { PrintButton } from '@/components/portal/PrintButton';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClientPortalContext } from '@/lib/portal/client-context';
import { QUOTE_STATUS, statusOf } from '@/lib/status';
import { formatDate } from '@/lib/format';
import type { Quote, QuoteItem } from '@/types';

export const dynamic = 'force-dynamic';

export default async function ClientQuotePage({ params }: { params: { id: string } }) {
  const ctx = await getClientPortalContext();
  if (!ctx) redirect('/login');
  const admin = createAdminClient('client-portal');
  const { data } = await admin.from('quotes').select('*').eq('id', params.id).maybeSingle();
  const quote = data as Quote | null;
  if (!quote || quote.organization_id !== ctx.me.organizationId || quote.company_id !== ctx.me.companyId || quote.status === 'draft') notFound();

  const [items, company, contact] = await Promise.all([
    admin.from('quote_items').select('*').eq('quote_id', quote.id).order('position'),
    admin.from('companies').select('name, address, city').eq('id', ctx.me.companyId).maybeSingle(),
    quote.contact_id ? admin.from('contacts').select('first_name, last_name, email').eq('id', quote.contact_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const st = statusOf(QUOTE_STATUS, quote.status, 'fr');
  const expired = quote.status === 'sent' && !!quote.valid_until && quote.valid_until < new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="no-print">
        <Link href="/client/quotes" className="text-[13px] text-muted-foreground hover:text-foreground">
          ← Devis
        </Link>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight sm:text-2xl">
          {quote.number} — {quote.title}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
          <StatusPill tone={st.tone}>{quote.status === 'sent' ? 'En attente de votre réponse' : st.label}</StatusPill>
          {quote.decided_at && <span>Réponse du {formatDate(quote.decided_at, 'fr')}</span>}
        </div>
      </div>

      {quote.status === 'sent' && (
        <Card className="no-print">
          <CardContent className="space-y-3 pt-5">
            {expired ? (
              <p className="text-[13.5px] text-warning">La date de validité de ce devis est dépassée : contactez votre interlocuteur avant de l’accepter.</p>
            ) : (
              <p className="text-[13.5px] text-muted-foreground">Votre réponse est transmise immédiatement à votre prestataire.</p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <ClientDecisionActions endpoint={`/api/client/quotes/${quote.id}`} kind="quote" />
              <PrintButton />
            </div>
          </CardContent>
        </Card>
      )}
      {quote.status !== 'sent' && (
        <div className="no-print flex justify-end">
          <PrintButton />
        </div>
      )}

      <div className="print-only overflow-x-auto">
        <QuoteDocument
          quote={quote}
          items={(items.data ?? []) as QuoteItem[]}
          branding={ctx.branding}
          client={company.data ? { name: company.data.name, address: company.data.address, city: company.data.city } : null}
          contact={contact.data ? { name: `${contact.data.first_name} ${contact.data.last_name}`, email: contact.data.email } : null}
        />
      </div>
    </div>
  );
}
