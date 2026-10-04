import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium leading-4 whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-brand-100 bg-brand-50 text-primary-deep',
        brand: 'border-brand-100 bg-brand-50 text-primary-deep',
        secondary: 'border-border bg-muted text-foreground',
        outline: 'border-border bg-card text-foreground',
        neutral: 'border-border bg-muted text-muted-foreground',
        success: 'border-success/15 bg-success-soft text-success',
        warning: 'border-warning/15 bg-warning-soft text-warning',
        info: 'border-info/15 bg-info-soft text-info',
        destructive: 'border-destructive/15 bg-danger-soft text-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
