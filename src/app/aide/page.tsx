'use client';

import Link from 'next/link';
import {
  LifeBuoy,
  Rocket,
  Users,
  ClipboardCheck,
  Receipt,
  FileSignature,
  BellRing,
  Mail,
  ArrowRight,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, AppCard, AppCardBody, SectionHeader } from '@/components/app';

// =========================================================================
// /aide — Centre d'aide client (in-app). Guides de prise en main par module
// + FAQ + contact support. Auparavant : aucune documentation client.
// =========================================================================

type Guide = {
  icon: React.ElementType;
  title: string;
  steps: string[];
  cta?: { label: string; href: string };
};

const GUIDES: Guide[] = [
  {
    icon: Rocket,
    title: 'Premiers pas',
    steps: [
      'Renseigne l’identité de ton ESN dans Paramètres → Facturation (SIREN, adresse, RIB) — obligatoire pour émettre des factures.',
      'Invite ton équipe dans Paramètres → Équipe (business manager, recruteur, finance).',
      'Ajoute tes premiers consultants, puis crée une offre pour lancer le matching.',
    ],
    cta: { label: 'Ouvrir les paramètres', href: '/settings' },
  },
  {
    icon: Users,
    title: 'Consultants & CV',
    steps: [
      'Crée un consultant, importe son CV (PDF) : le profil est pré-rempli automatiquement.',
      'Complète les documents (Kbis, RC Pro, RIB…) — la jauge de complétude et les relances t’aident à ne rien oublier.',
      'Génère un CV au format QuadCore et optimise-le pour une offre précise depuis le CV Optimizer.',
    ],
    cta: { label: 'Voir les consultants', href: '/consultants' },
  },
  {
    icon: ClipboardCheck,
    title: 'CRA (comptes rendus d’activité)',
    steps: [
      'Un CRA est unique par mission et par mois. Les jours ouvrés sont pré-remplis.',
      'Le consultant soumet, tu valides. Un CRA validé peut générer la facture correspondante.',
      'Les relances automatiques préviennent quand un CRA est en retard ou attendu.',
    ],
    cta: { label: 'Ouvrir les CRA', href: '/timesheets' },
  },
  {
    icon: Receipt,
    title: 'Facturation',
    steps: [
      'Laisse le numéro de facture vide : il est attribué séquentiellement et de façon conforme.',
      'Une facture émise ne se supprime pas (document légal) — utilise l’annulation ou l’avoir.',
      'Exporte le journal des ventes/achats en CSV depuis la page Factures (bouton « Export compta »).',
    ],
    cta: { label: 'Ouvrir les factures', href: '/invoices' },
  },
  {
    icon: FileSignature,
    title: 'Contrats & signature',
    steps: [
      'Génère un contrat (prestation client ou sous-traitance) à partir d’une mission.',
      'Le consultant le signe électroniquement depuis son espace ; tu es notifié à la signature.',
      'Les contrats à signer / expirant remontent dans le centre d’alertes.',
    ],
    cta: { label: 'Ouvrir les contrats', href: '/contracts' },
  },
  {
    icon: BellRing,
    title: 'Alertes & notifications',
    steps: [
      'Le centre d’alertes regroupe tout ce qui demande une action, trié par priorité.',
      'Règle les canaux (email, SMS) et les cadences de relance dans Paramètres → Notifications.',
      'Les relances aux consultants sont désactivées par défaut : tu les actives quand tu veux.',
    ],
    cta: { label: 'Ouvrir le centre d’alertes', href: '/alerts' },
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Un consultant peut-il voir les données commerciales (contacts, opportunités) ?',
    a: 'Non. L’espace portail du consultant est strictement cloisonné : il n’accède qu’à ses missions, CRA, contrats, factures et documents.',
  },
  {
    q: 'Puis-je récupérer toutes mes données ?',
    a: 'Oui. Paramètres → Confidentialité → « Exporter l’organisation » télécharge l’intégralité de vos données métier en JSON (portabilité RGPD).',
  },
  {
    q: 'Que se passe-t-il à la fin de l’essai ?',
    a: 'L’accès est suspendu jusqu’au choix d’un abonnement. Vos données restent intactes. Un email vous prévient 3 jours avant.',
  },
  {
    q: 'Comment changer de plan ?',
    a: 'Depuis Paramètres → Abonnement. Le changement est appliqué au prorata sur votre abonnement en cours, sans double facturation.',
  },
];

export default function AidePage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Support"
        title={
          <>
            Centre <span className="qc-italic-accent font-editorial italic">d’aide.</span>
          </>
        }
        description="Guides de prise en main par module, questions fréquentes et contact direct de l’équipe."
        actions={
          <a
            href="mailto:contact@centrium-platform.com"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-violet-glow px-4 text-sm font-medium text-white transition hover:opacity-90"
          >
            <Mail className="h-4 w-4" />
            Contacter le support
          </a>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-10">
        {GUIDES.map((g) => (
          <AppCard key={g.title} variant="default" tone="violet" className="h-full">
            <AppCardBody size="md" className="flex h-full flex-col">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-hairline bg-violet-glow/10 text-violet-glow">
                  <g.icon className="h-4 w-4" />
                </span>
                <h3 className="font-display text-lg font-light">{g.title}</h3>
              </div>
              <ol className="flex-1 space-y-2 text-sm text-muted-foreground">
                {g.steps.map((s, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-magenta/15 text-[10px] font-bold text-magenta">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
              {g.cta && (
                <Link
                  href={g.cta.href}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-violet-glow hover:gap-2.5 transition-all"
                >
                  {g.cta.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </AppCardBody>
          </AppCard>
        ))}
      </div>

      <SectionHeader
        eyebrow="FAQ"
        title={
          <>
            Questions <span className="qc-italic-accent font-editorial italic">fréquentes.</span>
          </>
        }
        description="L’essentiel en un coup d’œil."
        actions={<LifeBuoy className="h-4 w-4 text-magenta" />}
      />
      <div className="grid gap-3 md:grid-cols-2 mb-10">
        {FAQ.map((f) => (
          <AppCard key={f.q} variant="default" tone="cyan">
            <AppCardBody size="md">
              <h4 className="text-sm font-semibold mb-1.5">{f.q}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
            </AppCardBody>
          </AppCard>
        ))}
      </div>

      <AppCard variant="luminous" tone="violet">
        <AppCardBody size="md" className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-light">Besoin d’aide personnalisée ?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              L’équipe Centrium répond directement.{' '}
              <Link href="/changelog" className="text-violet-glow hover:underline">
                Voir les nouveautés →
              </Link>
            </p>
          </div>
          <a
            href="mailto:contact@centrium-platform.com"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline px-4 text-sm font-medium hover:bg-foreground/[0.04] transition"
          >
            <Mail className="h-4 w-4" />
            contact@centrium-platform.com
          </a>
        </AppCardBody>
      </AppCard>
    </AppShell>
  );
}
