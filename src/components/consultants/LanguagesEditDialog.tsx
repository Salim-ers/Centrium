'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/Combobox';
import { consultantService } from '@/lib/services/consultant.service';
import type { Language } from '@/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultantId: string;
  languages: Language[];
  onSaved?: () => void;
};

const LEVELS: Language['level'][] = ['Natif', 'Bilingue', 'Professionnel', 'Intermédiaire', 'Notions'];

export function LanguagesEditDialog({
  open,
  onOpenChange,
  consultantId,
  languages,
  onSaved,
}: Props) {
  const [items, setItems] = useState<Language[]>([]);
  const [saving, setSaving] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newLevel, setNewLevel] = useState<Language['level']>('Professionnel');

  useEffect(() => {
    if (open) setItems([...languages]);
  }, [open, languages]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const code = newCode.trim().toLowerCase();
    if (!/^[a-z]{2}$/.test(code)) {
      toast.error('Code ISO 2 lettres (fr, en, es…)');
      return;
    }
    if (items.some((l) => l.code === code)) {
      toast.error('Langue déjà présente');
      return;
    }
    setItems([...items, { code, level: newLevel }]);
    setNewCode('');
  }

  function remove(code: string) {
    setItems(items.filter((l) => l.code !== code));
  }

  function updateLevel(code: string, level: Language['level']) {
    setItems(items.map((l) => (l.code === code ? { ...l, level } : l)));
  }

  async function save() {
    setSaving(true);
    const res = await consultantService.updateLanguages(consultantId, items);
    setSaving(false);
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    toast.success('Langues mises à jour');
    onSaved?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gérer les langues</DialogTitle>
        </DialogHeader>

        <form onSubmit={add} className="flex gap-2 py-3 border-b border-hairline">
          <Input
            placeholder="fr"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            maxLength={2}
            className="w-16 uppercase text-center"
          />
          <Combobox
            value={newLevel}
            onChange={(v) => setNewLevel(v as Language['level'])}
            className="flex-1"
            options={LEVELS.map((lv) => ({ value: lv, label: lv }))}
          />
          <Button type="submit">
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </form>

        <div className="space-y-2 pt-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune langue</p>
          ) : (
            items.map((l) => (
              <div key={l.code} className="flex items-center gap-2">
                <span className="uppercase w-10 text-xs font-semibold text-muted-foreground">
                  {l.code}
                </span>
                <Combobox
                  value={l.level}
                  onChange={(v) => updateLevel(l.code, v as Language['level'])}
                  className="flex-1"
                  options={LEVELS.map((lv) => ({ value: lv, label: lv }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(l.code)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
