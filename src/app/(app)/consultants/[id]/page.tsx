'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  notifyDestructive,
  notifyError,
} from '@/lib/notify';
import {
  ArrowLeft,
  Mail,
  Phone,
  Linkedin,
  MapPin,
  Briefcase,
  GraduationCap,
  Languages as LangIcon,
  FileText,
  Pencil,
  Plus,
  Archive,
  ArchiveRestore,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { consultantService } from '@/lib/services/consultant.service';
import { ConsultantDocuments } from '@/components/consultants/ConsultantDocuments';
import { ConsultantActivityPanel } from '@/components/consultants/ConsultantActivityPanel';
import { KycDocuments } from '@/components/consultants/KycDocuments';
import { ConsultantCompleteness } from '@/components/consultants/ConsultantCompleteness';
import { ConsultantFormDialog } from '@/components/consultants/ConsultantFormDialog';
import { ConsultantMissionsList } from '@/components/missions/ConsultantMissionsList';
import { ExperienceEditDialog } from '@/components/consultants/ExperienceEditDialog';
import { EducationEditDialog } from '@/components/consultants/EducationEditDialog';
import { SkillsEditDialog } from '@/components/consultants/SkillsEditDialog';
import { LanguagesEditDialog } from '@/components/consultants/LanguagesEditDialog';
import { TextBlockEditDialog } from '@/components/consultants/TextBlockEditDialog';
import type {
  Consultant,
  ConsultantSkill,
  ConsultantExperience,
  ConsultantEducation,
} from '@/types';
import { CONSULTANT_STATUS_STYLE } from '@/constants';
import { formatDate, formatMonthYear } from '@/lib/utils';
import { useCurrency } from '@/lib/i18n/CurrencyProvider';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';

type Detail = {
  consultant: Consultant;
  skills: ConsultantSkill[];
  experiences: ConsultantExperience[];
  educations: ConsultantEducation[];
};

export default function ConsultantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { format: formatCurrency } = useCurrency();
  const t = useAppT();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Sous-dialogs d'édition par bloc
  const [expDialog, setExpDialog] = useState<{ open: boolean; exp: ConsultantExperience | null }>({
    open: false,
    exp: null,
  });
  const [eduDialog, setEduDialog] = useState<{ open: boolean; edu: ConsultantEducation | null }>({
    open: false,
    edu: null,
  });
  const [skillsDialog, setSkillsDialog] = useState(false);
  const [langDialog, setLangDialog] = useState(false);
  const [summaryDialog, setSummaryDialog] = useState(false);
  const [mobilityDialog, setMobilityDialog] = useState(false);

  async function reload() {
    if (!params?.id) return;
    const res = await consultantService.getById(params.id);
    if (res.error || !res.data) {
      setNotFound(true);
    } else {
      setDetail(res.data);
    }
    setLoading(false);
  }

  async function handleArchive() {
    if (!detail) return;
    const { consultant: c } = detail;
    const wasProspect = c.is_prospect;
    if (
      !confirm(
        isEn
          ? `Archive ${c.first_name} ${c.last_name}? The consultant leaves the library but their data (timesheets, invoices, CV) is kept.`
          : `Archiver ${c.first_name} ${c.last_name} ? Le consultant disparaît de la bibliothèque mais ses données (CRA, factures, CV) sont conservées.`,
      )
    ) {
      return;
    }
    const res = await consultantService.archive(c.id);
    if (res.error) {
      notifyError((isEn ? 'Error: ' : 'Erreur : ') + res.error.message);
      return;
    }
    notifyDestructive(
      wasProspect
        ? isEn ? `${c.first_name} ${c.last_name} removed from pool` : `${c.first_name} ${c.last_name} retiré du vivier`
        : isEn ? `${c.first_name} ${c.last_name} archived` : `${c.first_name} ${c.last_name} archivé`,
    );
    // Bibliothèque + vivier sont désormais sur un onglet unique.
    router.push('/consultants');
  }

  async function handleUnarchive() {
    if (!detail) return;
    const { consultant: c } = detail;
    const res = await consultantService.unarchive(c.id);
    if (res.error) {
      notifyError((isEn ? 'Error: ' : 'Erreur : ') + res.error.message);
      return;
    }
    reload();
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-4">
          <div className="h-8 w-40 rounded bg-card animate-pulse" />
          <div className="h-40 w-full rounded-xl bg-card animate-pulse" />
          <div className="h-60 w-full rounded-xl bg-card animate-pulse" />
        </div>
      </AppShell>
    );
  }

  if (notFound || !detail) {
    return (
      <AppShell>
        <div className="text-center py-20">
          <h1 className="font-display text-2xl font-bold">
            {isEn ? 'Consultant not found' : 'Consultant introuvable'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isEn
              ? 'This profile no longer exists or has been archived.'
              : 'Ce profil n\'existe plus ou a été archivé.'}
          </p>
          <Button className="mt-6" onClick={() => router.push('/consultants')}>
            <ArrowLeft className="h-4 w-4" />
            {isEn ? 'Back to library' : 'Retour à la bibliothèque'}
          </Button>
        </div>
      </AppShell>
    );
  }

  const { consultant: c, skills, experiences, educations } = detail;

  const skillsByCategory = skills.reduce<Record<string, ConsultantSkill[]>>((acc, s) => {
    acc[s.category] = acc[s.category] ? [...acc[s.category], s] : [s];
    return acc;
  }, {});

  return (
    <AppShell>
      <ConsultantFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        organizationId={c.organization_id}
        consultant={c}
        onSaved={() => reload()}
      />

      <ExperienceEditDialog
        open={expDialog.open}
        onOpenChange={(o) => setExpDialog({ open: o, exp: o ? expDialog.exp : null })}
        consultantId={c.id}
        experience={expDialog.exp}
        onSaved={() => reload()}
      />
      <EducationEditDialog
        open={eduDialog.open}
        onOpenChange={(o) => setEduDialog({ open: o, edu: o ? eduDialog.edu : null })}
        consultantId={c.id}
        education={eduDialog.edu}
        onSaved={() => reload()}
      />
      <SkillsEditDialog
        open={skillsDialog}
        onOpenChange={setSkillsDialog}
        consultantId={c.id}
        skills={skills}
        onSaved={() => reload()}
      />
      <LanguagesEditDialog
        open={langDialog}
        onOpenChange={setLangDialog}
        consultantId={c.id}
        languages={c.languages ?? []}
        onSaved={() => reload()}
      />
      <TextBlockEditDialog
        open={summaryDialog}
        onOpenChange={setSummaryDialog}
        title={isEn ? 'Executive summary' : 'Résumé exécutif'}
        initialValue={c.summary}
        maxLength={2000}
        rows={8}
        placeholder={
          isEn
            ? '3-5 sentences describing the background, key expertise and added value…'
            : '3-5 phrases décrivant le parcours, les expertises clés et la valeur ajoutée…'
        }
        onSave={(v) => consultantService.updateSummary(c.id, v)}
        onSaved={() => reload()}
      />
      <TextBlockEditDialog
        open={mobilityDialog}
        onOpenChange={setMobilityDialog}
        title={isEn ? 'Mobility' : 'Mobilité'}
        initialValue={c.mobility}
        maxLength={200}
        rows={2}
        placeholder={
          isEn
            ? 'Île-de-France, full remote, occasional travel…'
            : 'Île-de-France, full remote, déplacements ponctuels…'
        }
        onSave={(v) => consultantService.updateMobility(c.id, v)}
        onSaved={() => reload()}
      />

      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/consultants">
          <ArrowLeft className="h-4 w-4" />
          {isEn ? 'Back' : 'Retour'}
        </Link>
      </Button>

      <Card className="mb-6 overflow-hidden">
        <div className="h-1 bg-qc-gradient" />
        <CardContent className="p-6">
          <div className="flex items-start gap-6 flex-wrap">
            <div className="h-20 w-20 rounded-full bg-qc-gradient flex items-center justify-center text-white text-2xl font-bold ">
              {c.first_name[0]}
              {c.last_name[0]}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-3xl font-bold tracking-tight break-words [overflow-wrap:anywhere]">
                  {c.first_name} {c.last_name}
                </h1>
                <Badge variant="outline" className={CONSULTANT_STATUS_STYLE[c.status]}>
                  {t.consultant_status[c.status]}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground mt-1 break-words [overflow-wrap:anywhere]">{c.job_title}</p>
              {c.sub_title && (
                <p className="text-sm text-muted-foreground/80 break-words [overflow-wrap:anywhere]">{c.sub_title}</p>
              )}

              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm">
                <InfoItem label={isEn ? 'Seniority' : 'Séniorité'} value={t.seniority[c.seniority]} />
                <InfoItem
                  label={isEn ? 'Experience' : 'Expérience'}
                  value={`${c.years_experience} ${isEn ? 'yrs' : 'ans'}`}
                />
                <InfoItem label={isEn ? 'Day rate' : 'TJM'} value={formatCurrency(c.daily_rate_eur)} />
                {c.available_from && (
                  <InfoItem label={isEn ? 'Available from' : 'Disponible dès'} value={formatDate(c.available_from)} />
                )}
                {c.city && (
                  <InfoItem
                    icon={<MapPin className="h-3.5 w-3.5" />}
                    value={`${c.city}${c.country && c.country !== 'FR' ? `, ${c.country}` : ''}`}
                  />
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button asChild>
                <Link href={`/cv-optimizer?consultantId=${c.id}`}>
                  <FileText className="h-4 w-4" />
                  {isEn ? 'Generate CV' : 'Générer CV'}
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                {isEn ? 'Edit' : 'Éditer'}
              </Button>
              {c.archived ? (
                <Button
                  variant="outline"
                  onClick={handleUnarchive}
                  className="border-success/40 text-success hover:text-success hover:bg-success/10"
                >
                  <ArchiveRestore className="h-4 w-4" />
                  {isEn ? 'Restore' : 'Restaurer'}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleArchive}
                  className="border-destructive/40 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Archive className="h-4 w-4" />
                  {isEn ? 'Archive' : 'Archiver'}
                </Button>
              )}
            </div>
          </div>

          {(c.email || c.phone || c.linkedin_url) && (
            <div className="mt-6 pt-6 border-t border-hairline flex flex-wrap gap-4 text-sm">
              {c.email && (
                <a
                  href={`mailto:${c.email}`}
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {c.email}
                </a>
              )}
              {c.phone && (
                <a
                  href={`tel:${c.phone}`}
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {c.phone}
                </a>
              )}
              {c.linkedin_url && (
                <a
                  href={c.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                  {isEn ? 'LinkedIn profile' : 'Profil LinkedIn'}
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">{isEn ? 'Executive summary' : 'Résumé exécutif'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSummaryDialog(true)}>
                <Pencil className="h-3.5 w-3.5" />
                {c.summary ? (isEn ? 'Edit' : 'Éditer') : (isEn ? 'Add' : 'Ajouter')}
              </Button>
            </CardHeader>
            <CardContent>
              {c.summary ? (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere]">
                  {c.summary}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {isEn ? 'No summary yet' : 'Aucun résumé renseigné'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                {isEn ? 'Professional experience' : 'Expériences professionnelles'}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpDialog({ open: true, exp: null })}
              >
                <Plus className="h-3.5 w-3.5" />
                {isEn ? 'Add' : 'Ajouter'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              {experiences.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {isEn ? 'No experience yet' : 'Aucune expérience renseignée'}
                </p>
              ) : (
                experiences.map((exp) => (
                  <div key={exp.id} className="relative pl-5 border-l border-hairline group">
                    <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-qc-gradient" />
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold break-words [overflow-wrap:anywhere]">{exp.client_name}</div>
                        <div className="text-sm text-muted-foreground break-words [overflow-wrap:anywhere]">{exp.role}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                          {formatMonthYear(exp.start_date)} — {formatMonthYear(exp.end_date)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition"
                          onClick={() => setExpDialog({ open: true, exp })}
                          title={isEn ? 'Edit' : 'Éditer'}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {exp.context && (
                      <p className="text-xs text-muted-foreground/80 mt-2 italic break-words [overflow-wrap:anywhere]">
                        {exp.context}
                      </p>
                    )}
                    {exp.tasks.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm">
                        {exp.tasks.map((task, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-primary mt-0.5">▸</span>
                            <span className="text-muted-foreground break-words [overflow-wrap:anywhere]">{task}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {exp.environment.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {exp.environment.map((env) => (
                          <Badge key={env} variant="outline" className="text-[10px]">
                            {env}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                {isEn ? 'Education' : 'Formation'}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEduDialog({ open: true, edu: null })}
              >
                <Plus className="h-3.5 w-3.5" />
                {isEn ? 'Add' : 'Ajouter'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {educations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {isEn ? 'No education yet' : 'Aucune formation renseignée'}
                </p>
              ) : (
                educations.map((ed) => (
                  <div key={ed.id} className="flex items-baseline gap-4 group">
                    <span className="text-xs text-muted-foreground w-12">{ed.year}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm break-words [overflow-wrap:anywhere]">{ed.degree}</div>
                      {ed.institution && (
                        <div className="text-xs text-muted-foreground break-words [overflow-wrap:anywhere]">{ed.institution}</div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition"
                      onClick={() => setEduDialog({ open: true, edu: ed })}
                      title={isEn ? 'Edit' : 'Éditer'}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">{isEn ? 'Skills' : 'Compétences'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSkillsDialog(true)}>
                <Pencil className="h-3.5 w-3.5" />
                {isEn ? 'Manage' : 'Gérer'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.keys(skillsByCategory).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {isEn ? 'No skills yet' : 'Aucune compétence renseignée'}
                </p>
              ) : (
                Object.entries(skillsByCategory).map(([cat, items]) => (
                  <div key={cat}>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                      {cat}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((s) => (
                        <Badge
                          key={s.id}
                          variant="outline"
                          className={
                            s.is_highlighted
                              ? 'bg-primary/15 text-primary border-primary/30'
                              : ''
                          }
                        >
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <LangIcon className="h-5 w-5 text-primary" />
                {isEn ? 'Languages' : 'Langues'}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLangDialog(true)}>
                <Pencil className="h-3.5 w-3.5" />
                {isEn ? 'Manage' : 'Gérer'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {!c.languages || c.languages.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                c.languages.map((l) => (
                  <div key={l.code} className="flex items-center justify-between text-sm">
                    <span className="uppercase text-xs font-semibold text-muted-foreground">
                      {l.code}
                    </span>
                    <span>{l.level}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">{isEn ? 'Mobility' : 'Mobilité'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setMobilityDialog(true)}>
                <Pencil className="h-3.5 w-3.5" />
                {c.mobility ? (isEn ? 'Edit' : 'Éditer') : (isEn ? 'Add' : 'Ajouter')}
              </Button>
            </CardHeader>
            <CardContent>
              {c.mobility ? (
                <p className="text-sm text-muted-foreground break-words [overflow-wrap:anywhere]">{c.mobility}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {isEn ? 'Not specified' : 'Non renseignée'}
                </p>
              )}
            </CardContent>
          </Card>

          <ConsultantMissionsList consultantId={c.id} canManage />

          <ConsultantActivityPanel consultantId={c.id} />

          <ConsultantCompleteness
            consultantId={c.id}
            organizationId={c.organization_id}
          />

          <KycDocuments
            consultantId={c.id}
            organizationId={c.organization_id}
            asConsultant={false}
          />

          <ConsultantDocuments
            consultantId={c.id}
            organizationId={c.organization_id}
            onProfileUpdated={() => reload()}
          />
        </div>
      </div>
    </AppShell>
  );
}

function InfoItem({
  label,
  value,
  icon,
}: {
  label?: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      {label && <span className="text-muted-foreground">{label} :</span>}
      <span className="font-medium">{value}</span>
    </div>
  );
}
