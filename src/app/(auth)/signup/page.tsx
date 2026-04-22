'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, User, Mail, Lock, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signupSchema, type SignupInput } from '@/lib/validators';
import { createClient } from '@/lib/supabase/client';
import { AuthShell } from '@/components/auth/AuthShell';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(values: SignupInput) {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          first_name: values.first_name,
          last_name: values.last_name,
        },
      },
    });

    if (error || !data.user) {
      setLoading(false);
      toast.error(error?.message ?? 'Inscription échouée');
      return;
    }

    toast.success('Compte créé');

    const next = inviteToken ? `/invite/accept?token=${inviteToken}` : '/onboarding';
    router.push(next);
    router.refresh();
  }

  return (
    <AuthShell
      title={inviteToken ? 'Rejoins ton équipe' : 'Crée ton compte'}
      subtitle={
        inviteToken
          ? 'Finalise ton inscription pour accéder à l\'organisation'
          : 'Quelques infos et tu es prêt à piloter ton ESN'
      }
      footer={
        <>
          Déjà un compte ?{' '}
          <Link href="/login" className="text-magenta hover:text-magenta-neon transition font-medium">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="first_name" className="text-xs font-semibold tracking-wider uppercase text-white/60">
              Prénom
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
              <Input id="first_name" autoComplete="given-name" className="pl-9" {...register('first_name')} />
            </div>
            {errors.first_name && (
              <p className="text-xs text-red-400">{errors.first_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name" className="text-xs font-semibold tracking-wider uppercase text-white/60">
              Nom
            </Label>
            <Input id="last_name" autoComplete="family-name" {...register('last_name')} />
            {errors.last_name && (
              <p className="text-xs text-red-400">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-semibold tracking-wider uppercase text-white/60">
            Email professionnel
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="vous@votre-entreprise.fr"
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
              autoComplete="new-password"
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
          Créer mon compte
        </Button>

        <p className="text-[11px] text-center text-white/50 inline-flex items-center justify-center gap-1.5 w-full">
          <Sparkles className="h-3 w-3 text-violet-300" />
          Sans engagement · résiliation en 1 clic
        </p>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
