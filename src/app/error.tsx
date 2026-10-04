'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * Error boundary par défaut au niveau /app. Affiché quand une page
 * client throw au render. Évite le blanc total "Application error" et
 * propose à l'utilisateur de retenter ou revenir au dashboard.
 *
 * Affiche aussi un détail technique repliable (message + digest) pour
 * que l'utilisateur puisse copier-coller la cause exacte en debug.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Trace console détaillée pour debug (visible dans la console F12).
    console.error('[app error boundary]', error);
    if (error.stack) console.error(error.stack);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="mx-auto h-14 w-14 rounded-full bg-warning/15 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-warning" />
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
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button onClick={() => reset()} className="bg-primary hover:bg-primary/90">
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

        {/* Détails techniques repliables — utile pour comprendre la cause
            sans avoir à ouvrir la console. */}
        <div className="text-left">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mx-auto"
          >
            <ChevronDown
              className={`h-3 w-3 transition ${showDetails ? 'rotate-0' : '-rotate-90'}`}
            />
            Détails techniques
          </button>
          {showDetails && (
            <pre className="mt-3 max-h-60 overflow-auto rounded-md border border-hairline bg-card p-3 text-[11px] text-muted-foreground whitespace-pre-wrap break-words">
              {error.name}: {error.message}
              {error.digest ? `\n\nref · ${error.digest}` : ''}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
