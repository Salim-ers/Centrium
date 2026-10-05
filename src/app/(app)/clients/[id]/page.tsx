'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Briefcase,
  Building2,
  DoorOpen,
  ExternalLink,
  FileText,
  Globe,
  Inbox,
  Linkedin,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Target,
  UserRound,
  Users,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, KPICard } from '@/components/app';
import { FactList } from '@/components/app/FactList';
import { NotesPanel } from '@/components/app/NotesPanel';
import { ActivityTimeline } from '@/components/app/ActivityTimeline';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusPill } from '@/components/ui/status-pill';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientDrawer, CLIENT_KIND_LABEL } from '@/components/clients/ClientDrawer';
import { OpportunityDrawer } from '@/components/crm/OpportunityDrawer';
import { ContactFormDialog } from '@/components/crm/ContactFormDialog';
import { TaskList } from '@/components/crm/TaskList';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { loadClient360, type Client360 } from '@/lib/pilotage/load-client360';
import { stageLabel, stageTone } from '@/lib/crm/pipeline';
import { isOpenOpportunity, opportunityAmount } from '@/lib/pilotage/metrics';
import {
  CLIENT_REQUEST_STATUS,
  DOCUMENT_KIND,
  INVOICE_STATUS,
  MISSION_STATUS,
  QUOTE_STATUS,
  TIMESHEET_STATUS,
  periodLabel,
  statusOf,
} from '@/lib/status';
import { formatDate, formatEur, formatEurCompact, formatPct, monthLabel } from '@/lib/format';
import { CONTACT_TYPE_LABEL } from '@/constants';
import { cn } from '@/lib/utils';

function Row({ href, children, className }: { href?: string; children: React.ReactNode; className?: string }) {
  const cls = cn('flex items-center gap-3 px-4 py-3 transition-colors', href && 'hover:bg-muted/50', className);
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <div className={cls}>{children}</div>
  );
}

function ListCard({
  title,
  count,
  action,
  empty,
  children,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
  empty?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>
          {title}
          {count !== undefined && <span className="num ml-1.5 text-xs font-normal text-muted-foreground">{count}</span>}
        </CardTitle>
        {action}
      </CardHeader>
      {count === 0 && empty ? (
        <CardContent>
          <p className="text-[13px] text-muted-foreground">{empty}</p>
        </CardContent>
      ) : (
        <div className="divide-y divide-border border-t border-border">{children}</div>
      )}
    </Card>
  );
}

