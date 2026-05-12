'use client';

import { Suspense, useState } from 'react';
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
import { createClient } from '@/lib/supabase/client';
import { notifyCreated, notifyError } from '@/lib/notify';

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordInner />
    </Suspense>
  );
}

function SetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const welcome = params?.get('welcome'); // 'portal' = consultant invité
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      notifyError(error.message);
      setBusy(false);
      return;
    }
    notifyCreated('Mot de passe défini — bienvenue sur Centrium');
    // Le serveur connaît son rôle ; on laisse le middleware router au bon
    // dashboard (consultant → /portal/dashboard, autre → /dashboard).
    router.push(welcome === 'portal' ? '/portal/dashboard' : '/dashboard');
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
