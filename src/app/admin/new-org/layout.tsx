import { redirect } from 'next/navigation';

import { getSuperAdminContext } from '@/lib/auth/super-admin';

/**
 * Garde-fou serveur : double-check accès console (défense en profondeur,
 * en plus du layout racine /admin et de la route POST /api/admin/
 * organizations). Utilise le helper central — rôle super_admin OU compte
 * fondateur de l'allowlist FOUNDER_EMAILS.
 */
export default async function AdminNewOrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect('/dashboard');
  return <>{children}</>;
}
