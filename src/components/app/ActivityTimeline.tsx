'use client';

import { ArrowRightLeft, BellRing, FilePlus2, PencilLine, UserPlus, Activity as ActivityIcon, CheckCheck, CheckCircle2 } from 'lucide-react';
import { Timeline, type TimelineItem } from '@/components/ui/timeline';
import { SkeletonRows } from '@/components/ui/skeleton';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useTeamMembers } from '@/hooks/useOrgDirectory';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { crmService, type Activity } from '@/lib/services/crm.service';
import { stageLabel } from '@/lib/crm/pipeline';
import { formatDate } from '@/lib/format';
import type { OpportunityStatus } from '@/types';

/** Champs modifiés par une édition rapide, en clair. */
const FIELD_LABEL: Record<string, { fr: string; en: string }> = {
  expected_revenue: { fr: 'montant', en: 'amount' },
  probability: { fr: 'chances de gagner', en: 'chance of winning' },
  daily_rate_eur: { fr: 'TJM', en: 'day rate' },
  budget_eur: { fr: 'budget', en: 'budget' },
  owner_id: { fr: 'responsable', en: 'owner' },
  priority: { fr: 'priorité', en: 'priority' },
  expected_close: { fr: 'clôture prévue', en: 'expected close' },
  start_date: { fr: 'démarrage', en: 'start' },
  duration_months: { fr: 'durée', en: 'duration' },
  next_action: { fr: 'prochaine action', en: 'next step' },
  next_follow_up: { fr: 'date de relance', en: 'follow-up date' },
};

function describe(a: Activity, lang: 'fr' | 'en'): Pick<TimelineItem, 'title' | 'description' | 'icon' | 'tone'> {
  const fr = lang === 'fr';
  const d = (a.details ?? a.metadata ?? {}) as Record<string, unknown>;
  switch (a.action) {
    case 'created':
      return { title: fr ? 'Création' : 'Created', icon: FilePlus2, tone: 'brand' };
    case 'updated': {
      const fields = Array.isArray(d.fields) ? (d.fields as string[]).map((f) => FIELD_LABEL[f]?.[lang]).filter(Boolean) : [];
      return { title: fr ? 'Mise à jour' : 'Updated', description: fields.length ? fields.join(', ') : undefined, icon: PencilLine };
    }
    case 'follow_up_planned':
      return { title: fr ? 'Relance planifiée' : 'Follow-up planned', icon: BellRing, tone: 'brand' };
    case 'follow_up_done':
      return { title: fr ? 'Relance faite' : 'Follow-up done', description: typeof d.action === 'string' ? d.action : undefined, icon: CheckCheck, tone: 'success' };
    case 'stage_changed':
      return {
        title: fr ? "Changement d'étape" : 'Stage changed',
        description: [`${stageLabel(d.from as OpportunityStatus, lang)} → ${stageLabel(d.to as OpportunityStatus, lang)}`, typeof d.lost_reason === 'string' ? d.lost_reason : null]
          .filter(Boolean)
          .join(' — '),
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
