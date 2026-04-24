'use client';

import Link from 'next/link';
import { Settings as SettingsIcon, LogOut, Palette, Users } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/settings/branding" className="group">
          <Card className="h-full transition-colors group-hover:border-violet-glow/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4 text-violet-glow" />
                Identité visuelle
              </CardTitle>
              <CardDescription>
                Logo, couleurs et nom de marque affichés sur les CV générés.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings/team" className="group">
          <Card className="h-full transition-colors group-hover:border-violet-glow/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-glow" />
                Équipe
              </CardTitle>
              <CardDescription>
                Membres, invitations et rôles de l'organisation.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div className="space-y-4 mt-6">
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
