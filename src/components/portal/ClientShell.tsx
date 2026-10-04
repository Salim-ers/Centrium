'use client';

import { Briefcase, ClipboardCheck, FileText, Home, MessageSquarePlus, Receipt } from 'lucide-react';

import { SessionPresenceGate } from '@/components/auth/SessionPresenceGate';
import { PortalChrome, type PortalBrand, type PortalNavEntry } from './PortalChrome';

const ITEMS: PortalNavEntry[] = [
  { href: '/client', label: { fr: 'Accueil', en: 'Home' }, icon: Home, tab: true },
  { href: '/client/missions', label: { fr: 'Missions', en: 'Missions' }, icon: Briefcase, tab: true },
  { href: '/client/timesheets', label: { fr: 'CRA', en: 'Timesheets' }, icon: ClipboardCheck, tab: true },
  { href: '/client/quotes', label: { fr: 'Devis', en: 'Quotes' }, icon: Receipt, tab: true },
  { href: '/client/documents', label: { fr: 'Documents', en: 'Documents' }, icon: FileText },
  { href: '/client/requests', label: { fr: 'Demandes', en: 'Requests' }, icon: MessageSquarePlus, tab: true },
];

/** Portail client : aux couleurs de l'ESN prestataire. */
export function ClientShell({ brand, companyName, children }: { brand: PortalBrand | null; companyName: string; children: React.ReactNode }) {
  return (
    <>
      <SessionPresenceGate />
      <PortalChrome
        items={ITEMS}
        homeHref="/client"
        spaceLabel={{ fr: companyName ? `Espace client · ${companyName}` : 'Espace client', en: companyName ? `Client space · ${companyName}` : 'Client space' }}
        brand={brand}
      >
        {children}
      </PortalChrome>
    </>
  );
}
