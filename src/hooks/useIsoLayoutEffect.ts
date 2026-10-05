import { useEffect, useLayoutEffect } from 'react';

/**
 * useLayoutEffect côté client, useEffect côté serveur (sans avertissement).
 *
 * Sert à appliquer un cache navigateur (sessionStorage, localStorage)
 * avant la première peinture sans le lire pendant le rendu : le premier
 * rendu client reste identique au HTML du serveur, sinon React jette ce
 * HTML et re-rend tout le document.
 */
export const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
