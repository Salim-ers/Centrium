import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm',
        'focus-visible:outline-none focus-visible:border-violet-glow/60 focus-visible:ring-1 focus-visible:ring-violet-glow/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Sur Chrome/Edge le menu déroulant natif hérite la couleur du texte
        // du <select> → blanc sur blanc dans notre thème sombre. On force
        // chaque <option> à du texte sombre sur fond blanc pour la lisibilité.
        '[&>option]:text-neutral-900 [&>option]:bg-white',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';

export { Select };
