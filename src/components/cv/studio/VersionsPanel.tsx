'use client';

import { useEffect, useState } from 'react';
import { Check, FolderOpen, Loader2, Save, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScoreBadge } from '@/components/matching/MatchScore';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { cvService } from '@/lib/services/cv.service';
import { dossierTemplate } from '@/lib/cv/templates';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CVVersion } from '@/types';

type Props = {
  consultantId: string;
  lang: 'fr' | 'en';
  canSave: boolean;
  /** Nom proposé (« Pour “Data engineer senior” — Varenne »). */
  defaultLabel: string;
  activeId: string | null;
  onSave: (label: string) => Promise<CVVersion | null>;
  onOpen: (v: CVVersion) => void;
  onClose: () => void;
};

/**
 * Versions enregistrées d'un dossier : celle envoyée à tel client, pour tel
 * besoin, telle qu'elle a été préparée. Une version rouverte s'affiche à
 * l'identique et peut être réexportée.
 */
export function VersionsPanel({ consultantId, lang, canSave, defaultLabel, activeId, onSave, onOpen, onClose }: Props) {
  const fr = lang === 'fr';
  const [label, setLabel] = useState(defaultLabel);
  const [saving, setSaving] = useState(false);
  useEffect(() => setLabel(defaultLabel), [defaultLabel]);

  const { data, loading, setData } = useCachedQuery<CVVersion[]>(
    `cv-versions:${consultantId}`,
    async () => (await cvService.listByConsultant(consultantId)).data ?? [],
    { enabled: !!consultantId },
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const v = await onSave(label);
    setSaving(false);
    if (v) setData((list) => [v, ...(list ?? [])]);
  }

  return (
    <div className="space-y-5">
      {canSave && (
        <form onSubmit={save} className="space-y-2 rounded-xl border border-border bg-card p-3">
          <label htmlFor="version-label" className="block text-[12.5px] font-semibold">
            {fr ? 'Enregistrer ce dossier' : 'Save this dossier'}
          </label>
          <Input id="version-label" value={label} maxLength={200} onChange={(e) => setLabel(e.target.value)} placeholder={fr ? 'Ex. Pour Nordal — Data engineer' : 'e.g. For Nordal — Data engineer'} />
          <p className="text-[11px] leading-snug text-muted-foreground">{fr ? 'Mise en page, retouches et score compris : la version telle qu’envoyée.' : 'Layout, edits and score included: the version as sent.'}</p>
          <Button type="submit" size="sm" disabled={saving || !label.trim()}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {fr ? 'Enregistrer la version' : 'Save the version'}
          </Button>
        </form>
      )}

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[12.5px] font-semibold">{fr ? 'Versions enregistrées' : 'Saved versions'}</h3>
          {activeId && (
            <button type="button" onClick={onClose} className="inline-flex items-center gap-1 text-[11.5px] font-medium text-app-terra-dark hover:underline">
              <Undo2 className="h-3 w-3" />
              {fr ? 'Revenir au dossier généré' : 'Back to the generated dossier'}
            </button>
          )}
        </div>
        {loading && !data ? (
          <p className="text-[12px] text-muted-foreground">{fr ? 'Chargement…' : 'Loading…'}</p>
        ) : (data ?? []).length === 0 ? (
          <p className="text-[12px] text-muted-foreground">{fr ? 'Aucune version enregistrée pour ce consultant.' : 'No saved version for this consultant.'}</p>
        ) : (
          <ul className="space-y-1.5">
            {(data ?? []).map((v) => {
              const on = v.id === activeId;
              const tpl = dossierTemplate(v.content?.template ?? v.template_id);
              return (
                <li key={v.id} className={cn('flex items-center gap-2 rounded-lg border px-2.5 py-2', on ? 'border-app-terra bg-app-peach-light' : 'border-border bg-card')}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium">{v.version_label ?? (fr ? 'Sans titre' : 'Untitled')}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {formatDate(v.created_at, lang, 'short')} · {tpl.name}
                    </span>
                  </span>
                  {v.matching_score != null && <ScoreBadge score={Number(v.matching_score)} />}
                  <Button size="xs" variant={on ? 'secondary' : 'ghost'} onClick={() => onOpen(v)} disabled={on} aria-label={fr ? `Ouvrir la version ${v.version_label ?? ''}` : `Open version ${v.version_label ?? ''}`}>
                    {on ? <Check /> : <FolderOpen />}
                    {on ? (fr ? 'Ouverte' : 'Open') : fr ? 'Ouvrir' : 'Open'}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
