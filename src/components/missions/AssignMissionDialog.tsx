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
import { Select } from '@/components/ui/select';
import { jobOfferService } from '@/lib/services';
import type { JobOffer, Consultant } from '@/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Si fourni : flow "offre → consultant" (depuis Matching). L'offre est verrouillée.
   * Si null : flow "consultant → offre" (depuis la fiche/liste consultants), affiche
   * un sélecteur d'AO. L'AO reste optionnelle (mission libre possible).
   */
  offer?: JobOffer | null;
  consultant: Pick<Consultant, 'id' | 'first_name' | 'last_name' | 'daily_rate_eur'> | null;
  onAssigned?: () => void;
};

export function AssignMissionDialog({ open, onOpenChange, offer, consultant, onAssigned }: Props) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [tjm, setTjm] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');

  const offerLocked = !!offer;
  const activeOffer = offer ?? offers.find((o) => o.id === selectedOfferId) ?? null;

  useEffect(() => {
    if (!open) return;
    if (offerLocked) return;
    jobOfferService.list('open').then((res) => {
      if (res.data) setOffers(res.data);
    });
  }, [open, offerLocked]);

  useEffect(() => {
    if (!open || !consultant) return;
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
  }, [open, offer, offerLocked, consultant]);

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
    if (!consultant) return;
    if (!title.trim()) {
      toast.error('Titre requis');
      return;
    }
    if (!startDate) {
      toast.error('Date de début requise');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultant_id: consultant.id,
          job_offer_id: activeOffer?.id ?? null,
          title: title.trim(),
          daily_rate_eur: Number(tjm) || 0,
          start_date: startDate,
          end_date: endDate || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message ?? 'Affectation impossible');
        return;
      }
      toast.success(
        `Mission proposée pour ${consultant.first_name} ${consultant.last_name} — à valider sur sa fiche.`,
      );
      onAssigned?.();
      onOpenChange(false);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <Target className="h-5 w-5 text-violet-glow" />
            Affecter à une mission
          </DialogTitle>
          <DialogDescription>
            {consultant && (
              <>
                <strong>{consultant.first_name} {consultant.last_name}</strong>
                {activeOffer ? (
                  <>
                    {' '}sur <strong>{activeOffer.title}</strong>
                  </>
                ) : null}
                . Statut initial : <em>proposed</em>. À valider ensuite depuis la fiche consultant
                ou la page Missions.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!offerLocked && (
            <div>
              <Label>Offre client (AO) — optionnel</Label>
              <Select
                value={selectedOfferId}
                onChange={(e) => handleOfferSelect(e.target.value)}
              >
                <option value="">— Mission libre (sans AO)</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                    {o.daily_rate_max ? ` · jusqu'à ${o.daily_rate_max}€/j` : ''}
                  </option>
                ))}
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Sélectionne une AO ouverte pour pré-remplir, ou laisse vide pour créer une
                mission libre.
              </p>
            </div>
          )}
          <div>
            <Label>Titre de la mission</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>TJM (€)</Label>
              <Input
                type="number"
                min="0"
                step="10"
                value={tjm}
                onChange={(e) => setTjm(e.target.value)}
              />
            </div>
            <div>
              <Label>Début</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Fin (optionnel)</Label>
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
            Annuler
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Proposer la mission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
