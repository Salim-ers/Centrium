'use client';

import { createElement, useEffect, useLayoutEffect, useRef } from 'react';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export type EditableProps = {
  /** Chemin logique dans le CV (ex: "summary", "header.jobTitle", "experience.<id>.task.0"). */
  path: string;
  /** Valeur actuelle (déjà mergée avec les overrides) */
  value: string;
  /** true = contentEditable, false = texte statique */
  editable: boolean;
  onEdit?: (path: string, value: string) => void;
  /** Texte affiché en placeholder visuel si value est vide */
  placeholder?: string;
  /** Autorise les retours chariot (paragraphes longs) */
  multiline?: boolean;
  /** className appliqué en permanence */
  className?: string;
  /** Element rendu (span par défaut). Ex: 'h1', 'h3', 'p' pour garder la sémantique. */
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'li';
  style?: React.CSSProperties;
};

/**
 * Cellule de texte éditable "à la Canva" :
 *   - editable=false → rendu statique (span/h1/p…), aucun coût.
 *   - editable=true  → contentEditable, surligné au hover, commit au blur.
 *
 * Stratégie pour ne JAMAIS afficher un champ vide en mode édition :
 *   - On rend `value` comme child de l'élément contentEditable. React
 *     l'écrit dans le DOM dès le premier render, pas de flash "vide".
 *   - L'utilisateur peut cliquer / typer dedans : le contentEditable
 *     accepte les modifications DOM directement.
 *   - À chaque re-render, React diff les children. Si la valeur n'a pas
 *     changé, pas de DOM update → pas de caret-jump pendant la frappe.
 *   - useLayoutEffect garde le DOM en sync quand value change *hors*
 *     focus (ex: nouvelle consultant sélectionné, reset des overrides).
 */
export function Editable({
  path,
  value,
  editable,
  onEdit,
  placeholder,
  multiline = false,
  className,
  as = 'span',
  style,
}: EditableProps) {
  const ref = useRef<HTMLElement | null>(null);
  // Snapshot de la dernière valeur synchronisée vers le DOM. Permet de
  // savoir si on doit re-sync ou laisser le user typer en paix.
  const lastSyncedValue = useRef<string>(value);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Si l'élément a le focus ET la valeur n'a pas changé externalement
    // depuis la dernière sync, on laisse le user éditer en paix.
    if (document.activeElement === el && lastSyncedValue.current === value) return;
    if (el.textContent !== value) {
      el.textContent = value;
    }
    lastSyncedValue.current = value;
  }, [value]);

  if (!editable) {
    return createElement(
      as,
      { className, style },
      value || (placeholder ?? ''),
    );
  }

  const editClasses =
    'outline-none rounded-sm transition-colors ' +
    'hover:bg-primary/5 focus:bg-primary/10 ' +
    'focus:ring-2 focus:ring-primary/40 ' +
    'cursor-text empty:before:content-[attr(data-placeholder)] ' +
    'empty:before:text-muted-foreground empty:before:italic';

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    const text = e.currentTarget.innerText ?? '';
    const normalized = multiline ? text.replace(/\r/g, '') : text.replace(/\s+/g, ' ').trim();
    if (normalized !== value) onEdit?.(path, normalized);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  // Important : on passe `value` comme child de l'élément. React le rend
  // dans le DOM au premier paint — pas de flash "champ vide". Le
  // contentEditable laisse l'utilisateur modifier le DOM par dessus, et
  // React ne touchera plus aux children tant que `value` ne change pas
  // externalement (cf. useLayoutEffect ci-dessus).
  return createElement(
    as,
    {
      ref,
      contentEditable: true,
      suppressContentEditableWarning: true,
      'data-placeholder': placeholder ?? '',
      className: `${className ?? ''} ${editClasses}`,
      style,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
    },
    value,
  );
}
