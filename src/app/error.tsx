'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * Error boundary par défaut au niveau /app. Affiché quand une page
 * client throw au render. Évite le blanc total "Application error" et
 * propose à l'utilisateur de retenter ou revenir au dashboard.
 *
 * Le composant Next.js spécifie qu'il DOIT être un client component
 * et accepter { error, reset }.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // On garde la trace en console pour le debug ; en prod un Sentry / GA
    // pourrait s'abonner ici.
    console.error('[app error boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-14 w-14 rounded-full bg-amber-500/15 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-amber-300" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Oups — un problème est survenu
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            La page n&apos;a pas pu charger correctement. Réessaie : la plupart du temps
            c&apos;est un hoquet réseau ou de cache. Si ça persiste, retourne au
            dashboard.
          </p>
          {error.digest && (
            <p className="text-[10px] text-muted-foreground/60 mt-3 font-mono">
              ref · {error.digest}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button onClick={() => reset()} className="bg-violet-glow hover:bg-violet-glow/90">
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
