'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Loader2, Lock, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import { notifyCreated, notifyError } from '@/lib/notify';
import { markSessionActive } from '@/hooks/useSessionPresence';

// =========================================================================
// Formulaire partagé de définition de mot de passe.
// -------------------------------------------------------------------------
//   /auth/first-password  (mode='first')  → invité (membre org ou consultant)
//                                           crée son PREMIER mot de passe
//   /auth/reset-password   (mode='reset')  → "mot de passe oublié"
//
// Les deux pages arrivent APRÈS /auth/callback (session déjà posée par
// verifyOtp côté serveur). États gérés ici, sans jamais renvoyer vers la
// vitrine :
//   - lien expiré / invalide (?error=link_expired|invalid_link)
//   - session absente (lien consommé dans un autre navigateur, cookies
//     bloqués…) → carte d'erreur avec action de renvoi
//   - mot de passe trop court / confirmation différente / mot de passe
//     compromis (HIBP) → erreurs inline
// =========================================================================

type Mode = 'first' | 'reset';

type PasswordCheck = {
  ok: boolean;
  errors: string[];
  strength: 0 | 1 | 2 | 3 | 4;
};

const STRENGTH_LABEL: Record<PasswordCheck['strength'], string> = {
  0: 'Très faible',
  1: 'Faible',
  2: 'Correct',
  3: 'Solide',
  4: 'Excellent',
};

const LINK_ERROR_COPY: Record<string, { title: string; body: string }> = {
  link_expired: {
    title: 'Lien expiré ou déjà utilisé',
    body: 'Les liens envoyés par email sont à usage unique et expirent pour ta sécurité.',
  },
  invalid_link: {
    title: 'Lien invalide',
    body: 'Ce lien est incomplet ou altéré (certaines messageries coupent les URLs longues).',
  },
};

