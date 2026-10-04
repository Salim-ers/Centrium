'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

type TabsVariant = 'segmented' | 'underline';
const VariantContext = React.createContext<TabsVariant>('segmented');

const Tabs = TabsPrimitive.Root;

/**
 * Deux styles :
 *   - `segmented` (défaut) : contrôle segmenté compact, pour filtrer une vue.
 *   - `underline` : onglets de page (fiche 360, paramètres), soulignés.
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { variant?: TabsVariant }
>(({ className, variant = 'segmented', ...props }, ref) => (
  <VariantContext.Provider value={variant}>
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        variant === 'segmented'
          ? 'inline-flex h-9 items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5 text-muted-foreground'
          : 'no-scrollbar flex w-full items-center gap-5 overflow-x-auto border-b border-border text-muted-foreground',
        className,
      )}
      {...props}
    />
  </VariantContext.Provider>
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(VariantContext);
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-[13px] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50',
        '[&_svg]:size-3.5',
        variant === 'segmented'
          ? 'h-8 rounded-md px-3 hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs'
          : '-mb-px h-10 border-b-2 border-transparent px-0.5 hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground',
        className,
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-5 focus-visible:outline-none data-[state=active]:animate-fade-in', className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
