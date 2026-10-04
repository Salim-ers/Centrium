'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Décision du client sur un CRA (approuver / demander une correction) ou un
 * devis (accepter / refuser). Le serveur revérifie l'accès et le statut.
 */
export function ClientDecisionActions({
  endpoint,
  kind,
}: {
  endpoint: string;
  kind: 'timesheet' | 'quote';
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [comment, setComment] = useState('');
  const positive = kind === 'timesheet' ? 'approve' : 'accept';
  const negative = kind === 'timesheet' ? 'reject' : 'decline';

  async function send(action: string) {
    setBusy(action);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kind === 'timesheet' ? { action, comment: comment || null } : { action }),
    });
    setBusy(null);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.message ?? 'Action impossible. Réessayez.');
      return;
    }
    setRejectOpen(false);
    toast.success(
      action === positive ? (kind === 'timesheet' ? 'CRA approuvé' : 'Devis accepté') : kind === 'timesheet' ? 'Correction demandée' : 'Devis refusé',
    );
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="w-full sm:w-auto" onClick={() => void send(positive)} loading={busy === positive} disabled={!!busy}>
          <Check />
          {kind === 'timesheet' ? 'Approuver' : 'Accepter le devis'}
        </Button>
        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => (kind === 'timesheet' ? setRejectOpen(true) : void send(negative))} loading={busy === negative} disabled={!!busy}>
          <X />
          {kind === 'timesheet' ? 'Demander une correction' : 'Refuser'}
        </Button>
      </div>
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demander une correction</DialogTitle>
            <DialogDescription>Votre commentaire est transmis à votre prestataire.</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} placeholder="Ex. : le 12 était un jour d’absence." />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => void send(negative)} loading={busy === negative} disabled={!comment.trim()}>
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
