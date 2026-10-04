import * as React from 'react';
import { cn } from '@/lib/utils';
import { LIMITS } from '@/lib/constants/limits';
import { fieldBase } from './field-styles';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Affiche un compteur "X / N" en bas à droite du textarea.
   * Par défaut : true quand un maxLength est défini.
   */
  showCounter?: boolean;
}

/**
 * Textarea avec :
 *   - maxLength par défaut = LIMITS.description (4000 chars) — surcharge possible
 *   - compteur visuel auto si la limite > 0 (peut être désactivé)
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, maxLength, showCounter, value, defaultValue, onChange, ...props }, ref) => {
    const effectiveMax = maxLength ?? LIMITS.description;
    const shouldShowCounter = showCounter ?? effectiveMax > 0;

    const [internalValue, setInternalValue] = React.useState<string>(
      typeof defaultValue === 'string' ? defaultValue : '',
    );
    const currentValue = typeof value === 'string' ? value : internalValue;
    const currentLength = currentValue.length;

    const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
      if (value === undefined) setInternalValue(e.target.value);
      onChange?.(e);
    };

    if (!shouldShowCounter) {
      return (
        <textarea
          ref={ref}
          maxLength={effectiveMax > 0 ? effectiveMax : undefined}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          className={cn(
            'flex min-h-[80px] px-3 py-2 leading-relaxed',
            fieldBase,
            className,
          )}
          {...props}
        />
      );
    }

    const isNearLimit = currentLength > effectiveMax * 0.9;
    const isAtLimit = currentLength >= effectiveMax;

    return (
      <div className="relative w-full">
        <textarea
          ref={ref}
          maxLength={effectiveMax}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          className={cn(
            'flex min-h-[80px] px-3 py-2 pb-6 leading-relaxed',
            fieldBase,
            className,
          )}
          {...props}
        />
        <span
          className={cn(
            'pointer-events-none absolute right-2.5 bottom-1.5 text-[10px] tabular-nums select-none',
            isAtLimit
              ? 'text-destructive font-semibold'
              : isNearLimit
                ? 'text-warning'
                : 'text-muted-foreground/60',
          )}
        >
          {currentLength.toLocaleString('fr-FR')} / {effectiveMax.toLocaleString('fr-FR')}
        </span>
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
