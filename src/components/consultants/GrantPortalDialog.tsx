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
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { Consultant } from '@/types';

// Seuls ces 4 champs sont utilisés — le Pick permet d'ouvrir le dialog
// depuis des listes qui n'ont pas la fiche Consultant complète (en-mission).
type GrantTarget = Pick<Consultant, 'id' | 'first_name' | 'last_name' | 'email'>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultant: GrantTarget | null;
  onGranted?: (consultantId: string, email: string) => void;
};

export function GrantPortalDialog({
  open,
  onOpenChange,
  consultant,
  onGranted,
}: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
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
      notifyError(isEn ? 'Invalid email' : 'Email invalide');
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
        notifyError(body.message ?? body.error ?? (isEn ? `Error (${res.status})` : `Erreur (${res.status})`));
        return;
      }
      // Si l'email d'invitation n'a pas pu partir (rate-limit SMTP, etc.),
      // le backend renvoie invitation_sent=false + (éventuellement) une
      // invite_url copiable. On déclenche le warning même sans URL.
      const inviteFailed = body?.data?.invitation_sent === false;
      if (inviteFailed) {
        const inviteUrl: string | null =
          typeof body?.data?.invite_url === 'string' ? body.data.invite_url : null;
        if (inviteUrl) {
          try {
            await navigator.clipboard.writeText(inviteUrl);
          } catch {
            /* clipboard refused */
          }
        }
        const { toast } = await import('sonner');
        const errCode = body?.data?.email_error_code ?? 'smtp_failed';
        toast.warning(
          isEn
            ? inviteUrl
              ? `Portal access created, but the email could not be sent (${errCode}). Invitation link copied to the clipboard — send it manually to ${email}.`
              : `Portal access created, but the email could not be sent (${errCode}) and no fallback link was generated. Try again from the profile.`
            : inviteUrl
              ? `Accès portail créé, mais l'email n'a pas pu être envoyé (${errCode}). Lien d'invitation copié dans le presse-papier — envoie-le manuellement à ${email}.`
              : `Accès portail créé, mais l'email n'a pas pu être envoyé (${errCode}) et aucun lien de secours n'a été généré. Réessaie depuis la fiche.`,
          { duration: 12000 },
        );
      } else {
        notifyCreated(
          isEn
            ? `Access email sent to ${consultant.first_name} ${consultant.last_name} (${email}). The link expires after 7 days.`
            : `Email d'accès envoyé à ${consultant.first_name} ${consultant.last_name} (${email}). Le lien expire après 7 jours.`,
          { duration: 8000 },
        );
      }
      onGranted?.(consultant.id, email);
      onOpenChange(false);
    } catch (e) {
      notifyError((isEn ? 'Error: ' : 'Erreur : ') + (e instanceof Error ? e.message : (isEn ? 'unknown' : 'inconnue')));
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
            <KeyRound className="h-5 w-5 text-primary" />
            {isEn ? 'Create portal access' : 'Créer un accès portail'}
          </DialogTitle>
          <DialogDescription>
            {isEn ? (
              <>
                We send{' '}
                <strong>
                  {consultant.first_name} {consultant.last_name}
                </strong>{' '}
                a Centrium email with a link to choose their own password. No secret is
                stored on the admin side.
              </>
            ) : (
              <>
                On envoie à{' '}
                <strong>
                  {consultant.first_name} {consultant.last_name}
                </strong>{' '}
                un email Centrium avec un lien pour qu&apos;il choisisse son propre
                mot de passe. Aucun secret n&apos;est stocké côté admin.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 pt-2">
          <Label>{isEn ? 'Portal email *' : 'Email du portail *'}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@example.com"
              className="pl-9"
              autoComplete="off"
            />
          </div>
          <p className="text-[11px] text-primary">
            {isEn
              ? 'The invitation link expires after 7 days.'
              : "Le lien d'invitation expire après 7 jours."}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {isEn ? 'Cancel' : 'Annuler'}
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEn ? 'Send invitation' : "Envoyer l'invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
