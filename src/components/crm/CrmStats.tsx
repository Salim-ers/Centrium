'use client';

import { AlarmClock, Kanban, Trophy, Wallet } from 'lucide-react';

import { KPICard } from '@/components/app/KPICard';
import { summarizePipeline } from '@/lib/crm/summary';
import { stageOf } from '@/lib/crm/pipeline';
import { formatEurCompact } from '@/lib/format';
import type { Opportunity } from '@/types';

/** Rangée de tuiles du CRM : en cours, montant en jeu, relances en retard, taux de gain. */
export function CrmStats({ opps, today, lang }: { opps: Opportunity[]; today: string; lang: 'fr' | 'en' }) {
  const fr = lang === 'fr';
  const s = summarizePipeline(opps, today);
  const won = opps.filter((o) => stageOf(o.status) === 'won').length;
  const lost = opps.filter((o) => stageOf(o.status) === 'lost').length;
  const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null;
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KPICard accent="terra" icon={Kanban} label={fr ? 'Opportunités en cours' : 'Open opportunities'} value={s.open} />
      <KPICard icon={Wallet} label={fr ? 'Montant en jeu' : 'At stake'} valueText={formatEurCompact(s.amount, lang)} />
      <KPICard
        accent="peach"
        icon={AlarmClock}
        label={fr ? 'Relances en retard' : 'Overdue follow-ups'}
        value={s.overdue}
        hint={s.overdue ? (fr ? 'À relancer en priorité' : 'Follow up first') : fr ? 'Tout est à jour' : 'All up to date'}
      />
      <KPICard
        accent="soft"
        icon={Trophy}
        label={fr ? 'Taux de gain' : 'Win rate'}
        valueText={winRate == null ? '—' : `${winRate} %`}
        hint={fr ? `${won} gagnée${won > 1 ? 's' : ''} sur ${won + lost} conclue${won + lost > 1 ? 's' : ''}` : `${won} won out of ${won + lost} closed`}
      />
    </div>
  );
}
