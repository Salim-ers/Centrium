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

/**
 * Branding + identité légale + coordonnées bancaires consolidés.
 * Source de vérité unique pour TOUTES les surfaces (CV / Facture / Contrat /
 * Timesheet / Sidebar / Header / Footer). Quand un de ces champs change dans
 * /settings/branding ou /settings/identity, `brandingVersion` est bumped →
 * tous les `useMemo([branding, brandingVersion])` se réévaluent et les docs
 * se régénèrent avec les nouvelles valeurs.
 */
export type OrgBranding = {
  id: string;
  /** Raison sociale légale (Centrium, QuadCore SAS, etc.) */
  name: string;
  // === Visuel ===
  logoUrl: string | null;
  brandName: string | null;
  footerTagline: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  defaultCvTemplate: CVTemplatePref | null;
  signatureUrl: string | null;
  // === Identité légale ===
  legalForm: string | null;
  capitalEur: number | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  siren: string | null;
  siret: string | null;
  vatNumber: string | null;
  rcs: string | null;
  representativeName: string | null;
  representativeTitle: string | null;
  // === Banking ===
  iban: string | null;
  bic: string | null;
  bankName: string | null;
  // === Terms ===
  paymentTermsDays: number | null;
  lateFeeRatePct: number | null;
  /** Compteur incrémenté à chaque reloadBranding/load — sert de dep pour
   *  les useMemo des consumers de docs PDF afin qu'ils se régénèrent
   *  immédiatement après une modif. */
  version: number;
};

