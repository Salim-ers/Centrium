'use client';

import type { CVContent, CVTemplateId } from '@/types';
import { QuadCoreCVStandard } from './QuadCoreCVStandard';
import { QuadCoreCVDense } from './QuadCoreCVDense';
import { QuadCoreCVExecutive } from './QuadCoreCVExecutive';

type Props = {
  content: CVContent;
  templateId: CVTemplateId;
  showConfidential?: boolean;
};

export function CVRenderer({ content, templateId, showConfidential }: Props) {
  if (templateId === 'dense') {
    return <QuadCoreCVDense content={content} showConfidential={showConfidential} />;
  }
  if (templateId === 'executive') {
    return <QuadCoreCVExecutive content={content} showConfidential={showConfidential} />;
  }
  return <QuadCoreCVStandard content={content} showConfidential={showConfidential} />;
}
