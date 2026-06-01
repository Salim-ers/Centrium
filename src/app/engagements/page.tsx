'use client';

import {
  Lock,
  Server,
  ShieldCheck,
  Eye,
  RefreshCw,
  FileCheck2,
  Users2,
  KeyRound,
  ScrollText,
  HeartHandshake,
} from 'lucide-react';

import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MagneticButton } from '@/components/marketing/MagneticButton';

/**
 * /engagements — page unifiée qui combine l'ancien manifeste (vision
 * produit) et l'ancienne page sécurité (architecture, conformité,
 * réponse incident). Pas de section sous-traitants techniques —
 * info disponible dans le DPA (lien depuis le footer / page légale).
 *
 * Structure :
 *   1. Hero éditorial (manifeste)
 *   2. Texte manifeste + 3 principes
 *   3. Architecture sécurité (6 piliers)
 *   4. Conformité (4 axes)
 *   5. Réponse à incident
 *   6. CTA finale
 */

type Pillar = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
};

const PILLARS: Pillar[] = [
  {
    icon: Lock,
    title: 'Chiffrement de bout en bout',
    body: 'TLS 1.2+ sur toutes les communications, AES-256 au repos sur base de données et stockage, gestion stricte des clés côté hébergeur certifié.',
  },
  {
    icon: Server,
    title: 'Hébergement européen',
    body: 'Base de données et stockage en région Europe. CDN edge pour la latence, avec données applicatives jamais répliquées hors UE.',
  },
  {
    icon: ShieldCheck,
    title: 'Isolation multi-tenant stricte',
    body: 'Row Level Security activée sur toutes les tables sensibles. Chaque ESN n’accède qu’à ses propres consultants, contacts, missions et documents.',
  },
  {
    icon: KeyRound,
    title: 'Authentification renforcée',
    body: 'Mots de passe robustes obligatoires, sessions cookie-only (purge à la fermeture du navigateur), invitations par email signées, support SSO/MFA prévu.',
  },
  {
    icon: Eye,
    title: 'Journalisation & audit',
    body: 'Connexions, actions sensibles et accès aux données sont horodatés et associés à l’utilisateur responsable. Page admin dédiée à l’audit en cours de déploiement.',
  },
  {
    icon: RefreshCw,
    title: 'Sauvegardes & restauration',
    body: 'Sauvegardes chiffrées quotidiennes côté hébergeur, PITR (Point-in-Time Recovery) disponible, procédures de restauration testées régulièrement.',
  },
];

type Compliance = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
};

const COMPLIANCE: Compliance[] = [
  {
    icon: ScrollText,
    title: 'RGPD & loi Informatique et Libertés',
    items: [
      'Registre des activités de traitement maintenu',
      'Bases légales documentées pour chaque finalité',
      'Conservation des données limitée et justifiée',
      'Notification CNIL sous 72 h en cas de violation',
    ],
  },
  {
    icon: Users2,
    title: 'Sous-traitance encadrée (DPA)',
    items: [
      'Clauses Contractuelles Types pour les transferts hors UE',
      'Audit fournisseurs annuel',
      'Engagement à notifier tout changement de sous-traitant',
      'DPA signable sur demande',
    ],
  },
  {
    icon: HeartHandshake,
    title: 'Droits des personnes',
    items: [
      'Accès, rectification, effacement, opposition, portabilité',
      'Procédure simple depuis le compte utilisateur',
      'Réponse sous 30 jours maximum',
      'Référent dédié : contact@centrium-platform.com',
    ],
  },
  {
    icon: FileCheck2,
    title: 'Pratiques de développement',
    items: [
      'Revue de code et validation Zod sur toutes les entrées',
      'Scan automatique des dépendances',
      'Variables d’environnement isolées, secrets jamais commités',
      'Tests d’isolation multi-tenant',
    ],
  },
];

