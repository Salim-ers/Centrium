'use client';

import { useEffect, useState } from 'react';
import { Loader2, Mail, KeyRound } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { notifyCreated, notifyError } from '@/lib/notify';
import type { Consultant } from '@/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultant: Consultant | null;
  onGranted?: (consultantId: string, email: string) => void;
};

export function GrantPortalDialog({
  open,
  onOpenChange,
  consultant,
  onGranted,
}: Props) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && consultant) {
      setEmail(consultant.email ?? '');
    }
  }, [open, consultant]);

  async function submit() {
    if (!consultant) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notifyError('Email invalide');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/consultants/${consultant.id}/portal-access`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifyError(body.message ?? body.error ?? `Erreur (${res.status})`);
        return;
      }
      notifyCreated(
        `Email d'accès envoyé à ${consultant.first_name} ${consultant.last_name} (${email}). Le lien expire après 7 jours.`,
        { duration: 8000 },
      );
      onGranted?.(consultant.id, email);
      onOpenChange(false);
    } catch (e) {
      notifyError(`Erreur : ${e instanceof Error ? e.message : 'inconnue'}`);
    } finally {
      setBusy(false);
    }
  }

  if (!consultant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-violet-glow" />
            Créer un accès portail
          </DialogTitle>
          <DialogDescription>
            On envoie à{' '}
            <strong>
              {consultant.first_name} {consultant.last_name}
            </strong>{' '}
            un email Centrium avec un lien pour qu&apos;il choisisse son propre
            mot de passe. Aucun secret n&apos;est stocké côté admin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 pt-2">
          <Label>Email du portail *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@example.com"
              className="pl-9"
              autoComplete="off"
            />
          </div>
          <p className="text-[11px] text-violet-300/80">
            Le lien d&apos;invitation expire après 7 jours.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Envoyer l&apos;invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
