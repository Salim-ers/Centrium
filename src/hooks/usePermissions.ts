'use client';

import { useEffect, useMemo, useState } from 'react';
import { useOrganizationSafe } from '@/lib/auth/context';
import {
  defaultPermissions,
  type EffectiveRole,
  type Permission,
} from '@/lib/auth/permissions';

type Snapshot = {
  key: string;
  effectiveRole: EffectiveRole | null;
  isOwner: boolean;
  permissions: Permission[];
  ts: number;
};

const CACHE_KEY = 'qc_permissions';
const TTL_MS = 60_000;

function readCache(key: string): Snapshot | null {
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Snapshot;
    if (parsed.key !== key || Date.now() - parsed.ts > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Permissions effectives côté interface. Avant la réponse serveur, on
 * applique la matrice par défaut du rôle (pas de clignotement des menus).
 * Ne protège rien : la décision d'accès est prise côté serveur.
 */
export function usePermissions() {
  const org = useOrganizationSafe();
  const key = `${org?.user?.id ?? 'anon'}:${org?.activeOrgId ?? 'none'}`;
  const [snap, setSnap] = useState<Snapshot | null>(() =>
    typeof window === 'undefined' ? null : readCache(key),
  );

  useEffect(() => {
    if (!org?.activeOrgId || !org.user) return;
    const cached = readCache(key);
    if (cached) {
      setSnap(cached);
      return;
    }
    let cancelled = false;
    fetch('/api/me/permissions', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { data?: Omit<Snapshot, 'key' | 'ts'> } | null) => {
        if (cancelled || !body?.data) return;
        const next: Snapshot = { ...body.data, key, ts: Date.now() };
        setSnap(next);
        try {
          window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {
          /* stockage indisponible */
        }
      })
      .catch(() => {
        /* on garde la matrice par défaut */
      });
    return () => {
      cancelled = true;
    };
  }, [key, org?.activeOrgId, org?.user]);

  return useMemo(() => {
    const role = (snap?.effectiveRole ?? (org?.role as EffectiveRole | null)) || null;
    const perms = new Set<Permission>(snap?.permissions ?? (role ? defaultPermissions(role) : []));
    return {
      role,
      isOwner: snap?.isOwner ?? false,
      ready: !!snap,
      can: (p: Permission) => perms.has(p),
      permissions: perms,
    };
  }, [snap, org?.role]);
}
