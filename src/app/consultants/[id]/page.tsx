'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { consultantService } from '@/lib/services/consultant.service';
import { ConsultantDocuments } from '@/components/consultants/ConsultantDocuments';
import { ConsultantFormDialog } from '@/components/consultants/ConsultantFormDialog';
import type {
  Consultant,
  ConsultantSkill,
  ConsultantExperience,
  ConsultantEducation,
} from '@/types';
import {
  CONSULTANT_STATUS_LABEL,
  CONSULTANT_STATUS_STYLE,
  SENIORITY_LABEL,
} from '@/constants';
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/utils';

type Detail = {
  consultant: Consultant;
  skills: ConsultantSkill[];
  experiences: ConsultantExperience[];
  educations: ConsultantEducation[];
};

export default function ConsultantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-4">
          <div className="h-8 w-40 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-40 w-full rounded-xl bg-white/[0.02] animate-pulse" />
          <div className="h-60 w-full rounded-xl bg-white/[0.02] animate-pulse" />
        </div>
      </AppShell>
    );
  }

  if (notFound || !detail) {
    return (
      <AppShell>
        <div className="text-center py-20">
          <h1 className="font-display text-2xl font-bold">Consultant introuvable</h1>
          <p className="text-muted-foreground mt-2">
            Ce profil n&apos;existe plus ou a été archivé.
          </p>
          <Button className="mt-6" onClick={() => router.push('/consultants')}>
            <ArrowLeft className="h-4 w-4" />
            Retour à la bibliothèque
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

      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/consultants">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
      </Button>

      <Card className="mb-6 overflow-hidden">
        <div className="h-1 bg-qc-gradient" />
        <CardContent className="p-6">
          <div className="flex items-start gap-6 flex-wrap">
            <div className="h-20 w-20 rounded-full bg-qc-gradient flex items-center justify-center text-white text-2xl font-bold shadow-glow">
              {c.first_name[0]}
              {c.last_name[0]}
            </div>

            <div className="flex-1 min-w-[280px]">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-3xl font-bold tracking-tight">
                  {c.first_name} {c.last_name}
                </h1>
                <Badge variant="outline" className={CONSULTANT_STATUS_STYLE[c.status]}>
                  {CONSULTANT_STATUS_LABEL[c.status]}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground mt-1">{c.job_title}</p>
              {c.sub_title && (
                <p className="text-sm text-muted-foreground/80">{c.sub_title}</p>
              )}

              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm">
                <InfoItem label="Séniorité" value={SENIORITY_LABEL[c.seniority]} />
                <InfoItem label="Expérience" value={`${c.years_experience} ans`} />
                <InfoItem label="TJM" value={formatCurrency(c.daily_rate_eur)} />
                {c.available_from && (
                  <InfoItem label="Disponible dès" value={formatDate(c.available_from)} />
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
                  Générer CV
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Éditer
              </Button>
            </div>
          </div>

          {(c.email || c.phone || c.linkedin_url) && (
            <div className="mt-6 pt-6 border-t border-white/5 flex flex-wrap gap-4 text-sm">
              {c.email && (
                <a
                  href={`mailto:${c.email}`}
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-violet-glow transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {c.email}
                </a>
              )}
              {c.phone && (
                <a
                  href={`tel:${c.phone}`}
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-violet-glow transition-colors"
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
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-violet-glow transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                  Profil LinkedIn
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {c.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Résumé exécutif</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {c.summary}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-violet-glow" />
                Expériences professionnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {experiences.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune expérience renseignée</p>
              ) : (
                experiences.map((exp) => (
                  <div key={exp.id} className="relative pl-5 border-l border-white/10">
                    <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-qc-gradient" />
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-semibold">{exp.client_name}</div>
                        <div className="text-sm text-muted-foreground">{exp.role}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatMonthYear(exp.start_date)} — {formatMonthYear(exp.end_date)}
                      </div>
                    </div>
                    {exp.context && (
                      <p className="text-xs text-muted-foreground/80 mt-2 italic">
                        {exp.context}
                      </p>
                    )}
                    {exp.tasks.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm">
                        {exp.tasks.map((t, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-violet-glow mt-0.5">▸</span>
                            <span className="text-muted-foreground">{t}</span>
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
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-violet-glow" />
                Formation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {educations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune formation renseignée</p>
              ) : (
                educations.map((ed) => (
                  <div key={ed.id} className="flex items-baseline gap-4">
                    <span className="text-xs text-muted-foreground w-12">{ed.year}</span>
                    <div>
                      <div className="font-medium text-sm">{ed.degree}</div>
                      {ed.institution && (
                        <div className="text-xs text-muted-foreground">{ed.institution}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compétences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.keys(skillsByCategory).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune compétence renseignée</p>
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
                              ? 'bg-violet-500/15 text-violet-200 border-violet-500/30'
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
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LangIcon className="h-5 w-5 text-violet-glow" />
                Langues
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {c.languages.length === 0 ? (
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

          {c.mobility && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mobilité</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{c.mobility}</p>
              </CardContent>
            </Card>
          )}

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
