'use client';

import { useEffect, useRef, useState } from 'react';
import { formatMonthYear } from '@/lib/utils';

type Props = {
  /** Path dans le CV — ex: "experience.<id>.start_date". */
  path: string;
  /** ISO date "YYYY-MM-DD" ou null (= en cours / placeholder). */
  value: string | null;
  /** true → cliquable, ouvre un input month. */
  editable: boolean;
  onEdit?: (path: string, value: string) => void;
  className?: string;
  /** Label affiché quand value est null/vide. Défaut "En cours". */
  emptyLabel?: string;
  /** Si true, propose un bouton "En cours" qui set null (typique pour end_date). */
  allowNull?: boolean;
};

/**
 * Date mois/année éditable. Lecture seule = texte façon "OCT. 2024".
 * Mode édition : clic → input type="month" inline, validation au blur.
 *
 * Implémentation : input CONTROLLED (state local synchronisé à `value`
 * via useEffect). Permet d'éviter les crashs quand le parent re-render
 * pendant l'édition.
 *
 * Conventions de stockage :
 *   - value reçue = "YYYY-MM-DD" ou null
 *   - onEdit envoie "YYYY-MM-01" (1er du mois) ou "" (= null = en cours)
 */
export function EditableDate({
  path,
  value,
  editable,
  onEdit,
  className,
  emptyLabel = 'En cours',
  allowNull = false,
}: Props) {
  const [open, setOpen] = useState(false);
  // Format attendu par <input type="month"> = "YYYY-MM".
  // Protection : si value est null OU pas une string, on renvoie ''.
  const safeMonth = (v: string | null): string => {
    if (!v || typeof v !== 'string') return '';
    return v.slice(0, 7); // tolère "YYYY-MM" ou "YYYY-MM-DD"
  };
  const [draft, setDraft] = useState<string>(safeMonth(value));
  const closingRef = useRef(false);

  // Sync le draft quand value externe change (ex: reset overrides)
  useEffect(() => {
    if (!open) setDraft(safeMonth(value));
  }, [value, open]);

  // Affichage formaté en lecture seule. Protection : si formatMonthYear
  // throw pour une raison X, on fallback sur le texte brut ou l'emptyLabel.
  let displayText: string;
  try {
    displayText = value ? formatMonthYear(value) : emptyLabel;
  } catch {
    displayText = value ?? emptyLabel;
  }

  if (!editable) {
    return <span className={className}>{displayText}</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(safeMonth(value));
          setOpen(true);
        }}
        title="Modifier la date"
        className={`${className ?? ''} cursor-pointer rounded-sm hover:bg-primary/10 hover:ring-1 hover:ring-primary/30 px-1 -mx-1 outline-none transition-colors uppercase`}
      >
        {displayText}
      </button>
    );
  }

  // Commit la valeur saisie (ou null si vide + allowNull) et ferme.
  const commit = (rawMonth: string) => {
    if (closingRef.current) return;
    closingRef.current = true;
    try {
      const trimmed = (rawMonth ?? '').trim();
      if (trimmed === '') {
        if (allowNull) onEdit?.(path, '');
      } else if (/^\d{4}-\d{2}$/.test(trimmed)) {
        const next = `${trimmed}-01`;
        // évite un override identique
        if (next !== value) onEdit?.(path, next);
      }
      // sinon : format invalide → on ignore, on ferme juste
    } catch (e) {
      // on log pour debug mais on ne crash pas la UI
      console.warn('[EditableDate] commit failed', { path, rawMonth, e });
    } finally {
      setOpen(false);
      // reset closingRef au prochain tick pour les futures éditions
      setTimeout(() => {
        closingRef.current = false;
      }, 0);
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
      <input
        type="month"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(draft);
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
          }
        }}
        className="text-[10px] bg-white border border-primary/50 rounded px-1 py-0.5 outline-none focus:border-primary text-foreground font-sans"
      />
      {allowNull && (
        <button
          type="button"
          onMouseDown={(e) => {
            // mouseDown au lieu de click : intercepte AVANT le blur de l'input
            e.preventDefault();
            commit('');
          }}
          title="Marquer comme en cours (effacer la date)"
          className="text-[9px] text-primary hover:text-primary underline whitespace-nowrap"
        >
          en cours
        </button>
      )}
    </span>
  );
}
