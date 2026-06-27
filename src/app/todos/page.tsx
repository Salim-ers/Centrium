'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  Plus,
  Square,
  Trash2,
  Pencil,
  Calendar,
  Lock,
  Loader2,
  X,
  Users,
  Globe,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { useAppT } from '@/lib/i18n/LocaleProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { cn } from '@/lib/utils';
import { notifyDestructive, notifyError, notifyUpdated, notifyCreated } from '@/lib/notify';
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

const PRIORITY_LABEL: Record<Todo['priority'], string> = {
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
};

const PRIORITY_TONE: Record<Todo['priority'], StatusTone> = {
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
};

const PRIORITY_RANK: Record<Todo['priority'], number> = { high: 0, medium: 1, low: 2 };

/** MIME type pour le drag&drop d'une todo entre les deux tableaux. */
const DRAG_MIME = 'application/x-todo-id';

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

  const allTodos = todosData ?? [];

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
          .filter((t) => t.shared && t.user_id !== user.id)
          .map((t) => t.user_id),
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
  const filterByStatus = (t: Todo) =>
    filter === 'pending' ? !t.done : filter === 'done' ? t.done : true;

  // Une tâche est "perso" si elle n'a AUCUN aspect équipe : créée par moi,
  // pas partagée, et sans ping sur quelqu'un d'autre. Sinon elle est "équipe".
  // → toggle share ou ping sur un collègue déplace la tâche vers l'équipe.
  const mineAll = useMemo(
    () =>
      allTodos.filter((t) => {
        if (!myId) return false;
        if (t.user_id !== myId) return false;
        if (t.shared) return false;
        if (t.pinged_user_id && t.pinged_user_id !== myId) return false;
        return true;
      }),
    [allTodos, myId],
  );
  const teamAll = useMemo(
    () =>
      allTodos.filter((t) => {
        if (!myId) return false;
        if (t.user_id !== myId) return true; // tâche d'un collègue qu'on voit
        if (t.shared) return true;
        if (t.pinged_user_id && t.pinged_user_id !== myId) return true;
        return false;
      }),
    [allTodos, myId],
  );
  const mineTodos = sortTodos(mineAll.filter(filterByStatus));
  const teamTodos = sortTodos(teamAll.filter(filterByStatus));

  const counts = {
    pending: mineAll.filter((t) => !t.done).length + teamAll.filter((t) => !t.done).length,
    done: mineAll.filter((t) => t.done).length + teamAll.filter((t) => t.done).length,
    all: mineAll.length + teamAll.length,
  };

  async function toggleDone(todo: Todo) {
    const supabase = createClient();
    const nextDone = !todo.done;
    // Optimistic update
    setTodos((prev) =>
      (prev ?? []).map((t) =>
        t.id === todo.id
          ? { ...t, done: nextDone, completed_at: nextDone ? new Date().toISOString() : null }
          : t,
      ),
    );
    const { error } = await supabase
      .from('user_todos')
      .update({ done: nextDone })
      .eq('id', todo.id);
    if (error) {
      notifyError('Mise à jour impossible : ' + error.message);
      reload();
    }
  }

  async function deleteTodo(todo: Todo) {
    if (!confirm(`Supprimer "${todo.title}" ?`)) return;
    const prev = todosData;
    setTodos((list) => (list ?? []).filter((t) => t.id !== todo.id));
    const supabase = createClient();
    const { error } = await supabase.from('user_todos').delete().eq('id', todo.id);
    if (error) {
      notifyError('Suppression impossible : ' + error.message);
      setTodos(prev ?? []);
      return;
    }
    notifyDestructive(`"${todo.title}" supprimé`);
  }

  /**
   * Bascule un todo entre privé et partagé avec l'organisation.
   * Seul le propriétaire peut le faire (la RLS le garantit aussi côté DB).
   */
  async function toggleShare(todo: Todo) {
    if (!user?.id || todo.user_id !== user.id) return;
    if (!activeOrgId) {
      notifyError('Organisation introuvable — impossible de partager');
      return;
    }
    const nextShared = !todo.shared;
    const prev = todosData;
    // Optimistic
    setTodos((list) =>
      (list ?? []).map((t) =>
        t.id === todo.id
          ? { ...t, shared: nextShared, organization_id: nextShared ? activeOrgId : t.organization_id }
          : t,
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
      notifyError('Partage impossible : ' + error.message);
      setTodos(prev ?? []);
      return;
    }
    if (nextShared) {
      notifyCreated(`"${todo.title}" partagé avec l'équipe`);
      void broadcastOrgActivity(
        activeOrgId,
        user.id,
        'todo_shared',
        todo.title,
        '/todos',
      );
    } else {
      notifyUpdated(`"${todo.title}" remis en privé`);
    }
  }

  // ============ Drag & Drop entre tableaux ============
  // Seules les tâches que je possède sont draggable — RLS empêcherait
  // d'éditer celles d'un collègue de toute façon, mais on l'enforce
  // côté UI pour éviter un drop visuel trompeur.
  function onDragStartTodo(e: React.DragEvent, t: Todo) {
    if (!user?.id || t.user_id !== user.id) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData(DRAG_MIME, t.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(t.id);
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
    const t = allTodos.find((x) => x.id === id);
    if (!t || !user?.id || t.user_id !== user.id) return;
    const desiredShared = target === 'team';
    if (t.shared === desiredShared) return; // déjà dans le bon tableau
    void toggleShare(t);
  }

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
            Tes tâches privées + les tâches partagées par l&apos;équipe — clique sur l&apos;icône <Users className="inline h-3.5 w-3.5" /> pour partager.
          </span>
        }
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-violet-glow to-magenta-neon hover:opacity-95"
          >
            <Plus className="h-4 w-4" />
            Nouvelle tâche
          </Button>
        }
      />

      {/* Une seule barre maintenant : status (À faire / Terminées / Toutes)
          appliqué aux deux tableaux. Le "scope" est devenu superflu puisque
          la séparation visuelle Perso / Équipe le remplace. */}
      <div className="mb-4 flex items-center gap-1 rounded-lg border border-hairline bg-white/[0.02] p-1 w-fit">
        <FilterChip
          tone="violet"
          active={filter === 'pending'}
          onClick={() => setFilter('pending')}
          label="À faire"
          count={counts.pending}
        />
        <FilterChip
          tone="violet"
          active={filter === 'done'}
          onClick={() => setFilter('done')}
          label="Terminées"
          count={counts.done}
        />
        <FilterChip
          tone="violet"
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          label="Toutes"
          count={counts.all}
        />
      </div>

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
              const idx = list.findIndex((t) => t.id === saved.id);
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
        onToggleDone={(t) => toggleDone(t)}
        onEdit={(t) => {
          setEditing(t);
          setShowForm(true);
          setViewing(null);
        }}
        onDelete={(t) => {
          setViewing(null);
          void deleteTodo(t);
        }}
        onToggleShare={(t) => toggleShare(t)}
      />

      {/* Helper inline pour rendre une ligne de todo, réutilisé par les
          deux tableaux Perso / Équipe pour éviter la duplication. */}
      {(() => {
        const renderRow = (t: Todo) => {
          const isMine = t.user_id === user?.id;
          const owner = isMine ? null : ownerProfiles.get(t.user_id) ?? null;
          const ownerColor = owner ? presenceColor(owner.id) : null;
          const ownerInitials = owner
            ? presenceInitials(owner.first_name, owner.last_name, owner.email)
            : '';
          const ownerName = owner
            ? presenceDisplayName(owner.first_name, owner.last_name, owner.email)
            : '';
          const canDrag = isMine; // seules mes tâches sont déplaçables
          const isDragging = draggingId === t.id;
          return (
            <motion.li
              key={t.id}
              layoutId={`todo-${t.id}`}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.6 }}
              draggable={canDrag}
              onDragStart={(e) => onDragStartTodo(e as unknown as React.DragEvent, t)}
              onDragEnd={onDragEndTodo}
              className={cn(
                'flex items-start gap-3 px-4 py-3 transition-all duration-200 select-none',
                t.done && 'opacity-60',
                t.shared && !isMine && 'bg-violet-glow/[0.03]',
                canDrag && !isDragging && 'cursor-grab',
                // Animation drag façon CRM : rotation + scale + opacity
                isDragging && 'cursor-grabbing rotate-2 scale-95 opacity-50',
              )}
            >
              <button
                type="button"
                onClick={() => toggleDone(t)}
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-violet-glow transition"
                title={t.done ? 'Marquer non fait' : 'Marquer fait'}
              >
                {t.done ? (
                  <CheckSquare className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Square className="h-5 w-5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setViewing(t)}
                className="flex-1 min-w-0 text-left rounded-md -mx-2 px-2 py-1 hover:bg-white/[0.02] transition cursor-pointer"
                title="Voir les détails"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      'font-medium',
                      t.done && 'line-through text-muted-foreground',
                    )}
                  >
                    {t.title}
                  </span>
                  <StatusBadge tone={PRIORITY_TONE[t.priority]} dot={false}>
                    {PRIORITY_LABEL[t.priority]}
                  </StatusBadge>
                  {t.shared && (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-violet-glow/40 bg-violet-glow/[0.08] text-violet-glow inline-flex items-center gap-1"
                      title="Tâche partagée avec l'équipe"
                    >
                      <Globe className="h-3 w-3" />
                      Équipe
                    </Badge>
                  )}
                  {t.pinged_user_id &&
                    (() => {
                      const m = memberById.get(t.pinged_user_id);
                      if (!m) return null;
                      const name = `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.email;
                      const pingedSelf = t.pinged_user_id === user?.id;
                      const fromName = pingedSelf
                        ? memberById.get(t.user_id)?.first_name ?? 'Un collègue'
                        : '';
                      return (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold border',
                            pingedSelf
                              ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                              : 'border-violet-glow/40 bg-violet-glow/[0.08] text-violet-glow',
                          )}
                          title={pingedSelf ? `${fromName} t'a pingué sur cette tâche` : `Ping → ${name}`}
                        >
                          <Users className="h-3 w-3" />
                          {pingedSelf ? `Pingué par ${fromName}` : `→ ${name}`}
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
                  {t.due_date && (
                    <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(t.due_date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  )}
                </div>
                {t.description && (
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed line-clamp-2">
                    {t.description}
                  </p>
                )}
              </button>
              <div className="flex items-center gap-1 shrink-0">
                {isMine && (
                  <button
                    type="button"
                    onClick={() => toggleShare(t)}
                    className={cn(
                      'h-7 w-7 rounded-md inline-flex items-center justify-center transition',
                      t.shared
                        ? 'text-violet-glow bg-violet-glow/15 hover:bg-violet-glow/25'
                        : 'text-muted-foreground hover:text-violet-glow hover:bg-violet-glow/10',
                    )}
                    title={t.shared ? 'Repasser en privé' : 'Partager avec l\'équipe'}
                    aria-label={t.shared ? 'Repasser en privé' : 'Partager avec l\'équipe'}
                  >
                    {t.shared ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Users className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
                {isMine && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(t);
                      setShowForm(true);
                    }}
                    className="h-7 w-7 rounded-md inline-flex items-center justify-center text-violet-glow hover:bg-violet-glow/10 transition"
                    title="Éditer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                {isMine && (
                  <button
                    type="button"
                    onClick={() => deleteTodo(t)}
                    className="h-7 w-7 rounded-md inline-flex items-center justify-center text-red-400 hover:bg-red-500/10 transition"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </motion.li>
          );
        };

        const renderList = (
          list: Todo[],
          emptyText: string,
          dropTarget: 'mine' | 'team',
        ) =>
          loading ? (
            <div className="p-6 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 bg-white/[0.02] animate-pulse rounded-md" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center px-4 transition-all duration-200">
              <div
                className={cn(
                  'mx-3 rounded-lg border border-dashed py-8 px-4 transition-all duration-200',
                  dragOverTarget === dropTarget && draggingId !== null
                    ? 'border-violet-glow/60 bg-violet-glow/[0.06] text-violet-glow'
                    : 'border-hairline text-muted-foreground/60',
                )}
              >
                <p className="text-sm font-medium">
                  {dragOverTarget === dropTarget && draggingId !== null
                    ? `Déposer ici pour ${dropTarget === 'team' ? 'partager avec l’équipe' : 'repasser en privé'}`
                    : emptyText}
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              <AnimatePresence initial={false}>{list.map(renderRow)}</AnimatePresence>
            </ul>
          );

        // Source = la carte d'où vient la tâche draggée. Elle s'atténue
        // pour mettre en avant la cible (façon CRM).
        const sourceTarget: 'mine' | 'team' | null = (() => {
          if (!draggingId) return null;
          const t = allTodos.find((x) => x.id === draggingId);
          if (!t) return null;
          const inMine = mineAll.some((x) => x.id === t.id);
          return inMine ? 'mine' : 'team';
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

        return (
          <LayoutGroup>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card
                onDragOver={(e) => onDragOverTarget(e, 'mine')}
                onDragLeave={(e) => onDragLeaveTarget(e, 'mine')}
                onDrop={(e) => onDropTarget(e, 'mine')}
                className={cardClass('mine')}
              >
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="h-4 w-4 text-violet-glow" />
                    Mes tâches
                    <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                      {mineTodos.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {renderList(
                    mineTodos,
                    filter === 'pending'
                      ? 'Rien à faire — tout est sous contrôle 🎯'
                      : filter === 'done'
                        ? 'Aucune tâche terminée pour le moment'
                        : 'Aucune tâche perso. Clique sur « Nouvelle tâche ».',
                    'mine',
                  )}
                </CardContent>
              </Card>

              <Card
                onDragOver={(e) => onDragOverTarget(e, 'team')}
                onDragLeave={(e) => onDragLeaveTarget(e, 'team')}
                onDrop={(e) => onDropTarget(e, 'team')}
                className={cardClass('team')}
              >
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-violet-glow" />
                    Tâches équipe
                    <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                      {teamTodos.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {renderList(
                    teamTodos,
                    filter === 'pending'
                      ? 'Aucune tâche d’équipe en cours'
                      : filter === 'done'
                        ? 'Aucune tâche d’équipe terminée'
                        : 'Glisse une de tes tâches ici pour la partager avec l’équipe.',
                    'team',
                  )}
                </CardContent>
              </Card>
            </div>
          </LayoutGroup>
        );
      })()}
    </AppShell>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  tone = 'violet',
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  /** Palette du chip quand actif. Rouge = scope (gauche), violet = status (droite). */
  tone?: 'red' | 'violet';
}) {
  const activeChip =
    tone === 'red'
      ? 'bg-red-500/15 text-red-300 border border-red-500/30'
      : 'bg-violet-glow/15 text-violet-glow border border-violet-glow/30';
  const activeCount =
    tone === 'red'
      ? 'bg-red-500/25 text-red-50'
      : 'bg-violet-glow/25 text-violet-50';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition',
        active
          ? activeChip
          : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03] border border-transparent',
      )}
    >
      <span className="font-medium">{label}</span>
      <span
        className={cn(
          'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
          active ? activeCount : 'bg-white/[0.05] text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
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
              Priorité {PRIORITY_LABEL[todo.priority].toLowerCase()}
            </StatusBadge>
            {todo.shared && (
              <Badge
                variant="outline"
                className="text-[10px] border-violet-glow/40 bg-violet-glow/[0.08] text-violet-glow inline-flex items-center gap-1"
              >
                <Globe className="h-3 w-3" />
                Partagé avec l&apos;équipe
              </Badge>
            )}
            {pingedMember &&
              (() => {
                const name =
                  `${pingedMember.first_name ?? ''} ${pingedMember.last_name ?? ''}`.trim() ||
                  pingedMember.email;
                const pingedSelf = pingedMember.id === currentUserId;
                const ownerName = ownerMember
                  ? `${ownerMember.first_name ?? ''} ${ownerMember.last_name ?? ''}`.trim() ||
                    ownerMember.email
                  : 'un collègue';
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
                    {pingedSelf ? `Pingué par ${ownerName}` : `Pinge ${name}`}
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
                Créée par {ownerName}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {todo.description ? (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Notes
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                {todo.description}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Aucune note.</p>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <DetailRow
              icon={<Calendar className="h-3.5 w-3.5 text-violet-glow" />}
              label="Échéance"
              value={dueLabel ?? 'Aucune'}
            />
            <DetailRow
              icon={<Plus className="h-3.5 w-3.5 text-muted-foreground" />}
              label="Créée le"
              value={createdLabel}
            />
            {completedLabel && (
              <DetailRow
                icon={<CheckSquare className="h-3.5 w-3.5 text-emerald-400" />}
                label="Terminée le"
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
                Remettre à faire
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4" />
                Marquer fait
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
                    Repasser en privé
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    Partager avec l&apos;équipe
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
                Éditer
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onDelete(todo)}
                className="border-red-500/40 text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
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
    <div className="rounded-md border border-hairline bg-white/[0.02] px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}

type FormProps = {
  todo: Todo | null;
  userId: string | null;
  orgIdHint?: string | null;
  orgMembers: OrgMember[];
  onClose: () => void;
  onSaved: (todo: Todo) => void;
};

function TodoForm({ todo, userId, orgMembers, onClose, onSaved }: FormProps) {
  const [title, setTitle] = useState(todo?.title ?? '');
  const [description, setDescription] = useState(todo?.description ?? '');
  const [priority, setPriority] = useState<Todo['priority']>(todo?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(todo?.due_date ?? '');
  // "" = pas de ping. On stocke '' au lieu de null pour matcher le <Select>.
  const [pingedUserId, setPingedUserId] = useState<string>(todo?.pinged_user_id ?? '');
  const [busy, setBusy] = useState(false);

  const isEdit = !!todo;
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
        notifyError('Le titre est requis');
        return;
      }
      if (!userId) {
        notifyError('Session expirée — reconnecte-toi');
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
            notifyError('Mise à jour impossible : ' + (error?.message ?? 'inconnu'));
            return;
          }
          notifyUpdated(`"${data.title}" mis à jour`);
          onSaved(data as Todo);
        } else {
          const { data, error } = await supabase
            .from('user_todos')
            .insert({ ...payload, user_id: userId })
            .select()
            .single();
          if (error || !data) {
            notifyError('Création impossible : ' + (error?.message ?? 'inconnu'));
            return;
          }
          notifyUpdated(`"${data.title}" ajouté`);
          onSaved(data as Todo);
        }
      } finally {
        setBusy(false);
      }
    },
    [title, description, priority, dueDate, pingedUserId, isEdit, todo, userId, onSaved],
  );

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold inline-flex items-center gap-2">
              {isEdit ? <Pencil className="h-4 w-4 text-violet-glow" /> : <Plus className="h-4 w-4 text-violet-glow" />}
              {isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              title="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <Label>Titre *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Relancer Banque Postale pour la mission Tech Lead"
              autoFocus
            />
          </div>

          <div>
            <Label>Notes (optionnel)</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails, contexte, prochaines étapes…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priorité</Label>
              <Select value={priority} onChange={(e) => setPriority(e.target.value as Todo['priority'])}>
                <option value="high">Haute</option>
                <option value="medium">Moyenne</option>
                <option value="low">Basse</option>
              </Select>
            </div>
            <div>
              <Label>Échéance</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-violet-glow" />
              Ping une personne <span className="text-muted-foreground/60 font-normal">(optionnel)</span>
            </Label>
            <Select value={pingedUserId} onChange={(e) => setPingedUserId(e.target.value)}>
              <option value="">— Personne —</option>
              {pingCandidates.map((m) => {
                const name = `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.email;
                return (
                  <option key={m.id} value={m.id}>
                    {name}
                  </option>
                );
              })}
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              La personne pinguée verra la tâche et pourra la cocher. Elle ne peut ni l&apos;éditer ni la supprimer.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="bg-gradient-to-r from-violet-glow to-magenta-neon hover:opacity-95"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
