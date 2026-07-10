'use client';

import Link from 'next/link';
import { Sparkles, ShieldCheck, Receipt, BellRing, Smartphone } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, AppCard, AppCardBody } from '@/components/app';

// =========================================================================
// /changelog — Journal des nouveautés produit, côté client.
// Mis à jour à chaque livraison notable. Entrées les plus récentes en haut.
// =========================================================================

type Tag = 'Nouveau' | 'Amélioration' | 'Sécurité' | 'Correctif';

type Entry = {
  date: string;
  title: string;
  icon: React.ElementType;
  tag: Tag;
  points: string[];
};

const ENTRIES: Entry[] = [
  {
    date: 'Juillet 2026',
    title: 'Centre d’alertes, notifications et relances',
    icon: BellRing,
    tag: 'Nouveau',
    points: [
      'Nouveau moteur d’alertes : profils incomplets, documents expirants, CRA manquants, factures oubliées, contrats à signer…',
      'Relances automatiques par email et SMS (désactivables), avec cadences réglables par organisation.',
      'Cloche de notifications par utilisateur + préférences dans Paramètres → Notifications.',
      'Jauge de complétude de profil sur la fiche consultant et dans le portail.',
    ],
  },
  {
    date: 'Juillet 2026',
    title: 'Conformité de facturation renforcée',
    icon: Receipt,
    tag: 'Amélioration',
    points: [
      'Numérotation des factures désormais séquentielle et continue (conforme).',
      'Une facture émise ne peut plus être supprimée (inaltérabilité + conservation légale).',
      'Export du journal des ventes/achats en CSV pour votre comptable.',
      'Identité légale (SIREN, adresse) exigée avant toute émission de facture.',
    ],
  },
  {
    date: 'Juillet 2026',
    title: 'Sécurité & portabilité des données',
    icon: ShieldCheck,
    tag: 'Sécurité',
    points: [
      'Cloisonnement renforcé : un compte consultant n’accède jamais aux données commerciales.',
      'Export complet des données de l’organisation en un clic (RGPD, art. 20).',
      'Gestion des rôles durcie côté serveur.',
    ],
  },
  {
    date: 'Juillet 2026',
    title: 'Portail consultant mobile',
    icon: Smartphone,
    tag: 'Amélioration',
    points: [
      'Navigation mobile complète du portail (menu + déconnexion accessibles sur téléphone).',
      'Affichage instantané des menus déroulants (cache local).',
    ],
  },
];

const TAG_STYLE: Record<Tag, string> = {
  Nouveau: 'bg-emerald-500/12 text-emerald-500 border-emerald-500/25',
  Amélioration: 'bg-violet-glow/12 text-violet-glow border-violet-glow/25',
  Sécurité: 'bg-amber-500/12 text-amber-600 dark:text-amber-300 border-amber-500/25',
  Correctif: 'bg-blue-500/12 text-blue-500 border-blue-500/25',
};

export default function ChangelogPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Produit"
        title={
          <>
            Nouveautés <span className="qc-italic-accent font-editorial italic">Centrium.</span>
          </>
        }
        description="Ce qui a changé récemment. Une question sur une nouveauté ? Écris à contact@centrium-platform.com."
        actions={
          <Link
            href="/aide"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-hairline px-4 text-sm font-medium hover:bg-foreground/[0.04] transition"
          >
            <Sparkles className="h-4 w-4" />
            Centre d’aide
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
                      {e.date}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TAG_STYLE[e.tag]}`}
                    >
                      {e.tag}
                    </span>
                  </div>
                  <h3 className="mt-1 font-display text-lg font-light">{e.title}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {e.points.map((p, i) => (
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
