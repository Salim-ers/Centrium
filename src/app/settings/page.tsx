'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { LogOut, Palette, Users, User, ShieldCheck, Building2, Sparkles, CreditCard } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { useAppT } from '@/lib/i18n/LocaleProvider';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/lib/auth/context';
import {
  PageHeader,
  SectionHeader,
  AppCard,
  AppCardBody,
} from '@/components/app';

type IdentityRow = {
  name: string;
  brand_name: string | null;
  footer_tagline: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  siren: string | null;
};

type SectionTone = 'magenta' | 'violet' | 'emerald' | 'amber' | 'cyan' | 'rose';

type SectionKey = 'profile' | 'branding' | 'team' | 'billing' | 'data' | 'appearance';

// Hub unique "Paramètres" : Équipe et Abonnement vivent ici (le menu
// latéral n'a plus qu'une seule entrée Organisation → Paramètres).
const SECTIONS: Array<{
  key: SectionKey;
  href: string;
  icon: typeof User;
  tone: SectionTone;
}> = [
  { key: 'profile', href: '/settings/profile', icon: User, tone: 'magenta' },
  { key: 'branding', href: '/settings/branding', icon: Palette, tone: 'violet' },
  { key: 'team', href: '/settings/team', icon: Users, tone: 'cyan' },
  { key: 'billing', href: '/billing', icon: CreditCard, tone: 'rose' },
  { key: 'data', href: '/settings/privacy', icon: ShieldCheck, tone: 'emerald' },
  { key: 'appearance', href: '/settings/appearance', icon: Sparkles, tone: 'amber' },
];

// Cache sessionStorage : la réponse /api/organizations/identity ne change
// quasi jamais (seulement quand l'utilisateur édite ses mentions légales).
// On peut donc la cacher pour toute la durée de la session navigateur et
// servir le bloc "Votre organisation" INSTANTANÉMENT à partir de la 2e
// visite. Au revalidation silencieux en arrière-plan, on update si change.
const IDENTITY_CACHE_KEY = (orgId: string) => `centrium-org-identity:${orgId}`;

function readIdentityCache(orgId: string): IdentityRow | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(IDENTITY_CACHE_KEY(orgId));
    if (!raw) return null;
    return JSON.parse(raw) as IdentityRow;
  } catch {
    return null;
  }
}

function writeIdentityCache(orgId: string, identity: IdentityRow): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(IDENTITY_CACHE_KEY(orgId), JSON.stringify(identity));
  } catch {
    /* mode incognito strict — ignore */
  }
}

