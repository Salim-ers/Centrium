'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';

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

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordInner />
    </Suspense>
  );
}

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

function SetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const welcome = params?.get('welcome'); // 'portal' = consultant invité, 'invited' = membre org, 'recovery' = reset mdp
  const orgName = params?.get('org');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  // Résultat du check serveur (policy + HaveIBeenPwned + jauge de force).
  // null = pas encore vérifié / vérification indisponible (fail-open :
  // la policy Supabase côté serveur reste le filet).
  const [check, setCheck] = useState<PasswordCheck | null>(null);

  // Vérification live (debounce 450 ms) via /api/auth/password-check —
  // policy + fuites HIBP + score de force pour la jauge.
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

  // Vérifie la session au mount — CÔTÉ SERVEUR (GET /api/auth/session).
  // L'ancien supabase.auth.getUser() client passait par navigator.locks
  // (verrou partagé entre onglets) et pouvait pendre indéfiniment →
  // spinner infini. En cas d'erreur réseau on affiche le formulaire
  // (fail-open) : la route update-password revalidera la session.
  useEffect(() => {
    let cancelled = false;
    const watchdog = setTimeout(() => {
      if (!cancelled) setCheckingSession(false);
    }, 8000);
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled) return;
        clearTimeout(watchdog);
        if (body && body.data?.authenticated === false) {
          router.replace('/login?error=session_expired');
          return;
        }
        // Session confirmée (lien email vérifié) : pose le flag de
        // présence — sans lui, SessionPresenceGate déconnecterait dès la
        // première page protégée après la création du mot de passe.
        markSessionActive();
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
  }, [router]);

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
    // Bloque les mots de passe refusés par la policy ou retrouvés dans des
    // fuites publiques (HIBP). Si le check n'a pas pu tourner (réseau,
    // rate-limit), on laisse passer — la policy Supabase serveur tranche.
    if (check && !check.ok) {
      notifyError(check.errors[0] ?? 'Mot de passe refusé — choisis-en un autre.');
      return;
    }
    setBusy(true);
    // Mise à jour CÔTÉ SERVEUR (cf. /api/auth/update-password) — le
    // updateUser() client pouvait pendre sur navigator.locks (multi-onglets).
    let ok = false;
    try {
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifyError(body.message ?? 'Mise à jour impossible — réessaie.');
        if (res.status === 401) router.replace('/login?error=session_expired');
        return;
      }
      ok = true;
    } catch {
      notifyError('Erreur réseau — vérifie ta connexion puis réessaie.');
      return;
    } finally {
      if (!ok) setBusy(false);
    }
    notifyCreated('Mot de passe défini — bienvenue sur Centrium');
    markSessionActive();
    // Le serveur connaît son rôle ; on laisse le middleware router au bon
    // dashboard (consultant → /portal/dashboard, autre → /dashboard).
    if (welcome === 'portal') {
      router.push('/portal/dashboard');
    } else if (welcome === 'invited' && orgName) {
      router.push(`/dashboard?invited=${encodeURIComponent(orgName)}`);
    } else {
      router.push('/dashboard');
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative">
      <div className="absolute inset-0 bg-gradient-radial opacity-30 pointer-events-none" />
      <div className="absolute top-6 left-1/2 -translate-x-1/2">
        <CentriumWordmark size="md" />
      </div>

      <Card className="w-full max-w-md relative">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-violet-500/10 rounded-full">
              <ShieldCheck className="h-6 w-6 text-violet-300" />
            </div>
          </div>
          <CardTitle className="text-xl">Choisis ton mot de passe</CardTitle>
          <CardDescription>
            {welcome === 'portal'
              ? 'Tu as été ajouté en tant que consultant. Définis le mot de passe que tu utiliseras pour accéder à ton portail.'
              : welcome === 'invited' && orgName
                ? `Bienvenue dans ${orgName}. Définis le mot de passe que tu utiliseras pour te reconnecter.`
                : welcome === 'recovery'
                  ? 'Choisis un nouveau mot de passe pour ton compte Centrium.'
                  : 'Définis le mot de passe qui te servira à te connecter à Centrium.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pw">Nouveau mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
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

              {/* Jauge de force + erreurs policy/HIBP en temps réel */}
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
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
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
              Valider et continuer
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
