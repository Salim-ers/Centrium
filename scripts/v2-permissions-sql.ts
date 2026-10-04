// Génère le bloc INSERT de role_permission_defaults à partir de la matrice
// TypeScript (src/lib/auth/permissions.ts) — source unique des droits.
// Usage : npx tsx scripts/v2-permissions-sql.ts
// Un test (tests/unit/permissions-sql.test.ts) vérifie que la migration
// reste alignée sur la matrice.
import { defaultPermissions, type EffectiveRole } from '../src/lib/auth/permissions';

const ROLES: EffectiveRole[] = ['owner', 'admin', 'direction', 'business_manager', 'recruiter', 'finance', 'viewer'];

const rows: string[] = [];
for (const role of ROLES) {
  for (const perm of defaultPermissions(role)) rows.push(`  ('${role}', '${perm}')`);
}
console.log(`INSERT INTO public.role_permission_defaults (role, permission) VALUES\n${rows.join(',\n')}\nON CONFLICT DO NOTHING;`);
