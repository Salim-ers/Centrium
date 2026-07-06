'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, ChevronDown, X } from 'lucide-react';

type Props = {
  /** Liste des villes présentes dans la table avec leur nb d'occurrences. */
  cities: { name: string; count: number }[];
  /** Sélection courante (Set de noms). Vide = "toutes les villes". */
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
};

const PANEL_WIDTH = 264;

/**
 * Filtre par ville en chip + popover. Le panneau est rendu via portal
 * (position fixed, z-[100]) pour rester AU PREMIER PLAN et ne jamais être
 * clippé par un `overflow:hidden` de carte parente — même comportement que
 * le Combobox. Aligné à droite du bouton (filtre en fin de barre d'outils).
 */
export function CityFilter({ cities, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  // Position sous le bouton, aligné à droite (bord droit panneau = bord droit
  // bouton), recalé si débordement à gauche de l'écran.
  const updateRect = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = Math.max(8, r.right - PANEL_WIDTH);
    setRect({ top: r.bottom + 6, left });
  }, []);

  useLayoutEffect(() => {
    if (open) updateRect();
  }, [open, updateRect]);

  useEffect(() => {
    if (!open) return;
    const on = () => updateRect();
    window.addEventListener('scroll', on, true);
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on, true);
      window.removeEventListener('resize', on);
    };
  }, [open, updateRect]);

  // Click-outside ferme le popover (bouton ET panneau via portal).
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !panelRef.current?.contains(t)) {
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
    <div className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs border transition ${
          isFiltering
            ? 'border-violet-glow/60 bg-violet-glow/15 text-violet-glow'
            : 'border-hairline surface-1 text-muted-foreground hover:border-foreground/25 hover:text-foreground'
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

      {mounted &&
        open &&
        rect &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: rect.top, left: rect.left, width: PANEL_WIDTH }}
            className="z-[100] max-h-80 overflow-auto rounded-xl border border-hairline bg-popover shadow-2xl animate-in fade-in-0 zoom-in-95"
          >
            <div className="sticky top-0 px-3 py-2 border-b border-hairline bg-popover flex items-center justify-between">
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
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover-surface ${
                          isSel ? 'text-violet-glow' : 'text-foreground'
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
          </div>,
          document.body,
        )}
    </div>
  );
}
