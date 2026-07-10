'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Check, Loader2, Plus, UserRound, X } from 'lucide-react';

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
import { invoiceSchema, type InvoiceInput } from '@/lib/validators';
import {
  invoiceService,
  companyService,
  jobOfferService,
} from '@/lib/services';
import { consultantService } from '@/lib/services/consultant.service';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { notifyError } from '@/lib/notify';
import type { Company, Consultant, DocumentParty, Invoice, JobOffer } from '@/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  /** Contrepartie présélectionnée (suit l'onglet actif de la page Factures). */
  defaultParty?: DocumentParty;
  onSaved?: (inv: Invoice) => void;
};

// FAC- = facture de vente client · FC- = facture de sous-traitance consultant.
// Numéro laissé VIDE par défaut : la DB attribue un numéro SÉQUENTIEL
// atomique et conforme à l'enregistrement (trigger assign_invoice_number,
// migration 088). Fini le tirage aléatoire (non conforme + collisions).
// L'utilisateur peut toujours saisir un numéro personnalisé à la main.
function suggestInvoiceNumber(_party: DocumentParty) {
  return '';
}

// Un numéro encore au format aléatoire hérité est traité comme "auto".
const AUTO_NUMBER_RE = /^(FAC|FC)-\d{4}-\d{4}$/;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function plus30DaysISO() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  organizationId,
  defaultParty = 'client',
  onSaved,
}: Props) {
  const t = useAppT();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [saving, setSaving] = useState(false);

  // Listes de référence via cache SWR : instantané à la réouverture du dialog
  // (fini les dropdowns « aucun client / consultant » le temps du fetch).
  const { data: companiesData, setData: setCompaniesCache } = useCachedQuery<Company[]>(
    `invoice-companies:${organizationId}`,
    async () => {
      const res = await companyService.list();
      if (res.error) throw res.error;
      return res.data ?? [];
    },
    { enabled: open && !!organizationId },
  );
  const companies = companiesData ?? [];

  const { data: consultantsData } = useCachedQuery<Consultant[]>(
    `invoice-consultants:${organizationId}`,
    async () => {
      const res = await consultantService.list({ is_prospect: false });
      if (res.error) throw res.error;
      return res.data ?? [];
    },
    { enabled: open && !!organizationId },
  );
  const consultants = consultantsData ?? [];

  const { data: offersData } = useCachedQuery<JobOffer[]>(
    `invoice-offers:${organizationId}`,
    async () => {
      const res = await jobOfferService.list('all');
      if (res.error) throw res.error;
      return res.data ?? [];
    },
    { enabled: open && !!organizationId },
  );
  const offers = offersData ?? [];

  // Inline "+ Nouveau client" — évite de quitter le dialog facture pour
  // créer un client manquant (cas typique : on facture une nouvelle ESN
  // qu'on n'a jamais entrée en base).
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyCity, setNewCompanyCity] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      party: defaultParty,
      invoice_number: suggestInvoiceNumber(defaultParty),
      issue_date: todayISO(),
      due_date: plus30DaysISO(),
      vat_rate: 20,
    },
  });

  const party = watch('party') ?? 'client';
  const isConsultantInvoice = party === 'consultant';

  // Suit l'onglet actif de la page à chaque ouverture.
  useEffect(() => {
    if (!open) return;
    setValue('party', defaultParty);
    setValue('invoice_number', suggestInvoiceNumber(defaultParty));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function switchParty(next: DocumentParty) {
    if (next === party) return;
    setValue('party', next, { shouldValidate: true });
    // Régénère le numéro seulement s'il est encore au format auto (on ne
    // touche pas à un numéro saisi à la main).
    const current = watch('invoice_number');
    if (!current || AUTO_NUMBER_RE.test(current)) {
      setValue('invoice_number', suggestInvoiceNumber(next));
    }
    if (next === 'consultant') {
      // Une facture de sous-traitance n'a pas d'entreprise cliente.
      setValue('company_id', null);
      setValue('job_offer_id', null);
    }
  }

  // Calcul TJM × jours → Montant HT. Si l'utilisateur saisit les deux,
  // on alimente automatiquement amount_ht ET on persiste unit_price /
  // quantity en DB pour que la facture imprimée affiche le détail
  // (Qté = jours, PU = TJM) au lieu d'un forfait. Vider les champs
  // permet de retomber sur un forfait : on saisit alors le HT direct.
  const [tjm, setTjm] = useState<string>('');
  const [days, setDays] = useState<string>('');

  useEffect(() => {
    const tjmNum = Number(tjm);
    const daysNum = Number(days);
    if (tjmNum > 0 && daysNum > 0) {
      const ht = +(tjmNum * daysNum).toFixed(2);
      setValue('amount_ht', ht, { shouldValidate: true });
      setValue('unit_price', tjmNum, { shouldValidate: true });
      setValue('quantity', daysNum, { shouldValidate: true });
    } else {
      // Forfait : on remet à null pour ne pas garder un PU/Qté périmé.
      setValue('unit_price', null);
      setValue('quantity', null);
    }
  }, [tjm, days, setValue]);

  const amountHt = watch('amount_ht');
  const vatRate = watch('vat_rate');
  const ttc =
    amountHt && vatRate
      ? Number(amountHt) * (1 + Number(vatRate) / 100)
      : Number(amountHt) || 0;

  // Quand on choisit un AO, on suggère le client lié si la cellule est encore vide.
  // Petit confort : ça évite de retaper le client quand l'AO le porte déjà.
  const selectedOfferId = watch('job_offer_id');
  const selectedCompanyId = watch('company_id');
  useEffect(() => {
    if (!selectedOfferId || selectedCompanyId) return;
    const offer = offers.find((o) => o.id === selectedOfferId);
    if (offer?.company_id) {
      setValue('company_id', offer.company_id, { shouldValidate: true });
    }
  }, [selectedOfferId, selectedCompanyId, offers, setValue]);

  // Facture consultant : le TJM ACHAT et le régime de TVA suivent la fiche
  // du freelance (TJM fiche + franchise 293 B si pas de n° TVA).
  const selectedConsultantId = watch('consultant_id');
  useEffect(() => {
    if (!isConsultantInvoice || !selectedConsultantId) return;
    const c = consultants.find((x) => x.id === selectedConsultantId);
    if (!c) return;
    if (c.daily_rate_eur && !tjm) setTjm(String(c.daily_rate_eur));
    setValue('vat_rate', c.vat_number ? 20 : 0, { shouldValidate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConsultantId, isConsultantInvoice, consultants]);

  // Tri / dédoublonnage des consultants pour l'affichage : ordre alpha
  // sur "nom prénom — intitulé".
  const sortedConsultants = useMemo(
    () =>
      [...consultants].sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`),
      ),
    [consultants],
  );

  const selectedConsultant = useMemo(
    () => consultants.find((c) => c.id === selectedConsultantId) ?? null,
    [consultants, selectedConsultantId],
  );

  async function createCompanyInline() {
    const name = newCompanyName.trim();
    if (!name) {
      notifyError(isEn ? 'Client name required' : 'Nom du client obligatoire');
      return;
    }
    setSavingCompany(true);
    try {
      const res = await companyService.create({
        organization_id: organizationId,
        name,
        city: newCompanyCity.trim() || null,
      });
      if (res.error || !res.data) {
        notifyError(
          (isEn ? 'Cannot create: ' : 'Création impossible : ') +
            (res.error?.message ?? (isEn ? 'unknown' : 'inconnue')),
        );
        return;
      }
      // Insère en haut de la liste (cache SWR), sélectionne, replie l'inline form.
      setCompaniesCache((prev) => [res.data!, ...(prev ?? [])]);
      setValue('company_id', res.data.id, { shouldValidate: true });
      setNewCompanyName('');
      setNewCompanyCity('');
      setCreatingCompany(false);
    } finally {
      setSavingCompany(false);
    }
  }

  async function onSubmit(values: InvoiceInput) {
    setSaving(true);
    try {
      const res = await invoiceService.create(values, organizationId);
      if (res.error) {
        notifyError((isEn ? 'Error: ' : 'Erreur : ') + res.error.message);
        return;
      }
      onSaved?.(res.data);
      reset({
        party,
        invoice_number: suggestInvoiceNumber(party),
        issue_date: todayISO(),
        due_date: plus30DaysISO(),
        vat_rate: 20,
      });
      setTjm('');
      setDays('');
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
      title: isEn ? 'Client invoice' : 'Facture client',
      subtitle: isEn
        ? 'Billed to a client company — money in.'
        : 'Vente à une entreprise cliente — à encaisser.',
    },
    {
      value: 'consultant',
      icon: UserRound,
      title: isEn ? 'Consultant invoice' : 'Facture consultant',
      subtitle: isEn
        ? 'Freelance subcontracting — money out.'
        : 'Sous-traitance freelance — à payer au consultant.',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.forms.invoice.title_create}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* ===== Contrepartie : client (vente) vs consultant (sous-traitance) ===== */}
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
                      ? 'border-violet-glow/60 bg-violet-glow/[0.07] ring-1 ring-violet-glow/40'
                      : 'border-hairline hover:border-foreground/20 hover:bg-foreground/[0.03]'
                  }`}
                >
                  {active && (
                    <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-glow text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                  <Icon
                    className={`h-4 w-4 mb-2 ${active ? 'text-violet-glow' : 'text-muted-foreground'}`}
                  />
                  <div className="text-sm font-semibold leading-tight">{card.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {card.subtitle}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t.forms.invoice.invoice_number}</Label>
              <Input
                {...register('invoice_number')}
                placeholder={isEn ? 'Auto (sequential)' : 'Auto (séquentiel)'}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {isEn
                  ? 'Leave empty for an automatic sequential number.'
                  : 'Laisser vide = numéro séquentiel automatique et conforme.'}
              </p>
              {errors.invoice_number && (
                <p className="text-xs text-red-400 mt-1">{errors.invoice_number.message}</p>
              )}
            </div>

            {isConsultantInvoice ? (
              <div>
                <Label>{isEn ? 'Consultant *' : 'Consultant *'}</Label>
                <Combobox
                  ariaLabel="Consultant"
                  value={watch('consultant_id') ?? ''}
                  onChange={(v) =>
                    setValue('consultant_id', v as InvoiceInput['consultant_id'], {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  options={[
                    {
                      value: '',
                      label: isEn ? '— Pick a consultant —' : '— Choisir un consultant —',
                    },
                    ...sortedConsultants.map((c) => ({
                      value: c.id,
                      label: `${c.first_name} ${c.last_name}`,
                      sublabel: c.job_title ?? undefined,
                    })),
                  ]}
                />
                {errors.consultant_id && (
                  <p className="text-xs text-red-400 mt-1">
                    {isEn ? 'Consultant required' : 'Consultant obligatoire'}
                  </p>
                )}
                {selectedConsultant?.company_name && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {isEn ? 'Company: ' : 'Société : '}
                    {selectedConsultant.company_name}
                    {selectedConsultant.siret ? ` · SIRET ${selectedConsultant.siret}` : ''}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <Label>{isEn ? 'Client *' : 'Client *'}</Label>
                  <button
                    type="button"
                    onClick={() => setCreatingCompany((v) => !v)}
                    className="text-[11px] text-violet-300 hover:text-violet-200 inline-flex items-center gap-1"
                  >
                    {creatingCompany ? (
                      <>
                        <X className="h-3 w-3" />
                        {isEn ? 'Cancel' : 'Annuler'}
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3" />
                        {isEn ? 'New client' : 'Nouveau client'}
                      </>
                    )}
                  </button>
                </div>
                {!creatingCompany ? (
                  <>
                    <Combobox
                      ariaLabel="Client"
                      value={watch('company_id') ?? ''}
                      onChange={(v) =>
                        setValue('company_id', v as InvoiceInput['company_id'], {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                      options={[
                        { value: '', label: isEn ? '— Pick a client —' : '— Choisir un client —' },
                        ...companies.map((c) => ({ value: c.id, label: c.name })),
                      ]}
                    />
                    {errors.company_id && (
                      <p className="text-xs text-red-400 mt-1">
                        {isEn ? 'Client required' : 'Client obligatoire'}
                      </p>
                    )}
                    {companies.length === 0 && (
                      <p className="text-[11px] text-amber-300/80 mt-1">
                        {isEn
                          ? 'No clients yet — click "New client" to add one.'
                          : 'Aucun client en base — clique « Nouveau client » pour en créer un.'}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="space-y-2 rounded-md border border-violet-glow/30 bg-violet-glow/[0.04] p-2.5">
                    <Input
                      autoFocus
                      placeholder={
                        isEn
                          ? 'Legal name (e.g. Renault, ENGIE…)'
                          : 'Raison sociale (ex: Renault, ENGIE…)'
                      }
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void createCompanyInline();
                        }
                      }}
                    />
                    <Input
                      placeholder={isEn ? 'City (optional)' : 'Ville (optionnel)'}
                      value={newCompanyCity}
                      onChange={(e) => setNewCompanyCity(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={createCompanyInline}
                      disabled={savingCompany || !newCompanyName.trim()}
                      className="w-full"
                    >
                      {savingCompany && <Loader2 className="h-3 w-3 animate-spin" />}
                      {isEn ? 'Create client' : 'Créer le client'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {!isConsultantInvoice && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isEn ? 'Billed consultant' : 'Consultant facturé'}</Label>
                <Combobox
                  ariaLabel={isEn ? 'Billed consultant' : 'Consultant facturé'}
                  value={watch('consultant_id') ?? ''}
                  onChange={(v) =>
                    setValue('consultant_id', v as InvoiceInput['consultant_id'], {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  options={[
                    {
                      value: '',
                      label: isEn ? '— None (free invoice) —' : '— Aucun (facture libre) —',
                    },
                    ...sortedConsultants.map((c) => ({
                      value: c.id,
                      label: `${c.first_name} ${c.last_name}`,
                      sublabel: c.job_title ?? undefined,
                    })),
                  ]}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {isEn
                    ? 'Optional — useful to track per-consultant billing'
                    : 'Optionnel — utile pour tracer la facturation par consultant'}
                </p>
              </div>
              <div>
                <Label>{isEn ? 'RFP / Opportunity' : "Appel d'offre / Opportunité"}</Label>
                <Combobox
                  ariaLabel={isEn ? 'RFP / Opportunity' : "Appel d'offre / Opportunité"}
                  value={watch('job_offer_id') ?? ''}
                  onChange={(v) =>
                    setValue('job_offer_id', v as InvoiceInput['job_offer_id'], {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  options={[
                    { value: '', label: isEn ? '— None —' : '— Aucun —' },
                    ...offers.map((o) => ({
                      value: o.id,
                      label: o.title,
                      sublabel: o.status !== 'open' ? o.status : undefined,
                    })),
                  ]}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {isEn
                    ? 'Optional — pre-fills client if the RFP has one'
                    : "Optionnel — pré-remplit le client si l'AO en a un"}
                </p>
              </div>
            </div>
          )}

          <div>
            <Label>{t.forms.invoice.period}</Label>
            <Input
              {...register('period_label')}
              placeholder={isEn ? 'e.g. April 2026' : 'ex: Avril 2026'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t.forms.invoice.issue_date} *</Label>
              <Input type="date" {...register('issue_date')} />
            </div>
            <div>
              <Label>{t.forms.invoice.due_date} *</Label>
              <Input type="date" {...register('due_date')} />
            </div>
          </div>

          {/* Calcul rapide : TJM × Jours → Montant HT (auto-rempli en
              dessous). Le Montant HT reste éditable pour les forfaits.
              Sur une facture consultant, le TJM proposé est le TJM ACHAT
              (fiche du freelance). */}
          <div className="rounded-md border border-violet-glow/20 bg-violet-glow/[0.04] p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-violet-300/80 font-semibold">
              {isConsultantInvoice
                ? isEn
                  ? 'Quick compute buy rate × days'
                  : 'Calcul rapide TJM achat × jours'
                : isEn
                  ? 'Quick compute day rate × days'
                  : 'Calcul rapide TJM × jours'}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>
                  {isConsultantInvoice
                    ? isEn
                      ? 'Buy rate (€/day)'
                      : 'TJM achat (€/j)'
                    : isEn
                      ? 'Day rate (€/day)'
                      : 'TJM (€/j)'}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder={isEn ? 'e.g. 520' : 'ex: 520'}
                  value={tjm}
                  onChange={(e) => setTjm(e.target.value)}
                />
              </div>
              <div>
                <Label>{isEn ? 'Days worked' : 'Jours travaillés'}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder={isEn ? 'e.g. 21' : 'ex: 21'}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isEn ? '= Excl. VAT amount' : '= Montant HT'}
                </Label>
                <Input
                  readOnly
                  value={
                    Number(tjm) > 0 && Number(days) > 0
                      ? (Number(tjm) * Number(days)).toFixed(2) + ' €'
                      : '—'
                  }
                  className="bg-white/[0.02] cursor-not-allowed font-mono"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {isEn
                ? 'Leave empty for a fixed-fee — enter the excl. VAT amount below.'
                : 'Laisse vide pour un forfait — saisis directement le montant HT ci-dessous.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{t.forms.invoice.amount_ht} *</Label>
              <Input type="number" min="0" step="0.01" {...register('amount_ht')} />
              {errors.amount_ht && (
                <p className="text-xs text-red-400 mt-1">
                  {isEn ? 'Amount required' : 'Montant obligatoire'}
                </p>
              )}
            </div>
            <div>
              <Label>{t.forms.invoice.vat_rate}</Label>
              <Input type="number" min="0" max="100" step="0.1" {...register('vat_rate')} />
              {isConsultantInvoice && Number(vatRate) === 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {isEn
                    ? 'VAT-exempt (art. 293 B, French tax code)'
                    : 'Franchise en base — art. 293 B du CGI'}
                </p>
              )}
            </div>
            <div>
              <Label>{isEn ? 'Total incl. VAT' : 'Total TTC'}</Label>
              <Input
                readOnly
                value={ttc ? ttc.toFixed(2) + ' €' : '—'}
                className="bg-white/[0.02] cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <Label>{isEn ? 'Notes' : 'Notes'}</Label>
            <Textarea
              {...register('notes')}
              rows={3}
              placeholder={isEn ? 'Terms, PO references…' : 'Conditions, références de commande…'}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.actions.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.actions.create}
            </Button>
          </DialogFooter>
        </form>
      </FormDialogContent>
    </Dialog>
  );
}
