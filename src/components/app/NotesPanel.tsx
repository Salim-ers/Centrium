'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { SkeletonRows } from '@/components/ui/skeleton';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useTeamMembers } from '@/hooks/useOrgDirectory';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { crmService, type Note } from '@/lib/services/crm.service';
import { formatDate } from '@/lib/format';

/** Notes internes d'une entité (jamais visibles des portails). */
export function NotesPanel({ entityType, entityId, canEdit }: { entityType: string; entityId: string; canEdit: boolean }) {
  const { activeOrgId, user } = useOrganization();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { byId: members } = useTeamMembers();
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const { data, loading, setData } = useCachedQuery<Note[]>(
    `notes:${entityType}:${entityId}`,
    async () => (await crmService.notes(entityType, entityId)).data ?? [],
    { enabled: !!entityId },
  );

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrgId || !draft.trim()) return;
    setSaving(true);
    const res = await crmService.addNote(activeOrgId, entityType, entityId, draft);
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    setData((list) => [res.data, ...(list ?? [])]);
    setDraft('');
  }

  async function remove(id: string) {
    const res = await crmService.deleteNote(id);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    setData((list) => (list ?? []).filter((n) => n.id !== id));
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <form onSubmit={add} className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={5000}
            showCounter={false}
            placeholder={fr ? 'Ajouter une note interne…' : 'Add an internal note…'}
            aria-label={fr ? 'Nouvelle note' : 'New note'}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {fr ? 'Visible uniquement par votre équipe.' : 'Only visible to your team.'}
            </p>
            <Button type="submit" size="sm" loading={saving} disabled={!draft.trim()}>
              {fr ? 'Enregistrer' : 'Save'}
            </Button>
          </div>
        </form>
      )}
      {loading && !data ? (
        <SkeletonRows rows={2} />
      ) : (data ?? []).length === 0 ? (
        <p className="text-[13px] text-muted-foreground">{fr ? 'Aucune note pour le moment.' : 'No notes yet.'}</p>
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((n) => {
            const author = n.author_id ? members.get(n.author_id) : null;
            return (
              <li key={n.id} className="group rounded-lg border border-border bg-card p-3">
                <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Avatar name={author?.name ?? '?'} size="xs" />
                  <span className="font-medium text-foreground">{author?.name ?? (fr ? 'Membre' : 'Member')}</span>
                  <span>· {formatDate(n.created_at, lang)}</span>
                  {canEdit && n.author_id === user?.id && (
                    <button
                      type="button"
                      onClick={() => void remove(n.id)}
                      className="ml-auto rounded p-1 opacity-0 transition hover:bg-muted hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                      aria-label={fr ? 'Supprimer la note' : 'Delete note'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground">{n.body}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
