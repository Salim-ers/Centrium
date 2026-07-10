import Link from 'next/link';
import { ShieldX } from 'lucide-react';

// =========================================================================
// /unauthorized — cible du redirect de requireRole() quand le rôle de
// l'utilisateur ne permet pas l'accès. Auparavant absente → 404 trompeur.
// =========================================================================

export const metadata = { title: 'Accès refusé · Centrium' };

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen grid place-content-center px-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-hairline bg-red-500/10 text-red-400">
        <ShieldX className="h-7 w-7" />
      </div>
      <h1 className="mt-6 font-display text-2xl font-light tracking-tight">
        Accès non autorisé
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Ton rôle ne permet pas d’accéder à cette page. Si tu penses que c’est une
        erreur, demande à un administrateur de ton organisation de vérifier tes
        droits.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center rounded-lg bg-violet-glow px-4 text-sm font-medium text-white transition hover:opacity-90"
        >
          Retour au tableau de bord
        </Link>
        <Link
          href="/settings"
          className="inline-flex h-9 items-center rounded-lg border border-hairline px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          Mes paramètres
        </Link>
      </div>
    </main>
  );
}
