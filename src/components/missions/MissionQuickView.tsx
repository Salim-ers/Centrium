'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { DetailDrawer } from '@/components/app/DetailDrawer';
import { FactList } from '@/components/app/FactList';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StatusPill } from '@/components/ui/status-pill';
import { RenewalPrompt } from '@/components/missions/RenewalPrompt';
import { MISSION_STATUS, RENEWAL_STATUS, statusOf } from '@/lib/status';
import { formatDate, formatEur, formatEurCompact, formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { MissionRow } from '@/lib/pilotage/load-missions';

/**
 * Aperçu d'une mission dans un tiroir : chiffres clés, avancement,
 * renouvellement. Le cockpit complet reste à un clic.
 */
export function MissionQuickView({
  mission: m,
  open,
  onOpenChange,
  lang,
  today,
  showRates,
  financials,
  canEdit,
  ownerName,
  onChanged,
}: {
  mission: MissionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: 'fr' | 'en';
  today: string;
  showRates: boolean;
  financials: boolean;
  canEdit: boolean;
  ownerName: string | null;
  onChanged: () => void;
}) {
  const fr = lang === 'fr';
  if (!m) return null;
  const st = statusOf(MISSION_STATUS, m.status, lang);
  const renewal = statusOf(RENEWAL_STATUS, m.renewal_status ?? 'unknown', lang);
  const planned = m.planned_days_effective;
  const ending = m.days_left != null && m.days_left >= 0 && m.days_left <= 30;

  const stats: Array<{ label: string; value: string; hint?: string; strong?: boolean }> = [
    ...(showRates ? [{ label: 'TJM', value: formatEur(Number(m.daily_rate_eur), lang) }] : []),
    ...(financials
      ? [
          { label: 'CJM', value: m.daily_cost_eur != null ? formatEur(m.daily_cost_eur, lang) : '—' },
          {
            label: fr ? 'Marge' : 'Margin',
            value: m.margin_pct != null ? formatPct(m.margin_pct, lang) : '—',
            hint: m.margin_eur != null ? formatEurCompact(m.margin_eur, lang) : undefined,
            strong: true,
          },
        ]
      : []),
    {
      label: fr ? 'Jours validés' : 'Approved days',
      value: `${m.validated_days}${planned != null ? ` / ${planned}` : ''}`,
    },
    {
      label: fr ? 'Fin' : 'End',
      value: m.end_date ? formatDate(m.end_date, lang, 'short') : fr ? 'Sans fin' : 'Open',
      hint: m.days_left != null && m.days_left >= 0 ? `J-${m.days_left}` : undefined,
    },
  ];

  const overview = (
    <div className="space-y-5">
      <RenewalPrompt
        mission={m}
        lang={lang}
        today={today}
        canEdit={canEdit}
        showRates={showRates}
        consultantName={m.consultant_name}
        ownerName={ownerName}
        onChanged={onChanged}
        stacked
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className={cn('rounded-xl px-3 py-2.5', s.strong ? 'bg-app-terra text-white' : 'bg-app-sand/50')}>
            <div className={cn('text-[11.5px] font-medium', s.strong ? 'text-white/80' : 'text-muted-foreground')}>{s.label}</div>
            <div className="num mt-0.5 text-[16px] font-semibold leading-tight">{s.value}</div>
            {s.hint && <div className={cn('num text-[11.5px]', s.strong ? 'text-white/80' : 'text-muted-foreground')}>{s.hint}</div>}
          </div>
        ))}
      </div>
      {planned != null && planned > 0 && (
        <div className="space-y-1.5">
          <Progress value={m.validated_days} max={planned} label={fr ? 'Jours validés sur jours prévus' : 'Approved days out of planned'} />
          <p className="num text-xs text-muted-foreground">
            {fr ? `${m.validated_days} jours validés sur ${planned}` : `${m.validated_days} approved days out of ${planned}`}
            {showRates && m.forecast_revenue != null ? ` · ${fr ? 'CA prévu' : 'forecast'} ${formatEurCompact(m.forecast_revenue, lang)}` : ''}
          </p>
        </div>
      )}
      <FactList
        columns={2}
        facts={[
          { label: 'Consultant', value: <Link href={`/consultants/${m.consultant_id}`} className="hover:text-app-terra-dark">{m.consultant_name}</Link>, hint: m.consultant_job ?? undefined },
          { label: 'Client', value: m.company_id ? <Link href={`/clients/${m.company_id}`} className="hover:text-app-terra-dark">{m.company_name ?? '—'}</Link> : null },
          { label: fr ? 'Début' : 'Start', value: formatDate(m.start_date, lang) },
          { label: fr ? 'Fin' : 'End', value: m.end_date ? formatDate(m.end_date, lang) : fr ? 'Non définie' : 'Not set' },
          { label: fr ? 'Responsable' : 'Owner', value: ownerName },
          { label: fr ? 'Renouvellement' : 'Renewal', value: m.status === 'active' ? renewal.label : '—' },
        ]}
      />
    </div>
  );

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={m.title}
      subtitle={[m.consultant_name, m.company_name].filter(Boolean).join(' · ')}
      badges={
        <>
          <StatusPill tone={st.tone}>{st.label}</StatusPill>
          {ending && <StatusPill tone={m.days_left! <= 15 ? 'danger' : 'warning'}>{`J-${m.days_left}`}</StatusPill>}
        </>
      }
      tabs={[{ id: 'overview', label: fr ? 'Aperçu' : 'Overview', content: overview }]}
      footer={
        <Button asChild>
          <Link href={`/missions/${m.id}`}>
            {fr ? 'Ouvrir le cockpit' : 'Open the cockpit'}
            <ArrowUpRight />
          </Link>
        </Button>
      }
    />
  );
}
