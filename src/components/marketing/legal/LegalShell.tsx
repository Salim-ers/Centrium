import Link from 'next/link';

import { CentriumWordmark } from '@/components/brand/CentriumWordmark';

export const LEGAL_PAGES = [
  { slug: 'privacy', label: 'Confidentialité', href: '/legal/privacy' },
  { slug: 'mentions', label: 'Mentions légales', href: '/legal/mentions' },
  { slug: 'cgu', label: 'CGU / CGS', href: '/legal/cgu' },
  { slug: 'cookies', label: 'Cookies', href: '/legal/cookies' },
  { slug: 'dpa', label: 'DPA (sous-traitance)', href: '/legal/dpa' },
] as const;

export type LegalSlug = (typeof LEGAL_PAGES)[number]['slug'];

type Props = {
  title: string;
  updatedAt: string;
  currentSlug: LegalSlug;
  children: React.ReactNode;
};

export function LegalShell({ title, updatedAt, currentSlug, children }: Props) {
  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <header className="border-b border-hairline bg-background/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" aria-label="Accueil Centrium" className="flex items-center">
            <CentriumWordmark size="sm" />
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="hidden sm:inline-flex items-center h-9 px-3 rounded-full text-white/70 hover:text-white hover:bg-white/5 transition"
            >
              Accueil
            </Link>
            <Link
              href="/devis"
              className="inline-flex items-center h-10 px-4 rounded-full bg-qc-gradient text-white text-sm font-semibold shadow-[0_0_22px_rgba(225,29,116,0.4)] hover:brightness-110 transition"
            >
              Demander un devis
            </Link>
          </nav>
        </div>
      </header>

      <div className="border-b border-amber-500/30 bg-amber-500/10">
        <div className="max-w-6xl mx-auto px-6 py-3 text-xs leading-relaxed text-amber-200">
          <strong className="font-semibold">Document de travail.</strong> Ce texte
          est un projet rédigé avec sérieux mais ne constitue pas un avis juridique
          définitif. Il doit être validé par un juriste avant toute utilisation
          contractuelle ou publication officielle.
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12 md:py-16">
        <div className="grid md:grid-cols-[230px_1fr] gap-10 md:gap-14">
          <aside className="md:sticky md:top-28 md:self-start">
            <div className="text-[11px] font-semibold tracking-[0.2em] text-white/40 mb-3 uppercase">
              Documents légaux
            </div>
            <nav
              aria-label="Sommaire des documents légaux"
              className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible -mx-6 md:mx-0 px-6 md:px-0 pb-2 md:pb-0 scrollbar-none"
            >
              {LEGAL_PAGES.map((p) => {
                const active = p.slug === currentSlug;
                return (
                  <Link
                    key={p.slug}
                    href={p.href}
                    aria-current={active ? 'page' : undefined}
                    className={`shrink-0 px-3 py-2 rounded-lg text-sm transition border ${
                      active
                        ? 'bg-white/10 text-white border-white/15'
                        : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {p.label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden md:block mt-8 rounded-xl border border-hairline bg-white/[0.02] p-4 text-xs text-white/60">
              <div className="font-semibold text-white/80 mb-1">Une question ?</div>
              <p className="leading-relaxed mb-3">
                Pour toute demande relative à vos données ou à un document légal,
                contactez notre référent.
              </p>
              <a
                href="mailto:contact@centrium-platform.com"
                className="text-magenta hover:underline break-all"
              >
                contact@centrium-platform.com
              </a>
            </div>
          </aside>

          <article>
            <header className="mb-10">
              <div className="text-[11px] font-semibold tracking-[0.2em] uppercase text-magenta mb-2">
                Centrium · Espace légal
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-white">
                {title}
              </h1>
              <p className="mt-3 text-sm text-white/50">
                Dernière mise à jour : <span className="text-white/70">{updatedAt}</span>
              </p>
            </header>

            <div className="legal-body text-[15px] leading-relaxed text-white/80">
              {children}
            </div>

            <div className="mt-14 pt-8 border-t border-hairline text-xs text-white/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                Vous avez une remarque sur ce document ?{' '}
                <a
                  href="mailto:contact@centrium-platform.com"
                  className="text-magenta hover:underline"
                >
                  Écrivez-nous
                </a>
              </div>
              <Link href="/legal/privacy" className="hover:text-white transition">
                Voir tous les documents →
              </Link>
            </div>
          </article>
        </div>
      </main>

      <footer className="border-t border-hairline py-8 mt-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/50">
          <div>
            © {new Date().getFullYear()} QuadCore SAS — Centrium est une marque
            éditée par QuadCore SAS.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/security" className="hover:text-white transition">
              Sécurité & conformité
            </Link>
            <Link href="/" className="hover:text-white transition">
              Retour à l’accueil
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
