'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import {
  Check,
  CheckCheck,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Pencil,
  Calendar,
  CalendarClock,
  Lock,
  Loader2,
  Users,
  Globe,
  ListTodo,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { useAppT } from '@/lib/i18n/LocaleProvider';
import { Button } from '@/components/ui/button';
import { PageHeader, StatusBadge, type StatusTone } from '@/components/app';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/Combobox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { cn } from '@/lib/utils';
import { notifyError } from '@/lib/notify';
import {
  presenceColor,
  presenceDisplayName,
  presenceInitials,
} from '@/lib/realtime/presence-utils';
import { broadcastOrgActivity } from '@/lib/realtime/org-activity';

type Todo = {
  id: string;
  user_id: string;
  organization_id: string | null;
  shared: boolean;
  pinged_user_id: string | null;
  title: string;
  description: string | null;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type OwnerProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

type OrgMember = OwnerProfile & {
  /** Rôle dans l'org. On exclut 'consultant' du sélecteur de ping :
   *  les consultants n'ont pas vocation à recevoir des tâches CRM /
   *  pilotage de la part des BM / recruteurs. */
  role: string | null;
};

type AppT = ReturnType<typeof useAppT>;

/**
 * Construit le mapping priority → label depuis le dictionnaire i18n.
 * Doit être appelé depuis un composant React qui a accès au hook `useAppT`.
 */
function buildPriorityLabel(t: AppT): Record<Todo['priority'], string> {
  return {
    high: t.pages.todos.prio_high,
    medium: t.pages.todos.prio_medium,
    low: t.pages.todos.prio_low,
  };
}

const PRIORITY_TONE: Record<Todo['priority'], StatusTone> = {
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
};

const PRIORITY_RANK: Record<Todo['priority'], number> = { high: 0, medium: 1, low: 2 };

/** Liseré vertical à gauche de chaque ligne — encode la priorité sans chip. */
const PRIORITY_STRIPE: Record<Todo['priority'], string> = {
  high: 'bg-rose-400',
  medium: 'bg-amber-400',
  low: 'bg-slate-500/50',
};

/** MIME type pour le drag&drop d'une todo entre les deux tableaux. */
const DRAG_MIME = 'application/x-todo-id';

const SPRING = { type: 'spring', stiffness: 380, damping: 32, mass: 0.6 } as const;

/** Date locale au format YYYY-MM-DD (pas d'UTC — l'échéance est "jour local"). */
function localDateStr(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

type DueMeta = { Icon: LucideIcon; className: string; label: string };

/**
 * Chip d'échéance contextuelle : rouge si dépassée, ambre si aujourd'hui,
 * neutre sinon. Une tâche terminée n'est jamais "en retard".
 */
function dueMeta(todo: Todo, t: AppT): DueMeta | null {
  if (!todo.due_date) return null;
  const dueStr = todo.due_date.slice(0, 10);
  const todayStr = localDateStr(new Date());
  const formatted = new Date(todo.due_date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });
  if (!todo.done && dueStr < todayStr) {
    return {
      Icon: CalendarClock,
      className: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
      label: `${t.pages.todos.due_overdue} · ${formatted}`,
    };
  }
  if (!todo.done && dueStr === todayStr) {
    return {
      Icon: CalendarClock,
      className: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
      label: t.pages.todos.due_today,
    };
  }
  return {
    Icon: Calendar,
    className: 'border-hairline text-muted-foreground',
    label: formatted,
  };
}

/**
 * To do list personnelle de l'utilisateur connecté.
 *
 * Confidentialité : la table user_todos est protégée par une RLS qui
 * limite tout SELECT/INSERT/UPDATE/DELETE à user_id = auth.uid().
 * Aucun autre membre de l'organisation (même admin) ne voit cette liste.
 */
export default function TodosPage() {
  const { user, activeOrgId } = useOrganization();
  const t = useAppT();
  const [filter, setFilter] = useState<'pending' | 'done' | 'all'>('pending');
  const [editing, setEditing] = useState<Todo | null>(null);
  const [showForm, setShowForm] = useState(false);
  // Dialog "détail" : ouvert au clic sur le titre/description d'une todo.
  // Distinct de l'édition — l'édition reste un formulaire séparé.
  const [viewing, setViewing] = useState<Todo | null>(null);
  // Drag & drop entre tableaux Perso / Équipe.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<'mine' | 'team' | null>(null);
  // Profils des auteurs des todos partagés (pour afficher initiales + couleur).
  const [ownerProfiles, setOwnerProfiles] = useState<Map<string, OwnerProfile>>(new Map());
  // Liste de tous les membres de l'org (pour le sélecteur "Ping" + résolution
  // des noms des personnes pinguées dans la liste). RLS profiles_select_same_org
  // permet de tous les voir.
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);

  const {
    data: todosData,
    loading,
    reload,
    setData: setTodos,
  } = useCachedQuery<Todo[]>(
    // La clé inclut l'org car la RLS dépend de l'appartenance org pour les
    // todos partagés. Sans ça, un switch d'org garderait les anciens todos.
    `user-todos:${user?.id ?? 'none'}:org:${activeOrgId ?? 'none'}`,
    async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_todos')
        .select('*')
        .order('done', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Todo[];
    },
    { enabled: !!user?.id },
  );

  // Realtime sync : mes todos ET les todos partagés de mes collègues.
  // RLS appliquée par Realtime → seuls les events accessibles arrivent.
  useRealtimeReload(['user_todos'], () => reload());

  const allTodos = useMemo(() => todosData ?? [], [todosData]);

  // Récupère tous les membres de l'org (pour le ping + résolution nom).
  // Un seul fetch au mount + reload sur changement d'org.
  useEffect(() => {
    if (!activeOrgId) return;
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .eq('organization_id', activeOrgId);
      if (cancelled || !data) return;
      setOrgMembers(data as OrgMember[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeOrgId]);

  // Récupère les profils des auteurs (autres que moi) pour les todos
  // partagés — utile pour afficher "Salim" + ses initiales colorées.
  useEffect(() => {
    if (!user?.id) return;
    const otherUserIds = Array.from(
      new Set(
        allTodos
          .filter((td) => td.shared && td.user_id !== user.id)
          .map((td) => td.user_id),
      ),
    );
    const missing = otherUserIds.filter((id) => !ownerProfiles.has(id));
    if (missing.length === 0) return;
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', missing);
      if (cancelled || !data) return;
      setOwnerProfiles((prev) => {
        const next = new Map(prev);
        for (const p of data as OwnerProfile[]) next.set(p.id, p);
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
    // ownerProfiles dans deps relancerait en boucle ; on lit la valeur courante
    // via le closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTodos, user?.id]);

  // Lookup membre par id (pour résoudre les noms pingués dans la liste).
  const memberById = useMemo(() => {
    const m = new Map<string, OrgMember>();
    for (const om of orgMembers) m.set(om.id, om);
    return m;
  }, [orgMembers]);

  // Tri commun : non-cochés en haut, par priorité, puis date d'échéance,
  // puis création. Appliqué à chaque sous-liste.
  const sortTodos = (list: Todo[]) =>
    list.slice().sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.priority !== b.priority)
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      if (ad !== bd) return ad - bd;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Split en deux tableaux distincts :
  //   - Perso : tâches que j'ai créées (peu importe partagées/pinguées)
  //   - Équipe : tâches que je vois sans en être l'auteur (partagées par
  //     un collègue, ou pinguées sur moi)
  const myId = user?.id ?? null;
  const filterByStatus = (td: Todo) =>
    filter === 'pending' ? !td.done : filter === 'done' ? td.done : true;

  // Une tâche est "perso" si elle n'a AUCUN aspect équipe : créée par moi,
  // pas partagée, et sans ping sur quelqu'un d'autre. Sinon elle est "équipe".
  // → toggle share ou ping sur un collègue déplace la tâche vers l'équipe.
  const mineAll = useMemo(
    () =>
      allTodos.filter((td) => {
        if (!myId) return false;
        if (td.user_id !== myId) return false;
        if (td.shared) return false;
        if (td.pinged_user_id && td.pinged_user_id !== myId) return false;
        return true;
      }),
    [allTodos, myId],
  );
  const teamAll = useMemo(
    () =>
      allTodos.filter((td) => {
        if (!myId) return false;
        if (td.user_id !== myId) return true; // tâche d'un collègue qu'on voit
        if (td.shared) return true;
        if (td.pinged_user_id && td.pinged_user_id !== myId) return true;
        return false;
      }),
    [allTodos, myId],
  );
  const mineTodos = sortTodos(mineAll.filter(filterByStatus));
  const teamTodos = sortTodos(teamAll.filter(filterByStatus));

  const counts = {
    pending: mineAll.filter((td) => !td.done).length + teamAll.filter((td) => !td.done).length,
    done: mineAll.filter((td) => td.done).length + teamAll.filter((td) => td.done).length,
    all: mineAll.length + teamAll.length,
  };

  // Stats du bandeau "pulse" : en retard = non fait + échéance dépassée.
  const todayStr = localDateStr(new Date());
  const overdueCount = useMemo(
    () =>
      [...mineAll, ...teamAll].filter(
        (td) => !td.done && td.due_date && td.due_date.slice(0, 10) < todayStr,
      ).length,
    [mineAll, teamAll, todayStr],
  );
  const progressPct = counts.all === 0 ? 0 : Math.round((counts.done / counts.all) * 100);

  async function toggleDone(todo: Todo) {
    const supabase = createClient();
    const nextDone = !todo.done;
    // Optimistic update
    setTodos((prev) =>
      (prev ?? []).map((td) =>
        td.id === todo.id
          ? { ...td, done: nextDone, completed_at: nextDone ? new Date().toISOString() : null }
          : td,
      ),
    );
    const { error } = await supabase
      .from('user_todos')
      .update({ done: nextDone })
      .eq('id', todo.id);
    if (error) {
      notifyError(t.pages.todos.err_save_failed_prefix + error.message);
      reload();
    }
  }

  async function deleteTodo(todo: Todo) {
    if (!confirm(`${t.pages.todos.delete_confirm_prefix} "${todo.title}" ?`)) return;
    const prev = todosData;
    setTodos((list) => (list ?? []).filter((td) => td.id !== todo.id));
    const supabase = createClient();
    const { error } = await supabase.from('user_todos').delete().eq('id', todo.id);
    if (error) {
      notifyError(t.pages.todos.err_delete_failed + error.message);
      setTodos(prev ?? []);
      return;
    }
  }

  /**
   * Bascule un todo entre privé et partagé avec l'organisation.
   * Seul le propriétaire peut le faire (la RLS le garantit aussi côté DB).
   */
  async function toggleShare(todo: Todo) {
    if (!user?.id || todo.user_id !== user.id) return;
    if (!activeOrgId) {
      notifyError(t.pages.todos.err_no_org);
      return;
    }
    const nextShared = !todo.shared;
    const prev = todosData;
    // Optimistic
    setTodos((list) =>
      (list ?? []).map((td) =>
        td.id === todo.id
          ? { ...td, shared: nextShared, organization_id: nextShared ? activeOrgId : td.organization_id }
          : td,
      ),
    );
    const supabase = createClient();
    const { error } = await supabase
      .from('user_todos')
      .update({
        shared: nextShared,
        // On stamp l'org même au "unshare" : ça n'a aucun effet vu que
        // shared=false → invisible via la policy, et ça simplifie un
        // re-partage ultérieur.
        organization_id: activeOrgId,
      })
      .eq('id', todo.id);
    if (error) {
      notifyError(t.pages.todos.err_share_failed + error.message);
      setTodos(prev ?? []);
      return;
    }
    if (nextShared) {
      void broadcastOrgActivity(
        activeOrgId,
        user.id,
        'todo_shared',
        todo.title,
        '/todos',
      );
    }
  }

  // ============ Drag & Drop entre tableaux ============
  // Seules les tâches que je possède sont draggable — RLS empêcherait
  // d'éditer celles d'un collègue de toute façon, mais on l'enforce
  // côté UI pour éviter un drop visuel trompeur.
  function onDragStartTodo(e: React.DragEvent, todo: Todo) {
    if (!user?.id || todo.user_id !== user.id) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData(DRAG_MIME, todo.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(todo.id);
  }

  function onDragEndTodo() {
    setDraggingId(null);
    setDragOverTarget(null);
  }

  function onDragOverTarget(e: React.DragEvent, target: 'mine' | 'team') {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTarget !== target) setDragOverTarget(target);
  }

  function onDragLeaveTarget(e: React.DragEvent, target: 'mine' | 'team') {
    const next = e.relatedTarget as Node | null;
    if (next && (e.currentTarget as Node).contains(next)) return;
    if (dragOverTarget === target) setDragOverTarget(null);
  }

  function onDropTarget(e: React.DragEvent, target: 'mine' | 'team') {
    e.preventDefault();
    const id = e.dataTransfer.getData(DRAG_MIME);
    setDraggingId(null);
    setDragOverTarget(null);
    if (!id) return;
    const todo = allTodos.find((x) => x.id === id);
    if (!todo || !user?.id || todo.user_id !== user.id) return;
    const desiredShared = target === 'team';
    if (todo.shared === desiredShared) return; // déjà dans le bon tableau
    void toggleShare(todo);
  }

  // Source = la carte d'où vient la tâche draggée. Elle s'atténue
  // pour mettre en avant la cible (façon CRM).
  const sourceTarget: 'mine' | 'team' | null = (() => {
    if (!draggingId) return null;
    const todo = allTodos.find((x) => x.id === draggingId);
    if (!todo) return null;
    return mineAll.some((x) => x.id === todo.id) ? 'mine' : 'team';
  })();

  const cardClass = (target: 'mine' | 'team') => {
    const isTarget = dragOverTarget === target && draggingId !== null && sourceTarget !== target;
    const isSource = sourceTarget === target && draggingId !== null;
    return cn(
      'transition-all duration-200',
      isTarget &&
        'border-violet-glow/70 bg-violet-glow/[0.06] shadow-[0_0_30px_-12px_rgba(168,85,247,0.65)] scale-[1.01]',
      isSource && !isTarget && 'opacity-70',
    );
  };

  const renderRow = (todo: Todo) => (
    <TodoRow
      key={todo.id}
      todo={todo}
      currentUserId={myId}
      owner={todo.user_id !== myId ? ownerProfiles.get(todo.user_id) ?? null : null}
      memberById={memberById}
      draggingId={draggingId}
      onDragStart={onDragStartTodo}
      onDragEnd={onDragEndTodo}
      onToggleDone={toggleDone}
      onView={setViewing}
      onToggleShare={toggleShare}
      onEdit={(td) => {
        setEditing(td);
        setShowForm(true);
      }}
      onDelete={(td) => void deleteTodo(td)}
    />
  );

  const renderList = (
    list: Todo[],
    emptyText: string,
    dropTarget: 'mine' | 'team',
    EmptyIcon: LucideIcon,
  ) => {
    if (loading) {
      return (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl surface-1"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      );
    }
    if (list.length === 0) {
      const dragActive = dragOverTarget === dropTarget && draggingId !== null;
      const dropHint =
        dropTarget === 'team' ? t.pages.todos.drop_team_hint : t.pages.todos.drop_private_hint;
      return (
        <div className="p-4">
          <div
            className={cn(
              'flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center transition-all duration-200',
              dragActive ? 'border-violet-glow/60 bg-violet-glow/[0.06]' : 'border-hairline',
            )}
          >
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border transition-colors',
                dragActive
                  ? 'border-violet-glow/40 text-violet-glow'
                  : 'border-hairline text-muted-foreground/50',
              )}
            >
              <EmptyIcon className="h-[18px] w-[18px]" />
            </span>
            <p
              className={cn(
                'text-sm',
                dragActive ? 'font-medium text-violet-glow' : 'text-muted-foreground/70',
              )}
            >
              {dragActive ? dropHint : emptyText}
            </p>
          </div>
        </div>
      );
    }
    return (
      <ul className="divide-y divide-hairline">
        <AnimatePresence initial={false}>{list.map(renderRow)}</AnimatePresence>
      </ul>
    );
  };

  const emptyTextFor = (scope: 'mine' | 'team') => {
    if (scope === 'mine') {
      return filter === 'pending'
        ? t.pages.todos.empty_mine_pending
        : filter === 'done'
          ? t.pages.todos.empty_mine_done
          : t.pages.todos.empty_mine_all;
    }
    return filter === 'pending'
      ? t.pages.todos.empty_team_pending
      : filter === 'done'
        ? t.pages.todos.empty_team_done
        : t.pages.todos.empty_team_all;
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow={t.pages.todos.eyebrow}
        title={
          <>
            {t.pages.todos.title_a}{' '}
            <span className="qc-italic-accent font-editorial italic">{t.pages.todos.title_b}</span>
          </>
        }
        description={
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-violet-glow" />
            {t.pages.todos.share_hint_prefix}
            <Users className="inline h-3.5 w-3.5" />
            {' '}{t.pages.todos.share_hint_suffix}
          </span>
        }
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-violet-glow to-magenta-neon hover:opacity-95 dark:shadow-glow-magenta"
          >
            <Plus className="h-4 w-4" />
            {t.pages.todos.new_task}
          </Button>
        }
      />

      {/* ============ Bandeau "pulse" : stats animées + progression ============ */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="qc-premium mb-6 grid grid-cols-2 rounded-2xl border lg:grid-cols-4"
      >
        <StatCell
          label={t.pages.todos.stat_pending}
          value={counts.pending}
          icon={ListTodo}
          iconClass="text-violet-glow"
          loading={loading}
        />
        <StatCell
          label={t.pages.todos.stat_overdue}
          value={overdueCount}
          icon={CalendarClock}
          iconClass={overdueCount > 0 ? 'text-rose-400' : 'text-muted-foreground/50'}
          valueClass={overdueCount > 0 ? 'text-rose-400' : undefined}
          loading={loading}
          className="border-l border-hairline"
        />
        <StatCell
          label={t.pages.todos.stat_done}
          value={counts.done}
          icon={CheckCheck}
          iconClass="text-emerald-400"
          loading={loading}
          className="border-t border-hairline lg:border-l lg:border-t-0"
        />
        <div className="border-l border-t border-hairline px-5 py-4 lg:border-t-0">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
              {t.pages.todos.stat_progress}
            </div>
            <TrendingUp className="h-4 w-4 text-magenta-neon" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="font-display text-[1.75rem] font-light leading-none tracking-[-0.03em] text-foreground">
              <AnimatedNumber value={loading ? null : progressPct} />
            </span>
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.07]">
            <motion.div
              className="h-full rounded-full bg-magenta dark:bg-gradient-to-r dark:from-violet-glow dark:to-magenta-neon"
              initial={false}
              animate={{ width: `${loading ? 0 : progressPct}%` }}
              transition={{ type: 'spring', stiffness: 90, damping: 20 }}
            />
          </div>
        </div>
      </motion.section>

      {/* Filtres : status (À faire / Terminées / Toutes) appliqué aux deux
          tableaux — pilule active animée façon segmented control. */}
      <FilterTabs
        value={filter}
        onChange={setFilter}
        tabs={[
          { key: 'pending', label: t.pages.todos.tab_pending, count: counts.pending },
          { key: 'done', label: t.pages.todos.tab_done, count: counts.done },
          { key: 'all', label: t.pages.todos.tab_all, count: counts.all },
        ]}
      />

      {showForm && (
        <TodoForm
          todo={editing}
          userId={user?.id ?? null}
          orgIdHint={activeOrgId}
          orgMembers={orgMembers}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={(saved) => {
            setTodos((prev) => {
              const list = prev ?? [];
              const idx = list.findIndex((td) => td.id === saved.id);
              if (idx === -1) return [saved, ...list];
              const next = list.slice();
              next[idx] = saved;
              return next;
            });
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      <TodoDetailDialog
        todo={viewing}
        currentUserId={user?.id ?? null}
        owner={
          viewing && viewing.user_id !== user?.id
            ? ownerProfiles.get(viewing.user_id) ?? null
            : null
        }
        pingedMember={
          viewing?.pinged_user_id ? memberById.get(viewing.pinged_user_id) ?? null : null
        }
        ownerMember={viewing ? memberById.get(viewing.user_id) ?? null : null}
        onClose={() => setViewing(null)}
        onToggleDone={(td) => toggleDone(td)}
        onEdit={(td) => {
          setEditing(td);
          setShowForm(true);
          setViewing(null);
        }}
        onDelete={(td) => {
          setViewing(null);
          void deleteTodo(td);
        }}
        onToggleShare={(td) => toggleShare(td)}
      />

      <LayoutGroup>
        <div className="grid gap-5 lg:grid-cols-2">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
            onDragOver={(e) => onDragOverTarget(e, 'mine')}
            onDragLeave={(e) => onDragLeaveTarget(e, 'mine')}
            onDrop={(e) => onDropTarget(e, 'mine')}
            className={cn('qc-premium relative overflow-hidden rounded-2xl border', cardClass('mine'))}
          >
            <header className="flex items-center gap-3 border-b border-hairline px-5 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-glow/30 bg-violet-glow/15 text-violet-glow">
                <Lock className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-semibold tracking-tight">
                {t.pages.todos.card_my_title}
              </h2>
              <span className="ml-auto rounded-full border border-hairline surface-2 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                {mineTodos.length}
              </span>
            </header>
            {renderList(mineTodos, emptyTextFor('mine'), 'mine', Sparkles)}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
            onDragOver={(e) => onDragOverTarget(e, 'team')}
            onDragLeave={(e) => onDragLeaveTarget(e, 'team')}
            onDrop={(e) => onDropTarget(e, 'team')}
            className={cn('qc-premium relative overflow-hidden rounded-2xl border', cardClass('team'))}
          >
            <header className="flex items-center gap-3 border-b border-hairline px-5 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-magenta/30 bg-magenta/10 text-magenta-neon">
                <Users className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-semibold tracking-tight">
                {t.pages.todos.card_team_title}
              </h2>
              <span className="ml-auto rounded-full border border-hairline surface-2 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                {teamTodos.length}
              </span>
            </header>
            {renderList(teamTodos, emptyTextFor('team'), 'team', Users)}
          </motion.section>
        </div>
      </LayoutGroup>
    </AppShell>
  );
}

/** Cellule du bandeau de stats : label CAPS + nombre animé + icône tonale. */
function StatCell({
  label,
  value,
  icon: Icon,
  iconClass,
  valueClass,
  loading,
  className,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  iconClass?: string;
  valueClass?: string;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('px-5 py-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
          {label}
        </div>
        <Icon className={cn('h-4 w-4', iconClass)} />
      </div>
      <div
        className={cn(
          'mt-1.5 font-display text-[1.75rem] font-light leading-none tracking-[-0.03em] text-foreground',
          valueClass,
        )}
      >
        <AnimatedNumber value={loading ? null : value} />
      </div>
    </div>
  );
}

type FilterKey = 'pending' | 'done' | 'all';

/** Segmented control avec pilule active qui glisse (layoutId framer-motion). */
function FilterTabs({
  value,
  onChange,
  tabs,
}: {
  value: FilterKey;
  onChange: (f: FilterKey) => void;
  tabs: { key: FilterKey; label: string; count: number }[];
}) {
  return (
    <div className="mb-6 flex w-fit items-center gap-1 rounded-xl border border-hairline surface-1 p-1">
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              'relative rounded-lg px-3.5 py-1.5 text-sm transition-colors',
              active ? 'text-violet-glow' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId="todos-filter-pill"
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                className="absolute inset-0 rounded-lg border border-violet-glow/30 bg-violet-glow/15"
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-2">
              <span className="font-medium">{tab.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  active ? 'bg-violet-glow/15 text-violet-glow' : 'surface-2 text-muted-foreground',
                )}
              >
                {tab.count}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

type TodoRowProps = {
  todo: Todo;
  currentUserId: string | null;
  owner: OwnerProfile | null;
  memberById: Map<string, OrgMember>;
  draggingId: string | null;
  onDragStart: (e: React.DragEvent, todo: Todo) => void;
  onDragEnd: () => void;
  onToggleDone: (todo: Todo) => void;
  onView: (todo: Todo) => void;
  onToggleShare: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
};

/**
 * Ligne de tâche — priorité encodée par le liseré vertical gauche
 * (rouge/ambre/gris), checkbox circulaire animée, chips contextuelles
 * (équipe / ping / échéance intelligente), actions révélées au survol.
 */
function TodoRow({
  todo,
  currentUserId,
  owner,
  memberById,
  draggingId,
  onDragStart,
  onDragEnd,
  onToggleDone,
  onView,
  onToggleShare,
  onEdit,
  onDelete,
}: TodoRowProps) {
  const t = useAppT();
  const PRIORITY_LABEL = buildPriorityLabel(t);
  const isMine = todo.user_id === currentUserId;
  const ownerColor = owner ? presenceColor(owner.id) : null;
  const ownerInitials = owner
    ? presenceInitials(owner.first_name, owner.last_name, owner.email)
    : '';
  const ownerName = owner
    ? presenceDisplayName(owner.first_name, owner.last_name, owner.email)
    : '';
  const canDrag = isMine; // seules mes tâches sont déplaçables
  const isDragging = draggingId === todo.id;
  const due = dueMeta(todo, t);

  return (
    <motion.li
      layoutId={`todo-${todo.id}`}
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={SPRING}
      draggable={canDrag}
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, todo)}
      onDragEnd={onDragEnd}
      className={cn(
        'group relative flex select-none items-start gap-3 py-3 pl-6 pr-3 transition-colors duration-200 hover-surface',
        todo.done && 'opacity-55',
        canDrag && !isDragging && 'cursor-grab',
        // Animation drag façon CRM : rotation + scale + opacity
        isDragging && 'rotate-2 scale-95 cursor-grabbing opacity-50',
      )}
    >
      <span
        aria-hidden
        title={PRIORITY_LABEL[todo.priority]}
        className={cn(
          'absolute bottom-3.5 left-2 top-3.5 w-[3px] rounded-full',
          PRIORITY_STRIPE[todo.priority],
          todo.done && 'opacity-40',
        )}
      />

      <button
        type="button"
        onClick={() => onToggleDone(todo)}
        title={todo.done ? t.pages.todos.mark_undone_short : t.pages.todos.mark_done_short}
        className={cn(
          'relative mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 transition-colors',
          todo.done
            ? 'border-emerald-500'
            : 'border-muted-foreground/35 hover:border-emerald-400',
        )}
      >
        <AnimatePresence initial={false}>
          {todo.done && (
            <motion.span
              key="check"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className="absolute inset-[-2px] flex items-center justify-center rounded-full bg-emerald-500"
            >
              <Check className="h-3 w-3 text-white" strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <button
        type="button"
        onClick={() => onView(todo)}
        className="min-w-0 flex-1 cursor-pointer text-left"
        title={t.pages.todos.view_tooltip}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              'text-sm font-medium leading-snug',
              todo.done && 'text-muted-foreground line-through decoration-muted-foreground/50',
            )}
          >
            {todo.title}
          </span>
          {/* Le liseré encode déjà la priorité — on ne badge que "Haute"
              (le seul signal réellement actionnable) pour alléger la ligne. */}
          {todo.priority === 'high' && !todo.done && (
            <StatusBadge tone={PRIORITY_TONE.high} dot={false} className="px-2 py-0.5 text-[10px]">
              {PRIORITY_LABEL.high}
            </StatusBadge>
          )}
          {todo.shared && (
            <Badge
              variant="outline"
              className="inline-flex items-center gap-1 border-violet-glow/40 bg-violet-glow/[0.08] text-[10px] text-violet-glow"
              title={t.pages.todos.shared_with_team}
            >
              <Globe className="h-3 w-3" />
              {t.pages.todos.team_badge}
            </Badge>
          )}
          {todo.pinged_user_id &&
            (() => {
              const m = memberById.get(todo.pinged_user_id);
              if (!m) return null;
              const name = `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.email;
              const pingedSelf = todo.pinged_user_id === currentUserId;
              const fromName = pingedSelf
                ? memberById.get(todo.user_id)?.first_name ?? t.pages.todos.a_colleague
                : '';
              return (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                    pingedSelf
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                      : 'border-violet-glow/40 bg-violet-glow/[0.08] text-violet-glow',
                  )}
                  title={
                    pingedSelf
                      ? `${t.pages.todos.pinged_by_label} ${fromName}`
                      : `${t.pages.todos.ping_to_label} → ${name}`
                  }
                >
                  <Users className="h-3 w-3" />
                  {pingedSelf ? `${t.pages.todos.pinged_by_label} ${fromName}` : `→ ${name}`}
                </span>
              );
            })()}
          {owner && ownerColor && (
            <span
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
              title={ownerName}
            >
              <span
                className={cn(
                  'inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold',
                  ownerColor.bg,
                  ownerColor.text,
                )}
              >
                {ownerInitials}
              </span>
              <span className="hidden sm:inline">{ownerName}</span>
            </span>
          )}
          {due && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                due.className,
              )}
            >
              <due.Icon className="h-3 w-3" />
              {due.label}
            </span>
          )}
        </div>
        {todo.description && (
          <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
            {todo.description}
          </p>
        )}
      </button>

      {isMine && (
        <div className="flex shrink-0 items-center gap-0.5 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onToggleShare(todo)}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-lg transition',
              todo.shared
                ? 'bg-violet-glow/15 text-violet-glow hover:bg-violet-glow/25'
                : 'text-muted-foreground hover:bg-violet-glow/10 hover:text-violet-glow',
            )}
            title={todo.shared ? t.pages.todos.back_to_private : t.pages.todos.share_with_team}
            aria-label={todo.shared ? t.pages.todos.back_to_private : t.pages.todos.share_with_team}
          >
            {todo.shared ? <Lock className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => onEdit(todo)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-violet-glow transition hover:bg-violet-glow/10"
            title={t.pages.todos.edit_button}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(todo)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-500/10"
            title={t.pages.todos.delete_button}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </motion.li>
  );
}

/**
 * Dialog "détail" — ouvert au clic sur le titre/description d'une todo.
 * Lecture seule par défaut, avec :
 * - le titre, la description complète, la priorité, l'échéance
 * - le statut partagé (Équipe) + l'auteur si ce n'est pas moi
 * - les dates created_at / completed_at
 * - les actions disponibles selon que je suis propriétaire ou non :
 *   - tout le monde : toggle "Fait / Pas fait"
 *   - propriétaire uniquement : Éditer, Partager/Privatiser, Supprimer
 */
function TodoDetailDialog({
  todo,
  currentUserId,
  owner,
  pingedMember,
  ownerMember,
  onClose,
  onToggleDone,
  onEdit,
  onDelete,
  onToggleShare,
}: {
  todo: Todo | null;
  currentUserId: string | null;
  owner: OwnerProfile | null;
  pingedMember: OrgMember | null;
  ownerMember: OrgMember | null;
  onClose: () => void;
  onToggleDone: (t: Todo) => void;
  onEdit: (t: Todo) => void;
  onDelete: (t: Todo) => void;
  onToggleShare: (t: Todo) => void;
}) {
  const t = useAppT();
  const PRIORITY_LABEL = buildPriorityLabel(t);
  if (!todo) return null;
  const isMine = currentUserId !== null && todo.user_id === currentUserId;
  const ownerColor = owner ? presenceColor(owner.id) : null;
  const ownerInitials = owner
    ? presenceInitials(owner.first_name, owner.last_name, owner.email)
    : '';
  const ownerName = owner
    ? presenceDisplayName(owner.first_name, owner.last_name, owner.email)
    : '';
  const dueLabel = todo.due_date
    ? new Date(todo.due_date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;
  const createdLabel = new Date(todo.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const completedLabel = todo.completed_at
    ? new Date(todo.completed_at).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <Dialog open={!!todo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-3 pr-6">
            <span className={cn('flex-1', todo.done && 'line-through text-muted-foreground')}>
              {todo.title}
            </span>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap pt-1">
            <StatusBadge tone={PRIORITY_TONE[todo.priority]} dot={false}>
              {t.pages.todos.priority_label} {PRIORITY_LABEL[todo.priority].toLowerCase()}
            </StatusBadge>
            {todo.shared && (
              <Badge
                variant="outline"
                className="text-[10px] border-violet-glow/40 bg-violet-glow/[0.08] text-violet-glow inline-flex items-center gap-1"
              >
                <Globe className="h-3 w-3" />
                {t.pages.todos.shared_team_badge}
              </Badge>
            )}
            {pingedMember &&
              (() => {
                const name =
                  `${pingedMember.first_name ?? ''} ${pingedMember.last_name ?? ''}`.trim() ||
                  pingedMember.email;
                const pingedSelf = pingedMember.id === currentUserId;
                const fromName = ownerMember
                  ? `${ownerMember.first_name ?? ''} ${ownerMember.last_name ?? ''}`.trim() ||
                    ownerMember.email
                  : t.pages.todos.a_colleague;
                return (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] inline-flex items-center gap-1',
                      pingedSelf
                        ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                        : 'border-violet-glow/40 bg-violet-glow/[0.08] text-violet-glow',
                    )}
                  >
                    <Users className="h-3 w-3" />
                    {pingedSelf ? `${t.pages.todos.pinged_by_label} ${fromName}` : `${t.pages.todos.ping_to_label} ${name}`}
                  </Badge>
                );
              })()}
            {!isMine && owner && ownerColor && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span
                  className={cn(
                    'inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold',
                    ownerColor.bg,
                    ownerColor.text,
                  )}
                >
                  {ownerInitials}
                </span>
                {t.pages.todos.created_by_label} {ownerName}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {todo.description ? (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                {t.pages.todos.notes_label}
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                {todo.description}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">{t.pages.todos.no_notes}</p>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <DetailRow
              icon={<Calendar className="h-3.5 w-3.5 text-violet-glow" />}
              label={t.pages.todos.due_label}
              value={dueLabel ?? t.pages.todos.no_due}
            />
            <DetailRow
              icon={<Plus className="h-3.5 w-3.5 text-muted-foreground" />}
              label={t.pages.todos.created_label}
              value={createdLabel}
            />
            {completedLabel && (
              <DetailRow
                icon={<CheckSquare className="h-3.5 w-3.5 text-emerald-400" />}
                label={t.pages.todos.completed_label}
                value={completedLabel}
              />
            )}
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onToggleDone(todo)}
            className={todo.done ? '' : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'}
          >
            {todo.done ? (
              <>
                <Square className="h-4 w-4" />
                {t.pages.todos.mark_undone}
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4" />
                {t.pages.todos.mark_done}
              </>
            )}
          </Button>

          {isMine && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onToggleShare(todo)}
                className="border-violet-glow/40 text-violet-glow hover:bg-violet-glow/10"
              >
                {todo.shared ? (
                  <>
                    <Lock className="h-4 w-4" />
                    {t.pages.todos.back_to_private}
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    {t.pages.todos.share_with_team}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onEdit(todo)}
                className="border-violet-glow/40 text-violet-glow hover:bg-violet-glow/10"
              >
                <Pencil className="h-4 w-4" />
                {t.pages.todos.edit_button}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onDelete(todo)}
                className="border-red-500/40 text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                {t.pages.todos.delete_button}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-hairline surface-1 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

/** Styles du sélecteur de priorité segmenté (formulaire). */
const PRIORITY_PICKER: Record<Todo['priority'], { active: string; dot: string }> = {
  high: { active: 'border-rose-500/50 bg-rose-500/10 text-rose-400', dot: 'bg-rose-400' },
  medium: { active: 'border-amber-500/50 bg-amber-500/10 text-amber-400', dot: 'bg-amber-400' },
  low: { active: 'border-slate-500/50 bg-slate-500/10 text-slate-300', dot: 'bg-slate-400' },
};

type FormProps = {
  todo: Todo | null;
  userId: string | null;
  orgIdHint?: string | null;
  orgMembers: OrgMember[];
  onClose: () => void;
  onSaved: (todo: Todo) => void;
};

/**
 * Formulaire création / édition — désormais en Dialog pour garder la page
 * épurée. Priorité en segmented control coloré plutôt qu'un <select>.
 */
function TodoForm({ todo, userId, orgMembers, onClose, onSaved }: FormProps) {
  const t = useAppT();
  const [title, setTitle] = useState(todo?.title ?? '');
  const [description, setDescription] = useState(todo?.description ?? '');
  const [priority, setPriority] = useState<Todo['priority']>(todo?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(todo?.due_date ?? '');
  // "" = pas de ping. On stocke '' au lieu de null pour matcher l'option vide du Combobox.
  const [pingedUserId, setPingedUserId] = useState<string>(todo?.pinged_user_id ?? '');
  const [busy, setBusy] = useState(false);

  const isEdit = !!todo;
  const PRIORITY_LABEL = buildPriorityLabel(t);
  // On peut se pinger soi-même (rappel visuel "à faire perso") mais pas
  // pinger les consultants — leurs comptes ne traitent pas les tâches
  // internes, ils ont leur propre portail.
  const pingCandidates = useMemo(
    () => orgMembers.filter((m) => m.role !== 'consultant'),
    [orgMembers],
  );

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) {
        notifyError(t.pages.todos.err_title_required);
        return;
      }
      if (!userId) {
        notifyError(t.pages.todos.err_session_expired);
        return;
      }
      setBusy(true);
      try {
        const supabase = createClient();
        const payload = {
          title: title.trim(),
          description: description.trim() || null,
          priority,
          due_date: dueDate || null,
          pinged_user_id: pingedUserId || null,
        };
        if (isEdit) {
          const { data, error } = await supabase
            .from('user_todos')
            .update(payload)
            .eq('id', todo!.id)
            .select()
            .single();
          if (error || !data) {
            notifyError(t.pages.todos.err_save_failed_prefix + (error?.message ?? 'unknown'));
            return;
          }
          onSaved(data as Todo);
        } else {
          const { data, error } = await supabase
            .from('user_todos')
            .insert({ ...payload, user_id: userId })
            .select()
            .single();
          if (error || !data) {
            notifyError(t.pages.todos.err_create_failed_prefix + (error?.message ?? 'unknown'));
            return;
          }
          onSaved(data as Todo);
        }
      } finally {
        setBusy(false);
      }
    },
    [title, description, priority, dueDate, pingedUserId, isEdit, todo, userId, onSaved, t],
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-glow/30 bg-violet-glow/15 text-violet-glow">
              {isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </span>
            {isEdit ? t.pages.todos.form_edit_title : t.pages.todos.form_create_title}
          </DialogTitle>
          <DialogDescription>{t.pages.todos.form_dialog_hint}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t.pages.todos.form_title_label}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.pages.todos.form_title_placeholder}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t.pages.todos.form_notes_label}</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.pages.todos.form_notes_placeholder}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t.pages.todos.form_priority_label}</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['high', 'medium', 'low'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      'inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition',
                      priority === p
                        ? PRIORITY_PICKER[p].active
                        : 'border-hairline text-muted-foreground hover-surface hover:text-foreground',
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_PICKER[p].dot)} />
                    {PRIORITY_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t.pages.todos.form_due_label}</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-violet-glow" />
              {t.pages.todos.form_ping_label}{' '}
              <span className="font-normal text-muted-foreground/60">
                {t.pages.todos.form_ping_optional}
              </span>
            </Label>
            <Combobox
              value={pingedUserId}
              onChange={(v) => setPingedUserId(v)}
              options={[
                { value: '', label: t.pages.todos.form_ping_none },
                ...pingCandidates.map((m) => ({
                  value: m.id,
                  label: `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.email,
                })),
              ]}
            />
            <p className="text-[11px] text-muted-foreground">
              {t.pages.todos.form_ping_hint}
            </p>
          </div>

          <DialogFooter className="gap-2 pt-1 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              {t.pages.todos.form_cancel}
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="bg-gradient-to-r from-violet-glow to-magenta-neon hover:opacity-95"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? t.pages.todos.form_save : t.pages.todos.form_add}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
