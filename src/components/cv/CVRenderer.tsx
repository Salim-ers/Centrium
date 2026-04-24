'use client';

import type { CVContent, CVTemplateId } from '@/types';
import { QuadCoreCVStandard } from './QuadCoreCVStandard';
import { QuadCoreCVDense } from './QuadCoreCVDense';
import { QuadCoreCVExecutive } from './QuadCoreCVExecutive';
import { resolveBrand } from '@/lib/cv/branding';
import { useOrganizationSafe } from '@/lib/auth/context';

type Props = {
  content: CVContent;
  templateId: CVTemplateId;
  showConfidential?: boolean;
  /**
   * Si true, les champs textuels clés (titre, résumé, rôle, bullet points…)
   * deviennent éditables directement sur le preview. onEdit reçoit alors
   * chaque modification (path, nouvelle valeur).
   */
  editable?: boolean;
  onEdit?: (path: string, value: string) => void;
};

export function CVRenderer({ content, templateId, showConfidential, editable, onEdit }: Props) {
  const org = useOrganizationSafe();
  const brand = resolveBrand(org?.branding ?? null);

  if (templateId === 'dense') {
    return (
      <QuadCoreCVDense
        content={content}
        showConfidential={showConfidential}
        editable={editable}
        onEdit={onEdit}
        brand={brand}
      />
    );
  }
  if (templateId === 'executive') {
    return (
      <QuadCoreCVExecutive
        content={content}
        showConfidential={showConfidential}
        editable={editable}
        onEdit={onEdit}
        brand={brand}
      />
    );
  }
  return (
    <QuadCoreCVStandard
      content={content}
      showConfidential={showConfidential}
      editable={editable}
      onEdit={onEdit}
      brand={brand}
    />
  );
}
