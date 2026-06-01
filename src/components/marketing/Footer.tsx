'use client';

import Link from 'next/link';
import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import { ManageCookiesLink } from './CookieBanner';
import type { LandingDict } from '@/lib/i18n/landing';

/**
 * Footer marketing — réorganisé en 3 colonnes propres :
 *   1. Brand : wordmark + tagline
 *   2. Produit : liens DICT
 *   3. Société : liens DICT + Engagements
 *
 * Rangée légale en bas : copyright à gauche · 5 liens légaux à droite
 * (privacy, mentions, CGU, cookies, DPA, gérer les cookies).
 *
 * Pas de "All systems operational" — confusion possible (vrai status
 * non monitoré), retiré.
 */
export function Footer({ t }: { t: LandingDict }) {
  return (
    <footer className="relative border-t border-white/10 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        {/* === Bloc principal : 3 colonnes === */}
        <div className="grid md:grid-cols-[1.5fr_1fr_1fr] gap-10 md:gap-16">
          <div>
            <CentriumWordmark size="md" />
            <p className="mt-4 text-sm text-white/55 max-w-sm leading-relaxed">
              {t.footer.tagline}
            </p>
          </div>

          <div>
            <div className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-4">
              {t.footer.cols.product.title}
            </div>
            <ul className="space-y-2.5 text-sm">
              {t.footer.cols.product.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-white/70 hover:text-white transition"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/engagements"
                  className="text-white/70 hover:text-white transition"
                >
                  Engagements &amp; sécurité
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-4">
              {t.footer.cols.company.title}
            </div>
            <ul className="space-y-2.5 text-sm">
              {t.footer.cols.company.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-white/70 hover:text-white transition"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* === Rangée légale === */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-[12px] text-white/45">
          <div>{t.footer.rights}</div>
          <nav
            aria-label="Liens légaux"
            className="flex flex-wrap items-center gap-x-5 gap-y-2"
          >
            <Link href="/legal/privacy" className="hover:text-white transition">
              Confidentialité
            </Link>
            <Link href="/legal/mentions" className="hover:text-white transition">
              Mentions légales
            </Link>
            <Link href="/legal/cgu" className="hover:text-white transition">
              CGU
            </Link>
            <Link href="/legal/cookies" className="hover:text-white transition">
              Cookies
            </Link>
            <Link href="/legal/dpa" className="hover:text-white transition">
              DPA
            </Link>
            <ManageCookiesLink className="hover:text-white transition" />
          </nav>
        </div>
      </div>
    </footer>
  );
}
