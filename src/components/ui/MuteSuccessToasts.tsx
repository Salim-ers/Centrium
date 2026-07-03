'use client';

import { toast } from 'sonner';

/**
 * Neutralise GLOBALEMENT les toasts de succès (demande utilisateur :
 * aucune notification quand on enregistre / supprime — c'est du bruit
 * visuel, la fermeture du dialog ou la mise à jour de la liste suffit).
 *
 * Pourquoi un patch runtime plutôt qu'un sweep des ~86 call-sites :
 * `toast` est un singleton module partagé par tous les imports de
 * 'sonner' — réassigner `toast.success` ici coupe tous les appels d'un
 * coup, de façon centralisée et trivialement réversible (supprimer ce
 * fichier + son mount dans app/layout.tsx restaure le comportement).
 *
 * toast.error / toast.warning / toast.info restent actifs — les erreurs
 * sont un feedback indispensable.
 *
 * Le patch s'exécute au premier render client (composant monté dans le
 * RootLayout, avant toute interaction possible).
 */
let patched = false;

function muteSuccess() {
  if (patched) return;
  patched = true;
  const mutedSuccess: typeof toast.success = () => '';
  toast.success = mutedSuccess;
}

export function MuteSuccessToasts() {
  muteSuccess();
  return null;
}
