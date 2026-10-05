'use client';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { SectionTabs } from '@/components/layout/SectionTabs';
import { MatchingCenter } from '@/components/matching/MatchingCenter';
import { useLocale } from '@/lib/i18n/LocaleProvider';

/**
 * Staffing · Matching : une opportunité ouverte, les consultants classés et
 * expliqués, positionnement et dossier sans changer d'écran.
 */
export default function MatchingPage() {
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  return (
    <AppShell fill>
      <PageHeader
        title="Staffing"
        description={fr ? 'Les profils compatibles pour chaque opportunité, expliqués.' : 'Matching profiles for every opportunity, explained.'}
        tabs={<SectionTabs section="staffing" />}
      />
      <MatchingCenter lang={lang} />
    </AppShell>
  );
}
