import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-hairline surface-1 px-3 py-2 text-sm',
        'focus-visible:outline-none focus-visible:border-violet-glow/60 focus-visible:ring-1 focus-visible:ring-violet-glow/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Sur Chrome/Edge le menu déroulant natif hérite la couleur du texte
        // du <select> → on force chaque <option> à un fond/texte explicites
        // pour rester lisible dans les deux modes (light ET dark).
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
