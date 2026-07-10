'use client';

import { PageHeader, Reveal } from '@/components/app';
import { ConsultantMissionsList } from '@/components/missions/ConsultantMissionsList';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { usePortalConsultant } from '../portal-context';

export default function PortalMissionsPage() {
  const { consultantId } = usePortalConsultant();
  const { locale } = useLocale();
  const isEn = locale === 'en';

  return (
    <div>
      <PageHeader
        eyebrow={isEn ? 'My space' : 'Mon espace'}
        title={isEn
          ? <>My <span className="qc-italic-accent font-editorial italic">missions.</span></>
          : <>Mes <span className="qc-italic-accent font-editorial italic">missions.</span></>}
        description={isEn
          ? "All the missions you're assigned to — proposed, ongoing, completed."
          : "Toutes les missions auxquelles tu es affecté — proposées, en cours, terminées."}
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
