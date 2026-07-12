'use client';

import { useEffect, useState } from 'react';
import { Loader2, Mail, ArrowRightCircle, UserPlus, ShieldCheck } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormDialogContent } from '@/components/ui/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { consultantService } from '@/lib/services/consultant.service';
import { createClient } from '@/lib/supabase/client';
import {
  notifyError,
  notifyPromoted,
  notifyWarning,
} from '@/lib/notify';
import { useLocale } from '@/lib/i18n/LocaleProvider';
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
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [createPortal, setCreatePortal] = useState(true);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  // True quand le profil a déjà un compte portail (ex: prospect re-promu).
  const [hasExistingPortal, setHasExistingPortal] = useState(false);
  const [checkingPortal, setCheckingPortal] = useState(false);

  useEffect(() => {
    if (!open || !consultant) {
      setHasExistingPortal(false);
      return;
    }
    setEmail(consultant.email ?? '');
    setCreatePortal(true);
    // Vérifier en DB si un profile portail existe déjà pour ce consultant.
    // Évite de re-proposer la création quand on re-promeut un ex-consultant
    // qui était redescendu en vivier.
    setCheckingPortal(true);
    const supabase = createClient();
    supabase
      .from('profiles')
      .select('id')
      .eq('consultant_id', consultant.id)
      .maybeSingle()
      .then(({ data }) => {
        const exists = !!data;
        setHasExistingPortal(exists);
        if (exists) setCreatePortal(false);
        setCheckingPortal(false);
      });
  }, [open, consultant]);

  async function submit() {
    if (!consultant) return;
    if (createPortal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notifyError(isEn ? 'Invalid portal email' : 'Email du portail invalide');
      return;
    }

    setBusy(true);
    try {
      // 1) Bascule is_prospect → false
      const promoteRes = await consultantService.promoteToConsultant(consultant.id);
      if (promoteRes.error || !promoteRes.data) {
        notifyError((isEn ? 'Promotion failed: ' : 'Promotion impossible : ') + (promoteRes.error?.message ?? ''));
        return;
      }

      // 2) Si demandé ET pas déjà existant, envoie l'invitation portail
      if (createPortal && !hasExistingPortal) {
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
          notifyWarning(
            isEn
              ? `Promoted to consultant, but sending the portal invitation failed: ${body.message ?? body.error ?? 'error'}. You can try again from their profile.`
              : `Promu en consultant, mais envoi de l'invitation portail échoué : ${body.message ?? body.error ?? 'erreur'}. Tu peux réessayer depuis sa fiche.`,
            { duration: 8000 },
          );
        } else if (body?.data?.invitation_sent === false) {
          // Email pas parti (SMTP) — l'invite_url est optionnel.
          const inviteUrl: string | null =
            typeof body?.data?.invite_url === 'string' ? body.data.invite_url : null;
          if (inviteUrl) {
            try {
              await navigator.clipboard.writeText(inviteUrl);
            } catch {
              /* clipboard refused */
            }
          }
          const errCode = body?.data?.email_error_code ?? 'smtp_failed';
          notifyWarning(
            isEn
              ? inviteUrl
                ? `${consultant.first_name} ${consultant.last_name} promoted, but the invitation email could not be sent (${errCode}). Link copied to the clipboard — send it manually to ${email}.`
                : `${consultant.first_name} ${consultant.last_name} promoted, but the invitation email could not be sent (${errCode}) and no fallback link was generated. Try again from the profile.`
              : inviteUrl
                ? `${consultant.first_name} ${consultant.last_name} promu, mais l'email d'invitation n'a pas pu être envoyé (${errCode}). Lien copié dans le presse-papier — envoie-le manuellement à ${email}.`
                : `${consultant.first_name} ${consultant.last_name} promu, mais l'email d'invitation n'a pas pu être envoyé (${errCode}) et aucun lien de secours n'a été généré. Réessaie depuis la fiche.`,
            { duration: 12000 },
          );
        } else {
          notifyPromoted(
            isEn
              ? `${consultant.first_name} ${consultant.last_name} promoted — access email sent to ${email}`
              : `${consultant.first_name} ${consultant.last_name} promu — email d'accès envoyé à ${email}`,
          );
        }
      } else if (hasExistingPortal) {
        notifyPromoted(
          isEn
            ? `${consultant.first_name} ${consultant.last_name} back as an active consultant (portal access kept)`
            : `${consultant.first_name} ${consultant.last_name} de retour en consultant actif (accès portail conservé)`,
        );
      } else {
        notifyPromoted(
          isEn
            ? `${consultant.first_name} ${consultant.last_name} is now an active consultant`
            : `${consultant.first_name} ${consultant.last_name} est désormais consultant actif`,
        );
      }

      onPromoted?.(promoteRes.data);
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
      <FormDialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightCircle className="h-5 w-5 text-emerald-300" />
            {isEn ? 'Promote to consultant' : 'Promouvoir en consultant'}
          </DialogTitle>
          <DialogDescription>
            <strong>
              {consultant.first_name} {consultant.last_name}
            </strong>{' '}
            {isEn
              ? 'joins the library of active consultants and counts towards headcount.'
              : "rejoint la bibliothèque des consultants actifs et compte dans l'effectif."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {hasExistingPortal ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-3 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300 shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                {isEn ? (
                  <>
                    This consultant <strong className="text-foreground">already has active portal access</strong>.
                    It will be reactivated automatically, no new email is sent.
                  </>
                ) : (
                  <>
                    Ce consultant a <strong className="text-foreground">déjà un accès portail actif</strong>.
                    Il sera réactivé automatiquement, aucun nouvel email n&apos;est envoyé.
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
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
                    {isEn ? 'Also create consultant portal access' : 'Créer aussi un accès portail consultant'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {isEn
                      ? 'We send the consultant a Centrium email with a link to choose their own password. No secret is stored on the admin side.'
                      : "On envoie au consultant un email Centrium avec un lien pour qu'il choisisse son propre mot de passe. Aucun secret n'est stocké côté admin."}
                  </div>
                </div>
              </label>

              {createPortal && (
                <div>
                  <Label>{isEn ? 'Portal email *' : 'Email du portail *'}</Label>
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
                  <p className="mt-1 text-[11px] text-violet-300/80">
                    {isEn
                      ? 'The invitation link expires after 7 days.'
                      : "Le lien d'invitation expire après 7 jours."}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {isEn ? 'Cancel' : 'Annuler'}
          </Button>
          <Button onClick={submit} disabled={busy || checkingPortal}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEn ? 'Promote' : 'Promouvoir'}
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}
