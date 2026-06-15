import * as React from 'react';
import { cn } from '@/lib/utils';
import { LIMITS } from '@/lib/constants/limits';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Limites par défaut selon le type d'input.
 * Tu peux toujours surcharger via la prop maxLength sur l'instance.
 *
 *   <Input type="email" />                      → 254 chars (RFC)
 *   <Input type="url" />                        → 2048 chars
 *   <Input type="password" />                   → 128 chars
 *   <Input type="tel" />                        → 30 chars
 *   <Input type="text" />                       → 200 chars (cas général)
 *   <Input maxLength={4000} />                  → surcharge explicite
 */
function defaultMaxLengthFor(type: string | undefined): number {
  switch (type) {
    case 'email':
      return LIMITS.email;
    case 'url':
      return LIMITS.url;
    case 'password':
      return LIMITS.password;
    case 'tel':
      return LIMITS.phone;
    case 'number':
    case 'date':
    case 'datetime-local':
    case 'time':
    case 'month':
    case 'week':
    case 'color':
    case 'range':
    case 'checkbox':
    case 'radio':
    case 'file':
    case 'hidden':
    case 'submit':
    case 'reset':
    case 'button':
      return 0; // pas de maxLength applicable
    default:
      return LIMITS.name;
  }
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, maxLength, ...props }, ref) => {
    const fallbackMax = defaultMaxLengthFor(type);
    const effectiveMax =
      maxLength !== undefined ? maxLength : fallbackMax > 0 ? fallbackMax : undefined;
    return (
      <input
        type={type}
        maxLength={effectiveMax}
        className={cn(
          'flex h-10 w-full rounded-md border border-hairline surface-1 px-3 py-2 text-sm transition-colors',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:border-violet-glow/60 focus-visible:ring-1 focus-visible:ring-violet-glow/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
