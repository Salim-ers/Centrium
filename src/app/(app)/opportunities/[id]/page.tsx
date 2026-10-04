'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Briefcase,
  Check,
  FileText,
  Inbox,
  Pencil,
  Receipt,
  Sparkles,
  Trash2,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
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
import { OpportunityDrawer } from '@/components/crm/OpportunityDrawer';
import { TaskList } from '@/components/crm/TaskList';
import { OpportunityMatching } from '@/components/matching/OpportunityMatching';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCompaniesLite, useContactsLite, useTeamMembers } from '@/hooks/useOrgDirectory';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { crmService } from '@/lib/services/crm.service';
import { PIPELINE_STAGES, STAGE_BY_ID, probabilityForMove, stageLabel, stageOf, stageTone, type PipelineStageId } from '@/lib/crm/pipeline';
import { opportunityAmount } from '@/lib/pilotage/metrics';
import { REMOTE_POLICY_LABEL, type RemotePolicy } from '@/lib/validators/v2';
import { formatDate, formatEur, formatEurCompact, relativeDays } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { JobOffer, Opportunity } from '@/types';

type Bundle = { opp: Opportunity; offer: JobOffer | null };

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const { activeOrgId } = useOrganization();
  const { can } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const canEdit = can('opportunities.edit');
  const { byId: companies } = useCompaniesLite();
  const { byId: contacts } = useContactsLite();
  const { byId: members } = useTeamMembers();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState(params.get('tab') ?? 'overview');

  const { data, loading, setData } = useCachedQuery<Bundle | null>(
    `opp-detail:${id}`,
    async () => {
      const res = await crmService.getOpportunity(id);
      if (!res.data) return null;
      let offer: JobOffer | null = null;
      if (res.data.job_offer_id) {
        const { data: o } = await createClient().from('job_offers').select('*').eq('id', res.data.job_offer_id).maybeSingle();
        offer = (o as JobOffer | null) ?? null;
      }
      return { opp: res.data, offer };
    },
    { enabled: !!id },
  );

  const opp = data?.opp;
  const stage = opp ? stageOf(opp.status) : null;

  async function moveTo(to: PipelineStageId) {
    if (!opp) return;
    const s = STAGE_BY_ID.get(to)!;
    const probability = probabilityForMove(opp.probability, to);
    const prev = data;
    setData({ ...data!, opp: { ...opp, status: s.canonical, probability } });
    const res = await crmService.moveOpportunity(opp, s.canonical, probability);
    if (res.error) {
      setData(prev ?? null);
      toast.error(fr ? 'Changement d’étape impossible' : 'Could not change stage');
      return;
    }
    if (to === 'won') setTab('mission');
  }

  async function remove() {
    if (!opp) return;
    if (!window.confirm(fr ? `Supprimer « ${opp.title} » ? Cette action est définitive.` : `Delete “${opp.title}”? This cannot be undone.`)) return;
    const res = await crmService.deleteOpportunity(opp.id);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(fr ? 'Opportunité supprimée' : 'Opportunity deleted');
    router.push('/crm');
  }

  if (loading && !data) {
    return (
      <AppShell>
        <Skeleton className="mb-3 h-5 w-32" />
        <Skeleton className="mb-6 h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }
  if (!opp) {
    return (
      <AppShell>
        <EmptyState
          title={fr ? 'Opportunité introuvable' : 'Opportunity not found'}
          description={fr ? 'Elle a peut-être été supprimée, ou vous n’y avez pas accès.' : 'It may have been deleted, or you do not have access.'}
          action={
            <Button asChild variant="secondary">
              <Link href="/crm">{fr ? 'Retour au CRM' : 'Back to the CRM'}</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const client = opp.company_id ? companies.get(opp.company_id) : null;
  const contact = opp.contact_id ? contacts.get(opp.contact_id) : null;
  const owner = opp.owner_id ? members.get(opp.owner_id) : null;
  const amount = opportunityAmount(opp);
  const skills = (data?.offer?.required_skills?.length ? data.offer.required_skills : opp.required_skills) ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <AppShell>
      <PageHeader
        backHref="/crm"
        backLabel="CRM"
        title={opp.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusPill tone={stageTone(opp.status)}>{stageLabel(opp.status, lang)}</StatusPill>
            {client && (
              <Link href={`/clients/${client.id}`} className="text-foreground hover:text-primary-deep">
                {client.name}
              </Link>
            )}
            {opp.source === 'client_portal' && (
              <Badge variant="info" className="gap-1">
                <Inbox className="h-3 w-3" />
                {fr ? 'Demande du portail client' : 'Client portal request'}
              </Badge>
            )}
          </span>
        }
        actions={
          canEdit && (
            <>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil />
                {fr ? 'Modifier' : 'Edit'}
              </Button>
              {can('documents.edit') && (
                <Button asChild variant="secondary">
                  <Link href={`/documents/quotes/new?opportunity=${opp.id}`}>
                    <Receipt />
                    {fr ? 'Créer un devis' : 'Create a quote'}
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => void remove()} aria-label={fr ? 'Supprimer' : 'Delete'}>
                <Trash2 />
              </Button>
            </>
          )
        }
      />

      {/* Progression dans le pipeline */}
      <ol className="no-scrollbar mb-6 flex overflow-x-auto rounded-lg border border-border bg-card p-1 shadow-xs" aria-label={fr ? 'Étapes du pipeline' : 'Pipeline stages'}>
        {PIPELINE_STAGES.map((s, i) => {
          const currentIndex = PIPELINE_STAGES.findIndex((x) => x.id === stage);
          const isCurrent = s.id === stage;
          const passed = currentIndex > i && stage !== 'lost' && s.id !== 'lost';
          return (
            <li key={s.id} className="flex-1">
              <button
                type="button"
                disabled={!canEdit || isCurrent}
                onClick={() => void moveTo(s.id)}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex w-full min-w-[6.5rem] items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                  isCurrent
                    ? s.id === 'won'
                      ? 'bg-success text-success-foreground'
                      : s.id === 'lost'
                        ? 'bg-destructive text-destructive-foreground'
                        : 'bg-primary text-primary-foreground'
                    : passed
                      ? 'text-foreground hover:bg-muted'
                      : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {passed && <Check className="h-3 w-3" />}
                {s.label[lang]}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList variant="underline">
              <TabsTrigger value="overview">{fr ? 'Aperçu' : 'Overview'}</TabsTrigger>
              <TabsTrigger value="matching">
                <Sparkles />
                {fr ? 'Consultants' : 'Consultants'}
              </TabsTrigger>
              {stage === 'won' && (
                <TabsTrigger value="mission">
                  <Briefcase />
                  Mission
                </TabsTrigger>
              )}
              <TabsTrigger value="tasks">{fr ? 'Tâches' : 'Tasks'}</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="history">{fr ? 'Historique' : 'History'}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>{fr ? 'Besoin' : 'Requirement'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {opp.description ? (
                    <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">{opp.description}</p>
                  ) : (
                    <p className="text-[13px] text-muted-foreground">{fr ? 'Pas encore de description.' : 'No description yet.'}</p>
                  )}
                  <div>
                    <div className="mb-1.5 text-xs font-medium text-muted-foreground">{fr ? 'Compétences recherchées' : 'Required skills'}</div>
                    {skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((s) => (
                          <Badge key={s} variant="secondary">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px] text-muted-foreground">
                        {fr ? 'Ajoutez des compétences pour activer le matching.' : 'Add skills to enable matching.'}
                      </p>
                    )}
                  </div>
                  {data?.offer && (
                    <Link href="/offers" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:text-primary-deep">
                      <FileText className="h-3.5 w-3.5" />
                      {fr ? `Fiche de poste liée : ${data.offer.title}` : `Linked job description: ${data.offer.title}`}
                    </Link>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{fr ? 'Suivi' : 'Follow-up'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <FactList
                    columns={2}
                    facts={[
                      {
                        label: fr ? 'Prochaine action' : 'Next action',
                        value: opp.next_action,
                      },
                      {
                        label: fr ? 'Date prévue' : 'Planned date',
                        value: opp.next_follow_up ? (
                          <span className={cn(opp.next_follow_up < today && 'font-medium text-destructive')}>
                            {formatDate(opp.next_follow_up, lang)} · {relativeDays(opp.next_follow_up, lang)}
                          </span>
                        ) : null,
                      },
                      { label: fr ? 'Dernière activité' : 'Last activity', value: formatDate(opp.last_interaction ?? opp.updated_at, lang) },
                      { label: fr ? 'Créée le' : 'Created', value: formatDate(opp.created_at, lang) },
                    ]}
                  />
                  {opp.notes && <p className="mt-4 whitespace-pre-wrap border-t border-border pt-4 text-[13.5px] text-foreground">{opp.notes}</p>}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="matching">
              <OpportunityMatching opp={opp} offer={data?.offer ?? null} lang={lang} canEdit={canEdit} organizationId={activeOrgId ?? ''} />
            </TabsContent>

            {stage === 'won' && (
              <TabsContent value="mission">
                <Card>
                  <CardContent className="flex flex-col items-start gap-3 pt-5">
                    <p className="text-[14px] text-foreground">
                      {fr
                        ? 'Opportunité gagnée : créez la mission pour suivre le CRA, la marge et la préfacturation.'
                        : 'Opportunity won: create the mission to track timesheets, margin and pre-invoicing.'}
                    </p>
                    {can('missions.edit') && (
                      <Button asChild>
                        <Link href={`/missions?new=1&opportunity=${opp.id}`}>
                          <Briefcase />
                          {fr ? 'Créer la mission' : 'Create the mission'}
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="tasks">
              <TaskList entityType="opportunity" entityId={opp.id} filter="all" compact />
            </TabsContent>
            <TabsContent value="notes">
              <NotesPanel entityType="opportunity" entityId={opp.id} canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="history">
              <ActivityTimeline entityType="opportunity" entityId={opp.id} />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{fr ? 'Synthèse' : 'Summary'}</CardTitle>
            </CardHeader>
            <CardContent>
              <FactList
                facts={[
                  {
                    label: fr ? 'Montant potentiel' : 'Potential amount',
                    value: amount ? <span className="num font-semibold">{formatEur(amount, lang)}</span> : null,
                    hint: opp.expected_revenue == null && amount ? (fr ? 'Estimé : TJM × durée × 20 j' : 'Estimated: rate × duration × 20 d') : undefined,
                  },
                  {
                    label: fr ? 'Probabilité · pondéré' : 'Probability · weighted',
                    value:
                      opp.probability != null ? (
                        <span className="num">
                          {opp.probability} % · {formatEurCompact(amount * (opp.probability / 100), lang)}
                        </span>
                      ) : null,
                  },
                  { label: fr ? 'TJM cible' : 'Target day rate', value: opp.daily_rate_eur ? formatEur(opp.daily_rate_eur, lang) : null },
                  { label: fr ? 'Budget client' : 'Client budget', value: opp.budget_eur ? formatEur(opp.budget_eur, lang) : null },
                  { label: fr ? 'Démarrage' : 'Start', value: opp.start_date ? formatDate(opp.start_date, lang) : null },
                  { label: fr ? 'Durée' : 'Duration', value: opp.duration_months ? `${opp.duration_months} ${fr ? 'mois' : 'months'}` : null },
                  { label: fr ? 'Localisation' : 'Location', value: opp.location },
                  {
                    label: fr ? 'Télétravail' : 'Remote work',
                    value: opp.remote_policy ? REMOTE_POLICY_LABEL[opp.remote_policy as RemotePolicy]?.[lang] : null,
                  },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{fr ? 'Interlocuteurs' : 'People'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Business Manager</div>
                {owner ? (
                  <div className="flex items-center gap-2 text-[13.5px]">
                    <Avatar name={owner.name} size="sm" />
                    {owner.name}
                  </div>
                ) : (
                  <span className="text-[13px] text-muted-foreground">—</span>
                )}
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">{fr ? 'Contact client' : 'Client contact'}</div>
                {contact ? (
                  <div className="flex items-center gap-2 text-[13.5px]">
                    <Avatar name={`${contact.first_name} ${contact.last_name}`} size="sm" />
                    <div className="min-w-0">
                      <div className="truncate">
                        {contact.first_name} {contact.last_name}
                      </div>
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="block truncate text-xs text-primary hover:text-primary-deep">
                          {contact.email}
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-[13px] text-muted-foreground">—</span>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {activeOrgId && (
        <OpportunityDrawer
          open={editing}
          onOpenChange={setEditing}
          organizationId={activeOrgId}
          opportunity={opp}
          onSaved={(o) => setData({ opp: o, offer: data?.offer ?? null })}
        />
      )}
    </AppShell>
  );
}
