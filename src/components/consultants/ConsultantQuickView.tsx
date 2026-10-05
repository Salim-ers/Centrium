'use client';

import Link from 'next/link';
import { ArrowUpRight, FileText, Mail, Phone, Target } from 'lucide-react';

import { DetailDrawer } from '@/components/app/DetailDrawer';
import { FactList } from '@/components/app/FactList';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { CONSULTANT_STATUS, statusOf } from '@/lib/status';
import { SENIORITY_LABEL } from '@/constants';
import { formatDate, formatEur } from '@/lib/format';
import type { ConsultantListItem } from '@/lib/services/consultant.service';

type Skill = { id: string; name: string; level?: number | null; is_highlighted?: boolean | null };

/**
 * Aperçu d'un consultant dans un tiroir : l'essentiel pour staffer, et les
 * actions courantes (dossier de compétences, positionnement, fiche).
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
  skills: Skill[];
  showRates: boolean;
  today: string;
}) {
  const fr = lang === 'fr';
  if (!consultant) return null;
  const c = consultant;
  const st = statusOf(CONSULTANT_STATUS, c.status, lang);
  const availableNow = c.status === 'available' && (!c.available_from || c.available_from <= today);
  const freeOn = availableNow ? null : (c.available_from ?? c.current_mission_end ?? null);
  const mission = c.active_missions.find((m) => m.status === 'active') ?? c.active_missions[0];
  const owner = c.owner ? `${c.owner.first_name ?? ''} ${c.owner.last_name ?? ''}`.trim() || c.owner.email : null;
  const top = skills
    .slice()
    .sort((a, b) => Number(b.is_highlighted) - Number(a.is_highlighted) || (b.level ?? 0) - (a.level ?? 0))
    .slice(0, 12);

  const overview = (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Avatar name={`${c.first_name} ${c.last_name}`} size="lg" />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold">{c.job_title}</div>
          <div className="text-[13px] text-muted-foreground">
            {c.seniority ? SENIORITY_LABEL[c.seniority] : ''}
            {c.city ? `${c.seniority ? ' · ' : ''}${c.city}` : ''}
          </div>
        </div>
      </div>
      <FactList
        columns={2}
        facts={[
          {
            label: fr ? 'Disponibilité' : 'Availability',
            value: availableNow ? <span className="font-medium text-success">{fr ? 'Immédiate' : 'Now'}</span> : freeOn ? formatDate(freeOn, lang) : null,
          },
          { label: fr ? 'Mission actuelle' : 'Current mission', value: mission?.title ?? null },
          ...(showRates ? [{ label: 'TJM', value: c.daily_rate_eur ? formatEur(Number(c.daily_rate_eur), lang) : null }] : []),
          { label: fr ? 'Référent' : 'Owner', value: owner },
        ]}
      />
      {top.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs text-muted-foreground">{fr ? 'Compétences clés' : 'Key skills'}</div>
          <div className="flex flex-wrap gap-1.5">
            {top.map((s) => (
              <Badge key={s.id} variant={s.is_highlighted ? 'default' : 'secondary'}>
                {s.name}
              </Badge>
            ))}
          </div>
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
      badges={<StatusPill tone={st.tone}>{st.label}</StatusPill>}
      actions={
        <>
          <Button asChild size="sm">
            <Link href={`/consultants/${c.id}/dossier`}>
              <FileText />
              {fr ? 'Générer un dossier' : 'Generate a dossier'}
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/consultants/${c.id}?tab=opportunities`}>
              <Target />
              {fr ? 'Positionner' : 'Position'}
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
