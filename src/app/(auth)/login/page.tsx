'use client';

import { useState } from 'react';
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

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

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
      .select('role')
      .eq('id', authRes.user.id)
      .maybeSingle();
    const timeoutPromise = new Promise<{ data: null }>((resolve) =>
      setTimeout(() => resolve({ data: null }), 5000),
    );
    const { data: profile } = (await Promise.race([
      profilePromise,
      timeoutPromise,
    ])) as { data: { role: string } | null };

    setLoading(false);
    toast.success('Connexion réussie');

    const redirectTo = profile?.role === 'consultant' ? '/portal/dashboard' : '/dashboard';
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <AuthShell
      title="Bon retour"
      subtitle="Connecte-toi à ton espace QuadCore"
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
