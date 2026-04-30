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

export type CVTemplatePref = 'standard' | 'dense' | 'executive';

export type OrgBranding = {
  id: string;
  name: string;
  logoUrl: string | null;
  brandName: string | null;
  footerTagline: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  defaultCvTemplate: CVTemplatePref | null;
  signatureUrl: string | null;
};

type State = {
  user: { id: string; email: string } | null;
  activeOrgId: string | null;
  role: UserRole | null;
  memberships: Membership[];
  branding: OrgBranding | null;
  loading: boolean;
};

type OrgContextValue = State & {
  switchOrg: (orgId: string) => Promise<void>;
  reload: () => Promise<void>;
  reloadBranding: () => Promise<void>;
};

const OrgContext = createContext<OrgContextValue | null>(null);

const AUTH_CACHE_TTL_MS = 60_000;
const AUTH_CACHE_KEY = 'qc_auth_state';
const AUTH_CACHE_TS_KEY = 'qc_auth_ts';

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({
    user: null,
    activeOrgId: null,
    role: null,
    memberships: [],
    branding: null,
    loading: true,
  });

  const supabase = useMemo(() => createClient(), []);

  const load = useCallback(
    async (options: { force?: boolean } = {}) => {
      const { force = false } = options;

      let hadFreshCache = false;
      if (typeof window !== 'undefined') {
        const cached = window.sessionStorage.getItem(AUTH_CACHE_KEY);
        const ts = Number(window.sessionStorage.getItem(AUTH_CACHE_TS_KEY) ?? '0');
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as Omit<State, 'loading'>;
            setState({ ...parsed, loading: false });
            if (!force && Date.now() - ts < AUTH_CACHE_TTL_MS) {
              hadFreshCache = true;
            }
          } catch {
            // ignore
          }
        }
      }

      if (hadFreshCache) return;

      // Timeout de sécurité : si Supabase stall, on ne veut pas que l'UI
      // reste en loading=true indéfiniment.
      const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T) =>
        Promise.race([
          p,
          new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
        ]);

      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(),
        8000,
        { data: { session: null } } as Awaited<ReturnType<typeof supabase.auth.getSession>>,
      );
      const user = session?.user ?? null;

      if (!user) {
        const next = {
          user: null,
          activeOrgId: null,
          role: null,
          memberships: [],
          branding: null,
        };
        setState({ ...next, loading: false });
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(AUTH_CACHE_KEY);
          window.sessionStorage.removeItem(AUTH_CACHE_TS_KEY);
        }
        return;
      }

      // Les PostgrestBuilder sont thenable ; Promise.resolve suffit pour les
      // "terminer". Fallback = objet minimal avec juste .data, c'est tout ce
      // qu'on lit ensuite.
      const profileQ = Promise.resolve(
        supabase.from('profiles').select('organization_id').eq('id', user.id).single(),
      ) as Promise<{ data: { organization_id: string | null } | null }>;
      // my_organizations expose aussi les colonnes de branding depuis 020.
      type MembershipRow = Membership & {
        logo_url: string | null;
        brand_name: string | null;
        footer_tagline: string | null;
        brand_primary_color: string | null;
        brand_accent_color: string | null;
        default_cv_template: CVTemplatePref | null;
        signature_url: string | null;
      };
      const memberQ = Promise.resolve(
        supabase
          .from('my_organizations')
          .select(
            'id, name, slug, role, logo_url, brand_name, footer_tagline, brand_primary_color, brand_accent_color, default_cv_template, signature_url',
          ),
      ) as Promise<{ data: MembershipRow[] | null }>;

      const [profileRes, memberRes] = await Promise.all([
        withTimeout(profileQ, 8000, { data: null } as { data: { organization_id: string | null } | null }),
        withTimeout(memberQ, 8000, { data: [] } as { data: MembershipRow[] | null }),
      ]);

      const rows = (memberRes.data ?? []) as MembershipRow[];
      const memberships: Membership[] = rows.map(({ id, name, slug, role }) => ({
        id,
        name,
        slug,
        role,
      }));
      const profileOrg = profileRes.data?.organization_id as string | null | undefined;
      const activeOrgId = profileOrg ?? memberships[0]?.id ?? null;
      const activeRole = memberships.find((m) => m.id === activeOrgId)?.role ?? null;
      const activeRow = rows.find((m) => m.id === activeOrgId) ?? null;
      const branding: OrgBranding | null = activeRow
        ? {
            id: activeRow.id,
            name: activeRow.name,
            logoUrl: activeRow.logo_url,
            brandName: activeRow.brand_name,
            footerTagline: activeRow.footer_tagline,
            primaryColor: activeRow.brand_primary_color,
            accentColor: activeRow.brand_accent_color,
            defaultCvTemplate: activeRow.default_cv_template,
            signatureUrl: activeRow.signature_url,
          }
        : null;

      const next = {
        user: { id: user.id, email: user.email ?? '' },
        activeOrgId,
        role: activeRole,
        memberships,
        branding,
      };
      setState({ ...next, loading: false });
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(next));
        window.sessionStorage.setItem(AUTH_CACHE_TS_KEY, String(Date.now()));
      }
    },
    [supabase],
  );

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load({ force: true }));
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

  const reload = useCallback(() => load({ force: true }), [load]);

  const reloadBranding = useCallback(async () => {
    if (!state.activeOrgId) return;
    try {
      const res = await fetch('/api/organizations/branding', { cache: 'no-store' });
      if (!res.ok) return;
      const { data } = (await res.json()) as {
        data: {
          id: string;
          name: string;
          logo_url: string | null;
          brand_name: string | null;
          footer_tagline: string | null;
          brand_primary_color: string | null;
          brand_accent_color: string | null;
          default_cv_template: CVTemplatePref | null;
          signature_url: string | null;
        };
      };
      const branding: OrgBranding = {
        id: data.id,
        name: data.name,
        logoUrl: data.logo_url,
        brandName: data.brand_name,
        footerTagline: data.footer_tagline,
        primaryColor: data.brand_primary_color,
        accentColor: data.brand_accent_color,
        defaultCvTemplate: data.default_cv_template,
        signatureUrl: data.signature_url,
      };
      setState((s) => {
        const next = { ...s, branding };
        if (typeof window !== 'undefined') {
          const payload = {
            user: next.user,
            activeOrgId: next.activeOrgId,
            role: next.role,
            memberships: next.memberships,
            branding: next.branding,
          };
          window.sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(payload));
          window.sessionStorage.setItem(AUTH_CACHE_TS_KEY, String(Date.now()));
        }
        return next;
      });
    } catch {
      // silent — branding est non critique
    }
  }, [state.activeOrgId]);

  const value = useMemo(
    () => ({ ...state, switchOrg, reload, reloadBranding }),
    [state, switchOrg, reload, reloadBranding],
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
