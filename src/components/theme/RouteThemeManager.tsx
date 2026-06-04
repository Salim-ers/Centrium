'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Force le mode sombre sur toutes les pages "publiques" (landing, login,
 * devis, pricing, signup-redirect, auth/* , invite/*) et restaure la
 * préférence utilisateur (localStorage) dès qu'on entre dans l'app
 * authentifiée. Évite que la marketing/login s'affichent en clair
 * quand l'utilisateur s'est déconnecté après avoir activé le mode clair.
 */
const FORCED_DARK_PATHS = [
  '/',
  '/login',
  '/signup',
  '/register',
  '/devis',
  '/pricing',
  '/plateforme',
  '/engagements',
  '/security',
  '/manifesto',
];
const FORCED_DARK_PREFIXES = ['/auth/', '/invite/', '/legal/'];

const STORAGE_KEY = 'centrium-theme';

function isForcedDark(pathname: string | null): boolean {
  if (!pathname) return false;
  if (FORCED_DARK_PATHS.includes(pathname)) return true;
  return FORCED_DARK_PREFIXES.some((p) => pathname.startsWith(p));
}

function applyDark() {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.add('dark');
  document.documentElement.style.colorScheme = 'dark';
}

function applyUserPref() {
  if (typeof document === 'undefined') return;
  let theme: 'light' | 'dark' = 'dark';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    } else {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark';
    }
  } catch {
    // localStorage indisponible → on garde dark
  }
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  root.style.colorScheme = theme;
}

export function RouteThemeManager() {
  const pathname = usePathname();

  useEffect(() => {
    if (isForcedDark(pathname)) {
      applyDark();
    } else {
      applyUserPref();
    }
  }, [pathname]);

  return null;
}
