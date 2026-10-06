// =========================================================================
// Rôles attribuables selon l'état de la base. Commercial et Opérations
// n'existent qu'une fois les migrations 105-106 jouées (valeurs d'enum,
// matrice SQL, policies par permission). Tant que la matrice SQL ne les
// connaît pas, ils ne sont proposés nulle part et les API les refusent.
// =========================================================================

import type { SupabaseClient } from '@supabase/supabase-js';

import { ALL_ASSIGNABLE_ROLES, ASSIGNABLE_ROLES, EXTENDED_ROLES, type AssignableRole } from './permissions';

/** La base connaît-elle les rôles étendus ? (lignes de role_permission_defaults) */
export async function extendedRolesAvailable(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.from('role_permission_defaults').select('role').in('role', [...EXTENDED_ROLES]).limit(1);
  return !error && (data ?? []).length > 0;
}

export async function assignableRoles(supabase: SupabaseClient): Promise<AssignableRole[]> {
  const extended = await extendedRolesAvailable(supabase);
  return ALL_ASSIGNABLE_ROLES.filter((r) => extended || (ASSIGNABLE_ROLES as readonly string[]).includes(r));
}

/** Réponse uniforme quand un rôle étendu est demandé avant la migration. */
export const ROLE_UNAVAILABLE = {
  error: 'role_unavailable',
  message: 'Ce rôle sera disponible après la mise à jour de la base de données (migrations 105-106).',
} as const;
