'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAppT } from '@/lib/i18n/LocaleProvider';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, X } from 'lucide-react';

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
import { Select } from '@/components/ui/select';
import { invoiceSchema, type InvoiceInput } from '@/lib/validators';
import {
  invoiceService,
  companyService,
  jobOfferService,
} from '@/lib/services';
import { consultantService } from '@/lib/services/consultant.service';
import { notifyCreated, notifyError } from '@/lib/notify';
import type { Company, Consultant, Invoice, JobOffer } from '@/types';

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
  const t = useAppT();
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [offers, setOffers] = useState<JobOffer[]>([]);

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
      invoice_number: suggestInvoiceNumber(),
      issue_date: todayISO(),
      due_date: plus30DaysISO(),
      vat_rate: 20,
    },
  });

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
      : 0;

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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([
      companyService.list(),
      consultantService.list({ is_prospect: false }),
      jobOfferService.list('all'),
    ]).then(([companiesRes, consultantsRes, offersRes]) => {
      if (cancelled) return;
      if (companiesRes.data) setCompanies(companiesRes.data);
      if (consultantsRes.data) setConsultants(consultantsRes.data);
      if (offersRes.data) setOffers(offersRes.data);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Tri / dédoublonnage des consultants pour l'affichage : ordre alpha
  // sur "nom prénom — intitulé".
  const sortedConsultants = useMemo(
    () =>
      [...consultants].sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`),
      ),
    [consultants],
  );

  async function createCompanyInline() {
    const name = newCompanyName.trim();
    if (!name) {
      notifyError('Nom du client obligatoire');
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
        notifyError('Création impossible : ' + (res.error?.message ?? 'inconnue'));
        return;
      }
      // Insère en haut de la liste, sélectionne, replie l'inline form.
      setCompanies((prev) => [res.data!, ...prev]);
      setValue('company_id', res.data.id, { shouldValidate: true });
      setNewCompanyName('');
      setNewCompanyCity('');
      setCreatingCompany(false);
      notifyCreated(`Client "${res.data.name}" créé`);
    } finally {
      setSavingCompany(false);
    }
  }

  async function onSubmit(values: InvoiceInput) {
    setSaving(true);
    try {
      const res = await invoiceService.create(values, organizationId);
      if (res.error) {
        notifyError('Erreur : ' + res.error.message);
        return;
      }
      notifyCreated(`Facture ${values.invoice_number} créée en brouillon`);
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
      <FormDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.forms.invoice.title_create}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t.forms.invoice.invoice_number} *</Label>
              <Input {...register('invoice_number')} />
              {errors.invoice_number && (
                <p className="text-xs text-red-400 mt-1">{errors.invoice_number.message}</p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Client *</Label>
                <button
                  type="button"
                  onClick={() => setCreatingCompany((v) => !v)}
                  className="text-[11px] text-violet-300 hover:text-violet-200 inline-flex items-center gap-1"
                >
                  {creatingCompany ? (
                    <>
                      <X className="h-3 w-3" />
                      Annuler
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3" />
                      Nouveau client
                    </>
                  )}
                </button>
              </div>
              {!creatingCompany ? (
                <>
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
                  {companies.length === 0 && (
                    <p className="text-[11px] text-amber-300/80 mt-1">
                      Aucun client en base — clique « Nouveau client » pour en créer un.
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-2 rounded-md border border-violet-glow/30 bg-violet-glow/[0.04] p-2.5">
                  <Input
                    autoFocus
                    placeholder="Raison sociale (ex: Renault, ENGIE…)"
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
                    placeholder="Ville (optionnel)"
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
                    Créer le client
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Consultant facturé</Label>
              <Select {...register('consultant_id')}>
                <option value="">— Aucun (facture libre) —</option>
                {sortedConsultants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                    {c.job_title ? ` — ${c.job_title}` : ''}
                  </option>
                ))}
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Optionnel — utile pour tracer la facturation par consultant
              </p>
            </div>
            <div>
              <Label>Appel d&apos;offre / Opportunité</Label>
              <Select {...register('job_offer_id')}>
                <option value="">— Aucun —</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                    {o.status !== 'open' ? ` · ${o.status}` : ''}
                  </option>
                ))}
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Optionnel — pré-remplit le client si l&apos;AO en a un
              </p>
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

          {/* Calcul rapide : TJM × Jours → Montant HT (auto-rempli en
              dessous). Le Montant HT reste éditable pour les forfaits. */}
          <div className="rounded-md border border-violet-glow/20 bg-violet-glow/[0.04] p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-violet-300/80 font-semibold">
              Calcul rapide TJM × jours
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>TJM (€/j)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="ex: 520"
                  value={tjm}
                  onChange={(e) => setTjm(e.target.value)}
                />
              </div>
              <div>
                <Label>Jours travaillés</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="ex: 21"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  = Montant HT
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
              Laisse vide pour un forfait — saisis directement le montant HT ci-dessous.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{t.forms.invoice.amount_ht} *</Label>
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
