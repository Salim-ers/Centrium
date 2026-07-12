'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Mail, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginSchema, type LoginInput } from '@/lib/validators';
import { createClient } from '@/lib/supabase/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { toastWelcome } from '@/components/auth/WelcomeToast';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { markSessionActive } from '@/hooks/useSessionPresence';

// Clé localStorage pour mémoriser l'email du dernier login.
// On NE stocke PAS le mot de passe ici : c'est le rôle du gestionnaire
// de mots de passe du navigateur (autocomplete="current-password"), qui
// chiffre la donnée côté OS et la verrouille derrière le device unlock.
// Stocker un mdp en localStorage le rendrait volable par n'importe quel XSS.
const REMEMBER_EMAIL_KEY = 'centrium-remember-email';

// Messages FR pour les erreurs remontées par /auth/callback et
// /auth/set-password via ?error=… — avant, le param était ignoré et
// l'utilisateur atterrissait sur le login sans explication.
function urlErrorMessages(isEn: boolean): Record<string, string> {
  return {
    session_expired: isEn
      ? 'Your link has expired or has already been used. Request a new one via "Forgot password".'
      : 'Ton lien a expiré ou a déjà été utilisé. Demande un nouveau lien via « Mot de passe oublié ».',
    missing_code: isEn
      ? 'Invalid or incomplete link. Reopen the link from your email, or request a new one.'
      : 'Lien invalide ou incomplet. Réouvre le lien depuis ton email, ou demande-en un nouveau.',
    otp_expired: isEn
      ? 'This link has expired. Request a new one via "Forgot password".'
      : 'Ce lien a expiré. Demande un nouveau lien via « Mot de passe oublié ».',
    access_denied: isEn
      ? 'This link is no longer valid (already used or revoked). Request a new one.'
      : 'Ce lien n\'est plus valide (déjà utilisé ou révoqué). Demande un nouveau lien.',
  };
}

