'use client';

import { Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success('Déconnexion');
    router.push('/login');
    router.refresh();
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
          <SettingsIcon className="h-7 w-7 text-violet-glow" />
          Paramètres
        </h1>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organisation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p><strong>QuadCore</strong> — IT Services &amp; Consulting</p>
            <p>5 Rue du Docteur Roux, 60180 Nogent-Sur-Oise</p>
            <p>SIREN : 101 694 016</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compte</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={logout}>
              Se déconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
