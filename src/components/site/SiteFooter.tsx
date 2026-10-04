import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { CentriumLogo } from '@/components/brand/CentriumLogo';

const COLUMNS = [
  {
    title: 'Produit',
    links: [
      { href: '/plateforme', label: 'Plateforme' },
      { href: '/plateforme#modules', label: 'Fonctionnalités' },
      { href: '/tarifs', label: 'Tarifs' },
      { href: '/essai', label: 'Essai de 7 jours' },
      { href: '/demo', label: 'Demander une démo' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { href: '/solutions#direction', label: 'Direction' },
      { href: '/solutions#business-managers', label: 'Business managers' },
      { href: '/solutions#recrutement', label: 'Recrutement' },
      { href: '/solutions#finance', label: 'ADV & finance' },
      { href: '/solutions#consultants', label: 'Consultants' },
      { href: '/solutions#clients', label: 'Clients' },
    ],
  },
  {
    title: 'Entreprise',
    links: [
      { href: '/securite', label: 'Sécurité' },
      { href: '/status', label: 'État du service' },
      { href: '/legal/subprocessors', label: 'Sous-traitants' },
      { href: '/legal/responsible-disclosure', label: 'Signaler une faille' },
      { href: 'mailto:contact@centrium-platform.com', label: 'Contact' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { href: '/legal/mentions', label: 'Mentions légales' },
      { href: '/legal/cgu', label: 'CGU' },
      { href: '/legal/privacy', label: 'Confidentialité' },
      { href: '/legal/dpa', label: 'DPA' },
      { href: '/legal/cookies', label: 'Cookies' },
    ],
  },
];

/** Pied de page : noir chaud, trame terracotta, CENTRIUM monumental. */
export function SiteFooter() {
  return (
    <footer data-nav="light" className="relative overflow-hidden bg-ink text-ivory">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(228,160,140,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(228,160,140,.07) 1px, transparent 1px)',
          backgroundSize: '96px 96px',
        }}
      />
      <div className="relative mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-12 2xl:px-16">
        <div className="flex flex-col gap-10 border-b border-ivory/10 py-20 md:flex-row md:items-end md:justify-between md:py-28">
          <p className="text-[clamp(2.4rem,6vw,6.5rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.05em]">
            Votre ESN.
            <br />
            <span className="text-terra-light">
              Un seul <em className="ml-[0.12em] font-editorial font-normal normal-case italic tracking-[-0.02em]">cockpit.</em>
            </span>
          </p>
          <Link
            href="/plateforme"
            data-cursor="Explorer"
            className="group inline-flex shrink-0 items-center gap-4 self-start border-b border-ivory/40 pb-2 text-[14px] font-semibold uppercase tracking-[0.16em] transition-colors hover:border-ivory md:self-auto"
          >
            Découvrir Centrium
            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
          </Link>
        </div>

        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Centrium — accueil">
              <CentriumLogo className="h-7 w-7" />
              <span className="text-[15px] font-extrabold uppercase tracking-[0.18em]">Centrium</span>
            </Link>
            <p className="mt-4 max-w-[260px] text-[14px] leading-relaxed text-ivory/60">Le cockpit des ESN modernes. Édité par QuadCore SAS, hébergé dans l’Union européenne.</p>
          </div>
          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.2em] text-terra-light">{c.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[14.5px] text-ivory/70 transition-colors hover:text-ivory">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div aria-hidden className="relative select-none overflow-hidden">
        <div className="translate-y-[18%] whitespace-nowrap text-center text-[clamp(4rem,19vw,24rem)] font-extrabold uppercase leading-[0.8] tracking-[-0.07em] text-terra">Centrium</div>
      </div>
      <div className="relative border-t border-ivory/10">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-1 px-5 py-5 text-[12px] text-ivory/50 sm:flex-row sm:justify-between sm:px-8 lg:px-12 2xl:px-16">
          <span>© {new Date().getFullYear()} QuadCore SAS — Centrium</span>
          <span>Application hébergée dans l’Union européenne</span>
        </div>
      </div>
    </footer>
  );
}
