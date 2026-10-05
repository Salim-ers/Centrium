'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, CopyPlus, FileText, Pencil, Printer, RotateCcw, Send, TimerOff, X } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { EmptyState } from '@/components/app/EmptyState';
import { DocumentCanvas } from '@/components/app/DocumentCanvas';
import { FactList } from '@/components/app/FactList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QuoteDocument } from '@/components/documents/QuoteDocument';
import { QuoteEditor } from '@/components/documents/QuoteEditor';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { QUOTE_STATUS, statusOf } from '@/lib/status';
import { formatDate, formatEur } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Quote, QuoteItem } from '@/types';

type Detail = {
  quote: Quote;
  items: QuoteItem[];
  company: { id: string; name: string; address: string | null; city: string | null } | null;
  contact: { id: string; first_name: string; last_name: string; email: string | null } | null;
  opportunity: { id: string; title: string } | null;
  versions: Array<Pick<Quote, 'id' | 'number' | 'version' | 'status' | 'total_ht' | 'created_at'>>;
};

async function loadQuote(id: string): Promise<Detail | null> {
  const supabase = createClient();
  const { data: quote } = await supabase.from('quotes').select('*').eq('id', id).maybeSingle();
  if (!quote) return null;
  const q = quote as Quote;
  const rootId = q.root_id ?? q.id;
  const [items, company, contact, opportunity, versions] = await Promise.all([
    supabase.from('quote_items').select('*').eq('quote_id', id).order('position'),
    q.company_id ? supabase.from('companies').select('id, name, address, city').eq('id', q.company_id).maybeSingle() : null,
    q.contact_id ? supabase.from('contacts').select('id, first_name, last_name, email').eq('id', q.contact_id).maybeSingle() : null,
    q.opportunity_id ? supabase.from('opportunities').select('id, title').eq('id', q.opportunity_id).maybeSingle() : null,
    supabase.from('quotes').select('id, number, version, status, total_ht, created_at').or(`id.eq.${rootId},root_id.eq.${rootId}`).order('version'),
  ]);
  return {
    quote: q,
    items: (items.data ?? []) as QuoteItem[],
    company: (company?.data ?? null) as Detail['company'],
    contact: (contact?.data ?? null) as Detail['contact'],
    opportunity: (opportunity?.data ?? null) as Detail['opportunity'],
    versions: (versions.data ?? []) as Detail['versions'],
  };
}

