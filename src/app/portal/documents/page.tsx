'use client';

import { PageHeader, Reveal } from '@/components/app';
import { useOrganization } from '@/lib/auth/context';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { ConsultantSelfDocuments } from '@/components/portal/ConsultantSelfDocuments';
import { SharedDocumentsList } from '@/components/portal/SharedDocumentsList';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { usePortalConsultant } from '../portal-context';

export default function PortalDocumentsPage() {
  const { consultantId, userId } = usePortalConsultant();
  const { activeOrgId: orgId } = useOrganization();
  const brandName = useBrandName();
  const { locale } = useLocale();
  const isEn = locale === 'en';

  return (
    <div>
      <PageHeader
        eyebrow={isEn ? 'My space' : 'Mon espace'}
        title={isEn
          ? <>My <span className="text-primary font-display ">documents.</span></>
          : <>Mes <span className="text-primary font-display ">documents.</span></>}
        description={isEn
          ? `Share your documents with ${brandName} and find those that have been sent to you.`
          : `Partagez vos documents avec ${brandName} et retrouvez ceux qui vous ont été transmis.`}
      />

      <Reveal className="space-y-6">
        <SharedDocumentsList endpoint="/api/portal/documents" cacheKey={`portal-shared-docs:${consultantId}`} />
        <ConsultantSelfDocuments
          consultantId={consultantId}
          userId={userId}
          orgId={orgId}
        />
      </Reveal>
    </div>
  );
}
