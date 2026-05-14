'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Briefcase } from 'lucide-react';

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
import { createClient } from '@/lib/supabase/client';
import type { Consultant, Contract } from '@/types';
import { useState } from 'react';

type MissionOption = {
  id: string;
  title: string;
  consultant_id: string;
  daily_rate_eur: number;
  start_date: string;
  end_date: string | null;
  status: string;
  company: { id: string; name: string; address: string | null; city: string | null } | null;
  job_offer: {
    id: string;
    location: string | null;
    remote_days: number | null;
  } | null;
};

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
  const [missions, setMissions] = useState<MissionOption[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string>('');
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
      // Charge les missions actives + proposées (pour pre-fill du contrat),
      // avec le client final et l'AO source pour pré-remplir lieu / remote.
      const supabase = createClient();
      supabase
        .from('missions')
        .select(
          `id, title, consultant_id, daily_rate_eur, start_date, end_date, status,
           company:companies (id, name, address, city),
           job_offer:job_offers (id, location, remote_days)`,
        )
        .in('status', ['proposed', 'active'])
        .order('start_date', { ascending: false })
        .then(({ data }) => {
          setMissions((data as MissionOption[] | null) ?? []);
        });
      setSelectedMissionId(contract?.mission_id ?? '');
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

  // Auto-fill depuis mission sélectionnée : consultant, TJM, dates,
  // mission_id, mission_title, client final + lieu + remote (depuis l'AO),
  // et infos fournisseur (depuis le dernier contrat du même consultant).
  async function applyMission(missionId: string) {
    setSelectedMissionId(missionId);
    if (!missionId) {
      setValue('mission_id', null);
      setValue('mission_title', null);
      return;
    }
    const m = missions.find((x) => x.id === missionId);
    if (!m) return;
    setValue('mission_id', m.id);
    setValue('mission_title', m.title);
    setValue('consultant_id', m.consultant_id);
    setValue('daily_rate_eur', m.daily_rate_eur);
    setValue('start_date', m.start_date);
    if (m.end_date) {
      const months = Math.max(
        1,
        Math.round(
          (new Date(m.end_date).getTime() - new Date(m.start_date).getTime()) /
            (1000 * 60 * 60 * 24 * 30),
        ),
      );
      setValue('duration_months', months);
    }
    if (!watch('title')) setValue('title', `Contrat AT – ${m.title}`);

    // Client final + lieu d'exécution + remote depuis l'AO source / la company.
    if (m.company?.name && !watch('client_name')) setValue('client_name', m.company.name);
    if (m.company?.address && !watch('client_address')) {
      const addr = [m.company.address, m.company.city].filter(Boolean).join(', ');
      setValue('client_address', addr);
    }
    if (m.job_offer?.location && !watch('work_location')) {
      setValue('work_location', m.job_offer.location);
    }
    if (m.job_offer?.remote_days != null) {
      setValue('remote_days_per_week', m.job_offer.remote_days);
    }

    // Dernier contrat pour ce consultant : on copie les infos fournisseur.
    const supabase = createClient();
    const { data: prev } = await supabase
      .from('contracts')
      .select(
        'supplier_company_name, supplier_address, supplier_postal_code, supplier_city, supplier_rcs, supplier_representative, supplier_email, billing_email, payment_terms_days, non_compete_months, jurisdiction_city',
      )
      .eq('consultant_id', m.consultant_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prev) {
      if (prev.supplier_company_name && !watch('supplier_company_name')) {
        setValue('supplier_company_name', prev.supplier_company_name);
      }
      if (prev.supplier_address && !watch('supplier_address')) setValue('supplier_address', prev.supplier_address);
      if (prev.supplier_postal_code && !watch('supplier_postal_code')) setValue('supplier_postal_code', prev.supplier_postal_code);
      if (prev.supplier_city && !watch('supplier_city')) setValue('supplier_city', prev.supplier_city);
      if (prev.supplier_rcs && !watch('supplier_rcs')) setValue('supplier_rcs', prev.supplier_rcs);
      if (prev.supplier_representative && !watch('supplier_representative')) setValue('supplier_representative', prev.supplier_representative);
      if (prev.supplier_email && !watch('supplier_email')) setValue('supplier_email', prev.supplier_email);
      if (prev.billing_email && !watch('billing_email')) setValue('billing_email', prev.billing_email);
      if (prev.payment_terms_days != null) setValue('payment_terms_days', prev.payment_terms_days);
      if (prev.non_compete_months != null) setValue('non_compete_months', prev.non_compete_months);
      if (prev.jurisdiction_city) setValue('jurisdiction_city', prev.jurisdiction_city);
    }
  }

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

          {/* Section 1bis : Mission rattachée (pre-fill auto) */}
          {!isEdit && missions.length > 0 && (
            <section className="rounded-lg border border-violet-brand/20 bg-violet-brand/5 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-glow mb-3 flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5" />
                Lier à une mission existante (optionnel)
              </h3>
              <Select
                value={selectedMissionId}
                onChange={(e) => applyMission(e.target.value)}
              >
                <option value="">— Aucune mission rattachée —</option>
                {missions.map((m) => {
                  const consultant = consultants.find((c) => c.id === m.consultant_id);
                  return (
                    <option key={m.id} value={m.id}>
                      [{m.status}] {m.title}
                      {consultant ? ` — ${consultant.first_name} ${consultant.last_name}` : ''}
                    </option>
                  );
                })}
              </Select>
              <p className="text-[10px] text-muted-foreground mt-2">
                Sélectionner une mission pré-remplit le consultant, le TJM et les dates ci-dessous.
              </p>
            </section>
          )}

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
                <Input type="number" min="0" step="1" {...register('daily_rate_eur')} />
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
