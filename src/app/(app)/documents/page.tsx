'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Download, FileSignature, FileText, Lock, Plus, Search, Upload } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, KPICard } from '@/components/app';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { DocumentUploadDrawer } from '@/components/documents/DocumentUploadDrawer';
import { DocumentDetailDrawer, VISIBILITY_LABEL, fileSize } from '@/components/documents/DocumentDetailDrawer';
import { TemplatesPanel } from '@/components/documents/TemplatesPanel';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCompaniesLite, useConsultantsLite } from '@/hooks/useOrgDirectory';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { DOCUMENT_KIND, QUOTE_STATUS, statusOf } from '@/lib/status';
import { formatDate, formatEur, formatEurCompact, formatPct } from '@/lib/format';
import type { LibraryDocument, Quote } from '@/types';

type QuoteRow = Pick<Quote, 'id' | 'number' | 'title' | 'status' | 'total_ht' | 'issue_date' | 'valid_until' | 'version' | 'root_id' | 'company_id' | 'sent_at' | 'decided_at'>;
type ContractRow = { id: string; title: string | null; status: string; contract_number: string | null; created_at: string };

type Library = { quotes: QuoteRow[]; documents: LibraryDocument[]; contracts: ContractRow[] };

async function loadLibrary(orgId: string): Promise<Library> {
  const supabase = createClient();
  const tolerant = <T,>(p: PromiseLike<{ data: unknown; error: unknown }>, fallback: T): Promise<T> =>
    Promise.resolve(p).then((r) => (r.error ? fallback : ((r.data as T | null) ?? fallback)));
  const [quotes, documents, contracts] = await Promise.all([
    tolerant<QuoteRow[]>(
      supabase
        .from('quotes')
        .select('id, number, title, status, total_ht, issue_date, valid_until, version, root_id, company_id, sent_at, decided_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(2000),
      [],
    ),
    tolerant<LibraryDocument[]>(supabase.from('documents').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(3000), []),
    tolerant<ContractRow[]>(
      supabase.from('contracts').select('id, title, status, contract_number, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(8),
      [],
    ),
  ]);
  return { quotes, documents, contracts };
}

/** Dernière version de chaque groupe (root_id) + index des versions. */
function latestByRoot<T extends { id: string; root_id: string | null; version: number }>(rows: T[]) {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const key = r.root_id ?? r.id;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  for (const list of groups.values()) list.sort((a, b) => b.version - a.version);
  const latest = [...groups.values()].map((l) => l[0]!);
  return { latest, groups };
}

export default function DocumentsPage() {
  const params = useSearchParams();
  const { activeOrgId } = useOrganization();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const canEdit = can('documents.edit');
  const { byId: companies } = useCompaniesLite();
  const { byId: consultants } = useConsultantsLite();

  const [tab, setTab] = useState(params.get('tab') ?? 'quotes');
  const [quoteStatus, setQuoteStatus] = useState('');
  const [kind, setKind] = useState('');
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [openDocId, setOpenDocId] = useState<string | null>(params.get('doc'));
  const [uploadOpen, setUploadOpen] = useState(false);
  const [versionOf, setVersionOf] = useState<LibraryDocument | null>(null);

  useEffect(() => {
    if (params.get('doc')) setTab('library');
  }, [params]);

  const { data, loading, reload } = useCachedQuery<Library>(`documents:${activeOrgId ?? 'none'}`, () => loadLibrary(activeOrgId!), {
    enabled: !!activeOrgId && ready && can('documents.view'),
  });

  const quotes = useMemo(() => latestByRoot(data?.quotes ?? []).latest, [data]);
  const docs = useMemo(() => latestByRoot(data?.documents ?? []), [data]);

  const q = query.trim().toLowerCase();
  const filteredQuotes = useMemo(
    () =>
      quotes.filter(
        (r) =>
          (!quoteStatus || r.status === quoteStatus) &&
          (!q || `${r.number ?? ''} ${r.title} ${r.company_id ? (companies.get(r.company_id)?.name ?? '') : ''}`.toLowerCase().includes(q)),
      ),
    [quotes, quoteStatus, q, companies],
  );
  const filteredDocs = useMemo(
    () =>
      docs.latest.filter(
        (d) =>
          (showArchived || !d.archived) &&
          (!kind || d.kind === kind) &&
          (!q || `${d.title} ${d.file_name ?? ''} ${d.description ?? ''}`.toLowerCase().includes(q)),
      ),
    [docs, showArchived, kind, q],
  );

  const quoteKpis = useMemo(() => {
    const since = new Date();
    since.setFullYear(since.getFullYear() - 1);
    const pending = quotes.filter((r) => r.status === 'sent');
    const decided = quotes.filter((r) => (r.status === 'accepted' || r.status === 'declined') && r.decided_at && new Date(r.decided_at) >= since);
    const accepted = decided.filter((r) => r.status === 'accepted');
    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, r) => s + Number(r.total_ht), 0),
      acceptedAmount: accepted.reduce((s, r) => s + Number(r.total_ht), 0),
      rate: decided.length ? (accepted.length / decided.length) * 100 : null,
      drafts: quotes.filter((r) => r.status === 'draft').length,
    };
  }, [quotes]);

  const openDoc = openDocId ? (data?.documents ?? []).find((d) => d.id === openDocId) ?? null : null;
  const openVersions = openDoc ? (docs.groups.get(openDoc.root_id ?? openDoc.id) ?? [openDoc]) : [];

  if (ready && !can('documents.view')) {
    return (
      <AppShell>
        <EmptyState icon={Lock} title={fr ? 'Accès restreint' : 'Restricted access'} description={fr ? 'Votre rôle ne donne pas accès aux documents.' : 'Your role has no access to documents.'} />
      </AppShell>
    );
  }

  const quoteColumns: Column<QuoteRow>[] = [
    {
      id: 'number',
      header: fr ? 'Devis' : 'Quote',
      mobile: 'title',
      sortValue: (r) => r.number ?? '',
      cell: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{r.title}</div>
          <div className="text-[12px] text-muted-foreground">
            {r.number ?? '—'}
            {r.version > 1 && ` · v${r.version}`}
          </div>
        </div>
      ),
    },
    {
      id: 'client',
      header: 'Client',
      mobile: 'subtitle',
      sortValue: (r) => (r.company_id ? (companies.get(r.company_id)?.name ?? '') : ''),
      cell: (r) => (r.company_id ? (companies.get(r.company_id)?.name ?? '—') : '—'),
    },
    {
      id: 'status',
      header: fr ? 'Statut' : 'Status',
      mobile: 'trailing',
      sortValue: (r) => r.status,
      cell: (r) => {
        const s = statusOf(QUOTE_STATUS, r.status, lang);
        return <StatusPill tone={s.tone}>{s.label}</StatusPill>;
      },
    },
    { id: 'date', header: fr ? 'Date' : 'Date', hideOnMobile: true, sortValue: (r) => r.issue_date, cell: (r) => formatDate(r.issue_date, lang) },
    {
      id: 'until',
      header: fr ? 'Validité' : 'Valid until',
      hideOnMobile: true,
      sortValue: (r) => r.valid_until ?? '',
      cell: (r) => {
        if (!r.valid_until) return '—';
        const late = r.status === 'sent' && r.valid_until < new Date().toISOString().slice(0, 10);
        return <span className={late ? 'text-warning' : undefined}>{formatDate(r.valid_until, lang)}</span>;
      },
    },
    {
      id: 'amount',
      header: fr ? 'Montant HT' : 'Amount',
      align: 'right',
      mobile: 'meta',
      sortValue: (r) => Number(r.total_ht),
      cell: (r) => <span className="num">{formatEur(Number(r.total_ht), lang)}</span>,
    },
  ];

  const docColumns: Column<LibraryDocument>[] = [
    {
      id: 'title',
      header: fr ? 'Document' : 'Document',
      mobile: 'title',
      sortValue: (d) => d.title,
      cell: (d) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="truncate font-medium">
              {d.title}
              {d.archived && <span className="ml-2 text-[11px] font-normal text-muted-foreground">({fr ? 'archivé' : 'archived'})</span>}
            </div>
            <div className="truncate text-[12px] text-muted-foreground">
              {d.file_name ?? '—'} · {fileSize(d.size_bytes)}
              {d.version > 1 && ` · v${d.version}`}
            </div>
          </div>
        </div>
      ),
    },
    { id: 'kind', header: 'Type', mobile: 'subtitle', sortValue: (d) => d.kind, cell: (d) => DOCUMENT_KIND[d.kind]?.[lang] ?? d.kind },
    {
      id: 'link',
      header: fr ? 'Rattachement' : 'Linked to',
      hideOnMobile: true,
      cell: (d) => {
        const parts = [
          d.company_id ? companies.get(d.company_id)?.name : null,
          d.consultant_id && consultants.get(d.consultant_id) ? `${consultants.get(d.consultant_id)!.first_name} ${consultants.get(d.consultant_id)!.last_name}` : null,
        ].filter(Boolean);
        return parts.length ? <span className="text-[13px]">{parts.join(' · ')}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: 'visibility',
      header: fr ? 'Visibilité' : 'Visibility',
      mobile: 'meta',
      sortValue: (d) => d.visibility,
      cell: (d) => <StatusPill tone={d.visibility === 'internal' ? 'neutral' : 'info'}>{VISIBILITY_LABEL[d.visibility][lang]}</StatusPill>,
    },
    { id: 'date', header: fr ? 'Mis à jour' : 'Updated', hideOnMobile: true, sortValue: (d) => d.created_at, cell: (d) => formatDate(d.created_at, lang) },
    {
      id: 'dl',
      header: <span className="sr-only">{fr ? 'Télécharger' : 'Download'}</span>,
      align: 'right',
      mobile: 'hidden',
      width: '3rem',
      cell: (d) => (
        <a
          href={`/api/documents/${d.id}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={fr ? `Télécharger ${d.title}` : `Download ${d.title}`}
        >
          <Download className="h-4 w-4" />
        </a>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow={fr ? 'Opérations' : 'Operations'}
        title={fr ? 'Devis & documents' : 'Quotes & documents'}
        description={
          fr
            ? 'Devis numérotés et versionnés, documents de mission et contrats, partagés au client ou au consultant quand vous le décidez.'
            : 'Numbered, versioned quotes, mission documents and contracts, shared with clients or consultants when you decide.'
        }
        actions={
          canEdit && (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setVersionOf(null);
                  setUploadOpen(true);
                }}
              >
                <Upload />
                {fr ? 'Déposer un document' : 'Upload'}
              </Button>
              <Button asChild>
                <Link href="/documents/quotes/new">
                  <Plus />
                  {fr ? 'Nouveau devis' : 'New quote'}
                </Link>
              </Button>
            </>
          )
        }
      >
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList variant="underline">
            <TabsTrigger value="quotes">{fr ? 'Devis' : 'Quotes'}</TabsTrigger>
            <TabsTrigger value="library">{fr ? 'Bibliothèque' : 'Library'}</TabsTrigger>
            <TabsTrigger value="contracts">{fr ? 'Contrats' : 'Contracts'}</TabsTrigger>
            <TabsTrigger value="templates">{fr ? 'Modèles' : 'Templates'}</TabsTrigger>
          </TabsList>
        </Tabs>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsContent value="quotes" className="mt-0 space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KPICard label={fr ? 'Devis en attente' : 'Pending quotes'} value={quoteKpis.pendingCount} loading={loading && !data} hint={formatEurCompact(quoteKpis.pendingAmount, lang)} />
            <KPICard label={fr ? 'Acceptés (12 mois)' : 'Accepted (12 months)'} value={quoteKpis.acceptedAmount} format={(n) => formatEurCompact(n, lang)} loading={loading && !data} />
            <KPICard
              label={fr ? 'Taux d’acceptation' : 'Acceptance rate'}
              valueText={quoteKpis.rate != null ? formatPct(quoteKpis.rate, lang, 0) : '—'}
              hint={fr ? 'Devis décidés sur 12 mois' : 'Decided quotes, 12 months'}
              loading={loading && !data}
            />
            <KPICard label={fr ? 'Brouillons' : 'Drafts'} value={quoteKpis.drafts} loading={loading && !data} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:max-w-xs sm:flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={fr ? 'Numéro, objet, client…' : 'Number, subject, client…'} className="pl-8" aria-label={fr ? 'Rechercher' : 'Search'} />
            </div>
            <Select value={quoteStatus} onChange={(e) => setQuoteStatus(e.target.value)} className="sm:w-48" aria-label={fr ? 'Statut' : 'Status'}>
              <option value="">{fr ? 'Tous les statuts' : 'All statuses'}</option>
              {Object.keys(QUOTE_STATUS).map((s) => (
                <option key={s} value={s}>
                  {statusOf(QUOTE_STATUS, s, lang).label}
                </option>
              ))}
            </Select>
          </div>
          <DataTable
            rows={filteredQuotes}
            columns={quoteColumns}
            getRowId={(r) => r.id}
            rowHref={(r) => `/documents/quotes/${r.id}`}
            loading={loading && !data}
            initialSort={{ id: 'date', dir: 'desc' }}
            aria-label={fr ? 'Devis' : 'Quotes'}
            empty={
              <EmptyState
                size="compact"
                icon={FileText}
                title={quotes.length ? (fr ? 'Aucun devis ne correspond' : 'No matching quote') : fr ? 'Aucun devis' : 'No quotes yet'}
                description={quotes.length ? undefined : fr ? 'Créez un devis depuis une opportunité ou une fiche client.' : 'Create a quote from an opportunity or a client.'}
                action={
                  canEdit && !quotes.length ? (
                    <Button asChild size="sm">
                      <Link href="/documents/quotes/new">{fr ? 'Nouveau devis' : 'New quote'}</Link>
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        </TabsContent>

        <TabsContent value="library" className="mt-0 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative sm:max-w-xs sm:flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={fr ? 'Titre, fichier…' : 'Title, file…'} className="pl-8" aria-label={fr ? 'Rechercher' : 'Search'} />
            </div>
            <Select value={kind} onChange={(e) => setKind(e.target.value)} className="sm:w-56" aria-label="Type">
              <option value="">{fr ? 'Tous les types' : 'All types'}</option>
              {Object.entries(DOCUMENT_KIND)
                .filter(([k]) => k !== 'quote')
                .map(([k, l]) => (
                  <option key={k} value={k}>
                    {l[lang]}
                  </option>
                ))}
            </Select>
            <label className="flex items-center gap-2 text-[13px] text-muted-foreground sm:ml-auto">
              <Checkbox checked={showArchived} onCheckedChange={(c) => setShowArchived(c === true)} />
              {fr ? 'Afficher les archivés' : 'Show archived'}
            </label>
          </div>
          <DataTable
            rows={filteredDocs}
            columns={docColumns}
            getRowId={(d) => d.id}
            onRowClick={(d) => setOpenDocId(d.id)}
            loading={loading && !data}
            initialSort={{ id: 'date', dir: 'desc' }}
            aria-label={fr ? 'Documents' : 'Documents'}
            empty={
              <EmptyState
                size="compact"
                icon={FileText}
                title={docs.latest.length ? (fr ? 'Aucun document ne correspond' : 'No matching document') : fr ? 'Aucun document' : 'No documents yet'}
                description={docs.latest.length ? undefined : fr ? 'Propositions, bons de commande, documents de mission…' : 'Proposals, purchase orders, mission documents…'}
                action={
                  canEdit && !docs.latest.length ? (
                    <Button size="sm" onClick={() => setUploadOpen(true)}>
                      {fr ? 'Déposer un document' : 'Upload'}
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        </TabsContent>

        <TabsContent value="contracts" className="mt-0">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-medium">{fr ? 'Contrats' : 'Contracts'}</h2>
                  <p className="text-[13px] text-muted-foreground">
                    {fr ? 'Contrats de prestation et de sous-traitance générés depuis vos missions.' : 'Service and subcontracting agreements generated from your missions.'}
                  </p>
                </div>
                <Button asChild variant="secondary">
                  <Link href="/contracts">
                    <FileSignature />
                    {fr ? 'Ouvrir les contrats' : 'Open contracts'}
                  </Link>
                </Button>
              </div>
              {(data?.contracts ?? []).length > 0 ? (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {data!.contracts.map((c) => (
                    <li key={c.id}>
                      <Link href={`/contracts/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-muted/50">
                        <FileSignature className="h-4 w-4 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate font-medium">{c.title ?? c.contract_number ?? (fr ? 'Contrat' : 'Contract')}</span>
                        <span className="hidden text-muted-foreground sm:inline">{c.contract_number}</span>
                        <span className="text-muted-foreground">{formatDate(c.created_at, lang)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                !loading && <p className="text-[13px] text-muted-foreground">{fr ? 'Aucun contrat pour l’instant.' : 'No contracts yet.'}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <TemplatesPanel canEdit={canEdit} />
        </TabsContent>
      </Tabs>

      <DocumentDetailDrawer
        doc={openDoc}
        versions={openVersions}
        canEdit={canEdit}
        onOpenChange={(o) => !o && setOpenDocId(null)}
        onChanged={() => void reload()}
        onNewVersion={(d) => {
          setVersionOf(d);
          setUploadOpen(true);
        }}
      />
      <DocumentUploadDrawer
        open={uploadOpen}
        onOpenChange={(o) => {
          setUploadOpen(o);
          if (!o) setVersionOf(null);
        }}
        versionOf={versionOf}
        onUploaded={(d) => {
          void reload();
          setTab('library');
          setOpenDocId(versionOf ? d.id : null);
        }}
      />
    </AppShell>
  );
}
