import { z } from 'zod';

/**
 * Politique de mot de passe Centrium.
 *
 * Valeurs par défaut alignées sur NIST SP 800-63B :
 *   - min 12 caractères (au lieu des classiques 8)
 *   - pas de rotation forcée
 *   - check HaveIBeenPwned obligatoire (compromis dans une fuite connue)
 *
 * La policy est CONFIGURABLE par admin d'organisation
 * (table `org_security_settings`, migration 060). Les valeurs ici
 * sont les défauts si la table n'est pas remplie.
 */

export type PasswordPolicy = {
  min_length: number;
  require_upper: boolean;
  require_lower: boolean;
  require_digit: boolean;
  require_symbol: boolean;
};

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  min_length: 12,
  require_upper: true,
  require_lower: true,
  require_digit: true,
  require_symbol: false,
};

/**
 * Vérifie qu'un mot de passe respecte la policy.
 * Retourne un array d'erreurs FR (vide = OK).
 */
export function validatePassword(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): string[] {
  const errors: string[] = [];

  if (password.length < policy.min_length) {
    errors.push(`Le mot de passe doit faire au moins ${policy.min_length} caractères.`);
  }
  if (policy.require_upper && !/[A-Z]/.test(password)) {
    errors.push('Une majuscule au moins est requise.');
  }
  if (policy.require_lower && !/[a-z]/.test(password)) {
    errors.push('Une minuscule au moins est requise.');
  }
  if (policy.require_digit && !/[0-9]/.test(password)) {
    errors.push('Un chiffre au moins est requis.');
  }
  if (policy.require_symbol && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Un caractère spécial au moins est requis.');
  }
  return errors;
}

/**
 * Zod schema pour validation côté serveur (route handlers).
 */
export const passwordSchema = z
  .string()
  .min(DEFAULT_PASSWORD_POLICY.min_length, {
    message: `Au moins ${DEFAULT_PASSWORD_POLICY.min_length} caractères.`,
  })
  .refine((p) => /[A-Z]/.test(p), 'Une majuscule au moins.')
  .refine((p) => /[a-z]/.test(p), 'Une minuscule au moins.')
  .refine((p) => /[0-9]/.test(p), 'Un chiffre au moins.');

/**
 * Vérifie si un mot de passe a fuité dans une breach connue.
 *
 * Utilise HaveIBeenPwned avec le modèle k-anonymity :
 *   - on hash le password en SHA1
 *   - on n'envoie QUE les 5 premiers caractères du hash
 *   - on reçoit la liste des suffixes connus et on cherche le nôtre localement
 *
 * Le password en clair ne quitte JAMAIS le serveur. C'est l'approche
 * recommandée officiellement par HIBP et utilisée par 1Password, Okta, etc.
 *
 * En cas d'échec réseau, on laisse passer (fail-open) — empêcher une
 * création de compte parce qu'HIBP est down est trop hostile.
 */
export async function isPasswordPwned(password: string): Promise<{
  pwned: boolean;
  count: number;
}> {
  try {
    // SHA-1 du password (encoding manuel pour éviter une dep externe)
    const buf = await crypto.subtle.digest(
      'SHA-1',
      new TextEncoder().encode(password),
    );
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

    const prefix = hex.slice(0, 5);
    const suffix = hex.slice(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'Centrium-Platform' },
      // Force un timeout court — HIBP est rapide mais on ne veut pas
      // bloquer une création de compte > 3s
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return { pwned: false, count: 0 };

    const text = await res.text();
    for (const line of text.split('\n')) {
      const [sfx, count] = line.trim().split(':');
      if (sfx === suffix) {
        return { pwned: true, count: parseInt(count ?? '0', 10) };
      }
    }
    return { pwned: false, count: 0 };
  } catch {
    // fail-open : si HIBP est down on laisse passer
    return { pwned: false, count: 0 };
  }
}
