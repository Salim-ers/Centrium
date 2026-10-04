'use client';

import { useEffect, useState } from 'react';

/**
 * Hook partagé pour l'état collapse/expand de la sidebar desktop.
 *
 * - Persiste en localStorage (survit aux navigations + reloads)
 * - Sync entre toutes les instances dans le même onglet via CustomEvent
 *   (Sidebar.tsx, AppShell.tsx, Header.tsx) — chaque appel re-render
 *   en cascade quand l'un toggle.
 * - Sync entre onglets via le storage event natif.
 *
 * AppShell n'est PAS un layout persistant (re-mount à chaque page) donc
 * un Context React seul ne suffit pas — localStorage est la source de vérité.
 */
const STORAGE_KEY = 'qc-sidebar-collapsed';
const EVENT_NAME = 'qc-sidebar-collapsed-change';

export function useSidebarCollapsed(): [boolean, (next: boolean) => void] {
  // Rail d'icônes par défaut (64 px). Le rendu serveur et le premier rendu
  // client sont identiques ; l'effet applique ensuite la préférence.
  const [collapsed, setCollapsedState] = useState(true);

  useEffect(() => {
    // Lecture initiale
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === '0') setCollapsedState(false);
    } catch {
      // localStorage bloqué → on garde le défaut (rail)
    }

    // Sync avec les autres instances du même onglet
    const onCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setCollapsedState(Boolean(detail));
    };
    window.addEventListener(EVENT_NAME, onCustomEvent);

    // Sync entre onglets (storage event ne se déclenche pas dans le même onglet)
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setCollapsedState(e.newValue === '1');
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(EVENT_NAME, onCustomEvent);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setCollapsed = (next: boolean) => {
    setCollapsedState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      // ignore
    }
    // Broadcast aux autres useSidebarCollapsed() du même onglet
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
  };

  return [collapsed, setCollapsed];
}
