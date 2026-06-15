'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';

export type ConsultantOption = {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  is_prospect?: boolean;
};

type Props = {
  consultants: ConsultantOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
};

/**
 * Combobox consultant : saisie libre OU menu déroulant.
 *
 * - Click sur l'input → ouvre la liste complète
 * - Tape du texte → filtre par prénom / nom / job_title (case-insensitive)
 * - Touches : ↓ ↑ pour naviguer, Enter pour valider, Esc pour fermer
 * - Click sur une option → set la valeur + ferme la liste
 * - Bouton ✕ → reset la sélection
 *
 * Indépendant de tout state global — passe juste `value` + `onChange`.
 */
export function ConsultantCombobox({
  consultants,
  value,
  onChange,
  placeholder = '— Choisir ou taper un nom —',
  disabled = false,
  className,
  ariaLabel,
}: Props) {
  const listboxId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const optionsRef = useRef<Array<HTMLLIElement | null>>([]);

  // SSR guard pour createPortal — n'instancie le portal qu'après mount client.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calcule la position du dropdown sous l'input (fixed position, donc
  // immunisé contre tout overflow:hidden d'ancêtre).
  const updateRect = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateRect();
  }, [open, updateRect]);

  // Recalcule à chaque scroll / resize tant que le dropdown est ouvert.
  useEffect(() => {
    if (!open) return;
    const onWindowChange = () => updateRect();
    window.addEventListener('scroll', onWindowChange, true);
    window.addEventListener('resize', onWindowChange);
    return () => {
      window.removeEventListener('scroll', onWindowChange, true);
      window.removeEventListener('resize', onWindowChange);
    };
  }, [open, updateRect]);

  // Libellé du consultant sélectionné — affiché dans l'input quand pas en train de taper.
  const selectedConsultant = useMemo(
    () => consultants.find((c) => c.id === value) ?? null,
    [consultants, value]
  );

  const selectedLabel = selectedConsultant
    ? `${selectedConsultant.is_prospect ? '★ ' : ''}${selectedConsultant.first_name} ${selectedConsultant.last_name}${
        selectedConsultant.job_title ? ' — ' + selectedConsultant.job_title : ''
      }`
    : '';

  // Filtre les options selon la query (multi-tokens : tous les mots doivent matcher).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return consultants;
    const tokens = q.split(/\s+/);
    return consultants.filter((c) => {
      const haystack = `${c.first_name} ${c.last_name} ${c.job_title ?? ''}`.toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  }, [consultants, query]);

  // Click extérieur → ferme la liste
  // Le dropdown est rendu dans un portal (body), donc on doit vérifier
  // l'input container ET le dropdown séparément.
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // Scroll automatique sur l'option active (navigation clavier)
  useEffect(() => {
    if (activeIndex < 0) return;
    const el = optionsRef.current[activeIndex];
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function handleSelect(id: string) {
    onChange(id);
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(0);
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
      if (target) handleSelect(target.id);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setOpen(true);
    inputRef.current?.focus();
  }

  // Quand on tape, on entre en mode "édition" — la query remplace le libellé sélectionné.
  // Quand on n'est PAS focus et qu'il n'y a pas de query, on affiche le libellé sélectionné.
  const isEditing = open || query.length > 0;
  const displayValue = isEditing ? query : selectedLabel;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border border-input bg-background px-3 h-10',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background',
          disabled && 'opacity-50 pointer-events-none'
        )}
        onClick={() => {
          if (!disabled) {
            setOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
          }
          aria-label={ariaLabel}
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 min-w-0"
        />
        {value && !open && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Effacer la sélection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </div>

      {/* Dropdown rendu via portal dans <body> pour éviter d'être clippé
          par les overflow:hidden des cards parents (AppCard etc.). */}
      {mounted && open && dropdownRect && createPortal(
        <ul
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          style={{
            position: 'fixed',
            top: dropdownRect.top,
            left: dropdownRect.left,
            width: dropdownRect.width,
          }}
          className="z-[100] max-h-72 overflow-y-auto rounded-md border border-input bg-popover shadow-2xl p-1 animate-in fade-in-0 zoom-in-95"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-xs text-center text-muted-foreground">
              Aucun consultant trouvé pour « {query} »
              <div className="mt-1 text-[10px] text-muted-foreground/70">
                Vérifie l&apos;orthographe ou crée la fiche depuis l&apos;onglet Consultants.
              </div>
            </li>
          ) : (
            filtered.map((c, idx) => {
              const isActive = idx === activeIndex;
              const isSelected = c.id === value;
              return (
                <li
                  key={c.id}
                  ref={(el) => {
                    optionsRef.current[idx] = el;
                  }}
                  id={`${listboxId}-opt-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault(); // évite le blur de l'input avant le click
                    handleSelect(c.id);
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer',
                    isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {c.is_prospect && (
                        <span className="text-[10px] uppercase tracking-wider text-amber-400/80 font-semibold">
                          ★ Vivier
                        </span>
                      )}
                      <span className="font-medium truncate">
                        {c.first_name} {c.last_name}
                      </span>
                    </div>
                    {c.job_title && (
                      <div className="text-xs text-muted-foreground truncate">
                        {c.job_title}
                      </div>
                    )}
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-magenta-neon shrink-0" />}
                </li>
              );
            })
          )}
        </ul>,
        document.body
      )}
    </div>
  );
}
