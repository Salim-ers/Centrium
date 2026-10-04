'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CalendarDays, MoreHorizontal, Plus, Trash2, Workflow } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Combobox } from '@/components/ui/Combobox';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { SkeletonRows } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useTeamMembers } from '@/hooks/useOrgDirectory';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { taskService } from '@/lib/services/crm.service';
import { formatDate, relativeDays } from '@/lib/format';
import type { Task, TaskEntityType } from '@/types';

const ENTITY_HREF: Record<TaskEntityType, (id: string) => string> = {
  opportunity: (id) => `/opportunities/${id}`,
  client: (id) => `/clients/${id}`,
  contact: () => `/contacts`,
  mission: (id) => `/missions/${id}`,
  consultant: (id) => `/consultants/${id}`,
  timesheet: (id) => `/timesheets/${id}`,
  quote: (id) => `/documents/quotes/${id}`,
  client_request: () => `/portals?tab=requests`,
};

const ENTITY_LABEL: Record<TaskEntityType, { fr: string; en: string }> = {
  opportunity: { fr: 'Opportunité', en: 'Opportunity' },
  client: { fr: 'Client', en: 'Client' },
  contact: { fr: 'Contact', en: 'Contact' },
  mission: { fr: 'Mission', en: 'Mission' },
  consultant: { fr: 'Consultant', en: 'Consultant' },
  timesheet: { fr: 'CRA', en: 'Timesheet' },
  quote: { fr: 'Devis', en: 'Quote' },
  client_request: { fr: 'Demande client', en: 'Client request' },
};

type Props = {
  /** Restreint la liste à une entité (fiche client, opportunité…). */
  entityType?: TaskEntityType;
  entityId?: string;
  /** Filtre d'affichage. */
  filter?: 'open' | 'done' | 'all';
  assigneeId?: string;
  /** Affiche le lien vers l'entité (vue globale). */
  showEntity?: boolean;
  compact?: boolean;
};

export function TaskList({ entityType, entityId, filter = 'open', assigneeId, showEntity = false, compact = false }: Props) {
  const { activeOrgId, user } = useOrganization();
  const { can } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { byId: members, options: memberOptions } = useTeamMembers();
  const canEdit = can('crm.edit') || can('missions.edit') || can('consultants.edit');
  const [title, setTitle] = useState('');
  const [due, setDue] = useState<string | null>(null);
  const [assignee, setAssignee] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const key = `tasks:${activeOrgId ?? 'none'}:${entityType ?? 'all'}:${entityId ?? ''}:${filter}:${assigneeId ?? ''}`;
  const { data, loading, setData } = useCachedQuery<Task[]>(
    key,
    async () => {
      const res = await taskService.list({
        entityType,
        entityId,
        assigneeId,
        status: filter === 'open' ? 'open' : filter === 'done' ? 'done' : undefined,
      });
      return res.data ?? [];
    },
    { enabled: !!activeOrgId },
  );

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrgId || !title.trim()) return;
    setSaving(true);
    const res = await taskService.create(
      {
        title,
        due_date: due,
        assignee_id: assignee || user?.id || null,
        entity_type: entityType ?? null,
        entity_id: entityId ?? null,
      },
      activeOrgId,
    );
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    setData((list) => [res.data, ...(list ?? [])]);
    setTitle('');
    setDue(null);
  }

  async function toggle(t: Task) {
    const status = t.status === 'done' ? 'todo' : 'done';
    setData((list) => (list ?? []).map((x) => (x.id === t.id ? { ...x, status } : x)));
    const res = await taskService.update(t.id, { status });
    if (res.error) {
      toast.error(res.error.message);
      setData((list) => (list ?? []).map((x) => (x.id === t.id ? t : x)));
    } else if (filter === 'open' && status === 'done') {
      // Laisse la coche visible un instant avant de retirer la ligne.
      setTimeout(() => setData((list) => (list ?? []).filter((x) => x.id !== t.id)), 600);
    }
  }

  async function remove(t: Task) {
    const res = await taskService.remove(t.id);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    setData((list) => (list ?? []).filter((x) => x.id !== t.id));
  }

  const today = new Date().toISOString().slice(0, 10);
  const tasks = data ?? [];

  return (
    <div>
      {canEdit && (
        <form onSubmit={add} className={cn('flex flex-col gap-2 sm:flex-row', compact ? 'mb-3' : 'mb-4')}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={fr ? 'Nouvelle tâche…' : 'New task…'}
            maxLength={200}
            aria-label={fr ? 'Intitulé de la tâche' : 'Task title'}
            className="sm:flex-1"
          />
          <DatePicker value={due} onChange={setDue} placeholder={fr ? 'Échéance' : 'Due date'} className="sm:w-44" />
          {!compact && (
            <div className="sm:w-48">
              <Combobox
                options={memberOptions}
                value={assignee}
                onChange={setAssignee}
                placeholder={fr ? 'Moi' : 'Me'}
                clearable
                ariaLabel={fr ? 'Assigner à' : 'Assign to'}
              />
            </div>
          )}
          <Button type="submit" variant="secondary" loading={saving} disabled={!title.trim()}>
            <Plus />
            {fr ? 'Ajouter' : 'Add'}
          </Button>
        </form>
      )}

      {loading && !data ? (
        <SkeletonRows rows={compact ? 3 : 5} />
      ) : tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
          {filter === 'done' ? (fr ? 'Aucune tâche terminée.' : 'No completed tasks.') : fr ? 'Aucune tâche en cours.' : 'No open tasks.'}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {tasks.map((t) => {
            const done = t.status === 'done';
            const overdue = !done && !!t.due_date && t.due_date < today;
            const member = t.assignee_id ? members.get(t.assignee_id) : null;
            return (
              <li key={t.id} className="group flex items-start gap-3 px-3 py-2.5">
                <Checkbox
                  checked={done}
                  onCheckedChange={() => void toggle(t)}
                  disabled={!canEdit}
                  className="mt-0.5"
                  aria-label={done ? (fr ? 'Rouvrir la tâche' : 'Reopen task') : fr ? 'Terminer la tâche' : 'Complete task'}
                />
                <div className="min-w-0 flex-1">
                  <div className={cn('text-[13.5px] leading-5', done ? 'text-muted-foreground line-through' : 'text-foreground')}>
                    {t.title}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {t.due_date && (
                      <span className={cn('inline-flex items-center gap-1', overdue && 'font-medium text-destructive')}>
                        <CalendarDays className="h-3 w-3" />
                        {overdue ? relativeDays(t.due_date, lang) : formatDate(t.due_date, lang, 'short')}
                      </span>
                    )}
                    {t.source === 'automation' && (
                      <Badge variant="neutral" className="gap-1">
                        <Workflow className="h-3 w-3" />
                        {fr ? 'Automatique' : 'Automated'}
                      </Badge>
                    )}
                    {showEntity && t.entity_type && t.entity_id && (
                      <Link href={ENTITY_HREF[t.entity_type](t.entity_id)} className="text-primary hover:text-primary-deep">
                        {ENTITY_LABEL[t.entity_type][lang]}
                      </Link>
                    )}
                  </div>
                </div>
                {member && <Avatar name={member.name} size="xs" className="mt-0.5" />}
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition hover:bg-muted focus-visible:opacity-100 group-hover:opacity-100"
                        aria-label={fr ? 'Actions' : 'Actions'}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem destructive onSelect={() => void remove(t)}>
                        <Trash2 />
                        {fr ? 'Supprimer' : 'Delete'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
