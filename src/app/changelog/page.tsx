'use client';

import Link from 'next/link';
import { Sparkles, ShieldCheck, Receipt, BellRing, Smartphone } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, AppCard, AppCardBody } from '@/components/app';
import { useLocale } from '@/lib/i18n/LocaleProvider';

// =========================================================================
// /changelog — Journal des nouveautés produit, côté client.
// Mis à jour à chaque livraison notable. Entrées les plus récentes en haut.
// =========================================================================

type Tag = 'Nouveau' | 'Amélioration' | 'Sécurité' | 'Correctif';

type Entry = {
  date: string;
  dateEn: string;
  title: string;
  titleEn: string;
  icon: React.ElementType;
  tag: Tag;
  points: string[];
  pointsEn: string[];
};

const ENTRIES: Entry[] = [
  {
    date: 'Juillet 2026',
    dateEn: 'July 2026',
    title: 'Centre d’alertes, notifications et relances',
    titleEn: 'Alerts center, notifications and reminders',
    icon: BellRing,
    tag: 'Nouveau',
    points: [
      'Nouveau moteur d’alertes : profils incomplets, documents expirants, CRA manquants, factures oubliées, contrats à signer…',
      'Relances automatiques par email et SMS (désactivables), avec cadences réglables par organisation.',
      'Cloche de notifications par utilisateur + préférences dans Paramètres → Notifications.',
      'Jauge de complétude de profil sur la fiche consultant et dans le portail.',
    ],
    pointsEn: [
      'New alerts engine: incomplete profiles, expiring documents, missing CRAs, forgotten invoices, contracts awaiting signature…',
      'Automatic email and SMS reminders (can be turned off), with cadences configurable per organization.',
      'Per-user notification bell + preferences under Settings → Notifications.',
      'Profile completeness gauge on the consultant record and in the portal.',
    ],
  },
  {
    date: 'Juillet 2026',
    dateEn: 'July 2026',
    title: 'Conformité de facturation renforcée',
    titleEn: 'Stronger invoicing compliance',
    icon: Receipt,
    tag: 'Amélioration',
    points: [
      'Numérotation des factures désormais séquentielle et continue (conforme).',
      'Une facture émise ne peut plus être supprimée (inaltérabilité + conservation légale).',
      'Export du journal des ventes/achats en CSV pour votre comptable.',
      'Identité légale (SIREN, adresse) exigée avant toute émission de facture.',
    ],
    pointsEn: [
      'Invoice numbering is now sequential and continuous (compliant).',
      'An issued invoice can no longer be deleted (tamper-proofing + legal retention).',
      'Export the sales/purchase journal to CSV for your accountant.',
      'Legal identity (SIREN, address) required before issuing any invoice.',
    ],
  },
  {
    date: 'Juillet 2026',
    dateEn: 'July 2026',
    title: 'Sécurité & portabilité des données',
    titleEn: 'Security & data portability',
    icon: ShieldCheck,
    tag: 'Sécurité',
    points: [
      'Cloisonnement renforcé : un compte consultant n’accède jamais aux données commerciales.',
      'Export complet des données de l’organisation en un clic (RGPD, art. 20).',
      'Gestion des rôles durcie côté serveur.',
    ],
    pointsEn: [
      'Stronger isolation: a consultant account never accesses commercial data.',
      "One-click full export of the organization's data (RGPD, art. 20).",
      'Hardened role management on the server side.',
    ],
  },
  {
    date: 'Juillet 2026',
    dateEn: 'July 2026',
    title: 'Portail consultant mobile',
    titleEn: 'Mobile consultant portal',
    icon: Smartphone,
    tag: 'Amélioration',
    points: [
      'Navigation mobile complète du portail (menu + déconnexion accessibles sur téléphone).',
      'Affichage instantané des menus déroulants (cache local).',
    ],
    pointsEn: [
      'Full mobile navigation across the portal (menu + logout available on phones).',
      'Instant dropdown display (local cache).',
    ],
  },
];

const TAG_STYLE: Record<Tag, string> = {
  Nouveau: 'bg-emerald-500/12 text-emerald-500 border-emerald-500/25',
  Amélioration: 'bg-violet-glow/12 text-violet-glow border-violet-glow/25',
  Sécurité: 'bg-amber-500/12 text-amber-600 dark:text-amber-300 border-amber-500/25',
  Correctif: 'bg-blue-500/12 text-blue-500 border-blue-500/25',
};

const TAG_LABEL_EN: Record<Tag, string> = {
  Nouveau: 'New',
  Amélioration: 'Improvement',
  Sécurité: 'Security',
  Correctif: 'Fix',
};

export default function ChangelogPage() {
  const { locale } = useLocale();
  const isEn = locale === 'en';

  return (
    <AppShell>
      <PageHeader
        eyebrow={isEn ? 'Product' : 'Produit'}
        title={
          <>
            {isEn ? "What's new" : 'Nouveautés'}{' '}
            <span className="qc-italic-accent font-editorial italic">Centrium.</span>
          </>
        }
        description={
          isEn
            ? 'Recent changes at a glance. A question about a new feature? Write to contact@centrium-platform.com.'
            : 'Ce qui a changé récemment. Une question sur une nouveauté ? Écris à contact@centrium-platform.com.'
        }
        actions={
          <Link
            href="/aide"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-hairline px-4 text-sm font-medium hover:bg-foreground/[0.04] transition"
          >
            <Sparkles className="h-4 w-4" />
            {isEn ? 'Help center' : 'Centre d’aide'}
          </Link>
        }
      />

      <div className="relative max-w-3xl space-y-4">
        {ENTRIES.map((e) => (
          <AppCard key={e.title} variant="default" tone="violet">
            <AppCardBody size="md">
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-hairline bg-violet-glow/10 text-violet-glow">
                  <e.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {isEn ? e.dateEn : e.date}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TAG_STYLE[e.tag]}`}
                    >
                      {isEn ? TAG_LABEL_EN[e.tag] : e.tag}
                    </span>
                  </div>
                  <h3 className="mt-1 font-display text-lg font-light">
                    {isEn ? e.titleEn : e.title}
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {(isEn ? e.pointsEn : e.points).map((p, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-magenta" />
                        <span className="leading-relaxed">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AppCardBody>
          </AppCard>
        ))}
      </div>
    </AppShell>
  );
}
