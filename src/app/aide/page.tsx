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
import { useLocale } from '@/lib/i18n/LocaleProvider';

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

export default function AidePage() {
  const { locale } = useLocale();
  const isEn = locale === 'en';

  const GUIDES: Guide[] = [
    {
      icon: Rocket,
      title: isEn ? 'Getting started' : 'Premiers pas',
      steps: [
        isEn
          ? 'Enter your company’s details in Settings → Billing (SIREN, address, RIB) — required to issue invoices.'
          : 'Renseigne l’identité de ton ESN dans Paramètres → Facturation (SIREN, adresse, RIB) — obligatoire pour émettre des factures.',
        isEn
          ? 'Invite your team in Settings → Team (business manager, recruiter, finance).'
          : 'Invite ton équipe dans Paramètres → Équipe (business manager, recruteur, finance).',
        isEn
          ? 'Add your first consultants, then create a job offer to start matching.'
          : 'Ajoute tes premiers consultants, puis crée une offre pour lancer le matching.',
      ],
      cta: { label: isEn ? 'Open settings' : 'Ouvrir les paramètres', href: '/settings' },
    },
    {
      icon: Users,
      title: isEn ? 'Consultants & CVs' : 'Consultants & CV',
      steps: [
        isEn
          ? 'Create a consultant and import their CV (PDF): the profile is filled in automatically.'
          : 'Crée un consultant, importe son CV (PDF) : le profil est pré-rempli automatiquement.',
        isEn
          ? 'Complete the documents (Kbis, RC Pro, RIB…) — the completeness gauge and reminders help you forget nothing.'
          : 'Complète les documents (Kbis, RC Pro, RIB…) — la jauge de complétude et les relances t’aident à ne rien oublier.',
        isEn
          ? 'Generate a CV in the QuadCore format and optimize it for a specific job offer from the CV Optimizer.'
          : 'Génère un CV au format QuadCore et optimise-le pour une offre précise depuis le CV Optimizer.',
      ],
      cta: { label: isEn ? 'View consultants' : 'Voir les consultants', href: '/consultants' },
    },
    {
      icon: ClipboardCheck,
      title: isEn ? 'CRA (activity reports)' : 'CRA (comptes rendus d’activité)',
      steps: [
        isEn
          ? 'A CRA is unique per mission and per month. Working days are pre-filled.'
          : 'Un CRA est unique par mission et par mois. Les jours ouvrés sont pré-remplis.',
        isEn
          ? 'The consultant submits, you approve. An approved CRA can generate the matching invoice.'
          : 'Le consultant soumet, tu valides. Un CRA validé peut générer la facture correspondante.',
        isEn
          ? 'Automatic reminders notify you when a CRA is overdue or expected.'
          : 'Les relances automatiques préviennent quand un CRA est en retard ou attendu.',
      ],
      cta: { label: isEn ? 'Open the CRAs' : 'Ouvrir les CRA', href: '/timesheets' },
    },
    {
      icon: Receipt,
      title: isEn ? 'Billing' : 'Facturation',
      steps: [
        isEn
          ? 'Leave the invoice number empty: it is assigned sequentially and in a compliant way.'
          : 'Laisse le numéro de facture vide : il est attribué séquentiellement et de façon conforme.',
        isEn
          ? 'An issued invoice cannot be deleted (legal document) — use cancellation or a credit note.'
          : 'Une facture émise ne se supprime pas (document légal) — utilise l’annulation ou l’avoir.',
        isEn
          ? 'Export the sales/purchase journal as CSV from the Invoices page (« Export compta » button).'
          : 'Exporte le journal des ventes/achats en CSV depuis la page Factures (bouton « Export compta »).',
      ],
      cta: { label: isEn ? 'Open invoices' : 'Ouvrir les factures', href: '/invoices' },
    },
    {
      icon: FileSignature,
      title: isEn ? 'Contracts & signing' : 'Contrats & signature',
      steps: [
        isEn
          ? 'Generate a contract (client engagement or subcontracting) from a mission.'
          : 'Génère un contrat (prestation client ou sous-traitance) à partir d’une mission.',
        isEn
          ? 'The consultant signs it electronically from their portal; you are notified once signed.'
          : 'Le consultant le signe électroniquement depuis son espace ; tu es notifié à la signature.',
        isEn
          ? 'Contracts to sign / expiring appear in the alert center.'
          : 'Les contrats à signer / expirant remontent dans le centre d’alertes.',
      ],
      cta: { label: isEn ? 'Open contracts' : 'Ouvrir les contrats', href: '/contracts' },
    },
    {
      icon: BellRing,
      title: isEn ? 'Alerts & notifications' : 'Alertes & notifications',
      steps: [
        isEn
          ? 'The alert center gathers everything that needs action, sorted by priority.'
          : 'Le centre d’alertes regroupe tout ce qui demande une action, trié par priorité.',
        isEn
          ? 'Set the channels (email, SMS) and reminder cadences in Settings → Notifications.'
          : 'Règle les canaux (email, SMS) et les cadences de relance dans Paramètres → Notifications.',
        isEn
          ? 'Reminders to consultants are disabled by default: turn them on whenever you want.'
          : 'Les relances aux consultants sont désactivées par défaut : tu les actives quand tu veux.',
      ],
      cta: { label: isEn ? 'Open the alert center' : 'Ouvrir le centre d’alertes', href: '/alerts' },
    },
  ];

  const FAQ: { q: string; a: string }[] = [
    {
      q: isEn
        ? 'Can a consultant see commercial data (contacts, opportunities)?'
        : 'Un consultant peut-il voir les données commerciales (contacts, opportunités) ?',
      a: isEn
        ? 'No. The consultant’s portal is strictly siloed: they only access their own missions, CRAs, contracts, invoices and documents.'
        : 'Non. L’espace portail du consultant est strictement cloisonné : il n’accède qu’à ses missions, CRA, contrats, factures et documents.',
    },
    {
      q: isEn ? 'Can I retrieve all my data?' : 'Puis-je récupérer toutes mes données ?',
      a: isEn
        ? 'Yes. Settings → Privacy → « Exporter l’organisation » downloads all your business data as JSON (RGPD portability).'
        : 'Oui. Paramètres → Confidentialité → « Exporter l’organisation » télécharge l’intégralité de vos données métier en JSON (portabilité RGPD).',
    },
    {
      q: isEn ? 'What happens at the end of the trial?' : 'Que se passe-t-il à la fin de l’essai ?',
      a: isEn
        ? 'Access is suspended until you choose a subscription. Your data stays intact. An email notifies you 3 days before.'
        : 'L’accès est suspendu jusqu’au choix d’un abonnement. Vos données restent intactes. Un email vous prévient 3 jours avant.',
    },
    {
      q: isEn ? 'How do I change plan?' : 'Comment changer de plan ?',
      a: isEn
        ? 'From Settings → Subscription. The change is prorated against your current subscription, with no double billing.'
        : 'Depuis Paramètres → Abonnement. Le changement est appliqué au prorata sur votre abonnement en cours, sans double facturation.',
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Support"
        title={
          <>
            {isEn ? 'Help' : 'Centre'}{' '}
            <span className="qc-italic-accent font-editorial italic">
              {isEn ? 'center.' : 'd’aide.'}
            </span>
          </>
        }
        description={
          isEn
            ? 'Module-by-module onboarding guides, frequently asked questions and direct contact with the team.'
            : 'Guides de prise en main par module, questions fréquentes et contact direct de l’équipe.'
        }
        actions={
          <a
            href="mailto:contact@centrium-platform.com"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-violet-glow px-4 text-sm font-medium text-white transition hover:opacity-90"
          >
            <Mail className="h-4 w-4" />
            {isEn ? 'Contact support' : 'Contacter le support'}
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
            {isEn ? 'Frequently asked' : 'Questions'}{' '}
            <span className="qc-italic-accent font-editorial italic">
              {isEn ? 'questions.' : 'fréquentes.'}
            </span>
          </>
        }
        description={isEn ? 'The essentials at a glance.' : 'L’essentiel en un coup d’œil.'}
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
            <h3 className="font-display text-lg font-light">
              {isEn ? 'Need personalized help?' : 'Besoin d’aide personnalisée ?'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isEn ? 'The Centrium team replies directly.' : 'L’équipe Centrium répond directement.'}{' '}
              <Link href="/changelog" className="text-violet-glow hover:underline">
                {isEn ? 'See what’s new →' : 'Voir les nouveautés →'}
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
