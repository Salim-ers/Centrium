'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Target } from 'lucide-react';

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
import { Combobox } from '@/components/ui/Combobox';
import { jobOfferService } from '@/lib/services';
import { consultantService } from '@/lib/services/consultant.service';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { JobOffer, Consultant } from '@/types';

type ConsultantPick = Pick<Consultant, 'id' | 'first_name' | 'last_name' | 'daily_rate_eur'>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * - offer set, consultant set : tout verrouillé (flow standard)
   * - offer null, consultant set : flow "consultant → offre" (sélecteur AO)
   * - offer set, consultant null : flow "offre → consultant" inverse (sélecteur consultant)
   *   Permet de pousser plusieurs consultants sur la même offre.
   */
  offer?: JobOffer | null;
  consultant?: ConsultantPick | null;
  onAssigned?: () => void;
};

export function AssignMissionDialog({ open, onOpenChange, offer, consultant, onAssigned }: Props) {
  const { activeOrgId } = useOrganization();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [tjm, setTjm] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>('');

  const offerLocked = !!offer;
  const consultantLocked = !!consultant;

  // Offres & consultants via cache SWR (instantané à la réouverture, keyé sur
  // l'org → aucune fuite inter-organisation). Chargés seulement dans les flows
  // où l'utilisateur doit choisir (offre ou consultant non verrouillé).
  const { data: offersData } = useCachedQuery<JobOffer[]>(
    `assign-offers:${activeOrgId ?? 'none'}`,
    async () => {
      const res = await jobOfferService.list('open');
      if (res.error) throw res.error;
      return res.data ?? [];
    },
    { enabled: open && !offer && !!activeOrgId },
  );
  const offers = offersData ?? [];

  const { data: consultantsData } = useCachedQuery<ConsultantPick[]>(
    `assign-consultants:${activeOrgId ?? 'none'}`,
    async () => {
      const res = await consultantService.list({ is_prospect: 'all', archived: false });
      if (res.error) throw res.error;
      return (res.data ?? [])
        .filter((c) => !c.is_prospect)
        .map((c) => ({
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          daily_rate_eur: c.daily_rate_eur ?? null,
        }));
    },
    { enabled: open && !consultant && !!activeOrgId },
  );
  const consultantsList = consultantsData ?? [];
  const activeOffer = offer ?? offers.find((o) => o.id === selectedOfferId) ?? null;
  const activeConsultant =
    consultant ?? consultantsList.find((c) => c.id === selectedConsultantId) ?? null;

  useEffect(() => {
    if (!open) return;

    // Mode "consultant à choisir" + offre verrouillée :
    // pré-remplit ce qu'on peut depuis l'offre, le consultant viendra après.
    if (!consultantLocked && offerLocked && offer) {
      setTitle(offer.title);
      setTjm(
        offer.daily_rate_max?.toString()
          ?? offer.daily_rate_min?.toString()
          ?? '',
      );
      setStartDate(offer.start_date ?? new Date().toISOString().slice(0, 10));
      const start = offer.start_date ? new Date(offer.start_date) : new Date();
      if (offer.duration_months) {
        const end = new Date(start);
        end.setMonth(end.getMonth() + offer.duration_months);
        setEndDate(end.toISOString().slice(0, 10));
      } else {
        setEndDate('');
      }
      setSelectedConsultantId('');
      return;
    }

    if (!consultant) return;

    // Flow offre verrouillée : préremplir depuis l'offre.
    if (offerLocked && offer) {
      setTitle(offer.title);
      setTjm(
        consultant.daily_rate_eur?.toString()
          ?? offer.daily_rate_max?.toString()
          ?? offer.daily_rate_min?.toString()
          ?? '',
      );
      setStartDate(offer.start_date ?? new Date().toISOString().slice(0, 10));
      const start = offer.start_date ? new Date(offer.start_date) : new Date();
      if (offer.duration_months) {
        const end = new Date(start);
        end.setMonth(end.getMonth() + offer.duration_months);
        setEndDate(end.toISOString().slice(0, 10));
      } else {
        setEndDate('');
      }
      return;
    }
    // Flow consultant → offre : reset des champs, TJM pré-rempli depuis le consultant.
    setTitle('');
    setTjm(consultant.daily_rate_eur?.toString() ?? '');
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate('');
    setSelectedOfferId('');
  }, [open, offer, offerLocked, consultant, consultantLocked]);

  function handleConsultantSelect(id: string) {
    setSelectedConsultantId(id);
    const c = consultantsList.find((x) => x.id === id);
    if (c?.daily_rate_eur && !consultantLocked) {
      // TJM = celui du consultant si défini, sinon on garde celui pré-rempli depuis l'AO.
      setTjm(String(c.daily_rate_eur));
    }
  }

  function handleOfferSelect(id: string) {
    setSelectedOfferId(id);
    const o = offers.find((x) => x.id === id);
    if (!o) {
      setTitle('');
      return;
    }
    setTitle(o.title);
    if (o.daily_rate_max) setTjm(String(o.daily_rate_max));
    else if (o.daily_rate_min) setTjm(String(o.daily_rate_min));
    if (o.start_date) setStartDate(o.start_date);
    if (o.duration_months && o.start_date) {
      const end = new Date(o.start_date);
      end.setMonth(end.getMonth() + o.duration_months);
      setEndDate(end.toISOString().slice(0, 10));
    }
  }

  async function submit() {
    if (!activeConsultant) {
      toast.error(isEn ? 'Consultant required' : 'Consultant requis');
      return;
    }
    if (!title.trim()) {
      toast.error(isEn ? 'Title required' : 'Titre requis');
      return;
    }
    if (!startDate) {
      toast.error(isEn ? 'Start date required' : 'Date de début requise');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultant_id: activeConsultant.id,
          job_offer_id: activeOffer?.id ?? null,
          title: title.trim(),
          daily_rate_eur: Number(tjm) || 0,
          start_date: startDate,
          end_date: endDate || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message ?? (isEn ? 'Assignment failed' : 'Affectation impossible'));
        return;
      }
      toast.success(
        isEn
          ? `Mission proposed for ${activeConsultant.first_name} ${activeConsultant.last_name} — to be confirmed on their profile.`
          : `Mission proposée pour ${activeConsultant.first_name} ${activeConsultant.last_name} — à valider sur sa fiche.`,
      );
      onAssigned?.();
      onOpenChange(false);
    } catch {
      toast.error(isEn ? 'Network error' : 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {isEn ? 'Assign to a mission' : 'Affecter à une mission'}
          </DialogTitle>
          <DialogDescription>
            {activeConsultant ? (
              <>
                <strong>{activeConsultant.first_name} {activeConsultant.last_name}</strong>
                {activeOffer ? (
                  <>
                    {' '}{isEn ? 'on' : 'sur'} <strong>{activeOffer.title}</strong>
                  </>
                ) : null}
                {isEn ? (
                  <>
                    . Initial status: <em>proposed</em>. To be confirmed afterwards from the
                    consultant profile or the Missions page.
                  </>
                ) : (
                  <>
                    . Statut initial : <em>proposed</em>. À valider ensuite depuis la fiche consultant
                    ou la page Missions.
                  </>
                )}
              </>
            ) : activeOffer ? (
              isEn ? (
                <>
                  Put a consultant forward for <strong>{activeOffer.title}</strong>. Choose the
                  person and adjust the negotiated day rate.
                </>
              ) : (
                <>
                  Pousser un consultant sur <strong>{activeOffer.title}</strong>. Choisis la
                  personne et ajuste le TJM négocié.
                </>
              )
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!consultantLocked && (
            <div>
              <Label>{isEn ? 'Consultant to position' : 'Consultant à positionner'}</Label>
              <Combobox
                value={selectedConsultantId}
                onChange={(v) => handleConsultantSelect(v)}
                options={[
                  { value: '', label: isEn ? '— Select —' : '— Sélectionner —' },
                  ...consultantsList.map((c) => ({
                    value: c.id,
                    label: `${c.last_name.toUpperCase()} ${c.first_name}${c.daily_rate_eur ? ` · ${isEn ? 'Rate' : 'TJM'} ${c.daily_rate_eur}€` : ''}`,
                  })),
                ]}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {isEn
                  ? 'Several consultants can be put forward for the same offer (1 line per proposal in Submitted CVs).'
                  : 'Plusieurs consultants peuvent être poussés sur la même offre (1 ligne par proposition dans CV poussés).'}
              </p>
            </div>
          )}
          {!offerLocked && (
            <div>
              <Label>{isEn ? 'Client offer (RFP) — optional' : 'Offre client (AO) — optionnel'}</Label>
              <Combobox
                value={selectedOfferId}
                onChange={(v) => handleOfferSelect(v)}
                options={[
                  { value: '', label: isEn ? '— Free mission (no RFP)' : '— Mission libre (sans AO)' },
                  ...offers.map((o) => ({
                    value: o.id,
                    label: `${o.title}${o.daily_rate_max ? ` · ${isEn ? `up to ${o.daily_rate_max}€/day` : `jusqu'à ${o.daily_rate_max}€/j`}` : ''}`,
                  })),
                ]}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {isEn
                  ? 'Select an open RFP to pre-fill, or leave empty to create a free mission.'
                  : 'Sélectionne une AO ouverte pour pré-remplir, ou laisse vide pour créer une mission libre.'}
              </p>
            </div>
          )}
          <div>
            <Label>{isEn ? 'Mission title' : 'Titre de la mission'}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{isEn ? 'Day rate (€)' : 'TJM (€)'}</Label>
              <Input
                type="number"
                min="0"
                step="10"
                value={tjm}
                onChange={(e) => setTjm(e.target.value)}
              />
            </div>
            <div>
              <Label>{isEn ? 'Start' : 'Début'}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>{isEn ? 'End (optional)' : 'Fin (optionnel)'}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {isEn ? 'Cancel' : 'Annuler'}
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEn ? 'Propose mission' : 'Proposer la mission'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
