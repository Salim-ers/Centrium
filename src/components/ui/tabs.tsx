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
          ? 'inline-flex h-10 items-center gap-1 rounded-xl border-2 border-terra/30 bg-card p-1 text-terra-deep'
          : 'no-scrollbar flex w-full items-center gap-2 overflow-x-auto pb-1 text-terra-deep',
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
        // Compteurs et pastilles restent lisibles sur l'onglet actif terracotta.
        'data-[state=active]:[&_.text-muted-foreground]:text-white/85 data-[state=active]:[&_.bg-primary]:bg-white/25',
        variant === 'segmented'
          ? 'h-7 rounded-lg px-3 font-semibold hover:bg-terra-blush/70 data-[state=active]:bg-terra data-[state=active]:text-white data-[state=active]:shadow-sm'
          : 'h-10 shrink-0 rounded-xl border-2 border-terra/35 bg-card px-4 font-semibold hover:border-terra hover:bg-terra-blush/60 data-[state=active]:border-terra data-[state=active]:bg-terra data-[state=active]:text-white data-[state=active]:shadow-sm',
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