export default function EngagementsPage() {
  return (
    <MarketingShell>
      <main className="relative pt-28 sm:pt-32 pb-20">
        {/* ===== HERO ÉDITORIAL ===== */}
        <article className="max-w-3xl mx-auto px-6">
          <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-6 text-center">
            Engagements
          </div>

          <h1 className="font-display font-light tracking-[-0.04em] leading-[0.95] text-[clamp(2.4rem,6vw,5rem)] text-white text-center">
            Une plateforme
            <span className="block mt-3 font-editorial italic font-normal">
              pensée pour celles et ceux
            </span>
            <span className="block mt-3">qui font tourner les ESN.</span>
          </h1>

          <div className="mt-12 sm:mt-16 space-y-8 sm:space-y-10 text-[16px] sm:text-[17px] md:text-[18px] leading-[1.7] text-white/75 font-light">
            <p className="font-editorial italic text-[clamp(1.3rem,2.2vw,1.8rem)] text-white/90 leading-[1.5] text-center">
              « Le staffing ne devrait pas être un sport d&apos;endurance Excel. »
            </p>

            <p>
              Nous avons passé des années à voir des business managers
              brillants perdre 30 % de leur temps à recoller des morceaux —
              un CV dans Word, un pipeline dans Notion, un CRA sur WhatsApp,
              une facture sur un PDF retouché à la main.
            </p>

            <p>
              Pendant ce temps, les <em>vrais</em> sujets — qualifier finement
              un besoin, sentir un intercontrat qui se profile, soigner la
              relation avec un client — passaient au second plan. Pas par
              paresse. Par fatigue d&apos;outil.
            </p>

            <p>
              Centrium est notre réponse. Une seule plateforme, qui couvre
              tout le cycle, et qui s&apos;efface devant le métier. Pas un
              tableau de bord de plus. <strong className="text-white">L&apos;outil</strong>.
            </p>
          </div>

          {/* 3 principes */}
          <div className="qc-luminous-static mt-16 sm:mt-20 grid sm:grid-cols-3 gap-px bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {[
              {
                num: '01',
                title: 'Le métier d’abord',
                body: 'Chaque écran a été dessiné avec une ESN en main. Pas un Figma envoyé par un consultant qui n’a jamais staffé.',
              },
              {
                num: '02',
                title: 'L’IA assistée, pas autonome',
                body: 'Aucune décision n’est prise sans vous. L’IA propose, suggère, accélère — vous validez. Jamais d’invention.',
              },
              {
                num: '03',
                title: 'Conformité par défaut',
                body: 'Hébergement EU, RLS multi-tenant, audit trail. Votre client le plus exigeant peut auditer demain.',
              },
            ].map((p) => (
              <div key={p.num} className="bg-background p-7 sm:p-8">
                <div className="text-[11px] font-mono text-white/30 mb-4">{p.num}</div>
                <div className="font-editorial italic text-2xl text-white mb-3">
                  {p.title}
                </div>
                <p className="text-[14px] text-white/60 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </article>

        {/* ===== ARCHITECTURE SÉCURITÉ ===== */}
        <section className="qc-section-divider relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24 mt-16">
          <div className="mb-10 sm:mb-14 text-center max-w-2xl mx-auto">
            <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-3">
              Architecture
            </div>
            <h2 className="font-display font-light tracking-[-0.03em] leading-[1] text-[clamp(1.8rem,3.8vw,3rem)] text-white">
              Les 6 piliers de notre{' '}
              <span className="font-editorial italic">sécurité.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="qc-luminous-static rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                >
                  <div className="h-10 w-10 rounded-xl bg-magenta/15 border border-magenta/30 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-magenta" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{p.title}</h3>
                  <p className="text-sm text-white/65 leading-relaxed">{p.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== CONFORMITÉ ===== */}
        <section className="qc-section-divider relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="mb-10 sm:mb-14 text-center max-w-2xl mx-auto">
            <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-3">
              Conformité
            </div>
            <h2 className="font-display font-light tracking-[-0.03em] leading-[1] text-[clamp(1.8rem,3.8vw,3rem)] text-white">
              Cadre réglementaire{' '}
              <span className="font-editorial italic">et engagements.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {COMPLIANCE.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.title}
                  className="qc-luminous-static rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-lg bg-violet-glow/15 border border-violet-glow/30 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-violet-300" />
                    </div>
                    <h3 className="font-semibold text-white">{c.title}</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-white/70">
                    {c.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-emerald-300 mt-1">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== CTA FINALE ===== */}
        <section className="qc-section-divider relative max-w-3xl mx-auto px-6 pt-20 sm:pt-24 text-center">
          <p className="font-editorial italic text-[clamp(1.5rem,2.6vw,2rem)] text-white/90 leading-[1.4] mb-2">
            Vous ne devriez pas avoir à choisir
          </p>
          <p className="font-editorial italic text-[clamp(1.5rem,2.6vw,2rem)] text-white/90 leading-[1.4]">
            entre rapidité et rigueur.
          </p>
          <p className="mt-6 text-white/55 text-[15px]">— L&apos;équipe Centrium</p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
            <MagneticButton href="/devis" variant="primary">
              Demander une démo
            </MagneticButton>
            <MagneticButton href="/plateforme" variant="ghost">
              Voir la plateforme
            </MagneticButton>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
