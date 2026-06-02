'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SESSION_FLAG_KEY = 'centrium-session-active';
const BROADCAST_CHANNEL = 'centrium-session';

/**
 * Force la déconnexion automatique quand le navigateur (ou tous les
 * onglets Centrium) est fermé, même si les cookies de session sont
 * restaurés par Chrome via "Continue where you left off".
 *
 * Principe :
 *   - À chaque login réussi, on pose un flag dans sessionStorage
 *     (`centrium-session-active`).
 *   - sessionStorage est PER-TAB et MEURT à la fermeture de l'onglet
 *     dans la plupart des configurations navigateur.
 *   - À l'ouverture d'une page protégée, ce hook vérifie le flag :
 *     • Présent → l'utilisateur est sur une session active légitime.
 *     • Absent → soit nouvel onglet (Ctrl+T), soit navigateur restauré.
 *       On demande aux autres onglets (BroadcastChannel) s'il y a une
 *       session active. Si un autre onglet répond → on récupère le flag.
 *       Sinon (250ms) → logout serveur + redirect /login.
 *
 * Effet : si l'utilisateur ferme le dernier onglet Centrium puis le
 * navigateur, à la prochaine ouverture le flag est absent ET aucun
 * onglet vivant pour répondre → re-login forcé.
 *
 * Si l'utilisateur ouvre un nouvel onglet Ctrl+T depuis Centrium, il
 * reste connecté grâce au handshake BroadcastChannel.
 */
export function useSessionPresence() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    let bc: BroadcastChannel | null = null;
    let answered = false;

    const hasFlag = () => {
      try {
        return window.sessionStorage.getItem(SESSION_FLAG_KEY) === '1';
      } catch {
        return false;
      }
    };
    const setFlag = () => {
      try {
        window.sessionStorage.setItem(SESSION_FLAG_KEY, '1');
      } catch {
        /* mode incognito strict */
      }
    };

    try {
      bc = new BroadcastChannel(BROADCAST_CHANNEL);
    } catch {
      /* BroadcastChannel pas supporté (anciens browsers) */
    }

    if (hasFlag()) {
      // On est sur une session active. On répond aux pings des autres
      // onglets qui auraient été ouverts par Ctrl+T pour qu'ils héritent
      // de notre statut connecté.
      if (bc) {
        bc.onmessage = (e) => {
          if (e.data?.type === 'ping') bc?.postMessage({ type: 'present' });
        };
      }
      return () => {
        cancelled = true;
        bc?.close();
      };
    }

    // Pas de flag → on ping les autres onglets éventuels.
    if (bc) {
      bc.onmessage = (e) => {
        if (e.data?.type === 'present' && !cancelled) {
          setFlag();
          answered = true;
        }
      };
      bc.postMessage({ type: 'ping' });
    }

    // Si personne ne répond après 250ms, on force le logout.
    const timer = window.setTimeout(async () => {
      if (cancelled || answered) return;
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch {
        /* best-effort, on redirect quand même */
      }
      if (!cancelled) router.replace('/login');
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      bc?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * À appeler une fois après un login réussi pour signaler au hook
 * useSessionPresence que cette session est active. Sans cet appel,
 * la prochaine page chargée force un logout.
 */
export function markSessionActive() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_FLAG_KEY, '1');
  } catch {
    /* mode incognito strict */
  }
}

/**
 * À appeler au logout volontaire (bouton "Se déconnecter") pour nettoyer
 * le flag avant la redirection vers /login.
 */
export function clearSessionPresence() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SESSION_FLAG_KEY);
  } catch {
    /* */
  }
}
