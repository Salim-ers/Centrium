import { Info } from 'lucide-react';

/**
 * Bandeau d'avertissement affiché sur les vues « archivés » : prévient que les
 * éléments archivés sont purgés automatiquement (rétention 30 jours, nettoyage
 * mensuel). Réutilisable sur toutes les listes d'archives (CRA, factures…).
 *
 * Couleurs theme-aware (texte sombre en clair / clair en sombre) pour rester
 * lisible dans les deux thèmes.
 */
export function ArchivePurgeNotice({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/[0.1] px-4 py-2.5 text-[13px] text-amber-900 dark:text-amber-100">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
      <span className="leading-relaxed">{message}</span>
    </div>
  );
}
