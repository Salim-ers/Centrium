'use client';

import { useEffect } from 'react';

/**
 * Enregistre le service worker en production : installation de l'app et
 * page de repli hors ligne. Il ne met jamais de données en cache
 * (voir public/sw.js).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        /* navigateur ou contexte non compatible : l'app fonctionne sans */
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);
  return null;
}
