'use client';

/**
 * Petit badge "live" qui pulse pour rappeler que le dashboard est synchro
 * en temps réel avec les actions des collègues. Affiche aussi le nombre
 * d'autres membres connectés ("+ 2 personnes en ligne").
 */

import { useOrgPresence } from '@/hooks/useOrgPresence';

export function LiveSyncBadge() {
  const { others } = useOrgPresence();

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/[0.07] px-3 py-1 text-[11px]"
      title="Le dashboard se met à jour automatiquement quand un collègue agit"
    >
      <span aria-hidden className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/80 opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-emerald-300 font-medium">Synchro temps réel</span>
      {others.length > 0 && (
        <span className="text-muted-foreground border-l border-emerald-500/20 pl-2">
          + {others.length} en ligne
        </span>
      )}
    </div>
  );
}
