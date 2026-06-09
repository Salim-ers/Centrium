import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

/**
 * Garde-fou serveur : double-check super_admin.
 *
 * Le middleware Next.js bloque déjà les non-super_admin sur /admin/*
 * mais on re-vérifie ici en SSR pour défense en profondeur (Belt &
 * Suspenders). Un user qui contourne le middleware (header forgé,
 * bug Next, etc.) tombera sur ce check côté serveur.
 *
 * Et même si tout ça est bypassé, la route POST /api/admin/organizations
 * vérifie une 3e fois le rôle avant d'exécuter quoi que ce soit.
 */
export default async function AdminNewOrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'super_admin') {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