/** Construit un OrgBranding à partir d'une ligne brute organizations. */
function buildBranding(
  row: Record<string, unknown> | null,
  version: number,
): OrgBranding | null {
  if (!row) return null;
  return {
    id: row.id as string,
    name: (row.name as string) ?? '',
    logoUrl: (row.logo_url as string | null) ?? null,
    brandName: (row.brand_name as string | null) ?? null,
    footerTagline: (row.footer_tagline as string | null) ?? null,
    primaryColor: (row.brand_primary_color as string | null) ?? null,
    accentColor: (row.brand_accent_color as string | null) ?? null,
    defaultCvTemplate: (row.default_cv_template as CVTemplatePref | null) ?? null,
    signatureUrl: (row.signature_url as string | null) ?? null,
    legalForm: (row.legal_form as string | null) ?? null,
    capitalEur: row.capital_eur != null ? Number(row.capital_eur) : null,
    address: (row.address as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    postalCode: (row.postal_code as string | null) ?? null,
    country: (row.country as string | null) ?? null,
    siren: (row.siren as string | null) ?? null,
    siret: (row.siret as string | null) ?? null,
    vatNumber: (row.vat_number as string | null) ?? null,
    rcs: (row.rcs as string | null) ?? null,
    representativeName: (row.representative_name as string | null) ?? null,
    representativeTitle: (row.representative_title as string | null) ?? null,
    iban: (row.iban as string | null) ?? null,
    bic: (row.bic as string | null) ?? null,
    bankName: (row.bank_name as string | null) ?? null,
    paymentTermsDays:
      row.payment_terms_days != null ? Number(row.payment_terms_days) : null,
    lateFeeRatePct:
      row.late_fee_rate_pct != null ? Number(row.late_fee_rate_pct) : null,
    version,
  };
}

/** Liste exhaustive des colonnes à SELECT pour construire un OrgBranding. */
const BRANDING_COLUMNS =
  'id, name, logo_url, brand_name, footer_tagline, brand_primary_color, brand_accent_color, default_cv_template, signature_url, legal_form, capital_eur, address, city, postal_code, country, siren, siret, vat_number, rcs, representative_name, representative_title, iban, bic, bank_name, payment_terms_days, late_fee_rate_pct';

type State = {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
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

const EMPTY_STATE: State = {
  user: null,
  activeOrgId: null,
  role: null,
  memberships: [],
  branding: null,
  loading: true,
};

/**
 * Hydratation synchrone du contexte d'auth depuis sessionStorage.
 *
 * Sans ça, après un F5, `activeOrgId` reste null pendant le premier
 * render — toutes les pages déclenchent `enabled: !!activeOrgId === false`,
 * affichent un état "0 résultats" puis se mettent à jour après la
 * réhydratation. C'est ce que l'utilisateur voyait comme un "flash vide".
 *
 * On lit sessionStorage AVANT le premier render. Au prochain mount le
 * state est déjà peuplé, les queries enabled tournent dès le tick 1.
 */
function initialAuthState(): State {
  if (typeof window === 'undefined') return EMPTY_STATE;
  try {
    const cached = window.sessionStorage.getItem(AUTH_CACHE_KEY);
    if (!cached) return EMPTY_STATE;
    const parsed = JSON.parse(cached) as Omit<State, 'loading'>;
    // Sanity check : on rejette les caches cassés (user présent sans
    // org) qui mèneraient à une boucle de redirect.
    if (parsed.user && !parsed.activeOrgId) return EMPTY_STATE;
    return { ...parsed, loading: false };
  } catch {
    return EMPTY_STATE;
  }
}

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  // initialAuthState() lit la sessionStorage de façon synchrone :
  // le tout premier render a déjà activeOrgId, role, memberships, branding.
  const [state, setState] = useState<State>(initialAuthState);

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
            // Cache "frais" UNIQUEMENT si l'état est cohérent. Un cache qui
            // montre user connecté sans activeOrgId est cassé : on bypass le
            // TTL pour retenter — sinon l'utilisateur reste bloqué jusqu'à
            // expiration / déco.
            const isBroken = !!parsed.user && !parsed.activeOrgId;
            if (!force && !isBroken && Date.now() - ts < AUTH_CACHE_TTL_MS) {
              hadFreshCache = true;
            }
          } catch {
            // ignore
          }
        }
      }

      if (hadFreshCache) return;

      // Timeout de sécurité : on rejette plutôt qu'un fallback silencieux,
      // pour pouvoir distinguer "vraiment vide" de "Supabase stall" et ne pas
      // empoisonner le cache avec un état cassé qui survivrait au refresh.
      const withTimeout = <T,>(p: Promise<T>, ms: number) =>
        Promise.race([
          p,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('auth_timeout')), ms),
          ),
        ]);

      let session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] = null;
      try {
        const r = await withTimeout(supabase.auth.getSession(), 8000);
        session = r.data.session ?? null;
      } catch {
        // Impossible de lire la session — on garde l'état actuel et on
        // arrête juste le spinner. Aucun écrasement du cache.
        setState((s) => ({ ...s, loading: false }));
        return;
      }
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
      // "terminer".
      const profileQ = Promise.resolve(
        supabase
          .from('profiles')
          .select('organization_id, first_name, last_name')
          .eq('id', user.id)
          .single(),
      ) as Promise<{
        data: {
          organization_id: string | null;
          first_name: string | null;
          last_name: string | null;
        } | null;
      }>;
      // my_organizations donne juste la liste membership (rapide). Le
      // branding complet (visuel + identité légale + banking) vient
      // d'un select séparé sur organizations pour l'org active.
      const memberQ = Promise.resolve(
        supabase.from('my_organizations').select('id, name, slug, role'),
      ) as Promise<{ data: Membership[] | null }>;

      let profileRes: {
        data: {
          organization_id: string | null;
          first_name: string | null;
          last_name: string | null;
        } | null;
      };
      let memberRes: { data: Membership[] | null };
      try {
        [profileRes, memberRes] = await Promise.all([
          withTimeout(profileQ, 12000),
          withTimeout(memberQ, 12000),
        ]);
      } catch {
        // Réseau / RLS hiccup : on préserve l'état précédent (qui peut
        // contenir un activeOrgId valide depuis le cache) au lieu de
        // l'écraser par memberships=[]. L'utilisateur ne se retrouve pas
        // bloqué sur une page vide.
        setState((s) => ({ ...s, loading: false }));
        return;
      }

      const memberships: Membership[] = memberRes.data ?? [];
      const profileOrg = profileRes.data?.organization_id as string | null | undefined;
      const activeOrgId = profileOrg ?? memberships[0]?.id ?? null;
      const activeRole = memberships.find((m) => m.id === activeOrgId)?.role ?? null;

      // === Fetch branding COMPLET (visuel + identité légale + banking) ===
      let branding: OrgBranding | null = null;
      if (activeOrgId) {
        try {
          const { data: brandRow } = await withTimeout(
            Promise.resolve(
              supabase.from('organizations').select(BRANDING_COLUMNS).eq('id', activeOrgId).single(),
            ) as Promise<{ data: Record<string, unknown> | null }>,
            12000,
          );
          // version : on prend l'horloge UTC en secondes — chaque load() bumpé.
          branding = buildBranding(brandRow, Math.floor(Date.now() / 1000));
        } catch {
          // Branding non critique, on laisse à null
        }
      }

      const next = {
        user: {
          id: user.id,
          email: user.email ?? '',
          firstName: profileRes.data?.first_name ?? null,
          lastName: profileRes.data?.last_name ?? null,
        },
        activeOrgId,
        role: activeRole,
        memberships,
        branding,
      };
      setState({ ...next, loading: false });
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(next));
        window.sessionStorage.setItem(AUTH_CACHE_TS_KEY, String(Date.now()));

        // Pre-fetch organization identity (address, SIREN, etc.) en
        // arrière-plan : permet à la page /settings d'afficher tout
        // instantanément depuis sessionStorage à la 1ère visite,
        // pas seulement aux suivantes. Best-effort silencieux.
        if (activeOrgId) {
          fetch('/api/organizations/identity', { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : null))
            .then((body: { data: unknown } | null) => {
              if (body?.data) {
                try {
                  window.sessionStorage.setItem(
                    `centrium-org-identity:${activeOrgId}`,
                    JSON.stringify(body.data),
                  );
                } catch {
                  /* mode incognito strict */
                }
              }
            })
            .catch(() => {
              /* best-effort, /settings re-essaiera */
            });
        }
      }
    },
    [supabase],
  );

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load({ force: true }));
    return () => sub.subscription.unsubscribe();
  }, [load, supabase]);

  // Au retour de l'onglet : on force un refresh du token Supabase et on
  // recharge le contexte. Sans ça, après une longue idle le JWT peut être
  // expiré côté navigateur, RLS renvoie 0 rows, et toutes les listes
  // s'affichent vides jusqu'à un refresh manuel ou un logout/login.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let lastRefresh = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const idleMs = Date.now() - lastRefresh;
      lastRefresh = Date.now();
      // Pas la peine de refresh si on revient dans la fenêtre de 60s.
      if (idleMs < 60_000) return;
      // Best-effort : si pas de user en cache, on ne fait rien (load() s'en
      // occupera de toute façon au prochain trigger). Si user présent, on
      // refresh le token et on relance le load.
      setState((s) => {
        if (!s.user) return s;
        supabase.auth.refreshSession().finally(() => load({ force: true }));
        return s;
      });
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
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
      // Récupère directement depuis Supabase pour avoir TOUS les champs
      // (visuel + identité légale + banking). Aucun cache HTTP — on veut
      // les valeurs fraîches après un save dans /settings/branding ou
      // /settings/identity.
      const { data: brandRow } = await supabase
        .from('organizations')
        .select(BRANDING_COLUMNS)
        .eq('id', state.activeOrgId)
        .single();
      const branding = buildBranding(
        brandRow as Record<string, unknown> | null,
        Math.floor(Date.now() / 1000),
      );
      if (!branding) return;
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
  }, [state.activeOrgId, supabase]);

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
