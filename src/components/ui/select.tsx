import * as React from 'react';
import { cn } from '@/lib/utils';
import { fieldBase } from './field-styles';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

// Chevron discret (#706A66) en arrière-plan : apparence identique sur
// tous les navigateurs, sans dépendre du rendu natif.
const CHEVRON =
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23706A66' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:16px_16px] bg-[right_0.6rem_center] bg-no-repeat";

/**
 * Select natif stylé. Préféré au select custom pour les listes courtes :
 * accessible au clavier, natif sur mobile, zéro JavaScript.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-9 appearance-none py-1.5 pl-3 pr-9',
        fieldBase,
        CHEVRON,
        '[&>option]:bg-white [&>option]:text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export { Select };
