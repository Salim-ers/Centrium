'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, ChevronDown, X } from 'lucide-react';

type Props = {
  /** Liste des villes présentes dans la table avec leur nb d'occurrences. */
  cities: { name: string; count: number }[];
  /** Sélection courante (Set de noms). Vide = "toutes les villes". */
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
};

/**
 * Filtre par ville en chip + popover. On affiche uniquement les villes
 * effectivement présentes dans la liste, classées par fréquence
 * descendante. Multi-sélection ; vide = aucun filtre.
 */
export function CityFilter({ cities, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Click-outside ferme le popover.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (e.target instanceof Node && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  function toggle(city: string) {
    const next = new Set(selected);
    if (next.has(city)) next.delete(city);
    else next.add(city);
    onChange(next);
  }

  function clearAll() {
    onChange(new Set());
  }

  const isFiltering = selected.size > 0;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs border transition ${
          isFiltering
            ? 'border-violet-glow/60 bg-violet-glow/15 text-violet-100'
            : 'border-white/10 bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:text-white'
        }`}
      >
        <MapPin className="h-3.5 w-3.5" />
        Ville
        {isFiltering && (
          <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full bg-violet-glow/30 text-[10px] font-semibold">
            {selected.size}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-64 max-h-80 overflow-auto rounded-lg border border-white/10 bg-midnight-200 shadow-2xl">
          <div className="sticky top-0 px-3 py-2 border-b border-white/5 bg-midnight-200 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Filtrer par ville
            </span>
            {isFiltering && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[10px] text-violet-300 hover:text-violet-100 inline-flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Tout désélectionner
              </button>
            )}
          </div>
          {cities.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground italic">
              Aucune ville renseignée sur les profils visibles.
            </div>
          ) : (
            <ul className="py-1">
              {cities.map((c) => {
                const isSel = selected.has(c.name);
                return (
                  <li key={c.name}>
                    <button
                      type="button"
                      onClick={() => toggle(c.name)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/[0.04] ${
                        isSel ? 'text-violet-200' : 'text-foreground'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSel}
                        readOnly
                        className="h-3.5 w-3.5 rounded border-white/20 bg-white/10 accent-violet-brand pointer-events-none"
                      />
                      <span className="flex-1 text-left truncate">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground">{c.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