export default function Client360Page() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const { activeOrgId } = useOrganization();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const [tab, setTab] = useState(() => {
    const t = params.get('tab') ?? 'overview';
    if (t === 'finance') return 'missions';
    return ['overview', 'opportunities', 'missions', 'documents'].includes(t) ? t : 'overview';
  });
  const [editing, setEditing] = useState(false);
  const [newOpp, setNewOpp] = useState(false);
  const [newContact, setNewContact] = useState(false);

  const { data, loading, reload } = useCachedQuery<Client360 | null>(
    `client360:${id}`,
    () => loadClient360(createClient(), id, can),
    { enabled: !!id && ready },
  );

  const missionsActive = useMemo(() => (data?.missions ?? []).filter((m) => m.status === 'active'), [data]);
  const missionsPast = useMemo(() => (data?.missions ?? []).filter((m) => m.status !== 'active'), [data]);
  const missionTitle = useMemo(() => new Map((data?.missions ?? []).map((m) => [m.id, m])), [data]);

  if (loading && !data) {
    return (
      <AppShell>
        <Skeleton className="mb-3 h-5 w-24" />
        <Skeleton className="mb-6 h-8 w-1/2" />
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }
  if (!data) {
    return (
      <AppShell>
        <EmptyState
          icon={Building2}
          title={fr ? 'Client introuvable' : 'Client not found'}
          description={fr ? 'Il a peut-être été archivé, ou vous n’y avez pas accès.' : 'It may have been archived, or you do not have access.'}
          action={
            <Button asChild variant="secondary">
              <Link href="/clients">{fr ? 'Retour aux clients' : 'Back to clients'}</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const c = data.company;
  const m = data.metrics;
  const openOpps = data.opportunities.filter(isOpenOpportunity);
  const pendingRequests = data.requests.filter((r) => r.status === 'new' || r.status === 'in_review');
  const maxMonthly = Math.max(1, ...data.monthly.map((x) => x.revenue));

  return (
    <AppShell>
      <PageHeader
        backHref="/clients"
        backLabel={fr ? 'Clients' : 'Clients'}
        title={c.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge variant={c.kind === 'client' ? 'brand' : 'neutral'}>{CLIENT_KIND_LABEL[c.kind]?.[lang] ?? c.kind}</Badge>
            {c.industry && <span>{c.industry}</span>}
            {c.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {c.city}
              </span>
            )}
          </span>
        }
        actions={
          <>
            {can('clients.edit') && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil />
                {fr ? 'Modifier' : 'Edit'}
              </Button>
            )}
            {can('opportunities.edit') && (
              <Button onClick={() => setNewOpp(true)}>
                <Plus />
                {fr ? 'Opportunité' : 'Opportunity'}
              </Button>
            )}
          </>
        }
      />

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {m.revenue12m !== null && (
          <KPICard accent="terra" label={fr ? 'CA généré · 12 mois' : 'Revenue · 12 months'} valueText={formatEurCompact(m.revenue12m, lang)} hint={fr ? 'CRA validés' : 'Approved timesheets'} />
        )}
        {m.forecast3m !== null && (
          <KPICard label={fr ? 'CA prévisionnel · 3 mois' : 'Forecast · 3 months'} valueText={formatEurCompact(m.forecast3m, lang)} hint={fr ? 'Missions actives' : 'Active missions'} />
        )}
        {m.marginPct !== null && (
          <KPICard accent="soft" label={fr ? 'Marge moyenne' : 'Average margin'} valueText={formatPct(m.marginPct, lang)} tone="emerald" />
        )}
        <KPICard label={fr ? 'Consultants placés' : 'Consultants placed'} value={m.placedConsultants} hint={fr ? `${m.activeMissions} mission(s) en cours` : `${m.activeMissions} active mission(s)`} />
        <KPICard accent="peach"
          label={fr ? 'Opportunités ouvertes' : 'Open opportunities'}
          value={m.openOpportunities}
          hint={m.weightedPipeline ? `${formatEurCompact(m.weightedPipeline, lang)} ${fr ? 'pondérés' : 'weighted'}` : undefined}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList variant="underline">
              <TabsTrigger value="overview">{fr ? 'Aperçu' : 'Overview'}</TabsTrigger>
              <TabsTrigger value="opportunities">
                {fr ? 'Opportunités' : 'Opportunities'} <span className="num text-xs text-muted-foreground">{data.opportunities.length}</span>
              </TabsTrigger>
              <TabsTrigger value="missions">
                Missions <span className="num text-xs text-muted-foreground">{data.missions.length}</span>
              </TabsTrigger>
              {can('documents.view') && <TabsTrigger value="documents">{fr ? 'Documents' : 'Documents'}</TabsTrigger>}
            </TabsList>

            <TabsContent value="overview" className="space-y-5">
              {pendingRequests.length > 0 && (
                <ListCard title={fr ? 'Demandes du portail client' : 'Client portal requests'} count={pendingRequests.length}>
                  {pendingRequests.map((r) => {
                    const st = statusOf(CLIENT_REQUEST_STATUS, r.status, lang);
                    return (
                      <Row key={r.id} href={r.opportunity_id ? `/opportunities/${r.opportunity_id}` : '/portals?tab=requests'}>
                        <Inbox className="h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] font-medium">{r.title}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(r.created_at, lang)}</div>
                        </div>
                        <StatusPill tone={st.tone}>{st.label}</StatusPill>
                      </Row>
                    );
                  })}
                </ListCard>
              )}

              <ListCard
                title={fr ? 'Missions en cours' : 'Active missions'}
                count={missionsActive.length}
                empty={fr ? 'Aucune mission en cours chez ce client.' : 'No active mission for this client.'}
              >
                {missionsActive.map((ms) => (
                  <Row key={ms.id} href={`/missions/${ms.id}`}>
                    <Avatar name={ms.consultants ? `${ms.consultants.first_name} ${ms.consultants.last_name}` : '?'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium">{ms.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {ms.consultants ? `${ms.consultants.first_name} ${ms.consultants.last_name}` : '—'}
                        {ms.end_date ? ` · ${fr ? 'fin' : 'ends'} ${formatDate(ms.end_date, lang)}` : ''}
                      </div>
                    </div>
                    {can('consultants.financials') && ms.daily_rate_eur ? (
                      <span className="num text-[13px] text-muted-foreground">{formatEur(ms.daily_rate_eur, lang)}/j</span>
                    ) : null}
                  </Row>
                ))}
              </ListCard>

              <ListCard
                title={fr ? 'Opportunités ouvertes' : 'Open opportunities'}
                count={openOpps.length}
                empty={fr ? 'Aucune opportunité ouverte.' : 'No open opportunity.'}
                action={
                  can('opportunities.edit') && (
                    <Button variant="ghost" size="sm" onClick={() => setNewOpp(true)}>
                      <Plus />
                      {fr ? 'Ajouter' : 'Add'}
                    </Button>
                  )
                }
              >
                {openOpps.slice(0, 6).map((o) => (
                  <Row key={o.id} href={`/opportunities/${o.id}`}>
                    <Target className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{o.title}</div>
                    <span className="num hidden text-[13px] text-muted-foreground sm:inline">{opportunityAmount(o) ? formatEurCompact(opportunityAmount(o), lang) : ''}</span>
                    <StatusPill tone={stageTone(o.status)}>{stageLabel(o.status, lang)}</StatusPill>
                  </Row>
                ))}
              </ListCard>

              {m.revenue12m !== null && m.revenue12m > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{fr ? 'CA mensuel' : 'Monthly revenue'}</CardTitle>
                    <p className="text-xs text-muted-foreground">{fr ? 'CRA validés, 12 derniers mois' : 'Approved timesheets, last 12 months'}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex h-36 items-end gap-1.5" role="img" aria-label={fr ? 'CA mensuel du client' : 'Client monthly revenue'}>
                      {data.monthly.map((x) => (
                        <div key={x.key} className="flex flex-1 flex-col items-center gap-1" title={`${monthLabel(x.key, lang, true)} · ${formatEur(x.revenue, lang)}`}>
                          <div className="w-full rounded-t bg-primary/80 transition-[height] duration-500" style={{ height: `${(x.revenue / maxMonthly) * 100}%`, minHeight: x.revenue ? 3 : 0 }} />
                          <span className="text-[10px] text-muted-foreground">{monthLabel(x.key, lang)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            
              <ListCard
                title="Contacts"
                count={data.contacts.length}
                empty={fr ? 'Aucun contact rattaché à ce client.' : 'No contact linked to this client.'}
                action={
                  can('crm.edit') && (
                    <Button variant="ghost" size="sm" onClick={() => setNewContact(true)}>
                      <Plus />
                      {fr ? 'Ajouter' : 'Add'}
                    </Button>
                  )
                }
              >
                {data.contacts.map((ct) => (
                  <Row key={ct.id}>
                    <Avatar name={`${ct.first_name} ${ct.last_name}`} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium">
                        {ct.first_name} {ct.last_name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[ct.job_title, CONTACT_TYPE_LABEL[ct.contact_type]].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {ct.email && (
                        <Button asChild variant="ghost" size="icon-sm" aria-label={`Email ${ct.first_name}`}>
                          <a href={`mailto:${ct.email}`}>
                            <Mail />
                          </a>
                        </Button>
                      )}
                      {ct.phone && (
                        <Button asChild variant="ghost" size="icon-sm" aria-label={`${fr ? 'Appeler' : 'Call'} ${ct.first_name}`}>
                          <a href={`tel:${ct.phone}`}>
                            <Phone />
                          </a>
                        </Button>
                      )}
                    </div>
                  </Row>
                ))}
              </ListCard>
              <div className="grid gap-5 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{fr ? 'Tâches' : 'Tasks'}</CardTitle>
                  </CardHeader>
                  <CardContent><TaskList entityType="client" entityId={c.id} filter="all" compact /></CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent><NotesPanel entityType="company" entityId={c.id} canEdit={can('clients.edit')} /></CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{fr ? 'Historique' : 'History'}</CardTitle>
                </CardHeader>
                <CardContent><ActivityTimeline entityType="company" entityId={c.id} /></CardContent>
              </Card>
            </TabsContent>


            <TabsContent value="opportunities">
              <ListCard title={fr ? 'Opportunités' : 'Opportunities'} count={data.opportunities.length} empty={fr ? 'Aucune opportunité.' : 'No opportunity.'}>
                {data.opportunities.map((o) => (
                  <Row key={o.id} href={`/opportunities/${o.id}`}>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium">{o.title}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(o.updated_at, lang)}</div>
                    </div>
                    <span className="num hidden text-[13px] text-muted-foreground sm:inline">{opportunityAmount(o) ? formatEurCompact(opportunityAmount(o), lang) : ''}</span>
                    <StatusPill tone={stageTone(o.status)}>{stageLabel(o.status, lang)}</StatusPill>
                  </Row>
                ))}
              </ListCard>
            </TabsContent>

            <TabsContent value="missions" className="space-y-5">
              {[
                { title: fr ? 'En cours' : 'Active', list: missionsActive },
                { title: fr ? 'Terminées et autres' : 'Ended and other', list: missionsPast },
              ].map((group) => (
                <ListCard key={group.title} title={group.title} count={group.list.length} empty={fr ? 'Aucune mission.' : 'No mission.'}>
                  {group.list.map((ms) => {
                    const st = statusOf(MISSION_STATUS, ms.status, lang);
                    return (
                      <Row key={ms.id} href={`/missions/${ms.id}`}>
                        <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] font-medium">{ms.title}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {ms.consultants ? `${ms.consultants.first_name} ${ms.consultants.last_name} · ` : ''}
                            {formatDate(ms.start_date, lang, 'short')} → {ms.end_date ? formatDate(ms.end_date, lang, 'short') : fr ? 'sans fin' : 'open-ended'}
                          </div>
                        </div>
                        <StatusPill tone={st.tone}>{st.label}</StatusPill>
                      </Row>
                    );
                  })}
                </ListCard>
              ))}
            
              <ListCard title={fr ? 'CRA liés' : 'Related timesheets'} count={data.timesheets.length} empty={fr ? 'Aucun CRA.' : 'No timesheet.'}>
                {data.timesheets.slice(0, 24).map((t) => {
                  const st = statusOf(TIMESHEET_STATUS, t.status, lang);
                  const ms = missionTitle.get(t.mission_id);
                  return (
                    <Row key={t.id} href={`/timesheets/${t.id}`}>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium">{periodLabel(t.period_month, t.period_year, lang)}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {ms?.consultants ? `${ms.consultants.first_name} ${ms.consultants.last_name} · ` : ''}
                          {ms?.title}
                        </div>
                      </div>
                      <span className="num text-[13px] text-muted-foreground">{t.days_validated || t.days_worked} j</span>
                      <StatusPill tone={st.tone}>{st.label}</StatusPill>
                    </Row>
                  );
                })}
              </ListCard>
              {m.revenue12m !== null && (
                <ListCard title={fr ? 'Préfactures et factures' : 'Pre-invoices and invoices'} count={data.invoices.length} empty={fr ? 'Aucune préfacture.' : 'No pre-invoice.'}>
                  {data.invoices.map((inv) => {
                    const st = statusOf(INVOICE_STATUS, inv.status, lang);
                    return (
                      <Row key={inv.id} href={`/invoices/${inv.id}`}>
                        <Receipt className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] font-medium">{inv.invoice_number}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {inv.period_label ?? formatDate(inv.issue_date, lang)} · {fr ? 'échéance' : 'due'} {formatDate(inv.due_date, lang, 'short')}
                          </div>
                        </div>
                        <span className="num text-[13px]">{formatEur(inv.amount_ht, lang)}</span>
                        <StatusPill tone={st.tone}>{st.label}</StatusPill>
                      </Row>
                    );
                  })}
                </ListCard>
              )}
            </TabsContent>


            <TabsContent value="documents" className="space-y-5">
              <ListCard
                title={fr ? 'Devis' : 'Quotes'}
                count={data.quotes.length}
                empty={fr ? 'Aucun devis pour ce client.' : 'No quote for this client.'}
                action={
                  can('documents.edit') && (
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/documents/quotes/new?client=${c.id}`}>
                        <Plus />
                        {fr ? 'Devis' : 'Quote'}
                      </Link>
                    </Button>
                  )
                }
              >
                {data.quotes.map((q) => {
                  const st = statusOf(QUOTE_STATUS, q.status, lang);
                  return (
                    <Row key={q.id} href={`/documents/quotes/${q.id}`}>
                      <Receipt className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium">
                          {q.number} · {q.title}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDate(q.issue_date, lang)}</div>
                      </div>
                      <span className="num text-[13px]">{formatEur(q.total_ht, lang)}</span>
                      <StatusPill tone={st.tone}>{st.label}</StatusPill>
                    </Row>
                  );
                })}
              </ListCard>
              <ListCard title="Documents" count={data.documents.length} empty={fr ? 'Aucun document.' : 'No document.'}>
                {data.documents.map((d) => (
                  <Row key={d.id} href={`/documents?doc=${d.id}`}>
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium">{d.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {DOCUMENT_KIND[d.kind]?.[lang]} · v{d.version} · {formatDate(d.created_at, lang)}
                      </div>
                    </div>
                    {d.visibility === 'client' && <Badge variant="info">{fr ? 'Partagé client' : 'Shared'}</Badge>}
                  </Row>
                ))}
              </ListCard>
            </TabsContent>

          </Tabs>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{fr ? 'Société' : 'Company'}</CardTitle>
            </CardHeader>
            <CardContent>
              <FactList
                facts={[
                  { label: fr ? 'Secteur' : 'Industry', value: c.industry },
                  { label: fr ? 'Taille' : 'Size', value: c.size },
                  {
                    label: fr ? 'Adresse' : 'Address',
                    value: [c.address, c.city, c.country].filter(Boolean).join(', ') || null,
                  },
                  {
                    label: fr ? 'En ligne' : 'Online',
                    value:
                      c.website || c.linkedin_url ? (
                        <span className="flex flex-col gap-1">
                          {c.website && (
                            <a href={c.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:text-primary-deep">
                              <Globe className="h-3.5 w-3.5" />
                              {c.website.replace(/^https?:\/\//, '')}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {c.linkedin_url && (
                            <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:text-primary-deep">
                              <Linkedin className="h-3.5 w-3.5" />
                              LinkedIn
                            </a>
                          )}
                        </span>
                      ) : null,
                  },
                  { label: fr ? 'Client depuis' : 'Client since', value: formatDate(c.created_at, lang) },
                ]}
              />
            </CardContent>
          </Card>
          {can('portals.manage') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DoorOpen className="h-4 w-4 text-muted-foreground" />
                  {fr ? 'Portail client' : 'Client portal'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.portalUsers.filter((u) => !u.revoked_at).length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">
                    {fr ? 'Aucun accès portail pour ce client.' : 'No portal access for this client.'}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {data.portalUsers
                      .filter((u) => !u.revoked_at)
                      .map((u) => (
                        <li key={u.user_id} className="flex items-center gap-2 text-[13px]">
                          <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{u.email}</span>
                        </li>
                      ))}
                  </ul>
                )}
                <Button asChild variant="secondary" size="sm" className="w-full">
                  <Link href={`/portals?tab=clients&company=${c.id}`}>
                    <Users />
                    {fr ? 'Gérer les accès' : 'Manage access'}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

      {activeOrgId && (
        <>
          <ClientDrawer open={editing} onOpenChange={setEditing} organizationId={activeOrgId} client={c} onSaved={() => void reload()} />
          <OpportunityDrawer
            open={newOpp}
            onOpenChange={setNewOpp}
            organizationId={activeOrgId}
            defaults={{ company_id: c.id }}
            onSaved={() => void reload()}
          />
          <ContactFormDialog
            open={newContact}
            onOpenChange={setNewContact}
            organizationId={activeOrgId}
            defaultCompanyId={c.id}
            onSaved={() => void reload()}
          />
        </>
      )}
    </AppShell>
  );
}
