'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, ArrowRightCircle, UserPlus } from 'lucide-react';

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
import { consultantService } from '@/lib/services/consultant.service';
import type { Consultant } from '@/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultant: Consultant | null;
  onPromoted?: (c: Consultant) => void;
};

export function PromoteToConsultantDialog({
  open,
  onOpenChange,
  consultant,
  onPromoted,
}: Props) {
  const [createPortal, setCreatePortal] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && consultant) {
      setCreatePortal(true);
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
    if (createPortal) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error('Email du portail invalide');
        return;
      }
      if (password.length < 8) {
        toast.error('Mot de passe : 8 caractères minimum');
        return;
      }
    }

    setBusy(true);
    try {
      // 1) Bascule is_prospect → false
      const promoteRes = await consultantService.promoteToConsultant(consultant.id);
      if (promoteRes.error || !promoteRes.data) {
        toast.error('Promotion impossible : ' + (promoteRes.error?.message ?? ''));
        return;
      }

      // 2) Si demandé, crée le compte portail
      if (createPortal) {
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
          toast.warning(
            `Promu en consultant, mais accès portail échoué : ${body.message ?? body.error ?? 'erreur'}. Tu peux réessayer depuis sa fiche.`,
            { duration: 8000 },
          );
        } else {
          toast.success(
            `${consultant.first_name} ${consultant.last_name} est consultant + accès portail envoyé à ${email}.`,
            { duration: 8000 },
          );
        }
      } else {
        toast.success(
          `${consultant.first_name} ${consultant.last_name} est désormais consultant actif`,
        );
      }

      onPromoted?.(promoteRes.data);
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
            <ArrowRightCircle className="h-5 w-5 text-emerald-300" />
            Promouvoir en consultant
          </DialogTitle>
          <DialogDescription>
            <strong>
              {consultant.first_name} {consultant.last_name}
            </strong>{' '}
            rejoint la bibliothèque des consultants actifs et compte dans l&apos;effectif.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-violet-brand/20 bg-violet-brand/5 p-3">
            <input
              type="checkbox"
              checked={createPortal}
              onChange={(e) => setCreatePortal(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 accent-violet-brand cursor-pointer"
            />
            <div className="flex-1">
              <div className="text-sm font-medium inline-flex items-center gap-1.5">
                <UserPlus className="h-4 w-4 text-violet-300" />
                Créer aussi un accès portail consultant
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Le consultant pourra se connecter à <code className="text-violet-300">/login</code> avec ces
                identifiants pour voir ses missions, déposer ses CRA et consulter ses factures.
              </div>
            </div>
          </label>

          {createPortal && (
            <div className="grid grid-cols-2 gap-3">
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
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Promouvoir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
