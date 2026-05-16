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

// Clé localStorage pour mémoriser l'email du dernier login.
// On NE stocke PAS le mot de passe ici : c'est le rôle du gestionnaire
// de mots de passe du navigateur (autocomplete="current-password"), qui
// chiffre la donnée côté OS et la verrouille derrière le device unlock.
// Stocker un mdp en localStorage le rendrait volable par n'importe quel XSS.
const REMEMBER_EMAIL_KEY = 'centrium-remember-email';

export default function LoginPage() {
  const router = useRouter();
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

  async function onSubmit(values: LoginInput) {
    setLoading(true);
    const supabase = createClient();
    const { data: authRes, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error || !authRes.user) {
      setLoading(false);
      const msg = error?.message?.toLowerCase() ?? '';
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        toast.error(
          'Email non confirmé. Vérifie ta boîte mail (et les spams) pour valider ton compte avant de te connecter.',
          { duration: 6000 },
        );
      } else {
        toast.error('Identifiants invalides. Si tu viens de t\'inscrire, pense à valider ton email depuis le lien reçu par mail.', {
          duration: 6000,
        });
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

    setLoading(false);
    toastWelcome({ firstName: profile?.first_name ?? null });

    const redirectTo = profile?.role === 'consultant' ? '/portal/dashboard' : '/dashboard';
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <AuthShell
      title="Bon retour"
      subtitle="Connecte-toi à ton espace Centrium"
      footer={
        <>
          Pas encore de compte ?{' '}
          <Link href="/signup" className="text-magenta hover:text-magenta-neon transition font-medium">
            Créer une organisation
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-semibold tracking-wider uppercase text-white/60">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="vous@quadcore.fr"
              className="pl-9"
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs font-semibold tracking-wider uppercase text-white/60">
            Mot de passe
          </Label>
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
            Se souvenir de moi
          </span>
          <span
            className="ml-auto text-[10px] text-white/30"
            title="L'email est mémorisé localement. Le mot de passe reste géré par le gestionnaire de mots de passe du navigateur — beaucoup plus sécurisé."
          >
            Email uniquement
          </span>
        </label>

        <Button
          type="submit"
          size="lg"
          className="w-full bg-qc-gradient hover:opacity-90 shadow-glow-magenta"
          disabled={loading}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Se connecter
        </Button>
      </form>
    </AuthShell>
  );
}
