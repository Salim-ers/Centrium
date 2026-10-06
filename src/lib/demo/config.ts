// =========================================================================
// Espace de démonstration : une organisation dédiée, isolée comme toute
// autre (organization_id + RLS). Ses données sont fictives et le disent
// (bandeau dans l'application). Les comptes « Démo ESN » et « Démo
// Consultant » n'existent que si l'environnement les configure.
// =========================================================================

/** Organisation de démonstration (seed : supabase/seed/demo.sql). */
export const DEMO_ORG_ID = '0000de30-0000-4000-8000-000000000000';

/** Fiche consultant reliée au compte « Démo Consultant ». */
export const DEMO_CONSULTANT_ID = 'de30a003-0000-4000-8000-000000000001';

export type DemoKind = 'esn' | 'consultant';

/** Identifiants des comptes de démo, lus côté serveur uniquement (jamais dans le code). */
export function demoCredentials(kind: DemoKind): { email: string; password: string } | null {
  const email = kind === 'esn' ? process.env.DEMO_ESN_EMAIL : process.env.DEMO_CONSULTANT_EMAIL;
  const password = kind === 'esn' ? process.env.DEMO_ESN_PASSWORD : process.env.DEMO_CONSULTANT_PASSWORD;
  return email && password ? { email, password } : null;
}

/** La démo en libre accès est-elle ouverte sur cet environnement ? */
export function demoEnabled(): boolean {
  return process.env.DEMO_ACCESS === 'on' && !!demoCredentials('esn') && !!demoCredentials('consultant');
}
