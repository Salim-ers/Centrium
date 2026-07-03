import { redirect } from 'next/navigation';

import { getSuperAdminContext } from '@/lib/auth/super-admin';

// =========================================================================
// Layout racine /admin — garde SSR de TOUTE la super-console.
// -------------------------------------------------------------------------
// Avant : /admin/clients était un composant client protégé uniquement par
// le middleware (qui fait confiance au cookie qc_profile, TTL 5 min, pour
// le routing). Les APIs étaient déjà gated, mais la coquille de page
// pouvait s'afficher. Ce layout ferme ça : le check (rôle super_admin lu
// en DB + allowlist FOUNDER_EMAILS) s'exécute côté serveur sur chaque
// page /admin/**, avant tout rendu. Accès direct par URL → /dashboard.
// =========================================================================

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect('/dashboard');
  return <>{children}</>;
}
