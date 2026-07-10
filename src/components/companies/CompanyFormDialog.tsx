'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FormDialogContent } from '@/components/ui/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/Combobox';
import { companyService } from '@/lib/services';
import type { Company } from '@/types';

// =========================================================================
// Création / édition d'une société cliente depuis /companies.
// =========================================================================

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string;
  company?: Company | null;
  onSaved?: () => void;
};

type Form = {
  name: string;
  kind: 'client' | 'esn_partner' | 'prospect';
  industry: string;
  size: string;
  website: string;
  linkedin_url: string;
  address: string;
  city: string;
  country: string;
  notes: string;
};

const EMPTY: Form = {
  name: '', kind: 'client', industry: '', size: '', website: '',
  linkedin_url: '', address: '', city: '', country: 'France', notes: '',
};

export function CompanyFormDialog({ open, onOpenChange, organizationId, company, onSaved }: Props) {
  const isEdit = !!company;
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      company
        ? {
            name: company.name ?? '',
            kind: (company.kind as Form['kind']) ?? 'client',
            industry: company.industry ?? '',
            size: company.size ?? '',
            website: company.website ?? '',
            linkedin_url: company.linkedin_url ?? '',
            address: company.address ?? '',
            city: company.city ?? '',
            country: company.country ?? 'France',
            notes: company.notes ?? '',
          }
        : EMPTY,
    );
  }, [open, company]);

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Le nom de la société est obligatoire.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        kind: form.kind,
        industry: form.industry.trim() || null,
        size: form.size.trim() || null,
        website: form.website.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        notes: form.notes.trim() || null,
      };
      const res = isEdit
        ? await companyService.update(company!.id, payload)
        : await companyService.create({ organization_id: organizationId, ...payload });
      if (res.error) {
        toast.error('Erreur : ' + res.error.message);
        return;
      }
      toast.info(isEdit ? 'Société mise à jour.' : 'Société créée.');
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier la société' : 'Nouvelle société'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Raison sociale *</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="ex : BNP Paribas" />
            </div>
            <div>
              <Label>Type</Label>
              <Combobox
                ariaLabel="Type de société"
                value={form.kind}
                onChange={(v) => set('kind', v)}
                options={[
                  { value: 'client', label: 'Client' },
                  { value: 'esn_partner', label: 'ESN partenaire' },
                  { value: 'prospect', label: 'Prospect' },
                ]}
              />
            </div>
            <div>
              <Label>Secteur</Label>
              <Input value={form.industry} onChange={(e) => set('industry', e.target.value)} placeholder="Banque, Assurance…" />
            </div>
            <div>
              <Label>Ville</Label>
              <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div>
              <Label>Pays</Label>
              <Input value={form.country} onChange={(e) => set('country', e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Adresse</Label>
              <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div>
              <Label>Site web</Label>
              <Input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <Label>LinkedIn</Label>
              <Input value={form.linkedin_url} onChange={(e) => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/company/…" />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </FormDialogContent>
    </Dialog>
  );
}
