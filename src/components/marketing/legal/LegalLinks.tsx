'use client';

import { useState } from 'react';

import { LegalModal } from './LegalModal';
import { LegalNotice } from './LegalNotice';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfService } from './TermsOfService';
import { CookiePolicy } from './CookiePolicy';
import { DPA } from './DPA';

type LegalKey = 'notice' | 'privacy' | 'terms' | 'cookies' | 'dpa';

const DOCS: Record<LegalKey, { title: string; render: () => React.ReactNode; label: string }> = {
  notice: { title: 'Mentions légales', label: 'Mentions légales', render: () => <LegalNotice /> },
  privacy: { title: 'Politique de confidentialité', label: 'Confidentialité', render: () => <PrivacyPolicy /> },
  terms: { title: 'CGU / CGS', label: 'CGU & CGS', render: () => <TermsOfService /> },
  cookies: { title: 'Politique de cookies', label: 'Cookies', render: () => <CookiePolicy /> },
  dpa: { title: 'Accord de sous-traitance (DPA)', label: 'DPA', render: () => <DPA /> },
};

export function LegalLinks() {
  const [open, setOpen] = useState<LegalKey | null>(null);

  return (
    <>
      <nav
        aria-label="Documents légaux"
        className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-xs text-muted-foreground"
      >
        {(Object.keys(DOCS) as LegalKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setOpen(k)}
            className="hover:text-foreground transition underline-offset-4 hover:underline"
          >
            {DOCS[k].label}
          </button>
        ))}
      </nav>

      {(Object.keys(DOCS) as LegalKey[]).map((k) => (
        <LegalModal
          key={k}
          open={open === k}
          onOpenChange={(o) => setOpen(o ? k : null)}
          title={DOCS[k].title}
        >
          {DOCS[k].render()}
        </LegalModal>
      ))}
    </>
  );
}
