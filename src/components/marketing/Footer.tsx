'use client';

import Link from 'next/link';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';
import { LegalLinks } from './legal/LegalLinks';
import type { LandingDict } from '@/lib/i18n/landing';

export function Footer({ t }: { t: LandingDict }) {
  return (
    <footer className="relative border-t border-white/5 py-14">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <QuadCoreLogo size="sm" variant="dark" />
          <p className="mt-4 text-sm text-white/55 max-w-sm leading-relaxed">{t.footer.tagline}</p>
        </div>

        <div>
          <div className="text-xs font-semibold tracking-widest text-white/40 mb-3">
            {t.footer.cols.product.title}
          </div>
          <ul className="space-y-2 text-sm">
            {t.footer.cols.product.links.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-white/70 hover:text-white transition">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold tracking-widest text-white/40 mb-3">
            {t.footer.cols.company.title}
          </div>
          <ul className="space-y-2 text-sm">
            {t.footer.cols.company.links.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-white/70 hover:text-white transition">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-white/5 flex flex-col gap-4">
        <LegalLinks />
        <div className="text-xs text-white/40 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>{t.footer.rights}</div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
