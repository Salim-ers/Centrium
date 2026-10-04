'use client';

import Link from 'next/link';

import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import { useLocale } from '@/lib/i18n/LocaleProvider';

const COLUMNS = [
  {
    title: { fr: 'Produit', en: 'Product' },
    links: [
      { href: '/#produit', label: { fr: 'Fonctionnalités', en: 'Features' } },
      { href: '/#parcours', label: { fr: 'Parcours', en: 'How it works' } },
      { href: '/tarifs', label: { fr: 'Tarifs', en: 'Pricing' } },
      { href: '/essai', label: { fr: 'Essai gratuit', en: 'Free trial' } },
      { href: '/demo', label: { fr: 'Demander une démo', en: 'Book a demo' } },
    ],
  },
  {
    title: { fr: 'Confiance', en: 'Trust' },
    links: [
      { href: '/security', label: { fr: 'Sécurité', en: 'Security' } },
      { href: '/status', label: { fr: 'État du service', en: 'Status' } },
      { href: '/legal/subprocessors', label: { fr: 'Sous-traitants', en: 'Subprocessors' } },
      { href: '/legal/responsible-disclosure', label: { fr: 'Signaler une faille', en: 'Report a vulnerability' } },
    ],
  },
  {
    title: { fr: 'Légal', en: 'Legal' },
    links: [
      { href: '/legal/mentions', label: { fr: 'Mentions légales', en: 'Legal notice' } },
      { href: '/legal/cgu', label: { fr: 'CGU', en: 'Terms' } },
      { href: '/legal/privacy', label: { fr: 'Confidentialité', en: 'Privacy' } },
      { href: '/legal/dpa', label: { fr: 'DPA', en: 'DPA' } },
      { href: '/legal/cookies', label: { fr: 'Cookies', en: 'Cookies' } },
    ],
  },
];

export function SiteFooter() {
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  return (
    <footer className="border-t border-border bg-sand-100/50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <CentriumWordmark size="sm" orientation="horizontal" href="/" />
          <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-muted-foreground">
            {lang === 'fr' ? 'Le cockpit de gestion des ESN et cabinets de conseil.' : 'The operating cockpit for IT services and consulting firms.'}
          </p>
          <a href="mailto:contact@centrium-platform.com" className="mt-4 inline-block text-[14px] text-primary-deep hover:underline">
            contact@centrium-platform.com
          </a>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title.fr}>
            <h2 className="text-[13px] font-semibold">{c.title[lang]}</h2>
            <ul className="mt-3 space-y-2">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[14px] text-muted-foreground transition-colors hover:text-foreground">
                    {l.label[lang]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-[12px] text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} Centrium</span>
          <span>{lang === 'fr' ? 'Application hébergée dans l’Union européenne' : 'Application hosted in the European Union'}</span>
        </div>
      </div>
    </footer>
  );
}
