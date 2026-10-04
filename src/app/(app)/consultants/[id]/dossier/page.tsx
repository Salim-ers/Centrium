'use client';

import { useParams } from 'next/navigation';
import { SkillsDossierStudio } from '@/components/cv/SkillsDossierStudio';

export default function ConsultantDossierPage() {
  const { id } = useParams<{ id: string }>();
  return <SkillsDossierStudio lockedConsultantId={id} />;
}
