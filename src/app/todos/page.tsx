'use client';

import { useCallback, useEffect, useState } from 'react';
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
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { cn } from '@/lib/utils';
import { notifyDestructive, notifyError, notifyUpdated } from '@/lib/notify';

type Todo = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

const PRIORITY_LABEL: Record<Todo['priority'], string> = {
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
};

const PRIORITY_STYLE: Record<Todo['priority'], string> = {
  high: 'border-red-500/40 bg-red-500/10 text-red-300',
  medium: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  low: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
};

const PRIORITY_RANK: Record<Todo['priority'], number> = { high: 0, medium: 1, low: 2 };

/**
 * To do list personnelle de l'utilisateur connecté.
 *
 * Confidentialité : la table user_todos est protégée par une RLS qui
 * limite tout SELECT/INSERT/UPDATE/DELETE à user_id = auth.uid().
 * Aucun autre membre de l'organisation (même admin) ne voit cette liste.
 */
export default function TodosPage() {
  const { user, activeOrgId } = useOrganization();
  const [filter, setFilter] = useState<'pending' | 'done' | 'all'>('pending');
  const [editing, setEditing] = useState<Todo | null>(null);
  const [showForm, setShowForm] = useState(false);

  const {
    data: todosData,
    loading,
    reload,
    setData: setTodos,
  } = useCachedQuery<Todo[]>(
    `user-todos:${user?.id ?? 'none'}`,
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

  const allTodos = todosData ?? [];
  const filtered = allTodos.filter((t) =>
    filter === 'pending' ? !t.done : filter === 'done' ? t.done : true,
  );
  // Tri : non-cochés en haut, par priorité, puis date d'échéance, puis création.
  const todos = filtered.slice().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.priority !== b.priority)
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    if (ad !== bd) return ad - bd;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const counts = {
    pending: allTodos.filter((t) => !t.done).length,
    done: allTodos.filter((t) => t.done).length,
    all: allTodos.length,
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

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <CheckSquare className="h-7 w-7 text-violet-glow" />
            Ma to do list
          </h1>
          <p className="text-muted-foreground mt-1 inline-flex items-center gap-1.5 text-sm">
            <Lock className="h-3.5 w-3.5 text-violet-glow" />
            Liste privée — visible uniquement par toi ({user?.email ?? '…'})
          </p>
        </div>
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
      </div>

      {/* Filtre */}
      <div className="mb-4 flex items-center gap-1 rounded-lg border border-hairline bg-white/[0.02] p-1 w-fit">
        <FilterChip
          active={filter === 'pending'}
          onClick={() => setFilter('pending')}
          label="À faire"
          count={counts.pending}
        />
        <FilterChip
          active={filter === 'done'}
          onClick={() => setFilter('done')}
          label="Terminées"
          count={counts.done}
        />
        <FilterChip
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

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 bg-white/[0.02] animate-pulse rounded-md" />
              ))}
            </div>
          ) : todos.length === 0 ? (
            <div className="py-16 text-center">
              <CheckSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium">
                {filter === 'pending'
                  ? 'Rien à faire — tout est sous contrôle 🎯'
                  : filter === 'done'
                    ? 'Aucune tâche terminée pour le moment'
                    : 'Aucune tâche'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique sur « Nouvelle tâche » pour en ajouter une.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {todos.map((t) => (
                <li
                  key={t.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 transition',
                    t.done && 'opacity-60',
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          'font-medium',
                          t.done && 'line-through text-muted-foreground',
                        )}
                      >
                        {t.title}
                      </span>
                      <Badge variant="outline" className={cn('text-[10px]', PRIORITY_STYLE[t.priority])}>
                        {PRIORITY_LABEL[t.priority]}
                      </Badge>
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
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
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
                    <button
                      type="button"
                      onClick={() => deleteTodo(t)}
                      className="h-7 w-7 rounded-md inline-flex items-center justify-center text-red-400 hover:bg-red-500/10 transition"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition',
        active
          ? 'bg-violet-glow/15 text-violet-glow border border-violet-glow/30'
          : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03] border border-transparent',
      )}
    >
      <span className="font-medium">{label}</span>
      <span
        className={cn(
          'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
          active ? 'bg-violet-glow/25 text-violet-50' : 'bg-white/[0.05] text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  );
}

type FormProps = {
  todo: Todo | null;
  userId: string | null;
  orgIdHint?: string | null;
  onClose: () => void;
  onSaved: (todo: Todo) => void;
};

function TodoForm({ todo, userId, onClose, onSaved }: FormProps) {
  const [title, setTitle] = useState(todo?.title ?? '');
  const [description, setDescription] = useState(todo?.description ?? '');
  const [priority, setPriority] = useState<Todo['priority']>(todo?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(todo?.due_date ?? '');
  const [busy, setBusy] = useState(false);

  const isEdit = !!todo;

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
    [title, description, priority, dueDate, isEdit, todo, userId, onSaved],
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
