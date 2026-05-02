'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, KeyRound } from 'lucide-react';

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
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && consultant) {
      setEmail(consultant.email ?? '');
      setPassword(suggestPassword());
    }
  }, [open, consultant]);

  function suggestPassword(): string {
    const charset = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let out = '';
    const arr = new Uint32Array(12);
    crypto.getRandomValues(arr);
    for (const n of arr) out += charset[n % charset.length];
    return out;
  }

  async function submit() {
    if (!consultant) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Email invalide');
      return;
    }
    if (password.length < 8) {
      toast.error('Mot de passe : 8 caractères minimum');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/consultants/${consultant.id}/portal-access`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? `Erreur (${res.status})`);
        return;
      }
      toast.success(
        `Accès portail créé pour ${consultant.first_name} ${consultant.last_name} (${email}). Mot de passe à transmettre.`,
        { duration: 10000 },
      );
      onGranted?.(consultant.id, email);
      onOpenChange(false);
    } catch (e) {
      toast.error(`Erreur : ${e instanceof Error ? e.message : 'inconnue'}`);
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
            Génère un compte de connexion à <code className="text-violet-300">/login</code> pour{' '}
            <strong>
              {consultant.first_name} {consultant.last_name}
            </strong>
            . Une fois connecté, il verra ses missions, ses CRA et ses factures liées dans son portail.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
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
          </div>
          <div>
            <Label>Mot de passe * (8+ car.)</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 font-mono text-xs"
                autoComplete="off"
              />
            </div>
          </div>
          <p className="col-span-2 text-[11px] text-amber-300/80">
            ⚠ Communique ce mot de passe au consultant. Il pourra le changer après connexion.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Créer l&apos;accès
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
