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
          body.message ?? 'Envoi impossible pour le moment — réessaie dans quelques minutes.',
        );
        setPhase('error');
        return;
      }
      setMaskedEmail(body.data?.masked_email ?? null);
      setOrgName(body.data?.organization_name ?? null);
      setPhase('sent');
    } catch {
      setErrorMsg('Erreur réseau — vérifie ta connexion puis réessaie.');
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
            <div className="p-3 bg-violet-500/10 rounded-full">
              {phase === 'sent' ? (
                <MailCheck className="h-6 w-6 text-emerald-400" />
              ) : (
                <ShieldCheck className="h-6 w-6 text-violet-300" />
              )}
            </div>
          </div>
          <CardTitle className="text-xl">
            {phase === 'sent' ? 'Email envoyé !' : 'Active ton invitation'}
          </CardTitle>
          <CardDescription>
            {phase === 'sent' ? (
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
              {phase === 'sending' ? 'Envoi en cours…' : "M'envoyer le lien d'activation"}
            </Button>
          )}
          {phase === 'sent' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={sendActivation}
            >
              Renvoyer l&apos;email
            </Button>
          )}
          {errorMsg && (
            <p className="text-xs text-rose-400 text-center leading-relaxed">{errorMsg}</p>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-magenta hover:underline">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
