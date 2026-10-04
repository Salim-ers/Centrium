'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';

// =========================================================================
// Combobox — menu déroulant premium UNIFIÉ pour tout le site.
// -------------------------------------------------------------------------
// Remplace les <select> natifs (dont la liste ne peut pas être stylée) par
// un panneau custom : rendu via portal (immunisé contre overflow:hidden),
// coins arrondis, ombre, survol, coche terracotta sur l'option choisie,
// recherche automatique dès qu'il y a beaucoup d'options, navigation
// clavier (↑ ↓ Enter Esc) et ARIA.
//
// Panneau VOLONTAIREMENT plus large que le déclencheur (minWidth 320px par
// défaut, débordant vers la droite) pour un rendu haut de gamme et lisible
// même quand le champ est dans une colonne étroite.
// =========================================================================

export type ComboboxOption = {
  value: string;
  label: string;
  /** Ligne secondaire (ex: poste, statut). */
  sublabel?: string;
  /** Petit tag à gauche du label (ex: « ★ Vivier »). */
  badge?: string;
  disabled?: boolean;
};

type Props = {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Force / désactive la barre de recherche. Par défaut : auto (> 7 options). */
  searchable?: boolean;
  /** Autorise la remise à zéro (bouton ✕). Défaut : false. */
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  /** Classes ajoutées au bouton déclencheur (ex: hauteur/typo compactes). */
  triggerClassName?: string;
  ariaLabel?: string;
  /** Largeur mini du panneau en px (débordement à droite). Défaut : 320. */
  minPanelWidth?: number;
  id?: string;
  name?: string;
};

export function Combobox({
  options,
  value,
  onChange,
  placeholder = '— Sélectionner —',
  searchable,
  clearable = false,
  disabled = false,
  className,
  triggerClassName,
  ariaLabel,
  minPanelWidth = 320,
  id,
  name,
}: Props) {
  const listboxId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const optionsRef = useRef<Array<HTMLLIElement | null>>([]);

  const isSearchable = searchable ?? options.length > 7;

  useEffect(() => setMounted(true), []);

  // Position + largeur du panneau. On l'élargit à droite : width = max(champ,
  // minPanelWidth), en le recalant à gauche s'il déborderait de l'écran.
  const updateRect = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, minPanelWidth);
    let left = r.left;
    const overflow = left + width - (window.innerWidth - 8);
    if (overflow > 0) left = Math.max(8, left - overflow);
    setRect({ top: r.bottom + 4, left, width });
  }, [minPanelWidth]);

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

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    const tokens = q.split(/\s+/);
    return options.filter((o) => {
      const hay = `${o.label} ${o.sublabel ?? ''} ${o.badge ?? ''}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (!containerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (activeIndex < 0) return;
    optionsRef.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const openMenu = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    // Position l'index actif sur l'option déjà choisie.
    const idx = filtered.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    if (isSearchable) requestAnimationFrame(() => inputRef.current?.focus());
  }, [disabled, filtered, value, isSearchable]);

  function handleSelect(opt: ComboboxOption) {
    if (opt.disabled) return;
    onChange(opt.value);
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openMenu();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filtered[activeIndex] ?? filtered[0];
      if (target) handleSelect(target);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Champ caché : conserve name/value pour compat form natif éventuelle. */}
      {name && <input type="hidden" name={name} value={value} />}

      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-md border border-hairline surface-1 px-3 text-sm text-left',
          'focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-1 focus-visible:ring-primary/30',
          'disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          triggerClassName,
        )}
      >
        <span className={cn('flex-1 min-w-0 truncate', !selected && 'text-muted-foreground/70')}>
          {selected ? (
            <span className="inline-flex items-center gap-1.5">
              {selected.badge && (
                <span className="text-[10px] uppercase tracking-wider text-warning font-semibold shrink-0">
                  {selected.badge}
                </span>
              )}
              <span className="truncate">{selected.label}</span>
              {selected.sublabel && (
                <span className="text-muted-foreground truncate">— {selected.sublabel}</span>
              )}
            </span>
          ) : (
            placeholder
          )}
        </span>
        {clearable && value && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Effacer"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {mounted &&
        open &&
        rect &&
        createPortal(
          <div
            ref={dropdownRef as unknown as React.RefObject<HTMLDivElement>}
            style={{
              position: 'fixed',
              top: rect.top,
              left: rect.left,
              width: rect.width,
              // CRITIQUE : le panneau est porté dans document.body. Quand le
              // Combobox est DANS un Dialog Radix (modal), Radix pose
              // pointer-events:none sur tout ce qui est hors du contenu du
              // dialog → le panneau (frère dans body) devenait NON CLIQUABLE à
              // la souris (seul le clavier marchait). On rétablit la cliquabilité.
              pointerEvents: 'auto',
            }}
            // Empêche le pointerdown sur le panneau d'atteindre le
            // DismissableLayer de Radix (qui, le voyant « hors dialog »,
            // fermerait le dialog au clic d'une option).
            onPointerDown={(e) => e.stopPropagation()}
            className="z-[100] rounded-xl border border-hairline bg-popover shadow-2xl p-1.5 animate-in fade-in-0 zoom-in-95"
          >
            {isSearchable && (
              <div className="flex items-center gap-2 px-2 pb-1.5 mb-1 border-b border-hairline">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  placeholder="Rechercher…"
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground/60 min-w-0"
                />
              </div>
            )}
            <ul id={listboxId} role="listbox" className="max-h-72 overflow-y-auto">
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-xs text-center text-muted-foreground">
                  Aucun résultat{query ? ` pour « ${query} »` : ''}
                </li>
              ) : (
                filtered.map((o, idx) => {
                  const isActive = idx === activeIndex;
                  const isSelected = o.value === value;
                  return (
                    <li
                      key={o.value || `opt-${idx}`}
                      ref={(el) => {
                        optionsRef.current[idx] = el;
                      }}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(o);
                      }}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm cursor-pointer',
                        o.disabled && 'opacity-40 pointer-events-none',
                        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60',
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {o.badge && (
                            <span className="text-[10px] uppercase tracking-wider text-warning font-semibold shrink-0">
                              {o.badge}
                            </span>
                          )}
                          <span className="font-medium truncate">{o.label}</span>
                        </div>
                        {o.sublabel && (
                          <div className="text-xs text-muted-foreground truncate">{o.sublabel}</div>
                        )}
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}
