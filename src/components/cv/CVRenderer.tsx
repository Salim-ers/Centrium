'use client';

import type { CVContent } from '@/types';
import { DossierDocument } from './DossierDocument';
import { resolveBrand, type CVBrand } from '@/lib/cv/branding';
import type { DossierTemplateId } from '@/lib/cv/templates';
import { useOrganizationSafe } from '@/lib/auth/context';

type Props = {
  content: CVContent;
  templateId: DossierTemplateId;
  showConfidential?: boolean;
  /**
   * Si true, les champs textuels clés (titre, résumé, rôle, réalisations…)
   * deviennent éditables directement sur l'aperçu. onEdit reçoit alors
   * chaque modification (path, nouvelle valeur).
   */
  editable?: boolean;
  onEdit?: (path: string, value: string) => void;
  /** Data URL du QR code (vCard). Affiché à côté du logo. */
  qrSrc?: string | null;
  /** Branding à appliquer ; par défaut celui de l'organisation active. */
  brand?: CVBrand;
};

/** Dossier de compétences dans le modèle choisi, aux couleurs de l'organisation. */
export function CVRenderer({ content, templateId, showConfidential, editable, onEdit, qrSrc, brand }: Props) {
  const org = useOrganizationSafe();
  const b = brand ?? resolveBrand(org?.branding ?? null);
  return <DossierDocument content={content} template={templateId} brand={b} showConfidential={showConfidential} editable={editable} onEdit={onEdit} qrSrc={qrSrc} />;
}
