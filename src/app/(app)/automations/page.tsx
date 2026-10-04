'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowRight, Briefcase, ClipboardCheck, FileText, Lock, MessageSquarePlus, Target } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { EmptyState } from '@/components/app/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { AUTOMATION_RULES, type AutomationRule, type AutomationRuleId, type AutomationSettings } from '@/lib/automations/rules';

const ICON: Record<AutomationRule['category'], React.ElementType> = {
  missions: Briefcase,
  cra: ClipboardCheck,
  crm: Target,
  portals: MessageSquarePlus,
  documents: FileText,
};

type Activity = Partial<Record<AutomationRuleId, number>>;

/** Activité réelle des 30 derniers jours, par règle. */
async function loadActivity(orgId: string): Promise<Activity> {
  const supabase = createClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const count = (p: PromiseLike<{ count: number | null; error: unknown }>) => Promise.resolve(p).then((r) => (r.error ? 0 : (r.count ?? 0)));
  const [missionAlerts, missingTs, oppTasks, quoteTasks, requests] = await Promise.all([
    count(supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('source', 'engine').eq('kind', 'mission_ending').gte('created_at', since)),
    count(supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('source', 'engine').eq('kind', 'timesheet_missing').gte('created_at', since)),
    count(supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('source', 'automation').eq('entity_type', 'opportunity').gte('created_at', since)),
    count(supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('source', 'automation').eq('entity_type', 'quote').gte('created_at', since)),
    count(supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('source', 'client_portal').gte('created_at', since)),
  ]);
  return {
    mission_ending_alerts: missionAlerts,
    missing_timesheet_reminders: missingTs,
    stale_opportunity_tasks: oppTasks,
    quote_expiry_alerts: quoteTasks,
    client_request_to_opportunity: requests,
  };
}

export default function AutomationsPage() {
  const { activeOrgId } = useOrganization();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const allowed = can('automations.manage');
  const [saving, setSaving] = useState<AutomationRuleId | null>(null);

  const { data: settings, loading, setData } = useCachedQuery<AutomationSettings | null>(
    `automations:${activeOrgId ?? 'none'}`,
    async () => {
      const res = await fetch('/api/automations', { cache: 'no-store' });
      if (!res.ok) return null;
      return ((await res.json()) as { data: AutomationSettings }).data;
    },
    { enabled: !!activeOrgId && ready && allowed },
  );
  const { data: activity } = useCachedQuery<Activity>(`automations-activity:${activeOrgId ?? 'none'}`, () => loadActivity(activeOrgId!), {
    enabled: !!activeOrgId && ready && allowed,
  });

  async function toggle(rule: AutomationRuleId, enabled: boolean) {
    if (!settings) return;
    setSaving(rule);
    setData({ ...settings, [rule]: { enabled } });
    const res = await fetch('/api/automations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rule, enabled }) });
    setSaving(null);
    if (!res.ok) {
      setData(settings);
      toast.error(fr ? 'Enregistrement impossible' : 'Could not save');
      return;
    }
    toast.success(enabled ? (fr ? 'Automatisation activée' : 'Automation enabled') : fr ? 'Automatisation désactivée' : 'Automation disabled');
  }

  if (ready && !allowed) {
    return (
      <AppShell>
        <EmptyState icon={Lock} title={fr ? 'Accès restreint' : 'Restricted access'} description={fr ? 'Votre rôle ne permet pas de gérer les automatisations.' : 'Your role cannot manage automations.'} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow={fr ? 'Collaboration' : 'Collaboration'}
        title={fr ? 'Automatisations' : 'Automations'}
        description={
          fr
            ? 'Règles exécutées chaque jour par Centrium. Activez seulement ce qui sert à votre équipe.'
            : 'Rules run daily by Centrium. Enable only what helps your team.'
        }
      />

      {loading && !settings ? (
        <div className="space-y-3">
          {AUTOMATION_RULES.map((r) => (
            <Skeleton key={r.id} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {AUTOMATION_RULES.map((rule) => {
            const Icon = ICON[rule.category];
            const on = settings?.[rule.id]?.enabled ?? rule.defaultEnabled;
            const n = activity?.[rule.id];
            return (
              <Card key={rule.id} className={on ? '' : 'opacity-80'}>
                <CardContent className="flex items-start gap-4 p-4 sm:p-5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-primary-deep">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{rule.label[lang]}</div>
                    <div className="mt-1 grid gap-1 text-[13px] sm:grid-cols-[auto_1fr] sm:gap-x-3">
                      <span className="text-muted-foreground">{fr ? 'Quand' : 'When'}</span>
                      <span>{rule.trigger[lang]}</span>
                      <span className="text-muted-foreground">{fr ? 'Alors' : 'Then'}</span>
                      <span>{rule.action[lang]}</span>
                    </div>
                    {n !== undefined && (
                      <div className="mt-2 text-[12px] text-muted-foreground">
                        {fr ? `${n} déclenchement${n > 1 ? 's' : ''} sur 30 jours` : `${n} run${n > 1 ? 's' : ''} in the last 30 days`}
                      </div>
                    )}
                  </div>
                  <Switch
                    checked={on}
                    disabled={!settings || saving === rule.id}
                    onCheckedChange={(v) => void toggle(rule.id, v)}
                    aria-label={`${rule.label[lang]} — ${on ? (fr ? 'activée' : 'on') : fr ? 'désactivée' : 'off'}`}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Link
        href="/settings/notifications"
        className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-[13.5px] hover:bg-muted/40"
      >
        <span>
          <span className="block font-medium">{fr ? 'Canaux, cadences et seuils' : 'Channels, cadences and thresholds'}</span>
          <span className="block text-muted-foreground">
            {fr
              ? 'Email, SMS, rythme des relances, alertes contrats, factures et documents : Paramètres → Notifications.'
              : 'Email, SMS, reminder cadence, contract, invoice and document alerts: Settings → Notifications.'}
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </AppShell>
  );
}
