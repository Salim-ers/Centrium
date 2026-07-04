'use client';

import { PageHeader, Reveal } from '@/components/app';
import { useOrganization } from '@/lib/auth/context';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { ConsultantSelfDocuments } from '@/components/portal/ConsultantSelfDocuments';
import { usePortalConsultant } from '../portal-context';

export default function PortalDocumentsPage() {
  const { consultantId, userId } = usePortalConsultant();
  const { activeOrgId: orgId } = useOrganization();
  const brandName = useBrandName();

  return (
    <div>
      <PageHeader
        eyebrow="Mon espace"
        title={<>Mes <span className="qc-italic-accent font-editorial italic">documents.</span></>}
        description={`Partagez vos documents avec ${brandName} et retrouvez ceux qui vous ont été transmis.`}
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
