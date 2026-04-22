'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue: string | null;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
  onSave: (value: string | null) => Promise<{ error: { message: string } | null }>;
  onSaved?: () => void;
};

/**
 * Dialog générique pour éditer un champ texte long (résumé, mobilité…).
 */
export function TextBlockEditDialog({
  open,
  onOpenChange,
  title,
  initialValue,
  maxLength = 2000,
  rows = 6,
  placeholder,
  onSave,
  onSaved,
}: Props) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValue(initialValue ?? '');
  }, [open, initialValue]);

  async function save() {
    setSaving(true);
    const res = await onSave(value.trim() || null);
    setSaving(false);
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    toast.success(`${title} mis à jour`);
    onSaved?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Textarea
          rows={rows}
          maxLength={maxLength}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="mt-2"
        />
        <p className="text-[11px] text-muted-foreground text-right">
          {value.length} / {maxLength}
        </p>

        <DialogFooter className="pt-3">
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
