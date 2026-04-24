'use client';

import { createElement, useEffect, useRef } from 'react';

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
 * Uncontrolled pour éviter les sauts de caret : on ne met à jour le DOM que
 * lors du mount et quand la valeur externe change *hors* focus.
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

  // Synchronise le DOM avec la valeur externe, sauf si l'utilisateur est en
  // train de l'éditer (document.activeElement === ref.current).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.textContent !== value) {
      el.textContent = value;
    }
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
    'hover:bg-violet-500/5 focus:bg-violet-500/10 ' +
    'focus:ring-2 focus:ring-violet-400/40 ' +
    'cursor-text empty:before:content-[attr(data-placeholder)] ' +
    'empty:before:text-neutral-400 empty:before:italic';

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    const text = e.currentTarget.innerText ?? '';
    // innerText conserve les sauts de ligne visibles. Pour les champs
    // single-line on remplace par des espaces pour éviter \n parasites.
    const normalized = multiline ? text.replace(/\r/g, '') : text.replace(/\s+/g, ' ').trim();
    if (normalized !== value) onEdit?.(path, normalized);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    // Sur un champ single-line, Enter valide au lieu d'insérer un \n.
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  return createElement(as, {
    ref,
    contentEditable: true,
    suppressContentEditableWarning: true,
    'data-placeholder': placeholder ?? '',
    className: `${className ?? ''} ${editClasses}`,
    style,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
  });
}
