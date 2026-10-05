'use client';

import { Briefcase, ClipboardCheck, FileSignature, FileText, Home, UserCircle } from 'lucide-react';

import { BrandingStyles } from '@/components/brand/BrandingStyles';
import { SessionPresenceGate } from '@/components/auth/SessionPresenceGate';
import { PortalChrome, type PortalNavEntry } from '@/components/portal/PortalChrome';
import { useOrganizationSafe } from '@/lib/auth/context';

const ITEMS: PortalNavEntry[] = [
  { href: '/portal/dashboard', label: { fr: 'Accueil', en: 'Home' }, icon: Home, tab: true },
  { href: '/portal/cra', label: { fr: 'Mes CRA', en: 'Timesheets' }, icon: ClipboardCheck, tab: true },
  { href: '/portal/missions', label: { fr: 'Missions', en: 'Missions' }, icon: Briefcase, tab: true },
  { href: '/portal/documents', label: { fr: 'Documents', en: 'Documents' }, icon: FileText, tab: true },
  { href: '/portal/contracts', label: { fr: 'Contrats', en: 'Contracts' }, icon: FileSignature },
  { href: '/portal/profile', label: { fr: 'Mon profil', en: 'My profile' }, icon: UserCircle, tab: true },
];

/** Portail consultant : aux couleurs de l'ESN, pensé d'abord pour le mobile. */
export function PortalShell({ children }: { children: React.ReactNode }) {
  const org = useOrganizationSafe();
  const b = org?.branding;
  return (
    <>
      <BrandingStyles />
      {/* Auto-logout si l'onglet/navigateur a été fermé entre 2 visites. */}
      <SessionPresenceGate />
      <PortalChrome
        items={ITEMS}
        homeHref="/portal/dashboard"
        spaceLabel={{ fr: 'Espace consultant', en: 'Consultant space' }}
        brand={b ? { name: b.brandName || b.name, logoUrl: b.logoUrl } : null}
      >
        {children}
      </PortalChrome>
    </>
  );
}
