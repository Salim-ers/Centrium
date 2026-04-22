'use client';

import { Settings as SettingsIcon, LogOut } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
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
            {/*
              Le logout passe par /api/auth/logout côté serveur pour nettoyer
              tous les cookies (Supabase httpOnly + notre cache qc_profile)
              avant de rediriger vers /login.
            */}
            <form action="/api/auth/logout" method="POST">
              <Button type="submit" variant="outline">
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
