/**
 * Gestion du consentement cookies — conforme RGPD / CNIL.
 *
 * Catégories :
 *   - essential : strictement nécessaires (session, sécurité, préférences). Toujours actives.
 *   - analytics : mesure d'audience anonymisée.
 *   - marketing : non utilisée aujourd'hui par Centrium, prévue pour évolution.
 *
 * Stockage : localStorage. Le consentement est versionné — si on ajoute une
 * catégorie ou qu'on change la politique, on bumpe la version et la bannière
 * se réaffiche pour recueillir un nouveau consentement explicite.
 */

export type CookieCategory = 'essential' | 'analytics' | 'marketing';

export type CookieConsent = {
  version: number;
  decidedAt: string; // ISO date
  essential: true; // toujours true, immuable
  analytics: boolean;
  marketing: boolean;
};

export const CONSENT_STORAGE_KEY = 'centrium-cookie-consent';
export const CONSENT_VERSION = 1;

export const CONSENT_CATEGORIES: {
  key: Exclude<CookieCategory, 'essential'>;
  title: string;
  description: string;
}[] = [
  {
    key: 'analytics',
    title: 'Mesure d’audience',
    description:
      'Statistiques anonymisées d’usage de la plateforme (pages vues, parcours) pour améliorer le produit. Aucune donnée personnelle identifiante n’est partagée.',
  },
  {
    key: 'marketing',
    title: 'Communication',
    description:
      'Suivi de campagnes et personnalisation des contenus marketing. Non activé aujourd’hui — réservé pour évolution future.',
  },
];

export function readConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(input: {
  analytics: boolean;
  marketing: boolean;
}): CookieConsent {
  const consent: CookieConsent = {
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
    essential: true,
    analytics: input.analytics,
    marketing: input.marketing,
  };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    window.dispatchEvent(new CustomEvent('centrium-consent-change', { detail: consent }));
  }
  return consent;
}

export function clearConsent(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('centrium-consent-change', { detail: null }));
}
