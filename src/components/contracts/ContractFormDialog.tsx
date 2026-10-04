'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Briefcase, Building2, Check, Loader2, UserRound } from 'lucide-react';

import {
  Dialog,
  DialogContent,
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
import { contractSchema, type ContractInput } from '@/lib/validators/contract';
import { contractService } from '@/lib/services/contract.service';
import { consultantService } from '@/lib/services/consultant.service';
import { companyService } from '@/lib/services';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import type { Company, Consultant, Contract, DocumentParty } from '@/types';

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

type SupplierOption = {
  /** Identifiant unique calculé localement (hash de raison sociale + RCS). */
  key: string;
  company_name: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  rcs: string | null;
  representative: string | null;
  email: string | null;
  /** Nombre de contrats déjà signés avec ce fournisseur (pour trier par fréquence). */
  usageCount: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  contract?: Contract;
  /** Contrepartie présélectionnée (suit l'onglet actif de la page Contrats). */
  defaultParty?: DocumentParty;
  onSaved?: (c: Contract) => void;
};

// Types de contrat proposés selon la contrepartie.
const KIND_OPTIONS: Record<DocumentParty, { value: ContractInput['kind']; fr: string; en: string }[]> = {
  client: [
    { value: 'prestation_client', fr: 'Prestation de services', en: 'Service agreement' },
    { value: 'assistance_technique', fr: 'Assistance technique', en: 'Technical assistance' },
    { value: 'apport_affaire', fr: "Apport d'affaire", en: 'Business introducer' },
    { value: 'nda', fr: 'NDA', en: 'NDA' },
    { value: 'amendment', fr: 'Avenant', en: 'Amendment' },
  ],
  consultant: [
    { value: 'assistance_technique', fr: 'Assistance technique', en: 'Technical assistance' },
    { value: 'sous_traitance', fr: 'Sous-traitance', en: 'Subcontracting' },
    { value: 'freelance_mission', fr: 'Ordre de mission freelance', en: 'Freelance mission order' },
    { value: 'apport_affaire', fr: "Apport d'affaire", en: 'Business introducer' },
    { value: 'nda', fr: 'NDA', en: 'NDA' },
    { value: 'amendment', fr: 'Avenant', en: 'Amendment' },
  ],
};

export function ContractFormDialog({
  open,
  onOpenChange,
  organizationId,
  contract,
  defaultParty = 'consultant',
  onSaved,
}: Props) {
  const t = useAppT();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const isEdit = !!contract;

  // Listes de référence via cache SWR : hydratation instantanée depuis
  // sessionStorage à la réouverture du dialog → plus de dropdowns
  // « aucun consultant / aucune mission » le temps du fetch. Keyé sur l'org.
  const { data: consultantsData } = useCachedQuery<Consultant[]>(
    `contract-consultants:${organizationId}`,
    async () => {
      const res = await consultantService.list();
      if (res.error) throw res.error;
      return res.data ?? [];
    },
    { enabled: open && !!organizationId },
  );
  const consultants = consultantsData ?? [];

  const { data: companiesData } = useCachedQuery<Company[]>(
    `contract-companies:${organizationId}`,
    async () => {
      const res = await companyService.list();
      if (res.error) throw res.error;
      return res.data ?? [];
    },
    { enabled: open && !!organizationId },
  );
  const companies = companiesData ?? [];

  const { data: missionsData } = useCachedQuery<MissionOption[]>(
    `contract-missions:${organizationId}`,
    async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('missions')
        .select(
          `id, title, consultant_id, daily_rate_eur, start_date, end_date, status,
           company:companies (id, name, address, city),
           job_offer:job_offers (id, location, remote_days)`,
        )
        .in('status', ['proposed', 'active'])
        .order('start_date', { ascending: false });
      return (data as MissionOption[] | null) ?? [];
    },
    { enabled: open && !!organizationId },
  );
  const missions = missionsData ?? [];

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
      party: defaultParty,
      kind: defaultParty === 'client' ? 'prestation_client' : 'assistance_technique',
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

  const party = watch('party') ?? 'consultant';
  const isClientContract = party === 'client';

  function switchParty(next: DocumentParty) {
    if (next === party || isEdit) return;
    setValue('party', next, { shouldValidate: true });
    // Le type de contrat suit la contrepartie si celui en place n'existe
    // pas dans la nouvelle liste.
    const currentKind = watch('kind');
    if (!KIND_OPTIONS[next].some((k) => k.value === currentKind)) {
      setValue('kind', next === 'client' ? 'prestation_client' : 'assistance_technique');
    }
  }

  useEffect(() => {
    if (open) {
      // Charge tous les fournisseurs déjà saisis sur les contrats précédents,
      // dédupliqués par raison sociale (+ RCS si dispo) pour permettre la
      // sélection rapide depuis un dropdown.
      const supabase = createClient();
      supabase
        .from('contracts')
        .select(
          `supplier_company_name, supplier_address, supplier_postal_code,
           supplier_city, supplier_rcs, supplier_representative, supplier_email`,
        )
        .not('supplier_company_name', 'is', null)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          const byKey = new Map<string, SupplierOption>();
          for (const row of data ?? []) {
            const name = (row.supplier_company_name as string | null)?.trim();
            if (!name) continue;
            const rcs = (row.supplier_rcs as string | null)?.trim() ?? '';
            const key = `${name.toLowerCase()}|${rcs.toLowerCase()}`;
            const existing = byKey.get(key);
            if (existing) {
              existing.usageCount += 1;
            } else {
              byKey.set(key, {
                key,
                company_name: name,
                address: (row.supplier_address as string | null) ?? null,
                postal_code: (row.supplier_postal_code as string | null) ?? null,
                city: (row.supplier_city as string | null) ?? null,
                rcs: (row.supplier_rcs as string | null) ?? null,
                representative: (row.supplier_representative as string | null) ?? null,
                email: (row.supplier_email as string | null) ?? null,
                usageCount: 1,
              });
            }
          }
          // Tri par fréquence d'utilisation décroissante, puis nom.
          setSuppliers(
            [...byKey.values()].sort((a, b) => {
              if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
              return a.company_name.localeCompare(b.company_name, 'fr');
            }),
          );
        });
      setSelectedMissionId(contract?.mission_id ?? '');
      if (contract) {
        reset({
          contract_number: contract.contract_number,
          party: contract.party ?? 'consultant',
          kind: contract.kind,
          title: contract.title,
          company_id: contract.company_id,
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
      } else {
        setValue('party', defaultParty);
        setValue('kind', defaultParty === 'client' ? 'prestation_client' : 'assistance_technique');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contract, reset]);

  // Auto-remplissage depuis consultant sélectionné
  const consultantId = watch('consultant_id');
  useEffect(() => {
    if (!consultantId || isClientContract) return;
    const c = consultants.find((x) => x.id === consultantId);
    if (c) {
      if (c.daily_rate_eur) setValue('daily_rate_eur', c.daily_rate_eur);
      if (c.job_title && !watch('title')) {
        setValue('title', `Contrat AT – ${c.first_name} ${c.last_name} – ${c.job_title}`);
      }
    }
  }, [consultantId, consultants, setValue, watch, isClientContract]);

  // Contrat client : la sélection de l'entreprise remplit le snapshot
  // client_name / client_address imprimé sur le document.
  const companyId = watch('company_id');
  useEffect(() => {
    if (!isClientContract || !companyId) return;
    const co = companies.find((x) => x.id === companyId);
    if (!co) return;
    setValue('client_name', co.name, { shouldValidate: true });
    const addr = [co.address, co.city].filter(Boolean).join(', ');
    if (addr && !watch('client_address')) setValue('client_address', addr);
    if (!watch('title')) setValue('title', `Contrat de prestation – ${co.name}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, isClientContract, companies]);

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
    if (!watch('title')) {
      setValue(
        'title',
        isClientContract ? `Contrat de prestation – ${m.title}` : `Contrat AT – ${m.title}`,
      );
    }

    // Client final + lieu d'exécution + remote depuis l'AO source / la company.
    if (m.company?.id && isClientContract && !watch('company_id')) {
      setValue('company_id', m.company.id);
    }
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

    // Contrat consultant : on copie les infos fournisseur du dernier contrat
    // du même consultant. Inutile côté client.
    if (isClientContract) return;
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
        toast.error(`${isEn ? 'Error' : 'Erreur'} : ${res.error.message}`);
        return;
      }
      toast.success(isEdit ? t.forms.contract.updated : t.forms.contract.created);
      onSaved?.(res.data);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const PARTY_CARDS: {
    value: DocumentParty;
    icon: typeof Building2;
    title: string;
    subtitle: string;
  }[] = [
    {
      value: 'client',
      icon: Building2,
      title: isEn ? 'Client contract' : 'Contrat client',
      subtitle: isEn
        ? 'Service agreement with a client company.'
        : 'Prestation de services avec une entreprise.',
    },
    {
      value: 'consultant',
      icon: UserRound,
      title: isEn ? 'Consultant contract' : 'Contrat consultant',
      subtitle: isEn
        ? 'Subcontracting with a freelance — e-signed in their portal.'
        : 'Sous-traitance freelance — signé en ligne dans son espace.',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t.forms.contract.title_edit : t.forms.contract.title_create}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* ===== Contrepartie : client (prestation) vs consultant (sous-traitance) ===== */}
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              {PARTY_CARDS.map((card) => {
                const active = party === card.value;
                const Icon = card.icon;
                return (
                  <button
                    key={card.value}
                    type="button"
                    onClick={() => switchParty(card.value)}
                    aria-pressed={active}
                    className={`relative rounded-xl border p-3.5 text-left transition-all ${
                      active
                        ? 'border-primary/60 bg-primary/[0.07] ring-1 ring-primary/40'
                        : 'border-hairline hover:border-foreground/20 hover:bg-foreground/[0.03]'
                    }`}
                  >
                    {active && (
                      <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                    <Icon
                      className={`h-4 w-4 mb-2 ${active ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                    <div className="text-sm font-semibold leading-tight">{card.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {card.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Section 1 : Identification */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              {isEn ? 'Contract identification' : 'Identification du contrat'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>
                  {isEn ? 'Number (leave empty for auto)' : 'Numéro (laissez vide pour auto)'}
                </Label>
                <Input {...register('contract_number')} placeholder="CT-2026-0001" />
              </div>
              <div>
                <Label>{t.forms.contract.kind}</Label>
                <Combobox
                  ariaLabel={t.forms.contract.kind}
                  value={watch('kind') ?? KIND_OPTIONS[party][0]?.value ?? ''}
                  onChange={(v) =>
                    setValue('kind', v as ContractInput['kind'], {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  options={KIND_OPTIONS[party].map((k) => ({
                    value: k.value,
                    label: isEn ? k.en : k.fr,
                  }))}
                />
              </div>
            </div>
            <div className="mt-3">
              <Label>{isEn ? 'Contract title *' : 'Titre du contrat *'}</Label>
              <Input
                {...register('title')}
                placeholder={
                  isClientContract
                    ? isEn
                      ? 'Service agreement – BNP Paribas – QA Automation'
                      : 'Contrat de prestation – BNP Paribas – QA Automation'
                    : isEn
                      ? 'Subcontracting agreement – Alex S. – QA Automation'
                      : 'Contrat AT – Alex S. – QA Automation'
                }
              />
              {errors.title && (
                <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
              )}
            </div>
          </section>

          {/* Section 1bis : Mission rattachée (pre-fill auto) */}
          {!isEdit && missions.length > 0 && (
            <section className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5" />
                {isEn
                  ? 'Link to existing mission (optional)'
                  : 'Lier à une mission existante (optionnel)'}
              </h3>
              <Combobox
                ariaLabel={isEn ? 'Link to existing mission' : 'Lier à une mission existante'}
                value={selectedMissionId}
                onChange={(v) => applyMission(v)}
                options={[
                  {
                    value: '',
                    label: isEn ? '— No mission linked —' : '— Aucune mission rattachée —',
                  },
                  ...missions.map((m) => {
                    const consultant = consultants.find((c) => c.id === m.consultant_id);
                    return {
                      value: m.id,
                      label: `[${m.status}] ${m.title}`,
                      sublabel: consultant
                        ? `${consultant.first_name} ${consultant.last_name}`
                        : undefined,
                    };
                  }),
                ]}
              />
              <p className="text-[10px] text-muted-foreground mt-2">
                {isEn
                  ? 'Selecting a mission pre-fills consultant, day rate and dates below.'
                  : 'Sélectionner une mission pré-remplit le consultant, le TJM et les dates ci-dessous.'}
              </p>
            </section>
          )}

          {/* Section 2 : Contrepartie — entreprise cliente OU consultant + fournisseur */}
          {isClientContract ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                {isEn ? 'Client company' : 'Entreprise cliente'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>{isEn ? 'Company (from contacts)' : 'Entreprise (carnet clients)'}</Label>
                  <Combobox
                    ariaLabel={isEn ? 'Company (from contacts)' : 'Entreprise (carnet clients)'}
                    value={watch('company_id') ?? ''}
                    onChange={(v) =>
                      setValue('company_id', v as ContractInput['company_id'], {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    options={[
                      {
                        value: '',
                        label: isEn ? '— Pick a company —' : '— Choisir une entreprise —',
                      },
                      ...companies.map((c) => ({
                        value: c.id,
                        label: c.name,
                        sublabel: c.city ?? undefined,
                      })),
                    ]}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {isEn
                      ? 'Fills the legal name below — adjust freely.'
                      : 'Remplit la raison sociale ci-dessous — ajustable librement.'}
                  </p>
                </div>
                <div>
                  <Label>{isEn ? 'Legal name *' : 'Raison sociale *'}</Label>
                  <Input {...register('client_name')} placeholder={isEn ? 'e.g. BNP Paribas' : 'ex: BNP Paribas'} />
                  {errors.client_name && (
                    <p className="text-xs text-destructive mt-1">{errors.client_name.message}</p>
                  )}
                </div>
                <div>
                  <Label>{isEn ? 'Head office address' : 'Adresse du siège'}</Label>
                  <Input {...register('client_address')} />
                </div>
                <div className="col-span-2">
                  <Label>{isEn ? 'Consultant assigned (optional)' : 'Consultant positionné (optionnel)'}</Label>
                  <Combobox
                    ariaLabel={isEn ? 'Consultant assigned' : 'Consultant positionné'}
                    value={watch('consultant_id') ?? ''}
                    onChange={(v) =>
                      setValue('consultant_id', v as ContractInput['consultant_id'], {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    options={[
                      { value: '', label: isEn ? '— None —' : '— Aucun —' },
                      ...consultants.map((c) => ({
                        value: c.id,
                        label: `${c.first_name} ${c.last_name}`,
                        sublabel: c.job_title ?? undefined,
                      })),
                    ]}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {isEn
                      ? 'Linked for tracking — never visible in their portal.'
                      : 'Lien de suivi interne — jamais visible dans son espace consultant.'}
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <>
              {/* Section 2 : Consultant */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                  {isEn ? 'Consultant' : 'Consultant concerné'}
                </h3>
                <Label>{t.forms.contract.consultant}</Label>
                <Combobox
                  ariaLabel={t.forms.contract.consultant}
                  value={watch('consultant_id') ?? ''}
                  onChange={(v) =>
                    setValue('consultant_id', v as ContractInput['consultant_id'], {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  options={[
                    { value: '', label: isEn ? '— None —' : '— Aucun —' },
                    ...consultants.map((c) => ({
                      value: c.id,
                      label: `${c.first_name} ${c.last_name}`,
                      sublabel: c.job_title ?? undefined,
                    })),
                  ]}
                />
              </section>

              {/* Section 3 : Fournisseur */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                  {isEn
                    ? "Supplier (consultant's company)"
                    : 'Fournisseur (société du consultant)'}
                </h3>

                {/* Dropdown : reprendre un fournisseur déjà saisi sur un précédent contrat */}
                {suppliers.length > 0 && (
                  <div className="mb-4 rounded-md border border-primary/25 bg-primary/[0.04] p-3">
                    <Label className="text-primary text-[10px] uppercase tracking-wider font-semibold">
                      {isEn ? 'Reuse an existing supplier' : 'Reprendre un fournisseur existant'}
                    </Label>
                    <Combobox
                      ariaLabel={isEn ? 'Reuse an existing supplier' : 'Reprendre un fournisseur existant'}
                      value=""
                      onChange={(v) => {
                        const key = v;
                        if (!key) return;
                        const s = suppliers.find((x) => x.key === key);
                        if (!s) return;
                        setValue('supplier_company_name', s.company_name);
                        setValue('supplier_address', s.address ?? '');
                        setValue('supplier_postal_code', s.postal_code ?? '');
                        setValue('supplier_city', s.city ?? '');
                        setValue('supplier_rcs', s.rcs ?? '');
                        setValue('supplier_representative', s.representative ?? '');
                        setValue('supplier_email', s.email ?? '');
                        toast.success(
                          isEn
                            ? `Supplier "${s.company_name}" pre-filled`
                            : `Fournisseur « ${s.company_name} » pré-rempli`,
                        );
                      }}
                      className="mt-1.5"
                      options={[
                        {
                          value: '',
                          label: isEn
                            ? '— Choose an existing supplier —'
                            : '— Choisir un fournisseur déjà saisi —',
                        },
                        ...suppliers.map((s) => ({
                          value: s.key,
                          label: `${s.company_name}${s.city ? ` (${s.city})` : ''}`,
                          sublabel:
                            s.usageCount > 1
                              ? `${s.usageCount} ${isEn ? 'contracts' : 'contrats'}`
                              : undefined,
                        })),
                      ]}
                    />
                    <p className="mt-2 text-[10.5px] text-muted-foreground">
                      {isEn
                        ? '💡 You can then adjust the fields below case by case.'
                        : '💡 Tu peux ensuite ajuster les champs ci-dessous au cas par cas.'}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>{isEn ? 'Company name *' : 'Raison sociale *'}</Label>
                    <Input {...register('supplier_company_name')} />
                    {errors.supplier_company_name && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.supplier_company_name.message}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <Label>{isEn ? 'Head office address' : 'Adresse du siège'}</Label>
                    <Input {...register('supplier_address')} />
                  </div>
                  <div>
                    <Label>{isEn ? 'Postal code' : 'Code postal'}</Label>
                    <Input {...register('supplier_postal_code')} />
                  </div>
                  <div>
                    <Label>{isEn ? 'City' : 'Ville'}</Label>
                    <Input {...register('supplier_city')} />
                  </div>
                  <div>
                    <Label>{isEn ? 'RCS number' : 'N° RCS'}</Label>
                    <Input {...register('supplier_rcs')} placeholder="XXX XXX XXX R.C.S. Ville" />
                  </div>
                  <div>
                    <Label>{isEn ? 'Legal representative' : 'Représentant légal'}</Label>
                    <Input
                      {...register('supplier_representative')}
                      placeholder={isEn ? 'First name Last name' : 'Prénom Nom'}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>{isEn ? 'Supplier email' : 'Email fournisseur'}</Label>
                    <Input type="email" {...register('supplier_email')} />
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Section 4 : Mission & Client final */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              {isClientContract
                ? isEn
                  ? 'Mission'
                  : 'Mission'
                : isEn
                  ? 'Mission & End client'
                  : 'Mission & Client final'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>{isEn ? 'Mission title' : 'Intitulé de la mission'}</Label>
                <Input {...register('mission_title')} placeholder={isEn ? 'e.g. QA Automation – E-commerce project' : 'ex: QA Automation – Projet e-commerce'} />
              </div>
              {!isClientContract && (
                <div>
                  <Label>{isEn ? 'End client' : 'Client final'}</Label>
                  <Input {...register('client_name')} placeholder={isEn ? 'e.g. BNP Paribas' : 'ex: BNP Paribas'} />
                </div>
              )}
              <div>
                <Label>{isEn ? 'Remote days / week' : 'Jours remote / semaine'}</Label>
                <Input type="number" min="0" max="5" {...register('remote_days_per_week')} />
              </div>
              <div className="col-span-2">
                <Label>{isEn ? 'Execution location' : "Lieu d'exécution"}</Label>
                <Input
                  {...register('work_location')}
                  placeholder={isEn ? 'Full address' : 'Adresse complète des locaux'}
                />
              </div>
            </div>
          </section>

          {/* Section 5 : Période */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              {isEn ? 'Period' : 'Période'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isEn ? 'Start date *' : 'Date de début *'}</Label>
                <Input type="date" {...register('start_date')} />
                {errors.start_date && (
                  <p className="text-xs text-destructive mt-1">{errors.start_date.message}</p>
                )}
              </div>
              <div>
                <Label>{isEn ? 'Duration (months)' : 'Durée (mois)'}</Label>
                <Input type="number" min="1" max="60" {...register('duration_months')} />
              </div>
            </div>
          </section>

          {/* Section 6 : Conditions financières */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              {isEn ? 'Financial terms' : 'Conditions financières'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>
                  {isClientContract
                    ? isEn
                      ? 'Sell day rate excl. tax (€)'
                      : 'TJM vente HT (€)'
                    : isEn
                      ? 'Buy day rate excl. tax (€)'
                      : 'TJM achat HT (€)'}
                </Label>
                <Input type="number" min="0" step="1" {...register('daily_rate_eur')} />
              </div>
              <div>
                <Label>{isEn ? 'Payment terms (days)' : 'Délai de paiement (jours)'}</Label>
                <Input type="number" min="0" max="120" {...register('payment_terms_days')} />
              </div>
              <div className="col-span-2">
                <Label>{isEn ? 'Billing email' : 'Email de facturation'}</Label>
                <Input type="email" {...register('billing_email')} placeholder="facturation@centrium-platform.com" />
              </div>
            </div>
          </section>

          {/* Section 7 : Clauses */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
              {isEn ? 'Specific clauses' : 'Clauses particulières'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>
                  {isClientContract
                    ? isEn
                      ? 'Non-solicitation (months)'
                      : 'Non-sollicitation (mois)'
                    : isEn
                      ? 'Non-compete (months)'
                      : 'Non-concurrence (mois)'}
                </Label>
                <Input type="number" min="0" max="36" {...register('non_compete_months')} />
              </div>
              <div>
                <Label>{isEn ? 'Competent court' : 'Tribunal compétent'}</Label>
                <Input {...register('jurisdiction_city')} />
              </div>
            </div>
          </section>

          <div>
            <Label>{isEn ? 'Internal notes' : 'Notes internes'}</Label>
            <Textarea {...register('notes')} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.actions.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit
                ? isEn
                  ? 'Update'
                  : 'Mettre à jour'
                : isEn
                  ? 'Create contract'
                  : 'Créer le contrat'}
            </Button>
          </DialogFooter>
        </form>
      </FormDialogContent>
    </Dialog>
  );
}
