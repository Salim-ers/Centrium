'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Star } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { consultantService } from '@/lib/services/consultant.service';
import type { ConsultantSkill } from '@/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultantId: string;
  skills: ConsultantSkill[];
  onSaved?: () => void;
};

const CATEGORIES: string[] = [
  'languages',
  'frameworks',
  'automation',
  'testing',
  'databases',
  'cloud',
  'ci_cd',
  'tools',
  'methodologies',
  'data',
  'platforms',
];

export function SkillsEditDialog({
  open,
  onOpenChange,
  consultantId,
  skills,
  onSaved,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState<string>('tools');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!open) return;
    setNewCategory('tools');
    setNewName('');
  }, [open]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setBusy('add');
    const res = await consultantService.createSkill(consultantId, {
      category: newCategory,
      name,
      is_highlighted: false,
    });
    setBusy(null);
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    toast.success('Compétence ajoutée');
    setNewName('');
    onSaved?.();
  }

  async function toggleHighlight(s: ConsultantSkill) {
    setBusy(s.id);
    const res = await consultantService.updateSkill(s.id, { is_highlighted: !s.is_highlighted });
    setBusy(null);
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    onSaved?.();
  }

  async function remove(s: ConsultantSkill) {
    setBusy(s.id);
    const res = await consultantService.deleteSkill(s.id);
    setBusy(null);
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    toast.success('Supprimée');
    onSaved?.();
  }

  const byCat = skills.reduce<Record<string, ConsultantSkill[]>>((acc, s) => {
    acc[s.category] = acc[s.category] ? [...acc[s.category], s] : [s];
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gérer les compétences</DialogTitle>
          <DialogDescription>
            Clique sur l&apos;étoile pour mettre une compétence en avant. Supprime avec la corbeille.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={add} className="flex flex-col sm:flex-row gap-2 py-3 border-b border-white/5">
          <Select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="sm:max-w-[180px]">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Nouvelle compétence (ex: Playwright)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={!newName.trim() || busy === 'add'}>
            {busy === 'add' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Ajouter
          </Button>
        </form>

        <div className="space-y-4 pt-2">
          {Object.keys(byCat).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune compétence</p>
          ) : (
            Object.entries(byCat).map(([cat, items]) => (
              <div key={cat}>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  {cat}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((s) => (
                    <div
                      key={s.id}
                      className={`group relative inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-md border text-xs transition ${
                        s.is_highlighted
                          ? 'bg-violet-500/15 text-violet-200 border-violet-500/40'
                          : 'bg-white/5 border-white/10 text-white/80'
                      } ${busy === s.id ? 'opacity-50' : ''}`}
                    >
                      <span>{s.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleHighlight(s)}
                        disabled={busy === s.id}
                        title={s.is_highlighted ? 'Retirer mise en avant' : 'Mettre en avant'}
                        className="p-0.5 rounded hover:bg-white/10"
                      >
                        <Star
                          className={`h-3 w-3 ${s.is_highlighted ? 'text-amber-300 fill-amber-300' : 'text-white/40'}`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(s)}
                        disabled={busy === s.id}
                        title="Supprimer"
                        className="p-0.5 rounded hover:bg-red-500/20 text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
