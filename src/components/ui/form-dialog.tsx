'use client';

import * as React from 'react';
import { DialogContent } from './dialog';

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogContent>;

/**
 * Wrapper de DialogContent pour les formulaires longs.
 *
 * Désactive les 3 façons "accidentelles" de fermer le dialog qui font perdre
 * la saisie en cours :
 *
 *   1. onPointerDownOutside  → click sur le backdrop / hors du dialog
 *   2. onInteractOutside     → drag, focus extérieur
 *   3. onEscapeKeyDown       → touche Échap
 *
 * Seuls le bouton ✕ (DialogClose intégré au header shadcn) et un bouton
 * "Annuler" explicite ferment le dialog → plus de perte de données.
 *
 * Usage :
 *   <Dialog open={open} onOpenChange={setOpen}>
 *     <FormDialogContent className="max-w-2xl ...">
 *       ...form...
 *     </FormDialogContent>
 *   </Dialog>
 */
export const FormDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  DialogContentProps
>(({ children, ...props }, ref) => {
  return (
    <DialogContent
      ref={ref}
      onPointerDownOutside={(e) => e.preventDefault()}
      onInteractOutside={(e) => e.preventDefault()}
      onEscapeKeyDown={(e) => e.preventDefault()}
      {...props}
    >
      {children}
    </DialogContent>
  );
});
FormDialogContent.displayName = 'FormDialogContent';
