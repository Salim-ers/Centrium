'use client';

import Link from 'next/link';
import { ArrowUpRight, Briefcase, FileText, Mail, Phone, Sparkles, Target } from 'lucide-react';

import { DetailDrawer } from '@/components/app/DetailDrawer';
import { FactList } from '@/components/app/FactList';
import { AvailabilityBadge } from '@/components/consultants/AvailabilityBadge';
import { SkillChips } from '@/components/consultants/SkillChips';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { CONSULTANT_STATUS, statusOf } from '@/lib/status';
import { SENIORITY_LABEL } from '@/constants';
import { availabilityOf, languageName } from '@/lib/talents/filters';
import { formatEur } from '@/lib/format';
import type { ConsultantListItem } from '@/lib/services/consultant.service';

type Skill = { id: string; name: string; level: number | null; years: number | null; is_highlighted?: boolean | null; matched?: boolean };

/**
 * Aperçu d'un consultant dans un tiroir : l'essentiel pour staffer
 * (disponibilité réelle, mission, compétences et niveaux) et les accès
 * directs : dossier de compétences, matching IA, mission en cours.
 */
export function ConsultantQuickView({
  consultant,
  open,
  onOpenChange,
  lang,
  skills,
  showRates,
  today,
}: {
  consultant: ConsultantListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: 'fr' | 'en';
  /** Compétences déjà ordonnées (recherchées, mises en avant, niveau). */
  skills: Skill[];
  showRates: boolean;
  today: string;
}) {
  const fr = lang === 'fr';
  if (!consultant) return null;
  const c = consultant;
  const st = statusOf(CONSULTANT_STATUS, c.status, lang);
  const availability = availabilityOf(c, today);
  const mission = c.active_missions.find((m) => m.status === 'active') ?? c.active_missions[0];
  const owner = c.owner ? `${c.owner.first_name ?? ''} ${c.owner.last_name ?? ''}`.trim() || c.owner.email : null;
  const languages = (Array.isArray(c.languages) ? c.languages : []).filter((l) => l.code);

  const overview = (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Avatar name={`${c.first_name} ${c.last_name}`} size="lg" />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold">{c.job_title}</div>
          <div className="text-[13px] text-muted-foreground">
            {[c.seniority ? SENIORITY_LABEL[c.seniority] : null, c.years_experience ? (fr ? `${c.years_experience} ans d’expérience` : `${c.years_experience} years’ experience`) : null, c.city]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
      </div>
      <FactList
        columns={2}
        facts={[
          { label: fr ? 'Disponibilité' : 'Availability', value: <AvailabilityBadge availability={availability} lang={lang} /> },
          {
            label: fr ? 'Mission actuelle' : 'Current mission',
            value: mission ? (
              <Link href={`/missions/${mission.id}`} className="hover:text-primary-deep hover:underline">
                {mission.title}
              </Link>
            ) : null,
            hint: mission && c.current_client ? c.current_client : undefined,
          },
          ...(showRates ? [{ label: 'TJM', value: c.daily_rate_eur ? formatEur(Number(c.daily_rate_eur), lang) : null }] : []),
          { label: fr ? 'Mobilité' : 'Mobility', value: c.mobility },
          {
            label: fr ? 'Langues' : 'Languages',
            value: languages.length ? languages.map((l) => `${languageName(l.code, lang)}${l.level ? ` (${l.level.toLowerCase()})` : ''}`).join(', ') : null,
          },
          { label: fr ? 'Référent' : 'Owner', value: owner },
        ]}
      />
      {skills.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-xs text-muted-foreground">
            <span>{fr ? 'Compétences' : 'Skills'}</span>
            <span>{fr ? 'niveau 1 à 5' : 'level 1 to 5'}</span>
          </div>
          <SkillChips skills={skills} max={14} lang={lang} />
        </div>
      )}
      {(c.email || c.phone) && (
        <div className="space-y-1.5 text-[13.5px]">
          {c.email && (
            <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-foreground hover:text-primary-deep">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {c.email}
            </a>
          )}
          {c.phone && (
            <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-foreground hover:text-primary-deep">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {c.phone}
            </a>
          )}
        </div>
      )}
    </div>
  );

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={`${c.first_name} ${c.last_name}`}
      subtitle={c.job_title}
      badges={
        <>
          <StatusPill tone={st.tone}>{st.label}</StatusPill>
          {c.is_prospect && <span className="rounded-full bg-muted px-2 py-0.5 text-[12px] font-medium text-muted-foreground">{fr ? 'Vivier' : 'Pool'}</span>}
        </>
      }
      actions={
        <>
          <Button asChild size="sm">
            <Link href={`/consultants/${c.id}/dossier`}>
              <FileText />
              {fr ? 'Générer un dossier' : 'Generate a dossier'}
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/matching?consultant=${c.id}`}>
              <Sparkles />
              {fr ? 'Matching IA' : 'AI matching'}
            </Link>
          </Button>
          {mission && (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/missions/${mission.id}`}>
                <Briefcase />
                {fr ? 'Mission' : 'Mission'}
              </Link>
            </Button>
          )}
          <Button asChild size="sm" variant="ghost">
            <Link href={`/consultants/${c.id}?tab=opportunities`}>
              <Target />
              {fr ? 'Propositions' : 'Proposals'}
            </Link>
          </Button>
        </>
      }
      tabs={[{ id: 'overview', label: fr ? 'Aperçu' : 'Overview', content: overview }]}
      footer={
        <Button asChild size="sm" variant="secondary">
          <Link href={`/consultants/${c.id}`}>
            {fr ? 'Ouvrir la fiche complète' : 'Open full profile'}
            <ArrowUpRight />
          </Link>
        </Button>
      }
    />
  );
}