export function PasswordSetupForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const welcome = params?.get('welcome'); // 'portal' = consultant, 'invited' = membre org
  const orgName = params?.get('org');
  const linkError = params?.get('error');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(!linkError);
  // null = session OK ; sinon carte d'erreur "session absente"
  const [sessionLost, setSessionLost] = useState(false);
  const [check, setCheck] = useState<PasswordCheck | null>(null);

  // Vérification live (debounce 450 ms) : policy + fuites HIBP + force.
  useEffect(() => {
    if (password.length < 8) {
      setCheck(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/password-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        if (!res.ok) return; // rate-limited / erreur → fail-open
        const body = (await res.json()) as { data?: PasswordCheck };
        if (!cancelled && body.data) setCheck(body.data);
      } catch {
        /* réseau — fail-open */
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [password]);

  // Session vérifiée CÔTÉ SERVEUR (GET /api/auth/session — pas de
  // navigator.locks). Session absente → carte d'erreur contextualisée,
  // JAMAIS de redirection vers la vitrine ou le login sec.
  useEffect(() => {
    if (linkError) return; // déjà en erreur de lien, pas besoin de check
    let cancelled = false;
    const watchdog = setTimeout(() => {
      if (!cancelled) setCheckingSession(false); // fail-open → le POST revalidera
    }, 8000);
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled) return;
        clearTimeout(watchdog);
        if (body && body.data?.authenticated === false) {
          setSessionLost(true);
        } else {
          // Entrée légitime par lien email : pose le flag de présence
          // (sinon SessionPresenceGate déconnecte à la première page
          // protégée après la création du mot de passe).
          markSessionActive();
        }
        setCheckingSession(false);
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(watchdog);
          setCheckingSession(false);
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(watchdog);
    };
  }, [linkError]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      notifyError('Mot de passe : 8 caractères minimum');
      return;
    }
    if (password !== confirm) {
      notifyError('Les deux mots de passe ne correspondent pas');
      return;
    }
    if (check && !check.ok) {
      notifyError(check.errors[0] ?? 'Mot de passe refusé — choisis-en un autre.');
      return;
    }
    setBusy(true);
    let ok = false;
    try {
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          setSessionLost(true);
          return;
        }
        notifyError(body.message ?? 'Mise à jour impossible — réessaie.');
        return;
      }
      ok = true;
    } catch {
      notifyError('Erreur réseau — vérifie ta connexion puis réessaie.');
      return;
    } finally {
      if (!ok) setBusy(false);
    }
    notifyCreated(
      mode === 'reset'
        ? 'Mot de passe mis à jour'
        : 'Mot de passe défini — bienvenue sur Centrium',
    );
    markSessionActive();
    // Connecté : direction l'espace. Le middleware corrige la destination
    // selon le rôle (consultant → /portal/dashboard).
    if (welcome === 'portal') {
      router.push('/portal/dashboard');
    } else if (welcome === 'invited' && orgName) {
      router.push(`/dashboard?invited=${encodeURIComponent(orgName)}`);
    } else {
      router.push('/dashboard');
    }
  }

  // ---------- États d'erreur (lien / session) ----------
  if (linkError || sessionLost) {
    const copy =
      (linkError ? LINK_ERROR_COPY[linkError] : undefined) ??
      (sessionLost
        ? {
            title: 'Session introuvable',
            body:
              mode === 'reset'
                ? 'Ton lien a peut-être été ouvert dans un autre navigateur, ou il a expiré.'
                : 'Ton lien d’invitation a peut-être été ouvert dans un autre navigateur, ou il a expiré.',
          }
        : LINK_ERROR_COPY.link_expired);
    return (
      <Shell>
        <Card className="w-full max-w-md relative">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 bg-amber-500/10 rounded-full">
                <AlertTriangle className="h-6 w-6 text-amber-400" />
              </div>
            </div>
            <CardTitle className="text-xl">{copy.title}</CardTitle>
            <CardDescription>{copy.body}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mode === 'reset' ? (
              <>
                <Button asChild className="w-full">
                  <Link href="/forgot-password">Recevoir un nouveau lien</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">Retour à la connexion</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  Demande à ton administrateur de renvoyer l&apos;invitation — le
                  nouveau lien remplacera celui-ci.
                </p>
                <Button asChild className="w-full">
                  <Link href="/login">Aller à la connexion</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ---------- Formulaire ----------
  const heading =
    mode === 'reset'
      ? 'Réinitialise ton mot de passe'
      : 'Choisis ton mot de passe';
  const description =
    mode === 'reset'
      ? 'Choisis un nouveau mot de passe pour ton compte Centrium.'
      : welcome === 'portal'
        ? 'Tu as été ajouté en tant que consultant. Définis le mot de passe que tu utiliseras pour accéder à ton portail.'
        : orgName
          ? `Bienvenue dans ${orgName}. Définis le mot de passe que tu utiliseras pour te reconnecter.`
          : 'Définis le mot de passe qui te servira à te connecter à Centrium.';

  return (
    <Shell>
      <Card className="w-full max-w-md relative">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-violet-500/10 rounded-full">
              <ShieldCheck className="h-6 w-6 text-violet-300" />
            </div>
          </div>
          <CardTitle className="text-xl">{heading}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pw">
                {mode === 'reset' ? 'Nouveau mot de passe' : 'Mot de passe'}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
                <Input
                  id="pw"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  placeholder="8 caractères minimum"
                  autoComplete="new-password"
                  required
                />
              </div>

              {password.length >= 8 && check && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i < check.strength
                            ? check.strength >= 3
                              ? 'bg-emerald-400'
                              : check.strength === 2
                                ? 'bg-amber-400'
                                : 'bg-rose-400'
                            : 'bg-foreground/10'
                        }`}
                      />
                    ))}
                    <span
                      className={`ml-1 text-[10px] font-medium ${
                        check.strength >= 3
                          ? 'text-emerald-400'
                          : check.strength === 2
                            ? 'text-amber-400'
                            : 'text-rose-400'
                      }`}
                    >
                      {STRENGTH_LABEL[check.strength]}
                    </span>
                  </div>
                  {check.errors.length > 0 && (
                    <ul className="space-y-0.5">
                      {check.errors.map((err, i) => (
                        <li key={i} className="text-[11px] leading-snug text-rose-400">
                          {err}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirme le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="pl-9"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'reset' ? 'Mettre à jour et continuer' : 'Valider et continuer'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative">
      <div className="absolute inset-0 bg-gradient-radial opacity-30 pointer-events-none" />
      <div className="absolute top-6 left-1/2 -translate-x-1/2">
        <CentriumWordmark size="md" />
      </div>
      {children}
    </div>
  );
}
