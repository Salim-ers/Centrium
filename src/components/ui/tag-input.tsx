'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fieldBase } from './field-styles';

/**
 * Saisie de libellés (compétences…) : Entrée ou virgule pour ajouter,
 * Retour arrière pour retirer le dernier. Doublons ignorés (casse comprise).
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  id,
  max = 40,
  suggestions = [],
  className,
  'aria-label': ariaLabel,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  id?: string;
  max?: number;
  suggestions?: string[];
  className?: string;
  'aria-label'?: string;
}) {
  const [draft, setDraft] = React.useState('');
  const listId = React.useId();

  function add(raw: string) {
    const parts = raw
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const lower = new Set(value.map((v) => v.toLowerCase()));
    const next = [...value];
    for (const p of parts) {
      if (next.length >= max) break;
      if (lower.has(p.toLowerCase())) continue;
      lower.add(p.toLowerCase());
      next.push(p.slice(0, 60));
    }
    onChange(next);
    setDraft('');
  }

  return (
    <div
      className={cn('flex min-h-9 flex-wrap items-center gap-1.5 px-2 py-1.5', fieldBase, 'focus-within:border-primary focus-within:shadow-focus', className)}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs text-foreground"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v !== tag))}
            className="rounded text-muted-foreground hover:text-foreground"
            aria-label={`Retirer ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        list={suggestions.length ? listId : undefined}
        aria-label={ariaLabel}
        onChange={(e) => {
          const v = e.target.value;
          if (/[,;]$/.test(v)) add(v);
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
        onBlur={() => draft && add(draft)}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          if (/[,;\n]/.test(text)) {
            e.preventDefault();
            add(text);
          }
        }}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground/80"
      />
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.slice(0, 200).map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}
