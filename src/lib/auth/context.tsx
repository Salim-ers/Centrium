'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types';

export type Membership = {
  id: string; // organization_id
  name: string;
  slug: string;
  role: UserRole;
};

type State = {
  user: { id: string; email: string } | null;
  activeOrgId: string | null;
  role: UserRole | null;
  memberships: Membership[];
  loading: boolean;
};

type OrgContextValue = State & {
  switchOrg: (orgId: string) => Promise<void>;
  reload: () => Promise<void>;
};

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({
    user: null,
    activeOrgId: null,
    role: null,
    memberships: [],
    loading: true,
  });

  const supabase = useMemo(() => createClient(), []);

  const load = useCallback(async () => {
    // Hydrate instantanément depuis sessionStorage pour éviter le flash "loading".
    // Le refetch réseau derrière met à jour si quelque chose a bougé.
    if (typeof window !== 'undefined') {
      const cached = window.sessionStorage.getItem('qc_auth_state');
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as Omit<State, 'loading'>;
          setState({ ...parsed, loading: false });
        } catch {
          // ignore
        }
      }
    }

    // getSession() lit le cookie local : 0 appel réseau (vs getUser() qui valide côté auth server).
    // Le middleware serveur garde getUser() pour la vraie validation de session.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (!user) {
      const next = { user: null, activeOrgId: null, role: null, memberships: [] };
      setState({ ...next, loading: false });
      if (typeof window !== 'undefined') window.sessionStorage.removeItem('qc_auth_state');
      return;
    }

    const [profileRes, memberRes] = await Promise.all([
      supabase.from('profiles').select('organization_id').eq('id', user.id).single(),
      supabase.from('my_organizations').select('id, name, slug, role'),
    ]);

    const memberships = (memberRes.data ?? []) as Membership[];
    const profileOrg = profileRes.data?.organization_id as string | null | undefined;
    const activeOrgId = profileOrg ?? memberships[0]?.id ?? null;
    const activeRole = memberships.find((m) => m.id === activeOrgId)?.role ?? null;

    const next = {
      user: { id: user.id, email: user.email ?? '' },
      activeOrgId,
      role: activeRole,
      memberships,
    };
    setState({ ...next, loading: false });
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('qc_auth_state', JSON.stringify(next));
    }
  }, [supabase]);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, [load, supabase]);

  const switchOrg = useCallback(
    async (orgId: string) => {
      if (!state.user) return;
      // Le trigger SQL rejettera si le user n'est pas membre — safe.
      const { error } = await supabase
        .from('profiles')
        .update({ organization_id: orgId })
        .eq('id', state.user.id);
      if (error) {
        console.error('switchOrg failed', error);
        return;
      }
      const activeRole = state.memberships.find((m) => m.id === orgId)?.role ?? null;
      setState((s) => ({ ...s, activeOrgId: orgId, role: activeRole }));
    },
    [supabase, state.user, state.memberships],
  );

  const value = useMemo(
    () => ({ ...state, switchOrg, reload: load }),
    [state, switchOrg, load],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrganization(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error('useOrganization must be used within <OrganizationProvider>');
  }
  return ctx;
}

/**
 * Version défensive : renvoie null sans throw si le provider n'est pas monté
 * (pages publiques : /login, /signup, /pricing…).
 */
export function useOrganizationSafe(): OrgContextValue | null {
  return useContext(OrgContext);
}
