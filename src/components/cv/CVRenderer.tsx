'use client';

import type { CVContent, CVTemplateId } from '@/types';
import { QuadCoreCVStandard } from './QuadCoreCVStandard';
import { QuadCoreCVDense } from './QuadCoreCVDense';
import { QuadCoreCVExecutive } from './QuadCoreCVExecutive';

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
  if (templateId === 'dense') {
    return (
      <QuadCoreCVDense
        content={content}
        showConfidential={showConfidential}
        editable={editable}
        onEdit={onEdit}
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
      />
    );
  }
  return (
    <QuadCoreCVStandard
      content={content}
      showConfidential={showConfidential}
      editable={editable}
      onEdit={onEdit}
    />
  );
}
