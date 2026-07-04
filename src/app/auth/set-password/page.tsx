import { redirect } from 'next/navigation';

// =========================================================================
// /auth/set-password — ALIAS DE COMPATIBILITÉ.
// -------------------------------------------------------------------------
// Les parcours vivent désormais sur deux pages dédiées :
//   /auth/first-password  → premier mot de passe (invitation membre/consultant)
//   /auth/reset-password  → mot de passe oublié
// Cette route ne sert qu'aux liens déjà en circulation (emails envoyés
// avant la migration) et aux vieux favoris. Redirection serveur immédiate,
// paramètres préservés.
// =========================================================================

type Props = { searchParams: Record<string, string | string[] | undefined> };

export default function SetPasswordCompatPage({ searchParams }: Props) {
  const q = new URLSearchParams();
  let welcome: string | null = null;
  for (const [key, value] of Object.entries(searchParams)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (typeof v !== 'string') continue;
    if (key === 'welcome') welcome = v;
    else q.set(key, v);
  }
  if (welcome === 'recovery') {
    redirect(`/auth/reset-password${q.size ? `?${q.toString()}` : ''}`);
  }
  if (welcome) q.set('welcome', welcome);
  redirect(`/auth/first-password${q.size ? `?${q.toString()}` : ''}`);
}