type Action = 'mark_sent' | 'accept' | 'decline' | 'expire' | 'reopen' | 'new_version';

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can, ready } = usePermissions();
  const { branding } = useOrganization();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const canEdit = can('documents.edit');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<Action | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);

  const { data, loading, reload } = useCachedQuery<Detail | null>(`quote:${id}`, () => loadQuote(id), { enabled: !!id && ready });

  async function act(action: Action) {
    setBusy(action);
    const res = await fetch(`/api/quotes/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    setConfirmSend(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.message ?? json.error ?? (fr ? 'Action impossible' : 'Action failed'));
      return;
    }
    if (action === 'new_version') {
      toast.success(fr ? `Version ${json.data.version} créée en brouillon` : `Version ${json.data.version} created as draft`);
      router.push(`/documents/quotes/${json.data.id}`);
      return;
    }
    toast.success(fr ? 'Statut mis à jour' : 'Status updated');
    void reload();
  }

  if (loading && !data) {
    return (
      <AppShell>
        <Skeleton className="mb-3 h-5 w-24" />
        <Skeleton className="mb-6 h-8 w-1/2" />
        <Skeleton className="h-[60vh] w-full" />
      </AppShell>
    );
  }
  if (!data) {
    return (
      <AppShell>
        <EmptyState
          icon={FileText}
          title={fr ? 'Devis introuvable' : 'Quote not found'}
          action={
            <Button asChild variant="secondary">
              <Link href="/documents?tab=quotes">{fr ? 'Retour aux devis' : 'Back to quotes'}</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const q = data.quote;
  const st = statusOf(QUOTE_STATUS, q.status, lang);
  const contactName = data.contact ? `${data.contact.first_name} ${data.contact.last_name}` : null;

  if (editing && q.status === 'draft') {
    return (
      <AppShell fill>
        <PageHeader backHref={`/documents/quotes/${q.id}`} title={fr ? `Modifier ${q.number ?? 'le devis'}` : `Edit ${q.number ?? 'quote'}`} />
        <QuoteEditor
          quoteId={q.id}
          initial={{
            title: q.title,
            company_id: q.company_id,
            contact_id: q.contact_id,
            opportunity_id: q.opportunity_id,
            template_id: q.template_id,
            issue_date: q.issue_date,
            valid_until: q.valid_until,
            vat_rate: Number(q.vat_rate),
            intro_text: q.intro_text ?? '',
            terms_text: q.terms_text ?? '',
            notes: q.notes ?? '',
            items: data.items.map((i) => ({ description: i.description, consultant_id: i.consultant_id, quantity: Number(i.quantity), unit: i.unit, unit_price: Number(i.unit_price) })),
          }}
          onSaved={() => {
            setEditing(false);
            void reload();
          }}
          onCancel={() => setEditing(false)}
        />
      </AppShell>
    );
  }

  return (
    <AppShell fill>
      <div className="no-print">
        <PageHeader
          backHref="/documents?tab=quotes"
          backLabel={fr ? 'Devis' : 'Quotes'}
          title={`${q.number ?? (fr ? 'Devis' : 'Quote')} — ${q.title}`}
          description={
            <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
              <StatusPill tone={st.tone}>{st.label}</StatusPill>
              {data.company && (
                <Link href={`/clients/${data.company.id}`} className="hover:text-foreground">
                  {data.company.name}
                </Link>
              )}
              {q.version > 1 && <span>{fr ? `Version ${q.version}` : `Version ${q.version}`}</span>}
            </span>
          }
          actions={
            <>
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer />
                {fr ? 'Imprimer / PDF' : 'Print / PDF'}
              </Button>
              {canEdit && q.status === 'draft' && (
                <>
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    <Pencil />
                    {fr ? 'Modifier' : 'Edit'}
                  </Button>
                  <Button onClick={() => setConfirmSend(true)}>
                    <Send />
                    {fr ? 'Marquer comme envoyé' : 'Mark as sent'}
                  </Button>
                </>
              )}
              {canEdit && q.status === 'sent' && (
                <>
                  <Button variant="secondary" onClick={() => void act('expire')} disabled={!!busy}>
                    <TimerOff />
                    {fr ? 'Expiré' : 'Expired'}
                  </Button>
                  <Button variant="destructive-outline" onClick={() => void act('decline')} loading={busy === 'decline'}>
                    <X />
                    {fr ? 'Refusé' : 'Declined'}
                  </Button>
                  <Button onClick={() => void act('accept')} loading={busy === 'accept'}>
                    <Check />
                    {fr ? 'Accepté' : 'Accepted'}
                  </Button>
                </>
              )}
              {canEdit && (q.status === 'declined' || q.status === 'expired') && (
                <Button variant="secondary" onClick={() => void act('reopen')} loading={busy === 'reopen'}>
                  <RotateCcw />
                  {fr ? 'Rouvrir' : 'Reopen'}
                </Button>
              )}
              {canEdit && q.status !== 'draft' && (
                <Button variant="secondary" onClick={() => void act('new_version')} loading={busy === 'new_version'}>
                  <CopyPlus />
                  {fr ? 'Nouvelle version' : 'New version'}
                </Button>
              )}
            </>
          }
        />
      </div>

      <div className="print-only hidden print:block">
        <QuoteDocument
          quote={q}
          items={data.items}
          branding={branding}
          client={data.company ? { name: data.company.name, address: data.company.address, city: data.company.city } : null}
          contact={contactName ? { name: contactName, email: data.contact?.email } : null}
        />
      </div>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <DocumentCanvas title={<h2 className="text-[13.5px] font-semibold">{q.number ?? (fr ? 'Brouillon' : 'Draft')}</h2>}>
          <QuoteDocument
            quote={q}
            items={data.items}
            branding={branding}
            client={data.company ? { name: data.company.name, address: data.company.address, city: data.company.city } : null}
            contact={contactName ? { name: contactName, email: data.contact?.email } : null}
          />
        </DocumentCanvas>

        <aside className="no-print no-scrollbar space-y-4 lg:min-h-0 lg:overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle>{fr ? 'Synthèse' : 'Summary'}</CardTitle>
            </CardHeader>
            <CardContent>
              <FactList
                facts={[
                  { label: fr ? 'Total HT' : 'Total excl. VAT', value: <span className="num font-medium">{formatEur(Number(q.total_ht), lang, 2)}</span> },
                  { label: fr ? 'Total TTC' : 'Total incl. VAT', value: <span className="num">{formatEur(Number(q.total_ttc), lang, 2)}</span> },
                  { label: fr ? 'Émis le' : 'Issued', value: formatDate(q.issue_date, lang) },
                  { label: fr ? 'Validité' : 'Valid until', value: q.valid_until ? formatDate(q.valid_until, lang) : '—' },
                  { label: fr ? 'Envoyé le' : 'Sent', value: q.sent_at ? formatDate(q.sent_at, lang) : '—' },
                  { label: fr ? 'Décision' : 'Decision', value: q.decided_at ? formatDate(q.decided_at, lang) : '—' },
                  {
                    label: fr ? 'Opportunité' : 'Opportunity',
                    value: data.opportunity ? (
                      <Link href={`/opportunities/${data.opportunity.id}`} className="text-primary-deep hover:underline">
                        {data.opportunity.title}
                      </Link>
                    ) : (
                      '—'
                    ),
                  },
                  { label: 'Contact', value: contactName ?? '—' },
                ]}
              />
              {q.notes && (
                <div className="mt-3 rounded-md bg-muted/60 p-2.5 text-[12.5px]">
                  <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{fr ? 'Notes internes' : 'Internal notes'}</div>
                  <p className="whitespace-pre-wrap">{q.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {data.versions.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>{fr ? 'Versions' : 'Versions'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {data.versions.map((v) => {
                  const vs = statusOf(QUOTE_STATUS, v.status, lang);
                  return (
                    <Link
                      key={v.id}
                      href={`/documents/quotes/${v.id}`}
                      className={cn('flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-muted', v.id === q.id && 'bg-muted font-medium')}
                    >
                      <span>
                        v{v.version} <span className="text-muted-foreground">· {v.number ?? '—'}</span>
                      </span>
                      <StatusPill tone={vs.tone}>
                        {vs.label}
                      </StatusPill>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
            {fr
              ? 'Centrium n’envoie pas le devis par e-mail : exportez-le en PDF et transmettez-le au client. Une fois marqué comme envoyé, il apparaît dans le portail client de cette entreprise si un accès a été ouvert.'
              : 'Centrium does not email the quote: export it as PDF and send it to the client. Once marked as sent, it appears in that company’s client portal if access has been granted.'}
          </p>
        </aside>
      </div>

      <Dialog open={confirmSend} onOpenChange={setConfirmSend}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fr ? 'Marquer le devis comme envoyé ?' : 'Mark the quote as sent?'}</DialogTitle>
            <DialogDescription>
              {fr
                ? 'Le devis sera figé : toute modification passera par une nouvelle version. Pensez à le transmettre au client (PDF).'
                : 'The quote will be locked: any change will require a new version. Remember to send it to the client (PDF).'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmSend(false)}>
              {fr ? 'Annuler' : 'Cancel'}
            </Button>
            <Button onClick={() => void act('mark_sent')} loading={busy === 'mark_sent'}>
              {fr ? 'Confirmer' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
