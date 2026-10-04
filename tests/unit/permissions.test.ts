import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  can,
  defaultPermissions,
  effectiveRole,
  resolvePermissions,
  PERMISSIONS,
  type EffectiveRole,
} from '@/lib/auth/permissions';

describe('RBAC — matrice par défaut', () => {
  it('le propriétaire a toutes les permissions', () => {
    expect(defaultPermissions('owner').sort()).toEqual([...PERMISSIONS].sort());
  });

  it("l'admin a tout sauf la suppression de l'organisation", () => {
    expect(can('admin', 'billing.manage')).toBe(true);
    expect(can('admin', 'org.delete')).toBe(false);
  });

  it('le recruteur ne voit pas les données financières', () => {
    expect(can('recruiter', 'consultants.financials')).toBe(false);
    expect(can('recruiter', 'finance.view')).toBe(false);
    expect(can('recruiter', 'consultants.edit')).toBe(true);
  });

  it('les rôles externes n’ont aucune permission interne', () => {
    for (const role of ['consultant', 'client', 'super_admin'] as EffectiveRole[]) {
      expect(resolvePermissions(role).size).toBe(0);
    }
  });

  it('effectiveRole : un admin propriétaire devient owner', () => {
    expect(effectiveRole('admin', true)).toBe('owner');
    expect(effectiveRole('business_manager', true)).toBe('business_manager');
    expect(effectiveRole('admin', false)).toBe('admin');
    expect(effectiveRole(null, true)).toBeNull();
  });
});

describe('RBAC — surcharges d’organisation', () => {
  it('accorde et retire des permissions', () => {
    const perms = resolvePermissions('recruiter', [
      { role: 'recruiter', permission: 'consultants.financials', allowed: true },
      { role: 'recruiter', permission: 'consultants.edit', allowed: false },
    ]);
    expect(perms.has('consultants.financials')).toBe(true);
    expect(perms.has('consultants.edit')).toBe(false);
  });

  it('ne peut pas accorder une permission verrouillée', () => {
    const perms = resolvePermissions('recruiter', [{ role: 'recruiter', permission: 'team.manage', allowed: true }]);
    expect(perms.has('team.manage')).toBe(false);
  });

  it('ignore les surcharges sur owner, les rôles externes et les permissions inconnues', () => {
    expect(resolvePermissions('owner', [{ role: 'owner', permission: 'org.delete', allowed: false }]).has('org.delete')).toBe(true);
    expect(resolvePermissions('client', [{ role: 'client', permission: 'dashboard.view', allowed: true }]).size).toBe(0);
    expect(
      resolvePermissions('viewer', [{ role: 'viewer', permission: 'hack.everything', allowed: true }]).has(
        'hack.everything' as never,
      ),
    ).toBe(false);
  });

  it("n'applique que les surcharges du rôle concerné", () => {
    const perms = resolvePermissions('finance', [{ role: 'recruiter', permission: 'crm.edit', allowed: true }]);
    expect(perms.has('crm.edit')).toBe(false);
  });
});

describe('RBAC — alignement base de données', () => {
  it('la migration 096 contient exactement la matrice TypeScript', () => {
    const sql = readFileSync(
      path.resolve(__dirname, '../../supabase/migrations/096_v2_rbac_owner.sql'),
      'utf8',
    );
    const seeded = new Set([...sql.matchAll(/\('([a-z_]+)', '([a-z_]+\.[a-z_]+)'\)/g)].map((m) => `${m[1]}:${m[2]}`));
    const expected = new Set<string>();
    for (const role of ['owner', 'admin', 'direction', 'business_manager', 'recruiter', 'finance', 'viewer'] as EffectiveRole[]) {
      for (const p of defaultPermissions(role)) expected.add(`${role}:${p}`);
    }
    expect([...seeded].sort()).toEqual([...expected].sort());
  });
});
