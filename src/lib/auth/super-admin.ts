import 'server-only';

import { createClient } from '@/lib/supabase/server';

// =========================================================================
// Accès super-console — STRICTEMENT réservé aux comptes fondateurs
// -------------------------------------------------------------------------
// Défense en profondeur, DEUX conditions cumulatives côté serveur :
//
//   1. profiles.role === 'super_admin'  (lu en DB, jamais depuis un cookie)
//   2. email ∈ FOUNDER_EMAILS           (allowlist env, optionnelle)
//
// FOUNDER_EMAILS (env serveur, jamais NEXT_PUBLIC) : liste d'emails séparés
// par des virgules — les 3-4 comptes fondateurs autorisés. Si la variable
// est définie, même un compte qui aurait obtenu role='super_admin' en DB
// (erreur d'op, compromission SQL partielle) est REFUSÉ si son email n'est
// pas dans la liste. Si absente, on retombe sur le seul check de rôle
// (comportement historique) — la définir en prod est fortement recommandé.
//
// Utilisé par : les routes /api/admin/**, le layout SSR /admin, et tout
// futur point d'entrée super-console. Le middleware ne fait que du routing
// (cookie 5 min) — la sécurité réelle est ICI + RLS.
// =========================================================================

export type SuperAdminContext = {
  user: { id: string; email: string };
};

function founderAllowlist(): string[] | null {
  const raw = process.env.FOUNDER_EMAILS;
  if (!raw?.trim()) return null;
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** True si l'email fait partie de l'allowlist fondateurs (env). */
export function isFounderEmail(email: string | null | undefined): boolean {
  const allowlist = founderAllowlist();
  if (!allowlist || !email) return false;
  return allowlist.includes(email.toLowerCase());
}

/**
 * Retourne le contexte super-admin, ou null si l'appelant n'est pas un
 * fondateur autorisé. Ne throw jamais — l'appelant décide (403 / redirect).
 *
 * Deux voies d'accès (l'une OU l'autre) :
 *   a. rôle DB 'super_admin' — compte console dédié (org NULL). Si
 *      FOUNDER_EMAILS est défini, l'email doit AUSSI y figurer.
 *   b. email ∈ FOUNDER_EMAILS — les fondateurs utilisent leur compte
 *      admin quotidien (org QuadCore) et accèdent à la console via le
 *      menu profil, sans compte séparé.
 */
export async function getSuperAdminContext(): Promise<SuperAdminContext | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const allowlist = founderAllowlist();
  const email = (user.email ?? '').toLowerCase();
  const allowlisted = !!allowlist && allowlist.includes(email);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role === 'super_admin') {
    if (allowlist && !allowlisted) {
      console.warn(
        `[super-admin] role=super_admin mais email hors FOUNDER_EMAILS — accès refusé (user=${user.id})`,
      );
      return null;
    }
    return { user: { id: user.id, email: user.email ?? '' } };
  }

  if (allowlisted) {
    return { user: { id: user.id, email: user.email ?? '' } };
  }

  return null;
}
