'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, Settings2, X } from 'lucide-react';

import {
  CONSENT_CATEGORIES,
  readConsent,
  writeConsent,
  type CookieConsent,
} from '@/lib/consent/cookies';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type View = 'hidden' | 'banner' | 'preferences';

export function CookieBanner() {
  const { t } = useLocale();
  const [view, setView] = useState<View>('hidden');
  const [prefs, setPrefs] = useState({ analytics: false, marketing: false });

  useEffect(() => {
    const existing = readConsent();
    if (!existing) {
      const timer = window.setTimeout(() => setView('banner'), 600);
      return () => window.clearTimeout(timer);
    }
    setPrefs({ analytics: existing.analytics, marketing: existing.marketing });
  }, []);

  useEffect(() => {
    function onReopen() {
      const existing = readConsent();
      if (existing) {
        setPrefs({ analytics: existing.analytics, marketing: existing.marketing });
      }
      setView('preferences');
    }
    window.addEventListener('centrium-open-cookie-preferences', onReopen);
    return () => window.removeEventListener('centrium-open-cookie-preferences', onReopen);
  }, []);

  function persist(next: { analytics: boolean; marketing: boolean }): CookieConsent {
    const consent = writeConsent(next);
    setPrefs(next);
    setView('hidden');
    return consent;
  }

  function acceptAll() {
    persist({ analytics: true, marketing: true });
  }
  function rejectAll() {
    persist({ analytics: false, marketing: false });
  }
  function saveCustom() {
    persist(prefs);
  }

  if (view === 'hidden') return null;

  if (view === 'preferences') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-prefs-title"
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-foreground/70 animate-in fade-in-0"
      >
        <div className="w-full max-w-lg rounded-2xl border border-hairline bg-card text-foreground shadow-2xl overflow-hidden">
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-hairline">
            <div>
              <h2
                id="cookie-prefs-title"
                className="font-display text-lg font-semibold flex items-center gap-2"
              >
                <Settings2 className="h-4 w-4 text-primary" />
                {t.cookies.prefsTitle}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {t.cookies.prefsDesc}
              </p>
            </div>
            <button
              type="button"
              aria-label={t.cookies.closeAria}
              onClick={() => setView('hidden')}
              className="h-8 w-8 inline-flex items-center justify-center rounded-full border border-hairline hover:bg-muted transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="rounded-xl border border-hairline bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="font-medium text-sm">{t.cookies.essentialTitle}</div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-success">
                  {t.cookies.essentialAlways}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t.cookies.essentialDesc}
              </p>
            </div>

            {CONSENT_CATEGORIES.map((cat) => (
              <label
                key={cat.key}
                className="block rounded-xl border border-hairline bg-card hover:bg-muted/20 p-4 cursor-pointer transition"
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="font-medium text-sm">{cat.title}</div>
                  <input
                    type="checkbox"
                    checked={prefs[cat.key]}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, [cat.key]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                  />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {cat.description}
                </p>
              </label>
            ))}

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t.cookies.note1}{' '}
              <Link
                href="/legal/cookies"
                className="text-primary hover:underline"
                onClick={() => setView('hidden')}
              >
                {t.cookies.cookiePolicy}
              </Link>
              {t.cookies.note2}
            </p>
          </div>

          <div className="px-6 py-4 border-t border-hairline flex flex-col-reverse sm:flex-row gap-2 sm:justify-end bg-muted/20">
            <button
              type="button"
              onClick={rejectAll}
              className="h-10 px-4 rounded-full text-sm font-medium border border-hairline text-foreground/80 hover:bg-muted transition"
            >
              {t.cookies.refuseAll}
            </button>
            <button
              type="button"
              onClick={saveCustom}
              className="h-10 px-4 rounded-full text-sm font-medium border border-hairline text-foreground/80 hover:bg-muted transition"
            >
              {t.cookies.saveChoice}
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="h-10 px-5 rounded-full text-sm font-semibold bg-qc-gradient text-white shadow-[0_0_18px_rgba(225,29,116,0.45)] hover:brightness-110 transition"
            >
              {t.cookies.acceptAllBtn}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={t.cookies.bannerAria}
      className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:bottom-6 z-[150] sm:max-w-md animate-in fade-in-0 slide-in-from-bottom-4"
    >
      <div className="rounded-2xl border border-hairline bg-card/95 shadow-2xl p-5 text-foreground">
        <div className="flex items-start gap-3 mb-3">
          <div className="h-9 w-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <Cookie className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm">{t.cookies.bannerTitle}</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t.cookies.bannerDesc}{' '}
              <Link href="/legal/cookies" className="text-primary hover:underline">
                {t.cookies.learnMore}
              </Link>
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:items-center">
          <button
            type="button"
            onClick={rejectAll}
            className="h-9 px-3 rounded-full text-xs font-medium border border-hairline text-foreground/80 hover:bg-muted transition"
          >
            {t.cookies.refuse}
          </button>
          <button
            type="button"
            onClick={() => setView('preferences')}
            className="h-9 px-3 rounded-full text-xs font-medium border border-hairline text-foreground/80 hover:bg-muted transition"
          >
            {t.cookies.customize}
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="h-9 px-4 rounded-full text-xs font-semibold bg-qc-gradient text-white shadow-[0_0_18px_rgba(225,29,116,0.45)] hover:brightness-110 transition sm:ml-auto"
          >
            {t.cookies.acceptAll}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Petit bouton à mettre dans les footers pour réouvrir les préférences.
 * Émet l'event que CookieBanner écoute.
 */
export function ManageCookiesLink({ className, label }: { className?: string; label?: string }) {
  const { t } = useLocale();
  function open() {
    window.dispatchEvent(new CustomEvent('centrium-open-cookie-preferences'));
  }
  return (
    <button
      type="button"
      onClick={open}
      className={className ?? 'text-xs text-muted-foreground hover:text-foreground transition underline-offset-4 hover:underline'}
    >
      {label ?? t.footer.legal.cookieManage}
    </button>
  );
}
