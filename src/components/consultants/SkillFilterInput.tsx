'use client';

import { useId, useState } from 'react';
import { X } from 'lucide-react';

import { fieldBase } from '@/components/ui/field-styles';
import { fold } from '@/lib/talents/filters';
import { cn } from '@/lib/utils';

type Props = {
  value: string[];
  onChange: (skills: string[]) => void;
  /** Compétences connues, proposées pendant la saisie. */
  suggestions: string[];
  lang: 'fr' | 'en';
  className?: string;
};

/**
 * Filtre multi-compétences en étiquettes : Entrée, virgule ou un choix dans
 * la liste ajoute ; Retour arrière sur un champ vide retire la dernière.
 * Un profil doit avoir toutes les compétences saisies.
 */
export function SkillFilterInput({ value, onChange, suggestions, lang, className }: Props) {
  const fr = lang === 'fr';
  const [draft, setDraft] = useState('');
  const listId = useId();

  function add(raw: string) {
    const v = raw.trim();
    setDraft('');
    if (!v || value.some((x) => fold(x) === fold(v))) return;
    onChange([...value, v]);
  }

  return (
    <div
      className={cn(
        'flex min-h-9 flex-wrap items-center gap-1 px-1.5 py-1',
        fieldBase,
        'focus-within:border-primary focus-within:shadow-focus',
        className,
      )}
    >
      {value.map((s) => (
        <span key={s} className="inline-flex h-6 max-w-full items-center gap-0.5 rounded-md bg-app-peach-light pl-2 pr-0.5 text-[12px] font-medium text-app-terra-dark">
          <span className="truncate">{s}</span>
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== s))}
            aria-label={fr ? `Retirer ${s}` : `Remove ${s}`}
            className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-white/70"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        list={listId}
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          const native = e.nativeEvent as InputEvent;
          // Choix dans la liste proposée : ajouté tout de suite.
          if (!(typeof InputEvent !== 'undefined' && native instanceof InputEvent) || native.inputType === 'insertReplacementText') {
            if (suggestions.some((s) => fold(s) === fold(v))) {
              add(v);
              return;
            }
          }
          if (v.endsWith(',')) add(v.slice(0, -1));
          else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(draft);
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={value.length ? (fr ? 'Ajouter…' : 'Add…') : fr ? 'Compétences (ex. Java, AWS)' : 'Skills (e.g. Java, AWS)'}
        aria-label={fr ? 'Filtrer par compétences (toutes requises)' : 'Filter by skills (all required)'}
        className="h-7 min-w-[110px] flex-1 bg-transparent px-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/80"
      />
      <datalist id={listId}>
        {suggestions.slice(0, 300).map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
