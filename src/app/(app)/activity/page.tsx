'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  History,
  Inbox,
  Send,
  Target,
  UserPlus,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { EmptyState } from '@/components/app/EmptyState';
import { Segmented } from '@/components/app/Segmented';
import { Button } from '@/components/ui/button';
import { SkeletonRows } from '@/components/ui/skeleton';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { loadOrgActivity, type ActivityGroup, type ActivityKind, type OrgActivity } from '@/lib/activity/org-activity';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const ICON: Record<ActivityKind, LucideIcon> = {
  opportunity_created: Target,
  opportunity_won: CheckCircle2,
  opportunity_lost: XCircle,
  positioned: Send,
  quote_sent: FileText,
  quote_accepted: CheckCircle2,
  quote_declined: XCircle,
  client_request: Inbox,
  client_added: Building2,
  mission_created: Briefcase,
  consultant_added: UserPlus,
  timesheet_submitted: ClipboardCheck,
  timesheet_validated: CheckCircle2,
};

const PAGE = 60;
const DAYS = 30;

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Activité de l'organisation : les faits métier des 30 derniers jours, selon les accès de chacun. */
export default function ActivityPage() {
  const { activeOrgId } = useOrganization();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const [group, setGroup] = useState<ActivityGroup | 'all'>('all');
  const [limit, setLimit] = useState(PAGE);

  const { data, loading } = useCachedQuery<OrgActivity[]>(`org-activity:${activeOrgId ?? 'none'}`, () => loadOrgActivity(createClient(), activeOrgId!, can, DAYS), {
    enabled: !!activeOrgId && ready,
  });
  const all = useMemo(() => data ?? [], [data]);
  const count = (g: ActivityGroup) => all.filter((e) => e.group === g).length;
  const list = group === 'all' ? all : all.filter((e) => e.group === group);
  const shown = list.slice(0, limit);

  const days = useMemo(() => {
    const out: Array<{ key: string; items: OrgActivity[] }> = [];
    for (const e of shown) {
      const k = dayKey(e.at);
      const last = out.at(-1);
      if (last?.key === k) last.items.push(e);
      else out.push({ key: k, items: [e] });
    }
    return out;
  }, [shown]);

  const todayKey = dayKey(new Date().toISOString());
  const yesterdayKey = dayKey(new Date(Date.now() - 86_400_000).toISOString());
  const dayLabel = (k: string) => (k === todayKey ? (fr ? 'Aujourd’hui' : 'Today') : k === yesterdayKey ? (fr ? 'Hier' : 'Yesterday') : formatDate(k, lang));
  const time = (iso: string) => new Date(iso).toLocaleTimeString(fr ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <AppShell>
      <PageHeader
        title={fr ? 'Activité' : 'Activity'}
        description={fr ? `Les faits marquants des ${DAYS} derniers jours, selon vos accès.` : `Highlights of the last ${DAYS} days, based on your access.`}
        tabs={
          <Segmented<ActivityGroup | 'all'>
            label={fr ? 'Domaine' : 'Area'}
            value={group}
            onChange={(v) => {
              setGroup(v);
              setLimit(PAGE);
            }}
            options={[
              { value: 'all', label: fr ? 'Tout' : 'All', count: all.length },
              { value: 'commercial', label: fr ? 'Commercial' : 'Sales', count: count('commercial') },
              { value: 'staffing', label: 'Staffing', count: count('staffing') },
              { value: 'cra', label: fr ? 'CRA' : 'Timesheets', count: count('cra') },
            ]}
          />
        }
      />

      {loading && !data ? (
        <div className="rounded-2xl border border-border bg-card">
          <SkeletonRows rows={8} />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={History}
          title={fr ? 'Rien de nouveau' : 'Nothing new'}
          description={fr ? `Aucun fait marquant ces ${DAYS} derniers jours.` : `No highlights in the last ${DAYS} days.`}
        />
      ) : (
        <div className="space-y-5">
          {days.map((d) => (
            <section key={d.key}>
              <h2 className="mb-2 text-[12.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{dayLabel(d.key)}</h2>
              <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {d.items.map((e) => {
                  const Icon = ICON[e.kind];
                  return (
                    <li key={e.id}>
                      <Link href={e.href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 sm:px-5">
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                            e.kind === 'opportunity_lost' || e.kind === 'quote_declined' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-medium">{e.label[lang]}</span>
                          {e.detail && <span className="block truncate text-[12.5px] text-muted-foreground">{e.detail}</span>}
                        </span>
                        <span className="num shrink-0 text-[12px] text-muted-foreground">{time(e.at)}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          {list.length > limit && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
                {fr ? `Afficher plus (${list.length - limit})` : `Show more (${list.length - limit})`}
              </Button>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
