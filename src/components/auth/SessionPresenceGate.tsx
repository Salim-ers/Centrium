'use client';

import { useSessionPresence } from '@/hooks/useSessionPresence';

/**
 * Wrapper client à monter dans les shells de l'app (AppShell, PortalShell)
 * pour activer la vérification de présence de session.
 *
 * Si le flag sessionStorage est absent ET aucun autre onglet Centrium n'est
 * vivant, l'utilisateur sera automatiquement déconnecté et redirigé vers
 * /login.
 *
 * Ne rend aucun DOM (juste un effet de bord via le hook).
 */
export function SessionPresenceGate() {
  useSessionPresence();
  return null;
}
