import { SkillsDossierStudio } from '@/components/cv/SkillsDossierStudio';

/**
 * CV Optimizer : dossier de compétences d'un consultant (standard, dense,
 * executive ou adapté à une opportunité), export PDF et Word. Accessible
 * aussi depuis la fiche consultant (même atelier, consultant verrouillé).
 * `?consultantId=` et `?offerId=` présélectionnent consultant et offre.
 */
export default function CvOptimizerPage() {
  return <SkillsDossierStudio />;
}
