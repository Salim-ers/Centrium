'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Archive,
  ArchiveRestore,
  Award,
  Briefcase,
  CalendarCheck,
  DoorOpen,
  FileText,
  Languages as LanguagesIcon,
  Linkedin,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Sparkles,
  Target,
  UserCheck,
  UserMinus,
  Users,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { FavoriteButton } from '@/components/app/FavoriteButton';
import { FactList } from '@/components/app/FactList';
import { NotesPanel } from '@/components/app/NotesPanel';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusPill } from '@/components/ui/status-pill';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConsultantFormDialog } from '@/components/consultants/ConsultantFormDialog';
import { ExperienceEditDialog } from '@/components/consultants/ExperienceEditDialog';
import { EducationEditDialog } from '@/components/consultants/EducationEditDialog';
import { SkillsEditDialog } from '@/components/consultants/SkillsEditDialog';
import { LanguagesEditDialog } from '@/components/consultants/LanguagesEditDialog';
import { TextBlockEditDialog } from '@/components/consultants/TextBlockEditDialog';
import { CertificationsEditDialog } from '@/components/consultants/CertificationsEditDialog';
import { ConsultantFinancialsCard } from '@/components/consultants/ConsultantFinancialsCard';
import { ConsultantCompleteness } from '@/components/consultants/ConsultantCompleteness';
import { ConsultantDocuments } from '@/components/consultants/ConsultantDocuments';
import { KycDocuments } from '@/components/consultants/KycDocuments';
import { ConsultantActivityPanel } from '@/components/consultants/ConsultantActivityPanel';
import { GrantPortalDialog } from '@/components/consultants/GrantPortalDialog';
import { ConsultantMissionsList } from '@/components/missions/ConsultantMissionsList';
import { AssignMissionDialog } from '@/components/missions/AssignMissionDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { consultantService } from '@/lib/services/consultant.service';
import { stageLabel, stageTone } from '@/lib/crm/pipeline';
import { CONSULTANT_STATUS, TIMESHEET_STATUS, periodLabel, statusOf } from '@/lib/status';
import { SENIORITY_LABEL, SKILL_CATEGORIES } from '@/constants';
import { formatDate, formatEur } from '@/lib/format';
import { cn } from '@/lib/utils';
import type {
  Certification,
  Consultant,
  ConsultantEducation,
  ConsultantExperience,
  ConsultantSkill,
  OpportunityStatus,
  Timesheet,
} from '@/types';

type Detail = {
  consultant: Consultant & { certifications?: Certification[] };
  skills: ConsultantSkill[];
  experiences: ConsultantExperience[];
  educations: ConsultantEducation[];
  hasPortal: boolean;
  proposals: Array<{ opportunity_id: string; sent_at: string | null; opportunities: { id: string; title: string; status: OpportunityStatus; companies: { name: string } | null } | null }>;
  timesheets: Array<Pick<Timesheet, 'id' | 'period_month' | 'period_year' | 'days_worked' | 'days_validated' | 'status'>>;
};

async function loadConsultant(id: string, withCommercial: boolean, withTimesheets: boolean): Promise<Detail | null> {
  const res = await consultantService.getById(id);
  if (res.error || !res.data) return null;
  const supabase = createClient();
  const [portal, proposals, timesheets] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('consultant_id', id),
    withCommercial
      ? supabase
          .from('opportunity_consultants')
          .select('opportunity_id, sent_at, opportunities(id, title, status, companies(name))')
          .eq('consultant_id', id)
          .order('sent_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    withTimesheets
      ? supabase
          .from('timesheets')
          .select('id, period_month, period_year, days_worked, days_validated, status')
          .eq('consultant_id', id)
          .eq('archived', false)
          .order('period_year', { ascending: false })
          .order('period_month', { ascending: false })
          .limit(24)
      : Promise.resolve({ data: [] }),
  ]);
  return {
    ...res.data,
    hasPortal: (portal.count ?? 0) > 0,
    proposals: (proposals.data ?? []) as unknown as Detail['proposals'],
    timesheets: (timesheets.data ?? []) as Detail['timesheets'],
  };
}

function monthYear(iso: string | null, lang: 'fr' | 'en') {
  if (!iso) return lang === 'fr' ? 'aujourd’hui' : 'present';
  return new Date(iso + 'T00:00:00').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { month: 'short', year: 'numeric' });
}

