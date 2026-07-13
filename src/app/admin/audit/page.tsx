import { redirect } from 'next/navigation';

import { createAdminClient } from '@/lib/supabase/admin';
import { getSuperAdminContext } from '@/lib/auth/super-admin';

import { AuditContent } from './AuditContent';
import type { AuditRow } from './AuditTable';

export const dynamic = 'force-dynamic';

const CRITICAL_ACTIONS = new Set(['deleted', 'archived', 'requested']);

/**
 * Page /admin/audit — accessible UNIQUEMENT au super_admin (gate
 * middleware + double check ici). Affiche les 200 dernières activités
 * journalisées, toutes organisations confondues.
 */
export default async function AdminAuditPage() {
  // Helper central : rôle super_admin OU fondateur (FOUNDER_EMAILS).
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect('/dashboard');
  const admin = createAdminClient('cross-org-query');

  const { data: rows } = await admin
    .from('activities')
    .select('id, organization_id, user_id, entity_type, entity_id, action, details, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const list = (rows ?? []) as AuditRow[];
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const last24 = list.filter((r) => now - new Date(r.created_at).getTime() < day).length;
  const last7d = list.filter((r) => now - new Date(r.created_at).getTime() < 7 * day).length;
  const critical = list.filter((r) => CRITICAL_ACTIONS.has(r.action)).length;
  const uniqueUsers = new Set(list.map((r) => r.user_id).filter(Boolean)).size;

  return (
    <AuditContent
      rows={list}
      last24={last24}
      last7d={last7d}
      critical={critical}
      uniqueUsers={uniqueUsers}
    />
  );
}
