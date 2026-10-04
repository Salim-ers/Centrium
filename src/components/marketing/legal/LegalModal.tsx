'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
};

/**
 * Modal legal à pleine hauteur, scrollable, thème sombre QuadCore.
 * Header sticky avec titre + bouton de fermeture.
 */
export function LegalModal({ open, onOpenChange, title, children }: Props) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-foreground/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[101] w-[95vw] max-w-3xl max-h-[85vh]',
            '-translate-x-1/2 -translate-y-1/2',
            'flex flex-col overflow-hidden rounded-2xl border border-hairline',
            'bg-card/95 text-foreground shadow-[0_0_80px_rgba(225,29,116,0.25)]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          <div className="flex items-center justify-between px-7 py-5 border-b border-hairline bg-background/40">
            <DialogPrimitive.Title className="font-display text-xl font-semibold text-foreground">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Fermer"
              className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-hairline bg-muted text-muted-foreground hover:bg-muted hover:text-foreground transition"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="overflow-y-auto px-7 py-7 text-[15px] leading-relaxed text-muted-foreground legal-body">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
