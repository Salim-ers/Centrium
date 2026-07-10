'use client';

import { PageHeader, Reveal } from '@/components/app';
import { useOrganization } from '@/lib/auth/context';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { ConsultantSelfDocuments } from '@/components/portal/ConsultantSelfDocuments';
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
          ? <>My <span className="qc-italic-accent font-editorial italic">documents.</span></>
          : <>Mes <span className="qc-italic-accent font-editorial italic">documents.</span></>}
        description={isEn
          ? `Share your documents with ${brandName} and find those that have been sent to you.`
          : `Partagez vos documents avec ${brandName} et retrouvez ceux qui vous ont été transmis.`}
      />

      <Reveal>
        <ConsultantSelfDocuments
          consultantId={consultantId}
          userId={userId}
          orgId={orgId}
        />
      </Reveal>
    </div>
  );
}
