'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { fieldBase } from '@/components/ui/field-styles';
import { cn } from '@/lib/utils';

type Common = {
  label: string;
  /** Valeur mise en forme en lecture (null : tiret). */
  display: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
  /** Enregistre la valeur saisie (null : champ vidé). false : le champ reste ouvert. */
  onSave: (value: string | null) => Promise<boolean>;
};

type Props = Common &
  (
    | { kind: 'text' | 'number'; value: string | number | null; placeholder?: string; suffix?: string; min?: number; max?: number; step?: number }
    | { kind: 'date'; value: string | null }
    | { kind: 'select'; value: string | null; options: Array<{ value: string; label: string }>; emptyLabel?: string }
  );

/**
 * Champ modifiable sur place (fiches, tiroirs) : un clic sur la valeur ouvre
 * la saisie ; Entrée ou la sortie du champ enregistre, Échap annule.
 */
export function InlineField(props: Props) {
  const { label, display, hint, disabled, onSave } = props;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const initial = props.value == null ? '' : String(props.value);
  const [draft, setDraft] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(initial);
  }, [initial, editing]);

  useEffect(() => {
    if (!editing || props.kind !== 'date') return;
    // Un seul clic : le calendrier natif s'ouvre avec le champ.
    try {
      inputRef.current?.showPicker?.();
    } catch {
      // showPicker indisponible (ancien navigateur) : le champ reste utilisable.
    }
  }, [editing, props.kind]);

  async function commit(value: string) {
    if (done.current) return;
    if (value.trim() === initial.trim()) {
      setEditing(false);
      return;
    }
    done.current = true;
    setSaving(true);
    const ok = await onSave(value.trim() === '' ? null : value.trim());
    setSaving(false);
    done.current = false;
    if (ok) setEditing(false);
  }

  function cancel() {
    done.current = true;
    setDraft(initial);
    setEditing(false);
    queueMicrotask(() => {
      done.current = false;
    });
  }

  const empty = display === null || display === undefined || display === '';
  const shown = empty ? <span className="text-muted-foreground">—</span> : display;

  let editor: React.ReactNode = null;
  if (editing) {
    const onKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void commit(draft);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancel();
      }
    };
    if (props.kind === 'select') {
      editor = (
        <Select
          autoFocus
          value={draft}
          aria-label={label}
          disabled={saving}
          onChange={(e) => {
            setDraft(e.target.value);
            void commit(e.target.value);
          }}
          onBlur={() => !saving && setEditing(false)}
          onKeyDown={onKeyDown}
          className="h-8 text-[13px]"
        >
          {props.emptyLabel !== undefined && <option value="">{props.emptyLabel}</option>}
          {props.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
    } else if (props.kind === 'date') {
      editor = (
        <input
          ref={inputRef}
          type="date"
          autoFocus
          value={draft}
          aria-label={label}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit(draft)}
          onKeyDown={onKeyDown}
          className={cn('flex h-8 px-2.5 text-[13px]', fieldBase)}
        />
      );
    } else {
      editor = (
        <div className="relative">
          <Input
            autoFocus
            type={props.kind === 'number' ? 'number' : 'text'}
            inputMode={props.kind === 'number' ? 'decimal' : undefined}
            min={props.min}
            max={props.max}
            step={props.step}
            value={draft}
            placeholder={props.placeholder}
            aria-label={label}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit(draft)}
            onKeyDown={onKeyDown}
            className={cn('h-8 text-[13px]', props.suffix && 'pr-8')}
          />
          {props.suffix && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{props.suffix}</span>}
        </div>
      );
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {label}
        {saving && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
      </div>
      {editing ? (
        <div className="mt-0.5">{editor}</div>
      ) : disabled ? (
        <div className="mt-0.5 break-words text-[13.5px] text-foreground">{shown}</div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`${label} — modifier`}
          className="group/field -mx-1.5 mt-0.5 flex w-[calc(100%+0.75rem)] min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[13.5px] text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:shadow-focus"
        >
          <span className="min-w-0 flex-1 truncate">{shown}</span>
          <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/field:opacity-100 group-focus-visible/field:opacity-100" aria-hidden />
        </button>
      )}
      {hint && !editing && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
