'use client';

import { ArrowRightLeft, FilePlus2, PencilLine, UserPlus, Activity as ActivityIcon, CheckCircle2 } from 'lucide-react';
import { Timeline, type TimelineItem } from '@/components/ui/timeline';
import { SkeletonRows } from '@/components/ui/skeleton';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useTeamMembers } from '@/hooks/useOrgDirectory';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { crmService, type Activity } from '@/lib/services/crm.service';
import { stageLabel } from '@/lib/crm/pipeline';
import { formatDate } from '@/lib/format';
import type { OpportunityStatus } from '@/types';

function describe(a: Activity, lang: 'fr' | 'en'): Pick<TimelineItem, 'title' | 'description' | 'icon' | 'tone'> {
  const fr = lang === 'fr';
  const d = (a.details ?? a.metadata ?? {}) as Record<string, unknown>;
  switch (a.action) {
    case 'created':
      return { title: fr ? 'Création' : 'Created', icon: FilePlus2, tone: 'brand' };
    case 'updated':
      return { title: fr ? 'Mise à jour' : 'Updated', icon: PencilLine };
    case 'stage_changed':
      return {
        title: fr ? "Changement d'étape" : 'Stage changed',
        description: `${stageLabel(d.from as OpportunityStatus, lang)} → ${stageLabel(d.to as OpportunityStatus, lang)}`,
        icon: ArrowRightLeft,
        tone: d.to === 'won' ? 'success' : d.to === 'lost' ? 'danger' : 'brand',
      };
    case 'consultant_proposed':
      return { title: fr ? 'Profil proposé au client' : 'Profile sent to client', icon: UserPlus, tone: 'brand' };
    case 'converted':
      return { title: fr ? 'Convertie' : 'Converted', icon: CheckCircle2, tone: 'success' };
    default:
      return { title: a.action.replace(/[._]/g, ' '), icon: ActivityIcon };
  }
}

/** Historique d'une entité (journal `activities`). */
export function ActivityTimeline({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const { byId: members } = useTeamMembers();
  const { data, loading } = useCachedQuery<Activity[]>(
    `activities:${entityType}:${entityId}`,
    async () => (await crmService.activities(entityType, entityId)).data ?? [],
    { enabled: !!entityId },
  );

  if (loading && !data) return <SkeletonRows rows={3} />;
  if (!data || data.length === 0) {
    return <p className="text-[13px] text-muted-foreground">{lang === 'fr' ? 'Aucun événement.' : 'No events.'}</p>;
  }
  const items: TimelineItem[] = data.map((a) => {
    const who = a.user_id ?? a.actor_id;
    const name = who ? members.get(who)?.name : null;
    const desc = describe(a, lang);
    return {
      id: a.id,
      ...desc,
      description: [desc.description, name].filter(Boolean).join(' · ') || undefined,
      time: formatDate(a.created_at, lang),
    };
  });
  return <Timeline items={items} />;
}
