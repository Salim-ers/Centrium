'use client';

import { Fragment, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Lock, RotateCcw } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { EmptyState } from '@/components/app/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  ASSIGNABLE_ROLES,
  LOCKED_PERMISSIONS,
  PERMISSIONS,
  PERMISSION_LABEL,
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  defaultPermissions,
  type AssignableRole,
  type Permission,
  type PermissionOverride,
} from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';

// Les administrateurs gardent toutes les permissions (pas de verrouillage
// accidentel) ; les autres rôles sont personnalisables. Commercial et
// Opérations apparaissent une fois les migrations 105-106 appliquées.
type CustomRole = Exclude<AssignableRole, 'admin'>;
const BASE_ROLES = (ASSIGNABLE_ROLES as readonly AssignableRole[]).filter((r): r is CustomRole => r !== 'admin');

export default function PermissionsPage() {
  const { activeOrgId } = useOrganization();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const allowed = can('team.manage');
  const [busy, setBusy] = useState<string | null>(null);
  const { data: available } = useCachedQuery<AssignableRole[]>(
    `team-roles:${activeOrgId ?? 'none'}`,
    async () => {
      const res = await fetch('/api/team/roles', { cache: 'no-store' });
      if (!res.ok) return [...ASSIGNABLE_ROLES];
      return ((await res.json()) as { data?: { roles?: AssignableRole[] } }).data?.roles ?? [...ASSIGNABLE_ROLES];
    },
    { enabled: !!activeOrgId && ready && allowed },
  );
  const ROLES: CustomRole[] = available ? available.filter((r): r is CustomRole => r !== 'admin') : BASE_ROLES;

  const { data, loading, setData } = useCachedQuery<PermissionOverride[]>(
    `role-permissions:${activeOrgId ?? 'none'}`,
    async () => {
      const res = await fetch('/api/team/permissions', { cache: 'no-store' });
      if (!res.ok) return [];
      return ((await res.json()) as { data: PermissionOverride[] }).data ?? [];
    },
    { enabled: !!activeOrgId && ready && allowed },
  );

  const overrides = useMemo(() => new Map((data ?? []).map((o) => [`${o.role}:${o.permission}`, o.allowed])), [data]);
  const groups = useMemo(() => {
    const out = new Map<string, Permission[]>();
    for (const p of PERMISSIONS) {
      const g = PERMISSION_LABEL[p].group;
      out.set(g, [...(out.get(g) ?? []), p]);
    }
    return [...out.entries()];
  }, []);

  async function set(role: CustomRole, permission: Permission, value: boolean | null) {
    const key = `${role}:${permission}`;
    setBusy(key);
    const res = await fetch('/api/team/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, permission, allowed: value }),
    });
    setBusy(null);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(body.message ?? (fr ? 'Modification impossible' : 'Could not update'));
      return;
    }
    const isDefault = defaultPermissions(role).includes(permission);
    setData((prev) => {
      const rest = (prev ?? []).filter((o) => !(o.role === role && o.permission === permission));
      return value === null || value === isDefault ? rest : [...rest, { role, permission, allowed: value }];
    });
  }

  if (ready && !allowed) {
    return (
      <AppShell>
        <EmptyState icon={Lock} title={fr ? 'Accès restreint' : 'Restricted access'} description={fr ? 'Réservé aux administrateurs.' : 'Administrators only.'} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        backHref="/settings/team"
        backLabel={fr ? 'Équipe' : 'Team'}
        title={fr ? 'Permissions par rôle' : 'Permissions by role'}
        description={
          fr
            ? 'Ajustez ce que chaque rôle peut voir et faire. Les changements s’appliquent côté serveur à la prochaine requête de chaque utilisateur. Les administrateurs conservent tous les droits.'
            : 'Adjust what each role can see and do. Changes are enforced server-side on each user’s next request. Administrators keep every right.'
        }
      />
      <ul className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label={fr ? 'Rôles' : 'Roles'}>
        {ROLES.map((r) => (
          <li key={r} className="rounded-xl border border-border bg-card px-3.5 py-2.5">
            <div className="text-[13px] font-semibold">{ROLE_LABEL[r][lang]}</div>
            <div className="text-[12.5px] text-muted-foreground">{ROLE_DESCRIPTION[r]?.[lang]}</div>
          </li>
        ))}
      </ul>
      {loading && !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium">{fr ? 'Permission' : 'Permission'}</th>
                  {ROLES.map((r) => (
                    <th key={r} className="px-2 py-3 text-center font-medium">
                      {ROLE_LABEL[r][lang]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map(([group, perms]) => (
                  <Fragment key={group}>
                    <tr className="bg-muted/50">
                      <td colSpan={ROLES.length + 1} className="px-4 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {group}
                      </td>
                    </tr>
                    {perms.map((p) => {
                      const locked = LOCKED_PERMISSIONS.includes(p);
                      return (
                        <tr key={p} className="border-b border-border last:border-0">
                          <td className="px-4 py-2">
                            {PERMISSION_LABEL[p][lang]}
                            {locked && <Lock className="ml-1.5 inline h-3 w-3 text-muted-foreground" aria-label={fr ? 'Verrouillée' : 'Locked'} />}
                          </td>
                          {ROLES.map((r) => {
                            const key = `${r}:${p}`;
                            const def = defaultPermissions(r).includes(p);
                            const override = overrides.get(key);
                            const value = override ?? def;
                            const custom = override !== undefined;
                            return (
                              <td key={r} className={cn('px-2 py-2 text-center', custom && 'bg-brand-50/60')}>
                                <div className="inline-flex items-center gap-1">
                                  <Checkbox
                                    checked={value}
                                    disabled={locked || busy === key}
                                    onCheckedChange={(c) => void set(r, p, c === true)}
                                    aria-label={`${PERMISSION_LABEL[p][lang]} — ${ROLE_LABEL[r][lang]}`}
                                  />
                                  {custom && (
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      onClick={() => void set(r, p, null)}
                                      aria-label={fr ? 'Revenir à la valeur par défaut' : 'Reset to default'}
                                      title={fr ? 'Revenir à la valeur par défaut' : 'Reset to default'}
                                    >
                                      <RotateCcw />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      <p className="mt-3 text-[12px] text-muted-foreground">
        {fr
          ? 'Cases surlignées : valeur personnalisée pour votre organisation. Les permissions verrouillées (équipe, abonnement, suppression) restent réservées aux administrateurs.'
          : 'Highlighted cells: customised for your organisation. Locked permissions (team, subscription, deletion) stay with administrators.'}
      </p>
    </AppShell>
  );
}
