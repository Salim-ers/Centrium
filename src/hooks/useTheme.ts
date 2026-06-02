'use client';

import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

/**
 * Hook qui détecte le thème actif (dark/light) en lisant la classe `.dark`
 * sur `<html>`. Observe les mutations pour rester sync quand l'utilisateur
 * toggle via le ThemeToggle.
 *
 * SSR-safe : retourne 'dark' côté serveur (forced-dark pour les pages
 * publiques, le composant qui consomme se remontera correctement au
 * hydrate côté client).
 */
export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === 'undefined') return 'dark';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  useEffect(() => {
    const html = document.documentElement;
    // Initial sync au cas où l'hydratation n'avait pas la bonne valeur
    setTheme(html.classList.contains('dark') ? 'dark' : 'light');

    const observer = new MutationObserver(() => {
      setTheme(html.classList.contains('dark') ? 'dark' : 'light');
    });
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
