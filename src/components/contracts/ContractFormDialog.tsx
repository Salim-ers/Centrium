'use client';

import { useEffect } from 'react';
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
import { contractSchema, type ContractInput } from '@/lib/validators/contract';
import { contractService } from '@/lib/services/contract.service';
import { consultantService } from '@/lib/services/consultant.service';
import type { Consultant, Contract } from '@/types';
import { useState } from 'react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  contract?: Contract;
  onSaved?: (c: Contract) => void;
};

export function ContractFormDialog({
  open,
  onOpenChange,
  organizationId,
  contract,
  onSaved,
}: Props) {
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [saving, setSaving] = useState(false);
  const isEdit = !!contract;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContractInput>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      kind: 'assistance_technique',
      duration_months: 3,
      remote_days_per_week: 0,
      payment_terms_days: 30,
      non_compete_months: 12,
      jurisdiction_city: 'Paris',
      daily_rate_eur: 500,
      contract_number: '',
      title: '',
      supplier_company_name: '',
      start_date: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (open) {
      consultantService.list().then((res) => {
        if (res.data) setConsultants(res.data);
      });
      if (contract) {
        reset({
          contract_number: contract.contract_number,
          kind: contract.kind,
          title: contract.title,
          consultant_id: contract.consultant_id,
          supplier_company_name: contract.supplier_company_name ?? '',
          supplier_address: contract.supplier_address,
          supplier_postal_code: contract.supplier_postal_code,
          supplier_city: contract.supplier_city,
          supplier_rcs: contract.supplier_rcs,
          supplier_representative: contract.supplier_representative,
          supplier_email: contract.supplier_email,
          mission_id: contract.mission_id,
          mission_title: contract.mission_title,
          client_name: contract.client_name,
          client_address: contract.client_address,
          work_location: contract.work_location,
          remote_days_per_week: contract.remote_days_per_week,
          start_date: contract.start_date,
          duration_months: contract.duration_months,
          daily_rate_eur: contract.daily_rate_eur,
          payment_terms_days: contract.payment_terms_days,
          billing_email: contract.billing_email,
          non_compete_months: contract.non_compete_months,
          jurisdiction_city: contract.jurisdiction_city,
          notes: contract.notes,
        });
      }
    }
  }, [open, contract, reset]);

  // Auto-remplissage depuis consultant sélectionné
  const consultantId = watch('consultant_id');
  useEffect(() => {
    if (!consultantId) return;
    const c = consultants.find((x) => x.id === consultantId);
    if (c) {
      if (c.daily_rate_eur) setValue('daily_rate_eur', c.daily_rate_eur);
      if (c.job_title && !watch('title')) {
        setValue('title', `Contrat AT – ${c.first_name} ${c.last_name} – ${c.job_title}`);
      }
    }
  }, [consultantId, consultants, setValue, watch]);

  async function onSubmit(values: ContractInput) {
    setSaving(true);
    try {
      const res = isEdit
        ? await contractService.update(contract!.id, values)
        : await contractService.create(values, organizationId);

      if (res.error) {
        toast.error(`Erreur : ${res.error.message}`);
        return;
      }
      toast.success(isEdit ? 'Contrat mis à jour' : 'Contrat créé');
      onSaved?.(res.data);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifier le contrat' : 'Nouveau contrat d\'assistance technique'}
          </DialogTitle>
          <DialogDescription>
            Génère un contrat QuadCore prêt à envoyer au fournisseur
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* Section 1 : Identification */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-glow mb-3">
              Identification du contrat
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Numéro (laissez vide pour auto)</Label>
                <Input {...register('contract_number')} placeholder="CT-2026-0001" />
              </div>
              <div>
                <Label>Type</Label>
                <Select {...register('kind')}>
                  <option value="assistance_technique">Assistance technique</option>
                  <option value="sous_traitance">Sous-traitance</option>
                  <option value="apport_affaire">Apport d'affaire</option>
                  <option value="freelance_mission">Ordre de mission freelance</option>
                  <option value="nda">NDA</option>
                  <option value="amendment">Avenant</option>
                </Select>
              </div>
            </div>
            <div className="mt-3">
              <Label>Titre du contrat *</Label>
              <Input {...register('title')} placeholder="Contrat AT – Alex S. – QA Automation" />
              {errors.title && (
                <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>
              )}
            </div>
          </section>

          {/* Section 2 : Consultant */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-glow mb-3">
              Consultant concerné
            </h3>
            <Label>Consultant</Label>
            <Select {...register('consultant_id')}>
              <option value="">— Aucun —</option>
              {consultants.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} — {c.job_title}
                </option>
              ))}
            </Select>
          </section>

          {/* Section 3 : Fournisseur */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-glow mb-3">
              Fournisseur (société du consultant)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Raison sociale *</Label>
                <Input {...register('supplier_company_name')} />
                {errors.supplier_company_name && (
                  <p className="text-xs text-red-400 mt-1">
                    {errors.supplier_company_name.message}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <Label>Adresse du siège</Label>
                <Input {...register('supplier_address')} />
              </div>
              <div>
                <Label>Code postal</Label>
                <Input {...register('supplier_postal_code')} />
              </div>
              <div>
                <Label>Ville</Label>
                <Input {...register('supplier_city')} />
              </div>
              <div>
                <Label>N° RCS</Label>
                <Input {...register('supplier_rcs')} placeholder="XXX XXX XXX R.C.S. Ville" />
              </div>
              <div>
                <Label>Représentant légal</Label>
                <Input {...register('supplier_representative')} placeholder="Prénom Nom" />
              </div>
              <div className="col-span-2">
                <Label>Email fournisseur</Label>
                <Input type="email" {...register('supplier_email')} />
              </div>
            </div>
          </section>

          {/* Section 4 : Mission & Client */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-glow mb-3">
              Mission &amp; Client final
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Intitulé de la mission</Label>
                <Input {...register('mission_title')} placeholder="ex: QA Automation – Projet e-commerce" />
              </div>
              <div>
                <Label>Client final</Label>
                <Input {...register('client_name')} placeholder="ex: BNP Paribas" />
              </div>
              <div>
                <Label>Jours remote / semaine</Label>
                <Input type="number" min="0" max="5" {...register('remote_days_per_week')} />
              </div>
              <div className="col-span-2">
                <Label>Lieu d'exécution</Label>
                <Input {...register('work_location')} placeholder="Adresse complète des locaux" />
              </div>
            </div>
          </section>

          {/* Section 5 : Période */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-glow mb-3">
              Période
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date de début *</Label>
                <Input type="date" {...register('start_date')} />
                {errors.start_date && (
                  <p className="text-xs text-red-400 mt-1">{errors.start_date.message}</p>
                )}
              </div>
              <div>
                <Label>Durée (mois)</Label>
                <Input type="number" min="1" max="60" {...register('duration_months')} />
              </div>
            </div>
          </section>

          {/* Section 6 : Conditions financières */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-glow mb-3">
              Conditions financières
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>TJM HT (€)</Label>
                <Input type="number" min="0" step="10" {...register('daily_rate_eur')} />
              </div>
              <div>
                <Label>Délai de paiement (jours)</Label>
                <Input type="number" min="0" max="120" {...register('payment_terms_days')} />
              </div>
              <div className="col-span-2">
                <Label>Email de facturation</Label>
                <Input type="email" {...register('billing_email')} placeholder="facturation@quadcore.fr" />
              </div>
            </div>
          </section>

          {/* Section 7 : Clauses */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-glow mb-3">
              Clauses particulières
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Non-concurrence (mois)</Label>
                <Input type="number" min="0" max="36" {...register('non_compete_months')} />
              </div>
              <div>
                <Label>Tribunal compétent</Label>
                <Input {...register('jurisdiction_city')} />
              </div>
            </div>
          </section>

          <div>
            <Label>Notes internes</Label>
            <Textarea {...register('notes')} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Mettre à jour' : 'Créer le contrat'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
