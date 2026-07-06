import { Sparkles } from 'lucide-react';

// =========================================================================
// Écran de chargement instantané de la super-console.
// -------------------------------------------------------------------------
// Sans ce fichier, cliquer « Super console » (Link client) laissait la page
// figée jusqu'à ce que le RSC du layout /admin (getSuperAdminContext :
// getUser + requête profil) revienne — d'où le ressenti « lent ». Next.js
// affiche CE squelette immédiatement au clic (comme une frontière Suspense),
// pendant que le serveur rend le layout + la page. Le chrome de la console
// (en-tête) apparaît donc instantanément, façon déconnexion native.
// S'applique à toutes les routes /admin/**.
// =========================================================================

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-hairline bg-card/40 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-magenta" />
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight">Console super-admin</h1>
              <p className="text-[11px] text-muted-foreground">
                Demandes de devis · Provisioning clients
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-8 w-28 rounded-md bg-white/[0.04] animate-pulse" />
            <div className="h-8 w-40 rounded-md bg-white/[0.04] animate-pulse" />
            <div className="h-8 w-24 rounded-md bg-white/[0.04] animate-pulse" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* En-tête de page */}
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-8 w-64 rounded bg-white/[0.05] animate-pulse" />
          <div className="h-3 w-96 max-w-full rounded bg-white/[0.03] animate-pulse" />
        </div>

        {/* Bande de KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl border border-hairline bg-card/40 animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>

        {/* Liste */}
        <div className="rounded-2xl border border-hairline bg-card/40 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-14 border-b border-hairline last:border-0 bg-white/[0.01] animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
