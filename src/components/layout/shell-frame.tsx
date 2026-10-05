'use client';

import { createContext, useContext } from 'react';

/**
 * Présent quand la page est rendue dans un cadre de section (ex. Paramètres :
 * navigation interne à gauche, contenu à droite). Le cadre porte déjà la
 * marge de page : AppShell ne rend alors que son contenu.
 */
const FrameContext = createContext(false);

export function ShellFrame({ children }: { children: React.ReactNode }) {
  return <FrameContext.Provider value>{children}</FrameContext.Provider>;
}

/** Vrai dans un cadre de section : les liens « retour » y sont superflus. */
export function useInShellFrame() {
  return useContext(FrameContext);
}
