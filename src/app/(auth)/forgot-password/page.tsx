'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/AuthShell';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { toast } from 'sonner';

const schema = z.object({ email: z.string().email() });
type Input = z.infer<typeof schema>;

// =========================================================================
// /auth/forgot-password — Demande de réinitialisation du mot de passe
// -------------------------------------------------------------------------
// Flow :
//   1. User entre son email
//   2. supabase.auth.resetPasswordForEmail() → Supabase envoie l'email
//      "recovery" (template versionné dans supabase/templates/recovery.html)
//      via SMTP Resend → from: noreply@centrium-platform.com
//   3. User clique le lien dans l'email → /auth/v1/verify → /auth/callback
//      → exchange code → /auth/set-password?welcome=recovery
//   4. User pose son mdp → /dashboard
//
// SÉCURITÉ : on affiche TOUJOURS le même message succès, qu'un compte
// existe ou non, pour éviter l'énumération d'emails (timing attack côté
// API : Supabase renvoie le même délai dans les deux cas).
// =========================================================================

export default function ForgotPasswordPage() {
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Input>({ resolver: zodResolver(schema) });

  async function onSubmit({ email }: Input) {
    setLoading(true);
    const supabase = createClient();
    // redirectTo absolu requis. window.location.origin fonctionne en dev
    // (localhost) ET en prod (centrium-platform.com) tant que l'URL est
    // whitelistée côté Supabase Auth → URL Configuration.
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setLoading(false);
    if (error) {
      toast.error(t.forgotPassword.errors.generic, { duration: 6000 });
      return;
    }
    // Double feedback : toast + switch d'écran. Le user ne peut pas rater.
    toast.success(t.forgotPassword.successTitle, { duration: 5000 });
    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell
        title={t.forgotPassword.successTitle}
        subtitle={t.forgotPassword.successBody}
        footer={
          <Link
            href="/login"
            className="text-magenta hover:text-magenta-neon transition font-medium"
          >
            {t.forgotPassword.backToLogin}
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="p-3 bg-violet-500/10 rounded-full">
            <CheckCircle2 className="h-8 w-8 text-violet-300" />
          </div>
          <p className="text-center text-sm text-white/70 max-w-sm">
            {t.forgotPassword.successBody}
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t.forgotPassword.title}
      subtitle={t.forgotPassword.subtitle}
      footer={
        <Link
          href="/login"
          className="text-magenta hover:text-magenta-neon transition font-medium"
        >
          {t.forgotPassword.backToLogin}
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="text-xs font-semibold tracking-wider uppercase text-white/60"
          >
            {t.forgotPassword.email}
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

        <Button
          type="submit"
          size="lg"
          className="w-full bg-qc-gradient hover:opacity-90 shadow-glow-magenta"
          disabled={loading}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? t.forgotPassword.submitting : t.forgotPassword.submit}
        </Button>
      </form>
    </AuthShell>
  );
}
