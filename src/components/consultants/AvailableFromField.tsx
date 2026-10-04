'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, HelpCircle, Zap } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type Mode = 'now' | 'date' | 'unknown';

type Props = {
  value: string; // '' = pas renseigné, 'unknown' = on sait pas, 'YYYY-MM-DD' = date
  onChange: (value: string) => void;
};

/**
 * Champ "Disponible à partir de" en 3 modes mutuellement exclusifs :
 *   - Tout de suite (today)
 *   - À une date précise (date input compact)
 *   - On ne sait pas (sentinelle stockée 'unknown' côté form)
 *
 * On force toujours UNE des trois valeurs — pas de "vide" possible. Le
 * champ d'origine était un date picker plein largeur que l'utilisateur
 * laissait souvent vide ; ici on rend obligatoire mais avec une issue
 * "on ne sait pas" pour ne pas mentir.
 */
export function AvailableFromField({ value, onChange }: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const initialMode: Mode = useMemo(() => {
    if (!value) return 'unknown';
    if (value === 'unknown') return 'unknown';
    if (value === todayIso()) return 'now';
    return 'date';
  }, [value]);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [date, setDate] = useState<string>(
    value && value !== 'unknown' && value !== todayIso() ? value : '',
  );

  // Si la valeur externe change (ex: reset après import CV), on resync.
  useEffect(() => {
    setMode(initialMode);
    if (initialMode === 'date') setDate(value);
  }, [initialMode, value]);

  function pick(m: Mode) {
    setMode(m);
    if (m === 'now') onChange(todayIso());
    else if (m === 'unknown') onChange('unknown');
    else if (m === 'date') onChange(date || '');
  }

  return (
    <div className="space-y-1.5">
      <Label>
        {isEn ? 'Available from' : 'Disponible à partir'} <span className="text-destructive">*</span>
      </Label>
      <div className="flex flex-wrap gap-1.5">
        <ModeButton
          active={mode === 'now'}
          onClick={() => pick('now')}
          icon={<Zap className="h-3.5 w-3.5" />}
          label={isEn ? 'Right away' : 'Tout de suite'}
        />
        <ModeButton
          active={mode === 'date'}
          onClick={() => pick('date')}
          icon={<Calendar className="h-3.5 w-3.5" />}
          label={isEn ? 'On a date' : 'À une date'}
        />
        <ModeButton
          active={mode === 'unknown'}
          onClick={() => pick('unknown')}
          icon={<HelpCircle className="h-3.5 w-3.5" />}
          label={isEn ? 'Unknown' : 'Inconnue'}
        />
        {mode === 'date' && (
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              onChange(e.target.value);
            }}
            className="h-8 w-44 rounded-md border border-hairline bg-card px-2 text-sm text-foreground"
          />
        )}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs border transition ${
        active
          ? 'border-primary/60 bg-primary/15 text-primary'
          : 'border-hairline bg-card text-muted-foreground hover:border-border hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