export default function LoginPage() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const isEn = locale === 'en';
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  // Pré-remplit l'email à partir du dernier login mémorisé.
  // localStorage n'existe pas au SSR → on lit dans un useEffect.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (stored) {
      setValue('email', stored);
      setRemember(true);
    } else {
      // Si aucune mémo précédente, on décoche par défaut pour respecter
      // un choix explicite à la prochaine connexion.
      setRemember(false);
    }
  }, [setValue]);

  // Affiche les erreurs de lien (?error=session_expired|missing_code|…)
  // remontées par /auth/callback. window.location plutôt que
  // useSearchParams pour éviter le boundary Suspense sur ce client page.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const err = new URLSearchParams(window.location.search).get('error');
    if (!err) return;
    toast.error(
      urlErrorMessages(isEn)[err] ??
        (isEn ? 'Unable to sign in — try again.' : 'Connexion impossible — réessaie.'),
      {
        duration: 8000,
      },
    );
    // Nettoie l'URL pour ne pas re-toaster au refresh.
    window.history.replaceState(null, '', '/login');
  }, [isEn]);

  // Retour du paiement Stripe après le self-signup (/essai) : essai démarré.
  // On pré-remplit l'email et on souhaite la bienvenue.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('welcome') !== 'trial') return;
    const email = params.get('email');
    if (email) setValue('email', email);
    toast.success(
      isEn
        ? '🎉 Your trial has started! Sign in to access your workspace.'
        : '🎉 Ton essai a démarré ! Connecte-toi pour accéder à ton espace.',
      {
        duration: 9000,
      },
    );
    window.history.replaceState(null, '', '/login');
  }, [setValue, isEn]);

  async function onSubmit(values: LoginInput) {
    setLoading(true);

    // Pré-flight anti brute-force (10/5min par IP + 5/15min par email —
    // cf. /api/auth/throttle). Défense en profondeur : on bloque AVANT
    // d'atteindre Supabase Auth. Une erreur réseau sur le throttle ne
    // bloque pas le login (fail-open, Supabase rate-limite aussi).
    try {
      const throttleRes = await fetch('/api/auth/throttle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, action: 'login' }),
      });
      if (throttleRes.status === 429) {
        const body = await throttleRes.json().catch(() => ({}));
        setLoading(false);
        toast.error(
          body.message ??
            (isEn
              ? 'Too many attempts. For your security, wait a few minutes before trying again.'
              : 'Trop de tentatives. Pour ta sécurité, attends quelques minutes avant de réessayer.'),
          { duration: 8000 },
        );
        return;
      }
    } catch {
      /* réseau — on laisse le signIn tenter */
    }

    const supabase = createClient();
    const { data: authRes, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error || !authRes.user) {
      setLoading(false);
      const rawMsg = error?.message ?? '';
      const msg = rawMsg.toLowerCase();
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        // Cas spécifique non couvert par le dict — on garde le message Supabase
        // brut s'il est pertinent, sinon fallback générique.
        toast.error(rawMsg || t.login.errors.generic, { duration: 6000 });
      } else if (
        msg.includes('invalid login credentials') ||
        msg.includes('invalid credentials') ||
        msg.includes('email ou mot de passe incorrect')
      ) {
        toast.error(t.login.errors.invalid, { duration: 6000 });
      } else if (rawMsg) {
        // Autres erreurs Supabase : garde le message renvoyé.
        toast.error(rawMsg, { duration: 6000 });
      } else {
        toast.error(t.login.errors.generic, { duration: 6000 });
      }
      return;
    }

    // Timeout sur le fetch profile pour ne pas bloquer la redirection
    // si Supabase stall. Le middleware résoudra le bon redirect de toute façon.
    const profilePromise = supabase
      .from('profiles')
      .select('role, first_name')
      .eq('id', authRes.user.id)
      .maybeSingle();
    const timeoutPromise = new Promise<{ data: null }>((resolve) =>
      setTimeout(() => resolve({ data: null }), 5000),
    );
    const { data: profile } = (await Promise.race([
      profilePromise,
      timeoutPromise,
    ])) as { data: { role: string; first_name: string | null } | null };

    // Persiste / efface l'email mémorisé selon le choix "Se souvenir".
    if (typeof window !== 'undefined') {
      if (remember) {
        window.localStorage.setItem(REMEMBER_EMAIL_KEY, values.email);
      } else {
        window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    }

    // Trace la connexion + alerte email "nouvel appareil" si la policy org
    // l'active (cf. /api/auth/track-login). Fire-and-forget : ne retarde
    // jamais la redirection.
    void fetch('/api/auth/track-login', { method: 'POST' }).catch(() => {});

    setLoading(false);
    toastWelcome({ firstName: profile?.first_name ?? null });

    // Marque cette session navigateur comme active (flag sessionStorage).
    // Sans ce flag, le hook useSessionPresence forcera un re-logout dès
    // qu'une page protégée se chargera — c'est ce qui permet de garantir
    // qu'on ne reste pas connecté quand le navigateur a été fermé puis
    // restauré par Chrome ("Continue where you left off").
    markSessionActive();

    const redirectTo = profile?.role === 'consultant' ? '/portal/dashboard' : '/dashboard';
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <AuthShell
      title={t.login.title}
      subtitle={t.login.subtitle}
      footer={
        <>
          {t.login.noAccount}{' '}
          <Link href="/signup" className="text-magenta hover:text-magenta-neon transition font-medium">
            {t.login.createAccount}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-semibold tracking-wider uppercase text-white/60">
            {t.login.email}
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="vous@centrium-platform.com"
              className="pl-9"
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-semibold tracking-wider uppercase text-white/60">
              {t.login.password}
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-white/55 hover:text-magenta-neon transition"
            >
              {t.login.forgotPassword}
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              className="pl-9"
              {...register('password')}
            />
          </div>
          {errors.password && (
            <p className="text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/[0.04] accent-magenta-neon cursor-pointer"
          />
          <span className="text-sm text-white/70 group-hover:text-white/90 transition">
            {t.login.remember}
          </span>
          <span
            className="ml-auto text-[10px] text-white/30"
            title={
              isEn
                ? 'The email is stored locally. The password stays managed by your browser\'s password manager — much more secure.'
                : "L'email est mémorisé localement. Le mot de passe reste géré par le gestionnaire de mots de passe du navigateur — beaucoup plus sécurisé."
            }
          >
            {t.login.emailOnly}
          </span>
        </label>

        <Button
          type="submit"
          size="lg"
          className="w-full bg-qc-gradient hover:opacity-90 shadow-glow-magenta"
          disabled={loading}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? t.login.submitting : t.login.submit}
        </Button>
      </form>
    </AuthShell>
  );
}
