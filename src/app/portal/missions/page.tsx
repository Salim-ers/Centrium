'use client';

import { PageHeader, Reveal } from '@/components/app';
import { ConsultantMissionsList } from '@/components/missions/ConsultantMissionsList';
import { usePortalConsultant } from '../portal-context';

export default function PortalMissionsPage() {
  const { consultantId } = usePortalConsultant();

  return (
    <div>
      <PageHeader
        eyebrow="Mon espace"
        title={<>Mes <span className="qc-italic-accent font-editorial italic">missions.</span></>}
        description="Toutes les missions auxquelles tu es affecté — proposées, en cours, terminées."
      />

      <Reveal>
        <ConsultantMissionsList
          consultantId={consultantId}
          canManage={false}
          linkBase="/portal/missions"
        />
      </Reveal>
    </div>
  );
}
