'use client';

import { useState } from 'react';
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

  // Format attendu par <input type="month"> = "YYYY-MM"
  const inputValue = value ? value.slice(0, 7) : '';

  if (!editable) {
    return (
      <span className={className}>
        {value ? formatMonthYear(value) : emptyLabel}
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Modifier la date"
        className={`${className ?? ''} cursor-pointer rounded-sm hover:bg-violet-500/10 hover:ring-1 hover:ring-violet-400/30 px-1 -mx-1 outline-none transition-colors uppercase`}
      >
        {value ? formatMonthYear(value) : emptyLabel}
      </button>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
      <input
        type="month"
        defaultValue={inputValue}
        autoFocus
        onBlur={(e) => {
          const v = e.target.value;
          if (v && v !== inputValue) {
            onEdit?.(path, `${v}-01`);
          }
          // petit délai pour laisser un éventuel clic sur "en cours" prendre la main
          setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') setOpen(false);
        }}
        className="text-[10px] bg-white border border-violet-400/50 rounded px-1 py-0.5 outline-none focus:border-violet-500 text-neutral-900 font-sans"
      />
      {allowNull && (
        <button
          type="button"
          onMouseDown={(e) => {
            // mouseDown au lieu de click : intercepte AVANT le blur de l'input
            e.preventDefault();
            onEdit?.(path, '');
            setOpen(false);
          }}
          title="Marquer comme en cours (effacer la date)"
          className="text-[9px] text-violet-500 hover:text-violet-700 underline whitespace-nowrap"
        >
          en cours
        </button>
      )}
    </span>
  );
}
