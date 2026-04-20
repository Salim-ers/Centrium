'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { loginSchema, type LoginInput } from '@/lib/validators';
import { createClient } from '@/lib/supabase/client';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';

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
      toast.error('Identifiants invalides');
      return;
    }

    // Routage selon le rôle du profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authRes.user.id)
      .maybeSingle();

    setLoading(false);
    toast.success('Connexion réussie');

    const redirectTo = profile?.role === 'consultant' ? '/portal/dashboard' : '/dashboard';
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight-300 p-6">
      <div className="absolute inset-0 bg-gradient-radial opacity-30 pointer-events-none" />
      <Card className="w-full max-w-md relative">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <QuadCoreLogo size="lg" variant="dark" />
          </div>
          <CardDescription>Plateforme IT Services &amp; Consulting</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="vous@quadcore.fr" {...register('email')} />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Se connecter
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Plateforme réservée aux collaborateurs QuadCore.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