export default function SettingsPage() {
  const { activeOrgId, memberships, branding } = useOrganization();
  const t = useAppT();

  // Lecture SYNCHRONE du cache sessionStorage au premier render — pas
  // de useEffect, pas d'attente. Si cache présent, identity est posé
  // direct au mount → bloc affiché instantanément.
  const [identity, setIdentity] = useState<IdentityRow | null>(() =>
    activeOrgId ? readIdentityCache(activeOrgId) : null,
  );
  const [identityLoading, setIdentityLoading] = useState(() =>
    activeOrgId ? readIdentityCache(activeOrgId) === null : true,
  );

  // Fallback depuis le state OrganizationProvider (brandName, footerTagline,
  // name) pour le tout 1er render avant même qu'on ait le cache.
  const activeMembership = memberships.find((m) => m.id === activeOrgId);
  const fallbackIdentity = activeMembership || branding
    ? {
        name: branding?.name ?? activeMembership?.name ?? '',
        brand_name: branding?.brandName ?? null,
        footer_tagline: branding?.footerTagline ?? null,
        address: null,
        city: null,
        postal_code: null,
        siren: null,
      }
    : null;
  const displayed = identity ?? fallbackIdentity;

  useEffect(() => {
    if (!activeOrgId) return;
    let cancelled = false;
    // Revalidation silencieuse en arrière-plan — même si on a déjà servi
    // depuis le cache, on re-fetch pour avoir les dernières infos au cas
    // où l'utilisateur a édité ses mentions légales depuis un autre onglet.
    fetch('/api/organizations/identity')
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { data: IdentityRow } | null) => {
        if (cancelled) return;
        if (body?.data) {
          setIdentity(body.data);
          writeIdentityCache(activeOrgId, body.data);
        }
        setIdentityLoading(false);
      })
      .catch(() => {
        if (!cancelled) setIdentityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeOrgId]);

  const cityLine = displayed
    ? [displayed.postal_code, displayed.city].filter(Boolean).join(' ')
    : '';

  return (
    <AppShell>
      <PageHeader
        eyebrow={t.pages.settings.eyebrow}
        title={
          <>
            {t.pages.settings.title_a}{' '}
            <span className="qc-italic-accent font-editorial italic">{t.pages.settings.title_b}</span>
          </>
        }
        description={t.pages.settings.description}
      />

      <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
        {SECTIONS.map((s, i) => {
          const Icon = s.icon;
          const titleByKey: Record<SectionKey, string> = {
            profile: t.pages.settings.card_profile_title,
            branding: t.pages.settings.card_branding_title,
            team: t.pages.settings.card_team_title,
            billing: t.pages.settings.card_billing_title,
            data: t.pages.settings.card_data_title,
            appearance: t.pages.settings.card_appearance_title,
          };
          const descByKey: Record<SectionKey, string> = {
            profile: t.pages.settings.card_profile_description,
            branding: t.pages.settings.card_branding_description,
            team: t.pages.settings.card_team_description,
            billing: t.pages.settings.card_billing_description,
            data: t.pages.settings.card_data_description,
            appearance: t.pages.settings.card_appearance_description,
          };
          return (
            <motion.div
              key={s.href}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05, ease: 'easeOut' }}
            >
            <Link href={s.href} className="block group h-full">
              <AppCard variant="default" tone={s.tone} interactive className="h-full">
                <AppCardBody size="md" className="flex items-start gap-4">
                  <div className="shrink-0 rounded-xl border border-hairline surface-1 p-2.5 text-magenta transition-transform group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-light tracking-[-0.01em] text-lg text-foreground">
                      {titleByKey[s.key]}
                    </div>
                    <p className="mt-1 text-[13.5px] text-muted-foreground leading-relaxed">
                      {descByKey[s.key]}
                    </p>
                  </div>
                </AppCardBody>
              </AppCard>
            </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-10 space-y-6">
        <section>
          <SectionHeader
            eyebrow={t.pages.settings.legal_section_eyebrow}
            title={
              <>
                {t.pages.settings.legal_section_title_a}{' '}
                <span className="qc-italic-accent font-editorial italic">
                  {t.pages.settings.legal_section_title_b}
                </span>
              </>
            }
            description={t.pages.settings.legal_section_description}
          />
          <AppCard variant="default" tone="magenta">
            <AppCardBody size="md" className="space-y-1.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-magenta" />
                <strong className="text-foreground">
                  {displayed?.brand_name ?? displayed?.name ?? '—'}
                </strong>
                {displayed?.footer_tagline ? (
                  <span>— {displayed.footer_tagline}</span>
                ) : null}
              </p>
              {identityLoading && !identity ? (
                <div className="space-y-1.5 pt-1">
                  <div className="h-3 w-2/3 rounded bg-muted/50 animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-muted/50 animate-pulse" />
                </div>
              ) : (
                <>
                  {(identity?.address || cityLine) && (
                    <p>
                      {identity?.address}
                      {identity?.address && cityLine ? ', ' : ''}
                      {cityLine}
                    </p>
                  )}
                  {identity?.siren && <p>SIREN : {identity.siren}</p>}
                  {!identity?.address && !identity?.siren && (
                    <p className="italic text-amber-300/80">
                      <Link href="/settings/branding" className="text-magenta underline">
                        {t.pages.settings.card_branding_title}
                      </Link>
                    </p>
                  )}
                </>
              )}
            </AppCardBody>
          </AppCard>
        </section>

        <section>
          <SectionHeader
            eyebrow={t.pages.settings.account_section_eyebrow}
            title={
              <>
                {t.pages.settings.account_section_title_a}{' '}
                <span className="qc-italic-accent font-editorial italic">
                  {t.pages.settings.account_section_title_b}
                </span>
              </>
            }
            description={t.pages.settings.account_section_description}
          />
          <AppCard variant="subtle">
            <AppCardBody size="md">
              <form action="/api/auth/logout" method="POST">
                <Button type="submit" variant="outline">
                  <LogOut className="h-4 w-4" />
                  {t.pages.settings.logout_button}
                </Button>
              </form>
            </AppCardBody>
          </AppCard>
        </section>
      </div>
    </AppShell>
  );
}
