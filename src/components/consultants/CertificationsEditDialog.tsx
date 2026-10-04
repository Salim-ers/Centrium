'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FormDialogContent } from '@/components/ui/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import type { Certification } from '@/types';

/**
 * Édition des certifications d'un consultant. Seules les certifications
 * réellement détenues doivent être saisies : elles alimentent le dossier de
 * compétences tel quel.
 */
export function CertificationsEditDialog({
  open,
  onOpenChange,
  consultantId,
  certifications,
  lang,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  consultantId: string;
  certifications: Certification[];
  lang: 'fr' | 'en';
  onSaved?: () => void;
}) {
  const fr = lang === 'fr';
  const [rows, setRows] = useState<Certification[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setRows(certifications.length ? certifications : [{ name: '', issuer: '', year: null, expires_at: null }]);
  }, [open, certifications]);

  function update(i: number, patch: Partial<Certification>) {
    setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  async function save() {
    const clean = rows
      .map((r) => ({
        name: r.name.trim().slice(0, 120),
        issuer: r.issuer?.trim().slice(0, 80) || null,
        year: r.year && r.year > 1950 && r.year < 2100 ? Number(r.year) : null,
        expires_at: r.expires_at && /^\d{4}-\d{2}-\d{2}$/.test(r.expires_at) ? r.expires_at : null,
      }))
      .filter((r) => r.name);
    setSaving(true);
    const { error } = await createClient().from('consultants').update({ certifications: clean }).eq('id', consultantId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(fr ? 'Certifications enregistrées' : 'Certifications saved');
    onSaved?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{fr ? 'Certifications' : 'Certifications'}</DialogTitle>
          <DialogDescription>
            {fr ? 'Uniquement les certifications obtenues. Elles figurent telles quelles dans le dossier de compétences.' : 'Only certifications actually held. They appear as-is in the skills dossier.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="hidden grid-cols-[1fr_9rem_5rem_9rem_2rem] gap-2 text-xs text-muted-foreground sm:grid">
            <span>{fr ? 'Intitulé' : 'Name'}</span>
            <span>{fr ? 'Organisme' : 'Issuer'}</span>
            <span>{fr ? 'Année' : 'Year'}</span>
            <span>{fr ? 'Expire le' : 'Expires'}</span>
            <span />
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-border p-2 sm:grid-cols-[1fr_9rem_5rem_9rem_2rem] sm:border-0 sm:p-0">
              <Input value={r.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="AWS Solutions Architect" aria-label={fr ? 'Intitulé' : 'Name'} />
              <Input value={r.issuer ?? ''} onChange={(e) => update(i, { issuer: e.target.value })} placeholder="AWS" aria-label={fr ? 'Organisme' : 'Issuer'} />
              <Input type="number" value={r.year ?? ''} onChange={(e) => update(i, { year: e.target.value ? Number(e.target.value) : null })} placeholder="2024" aria-label={fr ? 'Année' : 'Year'} />
              <Input type="date" value={r.expires_at ?? ''} onChange={(e) => update(i, { expires_at: e.target.value || null })} aria-label={fr ? 'Date d’expiration' : 'Expiry date'} />
              <Button type="button" variant="ghost" size="icon" onClick={() => setRows((l) => l.filter((_, j) => j !== i))} aria-label={fr ? 'Retirer' : 'Remove'}>
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => setRows((l) => [...l, { name: '', issuer: '', year: null, expires_at: null }])}>
            <Plus />
            {fr ? 'Ajouter une certification' : 'Add a certification'}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {fr ? 'Annuler' : 'Cancel'}
          </Button>
          <Button onClick={() => void save()} loading={saving}>
            {fr ? 'Enregistrer' : 'Save'}
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}
