'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FileStack, Pencil, Plus, Star, Trash2 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/app/EmptyState';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { DOCUMENT_KIND } from '@/lib/status';
import { DOCUMENT_TEMPLATE_KINDS, documentTemplateSchema, type DocumentTemplateInput } from '@/lib/validators/v2';
import type { DocumentTemplate } from '@/types';

const EMPTY: DocumentTemplateInput = { kind: 'quote', name: '', intro_text: '', terms_text: '', footer_text: '', is_default: false };

/**
 * Modèles de documents (introduction, conditions, pied de page). Le modèle
 * « par défaut » d'un type est appliqué automatiquement aux nouveaux devis.
 */
export function TemplatesPanel({ canEdit }: { canEdit: boolean }) {
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { activeOrgId, user } = useOrganization();
  const [editing, setEditing] = useState<{ id: string | null; value: DocumentTemplateInput } | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, loading, reload } = useCachedQuery<DocumentTemplate[]>(
    `document-templates:${activeOrgId ?? 'none'}`,
    async () => {
      const { data, error } = await createClient().from('document_templates').select('*').order('kind').order('name');
      return error ? [] : ((data ?? []) as DocumentTemplate[]);
    },
    { enabled: !!activeOrgId },
  );

  async function save() {
    if (!editing || !activeOrgId) return;
    const parsed = documentTemplateSchema.safeParse(editing.value);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? (fr ? 'Modèle incomplet' : 'Incomplete template'));
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const v = parsed.data;
    // Un seul modèle par défaut par type (index unique) : on retire l'ancien d'abord.
    if (v.is_default) {
      await supabase.from('document_templates').update({ is_default: false }).eq('organization_id', activeOrgId).eq('kind', v.kind).eq('is_default', true);
    }
    const row = { ...v, updated_at: new Date().toISOString() };
    const { error } = editing.id
      ? await supabase.from('document_templates').update(row).eq('id', editing.id)
      : await supabase.from('document_templates').insert({ ...row, organization_id: activeOrgId, created_by: user?.id ?? null });
    setSaving(false);
    if (error) {
      toast.error(fr ? 'Enregistrement impossible' : 'Could not save');
      return;
    }
    toast.success(fr ? 'Modèle enregistré' : 'Template saved');
    setEditing(null);
    void reload();
  }

  async function remove(t: DocumentTemplate) {
    if (!window.confirm(fr ? `Supprimer le modèle « ${t.name} » ? Les devis existants ne sont pas modifiés.` : `Delete template “${t.name}”? Existing quotes are unchanged.`)) return;
    const { error } = await createClient().from('document_templates').delete().eq('id', t.id);
    if (error) {
      toast.error(fr ? 'Suppression impossible' : 'Could not delete');
      return;
    }
    toast.success(fr ? 'Modèle supprimé' : 'Template deleted');
    void reload();
  }

  const set = <K extends keyof DocumentTemplateInput>(k: K, v: DocumentTemplateInput[K]) =>
    setEditing((e) => (e ? { ...e, value: { ...e.value, [k]: v } } : e));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-muted-foreground">
          {fr
            ? 'Textes réutilisables pour vos devis et documents. Le logo, les couleurs et les mentions légales viennent des paramètres de l’organisation.'
            : 'Reusable texts for your quotes and documents. Logo, colours and legal mentions come from organisation settings.'}
        </p>
        {canEdit && (
          <Button variant="secondary" onClick={() => setEditing({ id: null, value: EMPTY })}>
            <Plus />
            {fr ? 'Nouveau modèle' : 'New template'}
          </Button>
        )}
      </div>

      {loading && !data ? (
        <Skeleton className="h-40 w-full" />
      ) : !data?.length ? (
        <EmptyState
          icon={FileStack}
          title={fr ? 'Aucun modèle' : 'No template'}
          description={fr ? 'Créez un modèle de devis pour pré-remplir introduction et conditions.' : 'Create a quote template to prefill intro and terms.'}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex h-full flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{t.name}</div>
                    <div className="text-[12px] text-muted-foreground">{DOCUMENT_KIND[t.kind]?.[lang] ?? t.kind}</div>
                  </div>
                  {t.is_default && (
                    <StatusPill tone="brand">
                      <Star className="h-3 w-3" />
                      {fr ? 'Par défaut' : 'Default'}
                    </StatusPill>
                  )}
                </div>
                <p className="line-clamp-3 flex-1 text-[12.5px] text-muted-foreground">{t.intro_text || t.terms_text || (fr ? 'Sans texte' : 'No text')}</p>
                {canEdit && (
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setEditing({
                          id: t.id,
                          value: { kind: t.kind, name: t.name, intro_text: t.intro_text ?? '', terms_text: t.terms_text ?? '', footer_text: t.footer_text ?? '', is_default: t.is_default },
                        })
                      }
                    >
                      <Pencil />
                      {fr ? 'Modifier' : 'Edit'}
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => void remove(t)} aria-label={fr ? 'Supprimer' : 'Delete'}>
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? (fr ? 'Modifier le modèle' : 'Edit template') : fr ? 'Nouveau modèle' : 'New template'}</DialogTitle>
            <DialogDescription>{fr ? 'Les devis déjà créés ne sont pas modifiés.' : 'Existing quotes are not changed.'}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={fr ? 'Nom' : 'Name'} htmlFor="tpl-name" required>
                  <Input id="tpl-name" value={editing.value.name} onChange={(e) => set('name', e.target.value)} maxLength={120} />
                </Field>
                <Field label={fr ? 'Type' : 'Type'} htmlFor="tpl-kind">
                  <Select id="tpl-kind" value={editing.value.kind} onChange={(e) => set('kind', e.target.value as DocumentTemplateInput['kind'])}>
                    {DOCUMENT_TEMPLATE_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {DOCUMENT_KIND[k]?.[lang] ?? k}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label={fr ? 'Introduction' : 'Introduction'} htmlFor="tpl-intro">
                <Textarea id="tpl-intro" rows={3} value={editing.value.intro_text ?? ''} onChange={(e) => set('intro_text', e.target.value)} showCounter={false} />
              </Field>
              <Field label={fr ? 'Conditions' : 'Terms'} htmlFor="tpl-terms">
                <Textarea id="tpl-terms" rows={5} value={editing.value.terms_text ?? ''} onChange={(e) => set('terms_text', e.target.value)} showCounter={false} />
              </Field>
              <label className="flex items-center gap-2 text-[13px]">
                <Checkbox checked={!!editing.value.is_default} onCheckedChange={(c) => set('is_default', c === true)} />
                {fr ? 'Modèle par défaut pour ce type' : 'Default template for this type'}
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {fr ? 'Annuler' : 'Cancel'}
            </Button>
            <Button onClick={() => void save()} loading={saving}>
              {fr ? 'Enregistrer' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
