'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut, Palette, Users, User, ShieldCheck, Building2, Sparkles } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
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

const SECTIONS: Array<{
  href: string;
  title: string;
  description: string;
  icon: typeof User;
  tone: SectionTone;
}> = [
  {
    href: '/settings/profile',
    title: 'Mon profil',
    description:
      "Vos infos personnelles (poste, contact, adresse, contact d'urgence) — visibles uniquement par vous.",
    icon: User,
    tone: 'magenta',
  },
  {
    href: '/settings/branding',
    title: 'Identité visuelle',
    description:
      'Logo, couleurs et nom de marque affichés sur les CV, contrats et factures générés.',
    icon: Palette,
    tone: 'violet',
  },
  {
    href: '/settings/team',
    title: 'Équipe',
    description: "Membres, invitations et rôles de l'organisation.",
    icon: Users,
    tone: 'cyan',
  },
  {
    href: '/settings/privacy',
    title: 'Mes données & confidentialité',
    description:
      'Exportez vos données, gérez vos cookies, exercez vos droits RGPD.',
    icon: ShieldCheck,
    tone: 'emerald',
  },
  {
    href: '/settings/appearance',
    title: 'Apparence & design',
    description:
      "Thème sombre/clair, intensité du fond animé, densité de l'interface — personnalisez l'ambiance.",
    icon: Sparkles,
    tone: 'amber',
  },
];

export default function SettingsPage() {
  const { activeOrgId } = useOrganization();
  const [identity, setIdentity] = useState<IdentityRow | null>(null);

  useEffect(() => {
    if (!activeOrgId) return;
    let cancelled = false;
    fetch('/api/organizations/identity', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { data: IdentityRow } | null) => {
        if (!cancelled && body?.data) setIdentity(body.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeOrgId]);

  const cityLine = identity
    ? [identity.postal_code, identity.city].filter(Boolean).join(' ')
    : '';

  return (
    <AppShell>
      <PageHeader
        eyebrow="Organisation"
        title={
          <>
            Paramètres{' '}
            <span className="qc-italic-accent font-editorial italic">
              de votre ESN.
            </span>
          </>
        }
        description="Profil personnel, équipe, identité visuelle, conformité RGPD — pilotez votre espace Centrium."
      />

      <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href} className="block group">
              <AppCard variant="default" tone={s.tone} interactive className="h-full">
                <AppCardBody size="md" className="flex items-start gap-4">
                  <div className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-magenta transition-transform group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-light tracking-[-0.01em] text-lg text-foreground">
                      {s.title}
                    </div>
                    <p className="mt-1 text-[13.5px] text-muted-foreground leading-relaxed">
                      {s.description}
                    </p>
                  </div>
                </AppCardBody>
              </AppCard>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 space-y-6">
        <section>
          <SectionHeader
            eyebrow="Identité légale"
            title={
              <>
                Votre{' '}
                <span className="qc-italic-accent font-editorial italic">
                  organisation.
                </span>
              </>
            }
            description="Informations utilisées sur vos contrats et factures."
          />
          <AppCard variant="default" tone="magenta">
            <AppCardBody size="md" className="space-y-1.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-magenta" />
                <strong className="text-foreground">
                  {identity?.brand_name ?? identity?.name ?? '—'}
                </strong>
                {identity?.footer_tagline ? (
                  <span>— {identity.footer_tagline}</span>
                ) : null}
              </p>
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
                  Identité légale non renseignée. Allez dans{' '}
                  <Link href="/settings/branding" className="text-magenta underline">
                    Identité visuelle
                  </Link>{' '}
                  pour la compléter — elle sera utilisée sur vos contrats et factures.
                </p>
              )}
            </AppCardBody>
          </AppCard>
        </section>

        <section>
          <SectionHeader
            eyebrow="Compte"
            title={
              <>
                Session{' '}
                <span className="qc-italic-accent font-editorial italic">
                  active.
                </span>
              </>
            }
            description="Déconnectez-vous de Centrium."
          />
          <AppCard variant="subtle">
            <AppCardBody size="md">
              {/*
                Le logout passe par /api/auth/logout côté serveur pour nettoyer
                tous les cookies (Supabase httpOnly + notre cache qc_profile)
                avant de rediriger vers /login.
              */}
              <form action="/api/auth/logout" method="POST">
                <Button type="submit" variant="outline">
                  <LogOut className="h-4 w-4" />
                  Se déconnecter
                </Button>
              </form>
            </AppCardBody>
          </AppCard>
        </section>
      </div>
    </AppShell>
  );
}
