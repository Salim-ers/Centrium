'use client';

import { Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';

/** Impression / export PDF via la boîte d'impression du navigateur. */
export function PrintButton({ label = 'Imprimer / PDF' }: { label?: string }) {
  return (
    <Button variant="ghost" onClick={() => window.print()}>
      <Printer />
      {label}
    </Button>
  );
}
