import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Lock, Globe, FileCheck, Activity, Mail } from 'lucide-react';

import { MarketingShell } from '@/components/marketing/MarketingShell';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Trust Center',
  description:
    'Trust Center Centrium : sécurité, conformité RGPD, disponibilité, sous-traitants, programme de divulgation responsable.',
  alternates: { canonical: '/trust' },
  openGraph: {
    title: 'Trust Center — Centrium',
    description: 'Toute la documentation sécurité et conformité de Centrium.',
    url: '/trust',
    type: 'website',
  },
};

const SECTIONS = [
  {
    icon: Shield,
    title: 'Sécurité de la plateforme',
    body: 'Architecture multi-tenant avec isolation par RLS PostgreSQL, chiffrement TLS 1.3 en transit et AES-256 au repos, MFA disponible, audit log complet.',
    link: { label: 'Whitepaper sécurité (PDF)', href: '/docs/produit/dist/SECURITY_WHITEPAPER.pdf' },
  },
  {
    icon: Lock,
    title: 'Conformité RGPD',
    body: 'DPA modèle disponible sur demande. Données hébergées exclusivement en Union Européenne. Droit d\'accès, rectification, portabilité et effacement en self-service.',
    link: { label: 'Politique de confidentialité', href: '/legal/privacy' },
  },
  {
    icon: Globe,
    title: 'Sous-traitants',
    body: 'Liste publique et versionnée de tous nos sous-traitants (Supabase EU, Vercel EU, Anthropic, Stripe EU, Resend). Notification 30 jours avant changement.',
    link: { label: 'Voir la liste', href: '/legal/subprocessors' },
  },
  {
    icon: FileCheck,
    title: 'Roadmap certifications',
    body: 'SOC 2 Type I prévue Q4 2026. SOC 2 Type II prévue Q1 2027. ISO 27001 évaluation Q2 2027. Pentest externe annuel à partir de Q4 2026.',
    link: { label: 'Calendrier détaillé', href: '/legal/dpa' },
  },
  {
    icon: Activity,
    title: 'Disponibilité',
    body: 'SLA contractuel 99,9% (Pro) à 99,95% (Enterprise). Status page publique avec historique des incidents.',
    link: { label: 'Status en temps réel', href: 'https://status.centrium-platform.com' },
  },
  {
    icon: Mail,
    title: 'Divulgation responsable',
    body: 'Programme de Vulnerability Disclosure (VDP) actif. Politique sous /.well-known/security.txt. Bug Bounty programme en cours de lancement (Q4 2026).',
    link: { label: 'security.txt', href: '/.well-known/security.txt' },
  },
];

export default function TrustCenterPage() {
  return (
    <MarketingShell>
      <BreadcrumbJsonLd crumbs={[{ name: 'Trust Center', path: '/trust' }]} />

      <main className="relative pt-32 pb-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold tracking-[0.2em] uppercase text-magenta mb-3">
              Centrium · Trust Center
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-white">
              Sécurité, confidentialité,{' '}
              <span className="qc-italic-accent font-serif italic">transparence</span>
            </h1>
            <p className="mt-5 text-lg text-white/65 leading-relaxed max-w-2xl">
              Tout ce qu&apos;un DSI, un RSSI ou un Responsable Achats a besoin de
              savoir avant de signer avec Centrium. Documents téléchargeables,
              roadmap publique, contacts directs.
            </p>
          </div>

          <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isExternal = s.link.href.startsWith('http');
              return (
                <article
                  key={s.title}
                  className="qc-premium rounded-2xl border border-white/10 p-6 hover:border-magenta/30 transition"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-md bg-white/[0.06] p-2.5 text-magenta">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="font-display font-semibold text-white text-[15px]">
                      {s.title}
                    </h2>
                  </div>
                  <p className="text-sm text-white/65 leading-relaxed mb-5">
                    {s.body}
                  </p>
                  {isExternal ? (
                    <a
                      href={s.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-magenta hover:underline inline-flex items-center gap-1"
                    >
                      {s.link.label} →
                    </a>
                  ) : (
                    <Link
                      href={s.link.href}
                      className="text-xs text-magenta hover:underline inline-flex items-center gap-1"
                    >
                      {s.link.label} →
                    </Link>
                  )}
                </article>
              );
            })}
          </div>

          <div className="mt-16 rounded-2xl border border-white/10 bg-white/[0.02] p-8 max-w-3xl">
            <h2 className="font-display text-xl font-semibold text-white mb-3">
              Une question, une demande, une due diligence ?
            </h2>
            <p className="text-sm text-white/65 leading-relaxed mb-5">
              Notre équipe répond aux questionnaires de sécurité (CAIQ, SIG,
              VSA, Tisax light) en moins de 5 jours ouvrés.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <a
                href="mailto:security@centrium-platform.com"
                className="rounded-lg border border-white/10 p-4 hover:border-magenta/40 transition"
              >
                <div className="text-xs text-white/50 mb-1">Sécurité</div>
                <div className="text-magenta">security@centrium-platform.com</div>
              </a>
              <a
                href="mailto:dpo@centrium-platform.com"
                className="rounded-lg border border-white/10 p-4 hover:border-magenta/40 transition"
              >
                <div className="text-xs text-white/50 mb-1">Données / DPO</div>
                <div className="text-magenta">dpo@centrium-platform.com</div>
              </a>
              <a
                href="mailto:sales@centrium-platform.com"
                className="rounded-lg border border-white/10 p-4 hover:border-magenta/40 transition"
              >
                <div className="text-xs text-white/50 mb-1">Commercial</div>
                <div className="text-magenta">sales@centrium-platform.com</div>
              </a>
            </div>
          </div>
        </div>
      </main>
    </MarketingShell>
  );
}
