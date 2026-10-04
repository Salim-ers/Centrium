import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium',
    'transition-[background-color,border-color,color,box-shadow] duration-150 ease-out',
    'focus-visible:outline-none focus-visible:shadow-focus',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary-deep active:bg-primary-deep',
        primary:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary-deep active:bg-primary-deep',
        secondary:
          'border border-border bg-card text-foreground shadow-xs hover:bg-muted hover:border-sand-300',
        outline:
          'border border-border bg-card text-foreground shadow-xs hover:bg-muted hover:border-sand-300',
        ghost: 'text-foreground hover:bg-muted',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-red-700',
        'destructive-outline':
          'border border-destructive/30 bg-card text-destructive hover:bg-danger-soft',
        subtle: 'bg-brand-50 text-primary-deep hover:bg-brand-100',
        link: 'h-auto px-0 text-primary underline-offset-4 hover:underline hover:text-primary-deep',
      },
      size: {
        default: 'h-9 px-3.5',
        sm: 'h-8 px-3 text-[13px]',
        xs: 'h-7 px-2.5 text-xs rounded',
        lg: 'h-11 px-5 text-[15px] rounded-lg',
        icon: 'h-9 w-9',
        'icon-sm': 'h-8 w-8',
        'icon-xs': 'h-7 w-7 rounded',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Affiche un spinner et désactive le bouton. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" aria-hidden />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
