'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { invoiceSchema, type InvoiceInput } from '@/lib/validators';
import { invoiceService, companyService } from '@/lib/services';
import type { Company, Invoice } from '@/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSaved?: (inv: Invoice) => void;
};

function suggestInvoiceNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `FAC-${y}-${rand}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function plus30DaysISO() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function InvoiceFormDialog({ open, onOpenChange, organizationId, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_number: suggestInvoiceNumber(),
      issue_date: todayISO(),
      due_date: plus30DaysISO(),
      vat_rate: 20,
    },
  });

  const amountHt = watch('amount_ht');
  const vatRate = watch('vat_rate');
  const ttc =
    amountHt && vatRate
      ? Number(amountHt) * (1 + Number(vatRate) / 100)
      : 0;

  useEffect(() => {
    if (!open) return;
    companyService.list().then((res) => {
      if (res.data) setCompanies(res.data);
    });
  }, [open]);

  async function onSubmit(values: InvoiceInput) {
    setSaving(true);
    try {
      const res = await invoiceService.create(values, organizationId);
      if (res.error) {
        toast.error('Erreur : ' + res.error.message);
        return;
      }
      toast.success('Facture créée');
      onSaved?.(res.data);
      reset({
        invoice_number: suggestInvoiceNumber(),
        issue_date: todayISO(),
        due_date: plus30DaysISO(),
        vat_rate: 20,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle facture</DialogTitle>
          <DialogDescription>
            Crée une facture en brouillon. Tu pourras l&apos;envoyer ensuite depuis la liste.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>N° facture *</Label>
              <Input {...register('invoice_number')} />
              {errors.invoice_number && (
                <p className="text-xs text-red-400 mt-1">{errors.invoice_number.message}</p>
              )}
            </div>
            <div>
              <Label>Client *</Label>
              <Select {...register('company_id')}>
                <option value="">— Choisir un client —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              {errors.company_id && (
                <p className="text-xs text-red-400 mt-1">Client obligatoire</p>
              )}
            </div>
          </div>

          <div>
            <Label>Période</Label>
            <Input {...register('period_label')} placeholder="ex: Avril 2026" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Émission *</Label>
              <Input type="date" {...register('issue_date')} />
            </div>
            <div>
              <Label>Échéance *</Label>
              <Input type="date" {...register('due_date')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Montant HT (€) *</Label>
              <Input type="number" min="0" step="0.01" {...register('amount_ht')} />
              {errors.amount_ht && (
                <p className="text-xs text-red-400 mt-1">Montant obligatoire</p>
              )}
            </div>
            <div>
              <Label>TVA (%)</Label>
              <Input type="number" min="0" max="100" step="0.1" {...register('vat_rate')} />
            </div>
            <div>
              <Label>Total TTC</Label>
              <Input
                readOnly
                value={ttc ? ttc.toFixed(2) + ' €' : '—'}
                className="bg-white/[0.02] cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea {...register('notes')} rows={3} placeholder="Conditions, références de commande…" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
