'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, MailCheck, MailQuestion, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import { useLocale } from '@/lib/i18n/LocaleProvider';

// =========================================================================
// Activation d'une invitation d'équipe SANS session.
// -------------------------------------------------------------------------
// L'invité a un token valide mais pas de session (lien copié-collé, autre
// navigateur, email d'origine perdu…). Un clic → POST /api/invitations/
// resend → Supabase renvoie l'email d'activation → l'invité clique le
// lien reçu → /auth/callback établit la session → /invite/accept →
// /auth/set-password. Boucle fermée, token unique, expirable, jamais
// réutilisable après acceptation.
// =========================================================================

type Phase = 'idle' | 'sending' | 'sent' | 'error';

export function InviteActivationCard({ token }: { token: string }) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [phase, setPhase] = useState<Phase>('idle');
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function sendActivation() {
    setPhase('sending');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/invitations/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(
          body.message ??
            (isEn
              ? 'Unable to send right now — try again in a few minutes.'
              : 'Envoi impossible pour le moment — réessaie dans quelques minutes.'),
        );
        setPhase('error');
        return;
      }
      setMaskedEmail(body.data?.masked_email ?? null);
      setOrgName(body.data?.organization_name ?? null);
      setPhase('sent');
    } catch {
      setErrorMsg(
        isEn
          ? 'Network error — check your connection then try again.'
          : 'Erreur réseau — vérifie ta connexion puis réessaie.',
      );
      setPhase('error');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative">
      <div className="absolute top-6 left-1/2 -translate-x-1/2">
        <CentriumWordmark size="md" />
      </div>

      <Card className="w-full max-w-md relative">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-full">
              {phase === 'sent' ? (
                <MailCheck className="h-6 w-6 text-success" />
              ) : (
                <ShieldCheck className="h-6 w-6 text-primary" />
              )}
            </div>
          </div>
          <CardTitle className="text-xl">
            {phase === 'sent'
              ? isEn
                ? 'Email sent!'
                : 'Email envoyé !'
              : isEn
                ? 'Activate your invitation'
                : 'Active ton invitation'}
          </CardTitle>
          <CardDescription>
            {phase === 'sent' ? (
              isEn ? (
                <>
                  An activation link has just been sent to{' '}
                  <strong className="text-foreground">{maskedEmail ?? 'your address'}</strong>
                  {orgName ? (
                    <>
                      {' '}
                      to join <strong className="text-foreground">{orgName}</strong>
                    </>
                  ) : null}
                  . Click the link in the email to create your password — remember to
                  check your spam folder.
                </>
              ) : (
                <>
                  Un lien d&apos;activation vient d&apos;être envoyé à{' '}
                  <strong className="text-foreground">{maskedEmail ?? 'ton adresse'}</strong>
                  {orgName ? (
                    <>
                      {' '}
                      pour rejoindre <strong className="text-foreground">{orgName}</strong>
                    </>
                  ) : null}
                  . Clique sur le lien dans l&apos;email pour créer ton mot de passe —
                  pense à vérifier tes spams.
                </>
              )
            ) : isEn ? (
              <>
                For security reasons, your account must be activated from the link
                received by email. Click below to (re)receive this email — it
                establishes your session then takes you to create your password.
              </>
            ) : (
              <>
                Pour des raisons de sécurité, ton compte doit être activé depuis le
                lien reçu par email. Clique ci-dessous pour (re)recevoir cet email —
                il établit ta session puis t&apos;emmène créer ton mot de passe.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {phase !== 'sent' && (
            <Button className="w-full" onClick={sendActivation} disabled={phase === 'sending'}>
              {phase === 'sending' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MailQuestion className="h-4 w-4" />
              )}
              {phase === 'sending'
                ? isEn
                  ? 'Sending…'
                  : 'Envoi en cours…'
                : isEn
                  ? 'Send me the activation link'
                  : "M'envoyer le lien d'activation"}
            </Button>
          )}
          {phase === 'sent' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={sendActivation}
            >
              {isEn ? 'Resend the email' : <>Renvoyer l&apos;email</>}
            </Button>
          )}
          {errorMsg && (
            <p className="text-xs text-destructive text-center leading-relaxed">{errorMsg}</p>
          )}
          <p className="text-center text-xs text-muted-foreground">
            {isEn ? 'Already have an account? ' : 'Déjà un compte ? '}
            <Link href="/login" className="text-primary hover:underline">
              {isEn ? 'Sign in' : 'Se connecter'}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