export default function Consultant360Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const canEdit = can('consultants.edit');
  const financials = can('consultants.financials');

  const [editOpen, setEditOpen] = useState(false);
  const [expDialog, setExpDialog] = useState<{ open: boolean; exp: ConsultantExperience | null }>({ open: false, exp: null });
  const [eduDialog, setEduDialog] = useState<{ open: boolean; edu: ConsultantEducation | null }>({ open: false, edu: null });
  const [skillsDialog, setSkillsDialog] = useState(false);
  const [langDialog, setLangDialog] = useState(false);
  const [certDialog, setCertDialog] = useState(false);
  const [summaryDialog, setSummaryDialog] = useState(false);
  const [mobilityDialog, setMobilityDialog] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);

  const { data, loading, reload } = useCachedQuery<Detail | null>(
    `consultant360:${id}`,
    () => loadConsultant(id, can('opportunities.view'), can('timesheets.view')),
    { enabled: !!id && ready },
  );

  async function toggleArchive(c: Consultant) {
    if (!c.archived && !window.confirm(fr ? `Archiver ${c.first_name} ${c.last_name} ? Les CRA, factures et documents sont conservés.` : `Archive ${c.first_name} ${c.last_name}? Timesheets, invoices and documents are kept.`)) return;
    const res = c.archived ? await consultantService.unarchive(c.id) : await consultantService.archive(c.id);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(c.archived ? (fr ? 'Profil restauré' : 'Profile restored') : fr ? 'Profil archivé' : 'Profile archived');
    if (c.archived) void reload();
    else router.push('/consultants');
  }

  async function togglePool(c: Consultant) {
    const res = c.is_prospect ? await consultantService.promoteToConsultant(c.id) : await consultantService.demoteToProspect(c.id);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(c.is_prospect ? (fr ? 'Ajouté à l’effectif' : 'Moved to staff') : fr ? 'Remis au vivier' : 'Moved to talent pool');
    void reload();
  }

  if (loading && !data) {
    return (
      <AppShell>
        <Skeleton className="mb-3 h-5 w-24" />
        <div className="mb-6 flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
        <Skeleton className="h-72 w-full" />
      </AppShell>
    );
  }
  if (!data) {
    return (
      <AppShell>
        <EmptyState
          icon={Users}
          title={fr ? 'Consultant introuvable' : 'Consultant not found'}
          description={fr ? 'Ce profil n’existe plus ou vous n’y avez pas accès.' : 'This profile no longer exists or you have no access.'}
          action={
            <Button asChild variant="secondary">
              <Link href="/consultants">{fr ? 'Retour aux consultants' : 'Back to consultants'}</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const { consultant: c, skills, experiences, educations } = data;
  const st = statusOf(CONSULTANT_STATUS, c.status, lang);
  const certifications: Certification[] = Array.isArray(c.certifications) ? c.certifications : [];
  const skillsByCategory = skills.reduce<Record<string, ConsultantSkill[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});
  const categoryLabel = (id: string) => SKILL_CATEGORIES.find((x) => x.id === id)?.label ?? id;
  const availability =
    c.status === 'available'
      ? c.available_from && c.available_from > new Date().toISOString().slice(0, 10)
        ? `${fr ? 'À partir du' : 'From'} ${formatDate(c.available_from, lang)}`
        : fr ? 'Immédiate' : 'Immediate'
      : c.available_from ?? c.current_mission_end
        ? `${fr ? 'À partir du' : 'From'} ${formatDate((c.available_from ?? c.current_mission_end)!, lang)}`
        : null;

  return (
    <AppShell>
      <PageHeader
        backHref="/consultants"
        backLabel="Consultants"
        title={
          <span className="flex items-center gap-3">
            <Avatar name={`${c.first_name} ${c.last_name}`} size="lg" />
            <span className="min-w-0">
              <span className="block truncate">
                {c.first_name} {c.last_name}
              </span>
              <span className="block truncate text-sm font-normal text-muted-foreground">
                {c.job_title}
                {c.sub_title ? ` · ${c.sub_title}` : ''}
              </span>
            </span>
          </span>
        }
        description={
          <span className="mt-1 inline-flex flex-wrap items-center gap-2">
            <StatusPill tone={st.tone}>{st.label}</StatusPill>
            {c.is_prospect && <Badge variant="neutral">{fr ? 'Vivier' : 'Talent pool'}</Badge>}
            {c.archived && <Badge variant="warning">{fr ? 'Archivé' : 'Archived'}</Badge>}
            {data.hasPortal && (
              <Badge variant="info" className="gap-1">
                <DoorOpen className="h-3 w-3" />
                {fr ? 'Accès portail' : 'Portal access'}
              </Badge>
            )}
          </span>
        }
        actions={
          <>
            <FavoriteButton kind="consultant" href={`/consultants/${c.id}`} label={`${c.first_name} ${c.last_name}`} />
            {canEdit && (
              <Button asChild>
                <Link href={`/consultants/${c.id}/dossier`}>
                  <FileText />
                  {fr ? 'Dossier de compétences' : 'Skills dossier'}
                </Link>
              </Button>
            )}
            <Button asChild variant="secondary">
              <Link href={`/matching?consultant=${c.id}`}>
                <Sparkles />
                {fr ? 'Matching IA' : 'AI matching'}
              </Link>
            </Button>
            {canEdit && (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                <Pencil />
                {fr ? 'Modifier' : 'Edit'}
              </Button>
            )}
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" aria-label={fr ? 'Plus d’actions' : 'More actions'}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  {(can('staffing.edit') || can('missions.edit')) && (
                    <DropdownMenuItem onSelect={() => setAssignOpen(true)}>
                      <Target />
                      {fr ? 'Positionner sur un besoin' : 'Position on a requirement'}
                    </DropdownMenuItem>
                  )}
                  {can('missions.edit') && (
                    <DropdownMenuItem onSelect={() => router.push(`/missions?new=1&consultant=${c.id}`)}>
                      <Briefcase />
                      {fr ? 'Créer une mission' : 'Create a mission'}
                    </DropdownMenuItem>
                  )}
                  {can('portals.manage') && !data.hasPortal && (
                    <DropdownMenuItem onSelect={() => setPortalOpen(true)}>
                      <DoorOpen />
                      {fr ? 'Ouvrir l’accès portail' : 'Grant portal access'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => void togglePool(c)}>
                    {c.is_prospect ? <UserCheck /> : <UserMinus />}
                    {c.is_prospect ? (fr ? 'Passer dans l’effectif' : 'Move to staff') : fr ? 'Remettre au vivier' : 'Move to talent pool'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive={!c.archived} onSelect={() => void toggleArchive(c)}>
                    {c.archived ? <ArchiveRestore /> : <Archive />}
                    {c.archived ? (fr ? 'Restaurer' : 'Restore') : fr ? 'Archiver' : 'Archive'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <Tabs defaultValue="profile">
            <TabsList variant="underline">
              <TabsTrigger value="profile">{fr ? 'Profil' : 'Profile'}</TabsTrigger>
              <TabsTrigger value="missions">Missions</TabsTrigger>
              {can('opportunities.view') && (
                <TabsTrigger value="opportunities">
                  {fr ? 'Opportunités' : 'Opportunities'} <span className="num text-xs text-muted-foreground">{data.proposals.length}</span>
                </TabsTrigger>
              )}
              {can('timesheets.view') && <TabsTrigger value="cra">CRA</TabsTrigger>}
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="activity">{fr ? 'Activité' : 'Activity'}</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-5">
              <ConsultantCompleteness consultantId={c.id} organizationId={c.organization_id} />

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle>{fr ? 'Résumé' : 'Summary'}</CardTitle>
                  {canEdit && (
                    <Button variant="ghost" size="icon-sm" onClick={() => setSummaryDialog(true)} aria-label={fr ? 'Modifier le résumé' : 'Edit summary'}>
                      <Pencil />
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {c.summary ? (
                    <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{c.summary}</p>
                  ) : (
                    <p className="text-[13px] text-muted-foreground">{fr ? 'Pas encore de résumé.' : 'No summary yet.'}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle>
                    {fr ? 'Compétences' : 'Skills'} <span className="num ml-1 text-xs font-normal text-muted-foreground">{skills.length}</span>
                  </CardTitle>
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => setSkillsDialog(true)}>
                      <Pencil />
                      {fr ? 'Gérer' : 'Manage'}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {skills.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">{fr ? 'Aucune compétence renseignée.' : 'No skills yet.'}</p>
                  ) : (
                    Object.entries(skillsByCategory).map(([cat, list]) => (
                      <div key={cat}>
                        <div className="mb-1.5 text-xs text-muted-foreground">{categoryLabel(cat)}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {list
                            .slice()
                            .sort((a, b) => Number(b.is_highlighted) - Number(a.is_highlighted) || (b.level ?? 0) - (a.level ?? 0))
                            .map((s) => (
                              <span
                                key={s.id}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs',
                                  s.is_highlighted ? 'border-brand-100 bg-brand-50 text-primary-deep' : 'border-border bg-muted text-foreground',
                                )}
                              >
                                {s.name}
                                {s.level ? <span className="num text-[10px] text-muted-foreground">{s.level}/5</span> : null}
                                {s.years ? <span className="num text-[10px] text-muted-foreground">· {s.years} a</span> : null}
                              </span>
                            ))}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle>{fr ? 'Expériences' : 'Experience'}</CardTitle>
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => setExpDialog({ open: true, exp: null })}>
                      <Plus />
                      {fr ? 'Ajouter' : 'Add'}
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {experiences.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">{fr ? 'Aucune expérience renseignée.' : 'No experience yet.'}</p>
                  ) : (
                    <ol className="space-y-5">
                      {experiences.map((exp) => (
                        <li key={exp.id} className="group relative border-l border-border pl-4">
                          <span aria-hidden className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary" />
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <div className="min-w-0">
                              <div className="break-words text-[14px] font-medium">{exp.role}</div>
                              <div className="break-words text-[13px] text-muted-foreground">{exp.client_name}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                {monthYear(exp.start_date, lang)} — {monthYear(exp.end_date, lang)}
                              </span>
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  className="opacity-0 transition focus-visible:opacity-100 group-hover:opacity-100"
                                  onClick={() => setExpDialog({ open: true, exp })}
                                  aria-label={fr ? 'Modifier l’expérience' : 'Edit experience'}
                                >
                                  <Pencil />
                                </Button>
                              )}
                            </div>
                          </div>
                          {exp.context && <p className="mt-1.5 break-words text-[13px] text-muted-foreground">{exp.context}</p>}
                          {exp.tasks.length > 0 && (
                            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[13px] marker:text-primary">
                              {exp.tasks.map((task, i) => (
                                <li key={i} className="break-words">
                                  {task}
                                </li>
                              ))}
                            </ul>
                          )}
                          {exp.environment.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {exp.environment.map((env) => (
                                <Badge key={env} variant="outline" className="text-[11px]">
                                  {env}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-5 md:grid-cols-2">
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle>{fr ? 'Formation' : 'Education'}</CardTitle>
                    {canEdit && (
                      <Button variant="ghost" size="icon-sm" onClick={() => setEduDialog({ open: true, edu: null })} aria-label={fr ? 'Ajouter une formation' : 'Add education'}>
                        <Plus />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {educations.length === 0 ? (
                      <p className="text-[13px] text-muted-foreground">—</p>
                    ) : (
                      <ul className="space-y-2">
                        {educations.map((e) => (
                          <li key={e.id} className="group flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-[13.5px]">{e.degree}</div>
                              <div className="text-xs text-muted-foreground">
                                {[e.institution, e.year].filter(Boolean).join(' · ')}
                              </div>
                            </div>
                            {canEdit && (
                              <Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100" onClick={() => setEduDialog({ open: true, edu: e })} aria-label={fr ? 'Modifier' : 'Edit'}>
                                <Pencil />
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      Certifications
                    </CardTitle>
                    {canEdit && (
                      <Button variant="ghost" size="icon-sm" onClick={() => setCertDialog(true)} aria-label={fr ? 'Modifier les certifications' : 'Edit certifications'}>
                        <Pencil />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {certifications.length === 0 ? (
                      <p className="text-[13px] text-muted-foreground">—</p>
                    ) : (
                      <ul className="space-y-2">
                        {certifications.map((cert, i) => {
                          const expired = !!cert.expires_at && cert.expires_at < new Date().toISOString().slice(0, 10);
                          return (
                            <li key={i}>
                              <div className="text-[13.5px]">{cert.name}</div>
                              <div className={cn('text-xs', expired ? 'text-destructive' : 'text-muted-foreground')}>
                                {[cert.issuer, cert.year].filter(Boolean).join(' · ')}
                                {cert.expires_at && ` · ${expired ? (fr ? 'expirée le' : 'expired') : fr ? 'expire le' : 'expires'} ${formatDate(cert.expires_at, lang, 'short')}`}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="missions">
              <ConsultantMissionsList consultantId={c.id} canManage={can('missions.edit')} />
            </TabsContent>

            <TabsContent value="opportunities">
              <Card>
                {data.proposals.length === 0 ? (
                  <CardContent className="pt-5">
                    <p className="text-[13px] text-muted-foreground">
                      {fr ? 'Ce profil n’a encore été proposé sur aucune opportunité.' : 'This profile has not been proposed yet.'}
                    </p>
                  </CardContent>
                ) : (
                  <div className="divide-y divide-border">
                    {data.proposals.map((p) =>
                      p.opportunities ? (
                        <Link key={p.opportunity_id} href={`/opportunities/${p.opportunity_id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
                          <Target className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13.5px] font-medium">{p.opportunities.title}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {p.opportunities.companies?.name}
                              {p.sent_at && ` · ${fr ? 'proposé le' : 'sent'} ${formatDate(p.sent_at, lang, 'short')}`}
                            </div>
                          </div>
                          <StatusPill tone={stageTone(p.opportunities.status)}>{stageLabel(p.opportunities.status, lang)}</StatusPill>
                        </Link>
                      ) : null,
                    )}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="cra">
              <Card>
                {data.timesheets.length === 0 ? (
                  <CardContent className="pt-5">
                    <p className="text-[13px] text-muted-foreground">{fr ? 'Aucun CRA.' : 'No timesheet.'}</p>
                  </CardContent>
                ) : (
                  <div className="divide-y divide-border">
                    {data.timesheets.map((t) => {
                      const s = statusOf(TIMESHEET_STATUS, t.status, lang);
                      return (
                        <Link key={t.id} href={`/timesheets/${t.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
                          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                          <span className="min-w-0 flex-1 text-[13.5px] font-medium">{periodLabel(t.period_month, t.period_year, lang)}</span>
                          <span className="num text-[13px] text-muted-foreground">{t.status === 'client_validated' ? t.days_validated : t.days_worked} j</span>
                          <StatusPill tone={s.tone}>{s.label}</StatusPill>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-5">
              <KycDocuments consultantId={c.id} organizationId={c.organization_id} asConsultant={false} />
              <ConsultantDocuments consultantId={c.id} organizationId={c.organization_id} onProfileUpdated={() => void reload()} />
            </TabsContent>

            <TabsContent value="notes" className="space-y-5">
              {c.internal_notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>{fr ? 'Notes de la fiche' : 'Profile notes'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-[13.5px]">{c.internal_notes}</p>
                  </CardContent>
                </Card>
              )}
              <NotesPanel entityType="consultant" entityId={c.id} canEdit={canEdit} />
            </TabsContent>

            <TabsContent value="activity">
              <ConsultantActivityPanel consultantId={c.id} />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{fr ? 'Disponibilité' : 'Availability'}</CardTitle>
            </CardHeader>
            <CardContent>
              <FactList
                facts={[
                  { label: fr ? 'Disponibilité' : 'Availability', value: availability },
                  { label: fr ? 'Client actuel' : 'Current client', value: c.current_client },
                  { label: fr ? 'Fin de mission' : 'Mission end', value: c.current_mission_end ? formatDate(c.current_mission_end, lang) : null },
                  {
                    label: fr ? 'Mobilité' : 'Mobility',
                    value: (
                      <span className="flex items-start justify-between gap-2">
                        <span>{c.mobility ?? '—'}</span>
                        {canEdit && (
                          <button type="button" onClick={() => setMobilityDialog(true)} className="text-xs text-primary hover:text-primary-deep">
                            {fr ? 'Modifier' : 'Edit'}
                          </button>
                        )}
                      </span>
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{fr ? 'Profil' : 'Profile'}</CardTitle>
            </CardHeader>
            <CardContent>
              <FactList
                facts={[
                  { label: fr ? 'Séniorité' : 'Seniority', value: `${SENIORITY_LABEL[c.seniority]} · ${c.years_experience} ${fr ? 'ans' : 'yrs'}` },
                  {
                    label: fr ? 'Localisation' : 'Location',
                    value: c.city ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {c.city}
                      </span>
                    ) : null,
                  },
                  {
                    label: fr ? 'Langues' : 'Languages',
                    value: (
                      <span className="flex items-start justify-between gap-2">
                        <span>{(c.languages ?? []).map((l) => `${l.code} (${l.level})`).join(', ') || '—'}</span>
                        {canEdit && (
                          <button type="button" onClick={() => setLangDialog(true)} className="shrink-0 text-xs text-primary hover:text-primary-deep" aria-label={fr ? 'Modifier les langues' : 'Edit languages'}>
                            <LanguagesIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </span>
                    ),
                  },
                  { label: fr ? 'Contrat' : 'Contract', value: c.contract_type },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{fr ? 'Coordonnées' : 'Contact'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[13.5px]">
              {c.email ? (
                <a href={`mailto:${c.email}`} className="flex items-center gap-2 break-all text-foreground hover:text-primary-deep">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {c.email}
                </a>
              ) : null}
              {c.phone ? (
                <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-foreground hover:text-primary-deep">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {c.phone}
                </a>
              ) : null}
              {c.linkedin_url ? (
                <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground hover:text-primary-deep">
                  <Linkedin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  LinkedIn
                </a>
              ) : null}
              {!c.email && !c.phone && !c.linkedin_url && <p className="text-muted-foreground">—</p>}
            </CardContent>
          </Card>

          {financials ? (
            <ConsultantFinancialsCard consultantId={c.id} dailyRate={c.daily_rate_eur ? Number(c.daily_rate_eur) : null} canEdit={financials} lang={lang} />
          ) : (
            c.daily_rate_eur && can('finance.view') ? (
              <Card>
                <CardContent className="pt-5">
                  <FactList facts={[{ label: fr ? 'TJM de référence' : 'Reference day rate', value: formatEur(Number(c.daily_rate_eur), lang) }]} />
                </CardContent>
              </Card>
            ) : null
          )}
        </aside>
      </div>

      <ConsultantFormDialog open={editOpen} onOpenChange={setEditOpen} organizationId={c.organization_id} consultant={c} onSaved={() => void reload()} />
      <ExperienceEditDialog open={expDialog.open} onOpenChange={(o) => setExpDialog({ open: o, exp: o ? expDialog.exp : null })} consultantId={c.id} experience={expDialog.exp} onSaved={() => void reload()} />
      <EducationEditDialog open={eduDialog.open} onOpenChange={(o) => setEduDialog({ open: o, edu: o ? eduDialog.edu : null })} consultantId={c.id} education={eduDialog.edu} onSaved={() => void reload()} />
      <SkillsEditDialog open={skillsDialog} onOpenChange={setSkillsDialog} consultantId={c.id} skills={skills} onSaved={() => void reload()} />
      <LanguagesEditDialog open={langDialog} onOpenChange={setLangDialog} consultantId={c.id} languages={c.languages ?? []} onSaved={() => void reload()} />
      <CertificationsEditDialog open={certDialog} onOpenChange={setCertDialog} consultantId={c.id} certifications={certifications} lang={lang} onSaved={() => void reload()} />
      <TextBlockEditDialog
        open={summaryDialog}
        onOpenChange={setSummaryDialog}
        title={fr ? 'Résumé' : 'Summary'}
        initialValue={c.summary}
        maxLength={2000}
        rows={8}
        placeholder={fr ? '3 à 5 phrases : parcours, expertises clés, valeur ajoutée.' : '3 to 5 sentences: background, key expertise, added value.'}
        onSave={(v) => consultantService.updateSummary(c.id, v)}
        onSaved={() => void reload()}
      />
      <TextBlockEditDialog
        open={mobilityDialog}
        onOpenChange={setMobilityDialog}
        title={fr ? 'Mobilité' : 'Mobility'}
        initialValue={c.mobility}
        maxLength={200}
        rows={2}
        placeholder={fr ? 'Île-de-France, télétravail complet, déplacements ponctuels…' : 'Paris area, fully remote, occasional travel…'}
        onSave={(v) => consultantService.updateMobility(c.id, v)}
        onSaved={() => void reload()}
      />
      <AssignMissionDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        consultant={{ id: c.id, first_name: c.first_name, last_name: c.last_name, daily_rate_eur: c.daily_rate_eur }}
        onAssigned={() => void reload()}
      />
      <GrantPortalDialog
        open={portalOpen}
        onOpenChange={setPortalOpen}
        consultant={{ id: c.id, first_name: c.first_name, last_name: c.last_name, email: c.email }}
        onGranted={() => void reload()}
      />
    </AppShell>
  );
}
