'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { CrmTabs } from '@/components/crm/CrmTabs';
import { TaskList } from '@/components/crm/TaskList';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';

export default function CrmTasksPage() {
  const { user } = useOrganization();
  const { locale } = useLocale();
  const fr = locale !== 'en';
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [filter, setFilter] = useState<'open' | 'done'>('open');

  return (
    <AppShell>
      <PageHeader
        eyebrow={fr ? 'Activité commerciale' : 'Sales'}
        title="CRM"
        description={
          fr
            ? 'Relances, rappels et suivis. Les automatisations créent aussi des tâches (opportunité sans activité, demande client…).'
            : 'Follow-ups and reminders. Automations also create tasks (stale opportunity, client request…).'
        }
      >
        <CrmTabs />
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs value={scope} onValueChange={(v) => setScope(v as 'mine' | 'all')}>
          <TabsList>
            <TabsTrigger value="mine">{fr ? 'Mes tâches' : 'My tasks'}</TabsTrigger>
            <TabsTrigger value="all">{fr ? 'Équipe' : 'Team'}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'open' | 'done')}>
          <TabsList>
            <TabsTrigger value="open">{fr ? 'À faire' : 'To do'}</TabsTrigger>
            <TabsTrigger value="done">{fr ? 'Terminées' : 'Done'}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="max-w-4xl">
        <TaskList filter={filter} assigneeId={scope === 'mine' ? user?.id : undefined} showEntity />
      </div>
    </AppShell>
  );
}
