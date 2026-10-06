import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
  UnderlineType,
} from 'docx';
import type { CVContent, CVSectionId } from '@/types';
import { formatMonthYear } from '@/lib/utils';
import type { CVBrand } from './branding';
import { resolveBrand } from './branding';
import { certificationLine, sectionOrder, sectionTitle as sectionTitle_, visibleCategories } from './layout';

const NEUTRAL_DARK = '111827';
const NEUTRAL_MUTED = '6B7280';

/** DOCX color hex doesn't include the leading '#'. */
function hex(c: string): string {
  return c.replace(/^#/, '').toUpperCase();
}

function rule(accent: string) {
  return new Paragraph({
    spacing: { before: 80, after: 120 },
    border: {
      bottom: { color: accent, space: 1, style: BorderStyle.SINGLE, size: 12 },
    },
  });
}

function sectionTitle(text: string, primary: string) {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 18,
        color: primary,
        characterSpacing: 40,
      }),
    ],
    border: {
      bottom: { color: 'E5E7EB', space: 1, style: BorderStyle.SINGLE, size: 4 },
    },
  });
}

/**
 * Dossier au format Word : mêmes sections, même ordre et mêmes titres que
 * l'aperçu (mise en page `content.layout`), aux couleurs de l'organisation.
 */
export async function generateCVDocx(
  content: CVContent,
  options: { brand?: CVBrand; showConfidential?: boolean } = {},
): Promise<Blob> {
  const b = options.brand ?? resolveBrand(null);
  const showConfidential = options.showConfidential ?? true;
  const PRIMARY = hex(b.primary);
  const ACCENT = hex(b.accent);
  const children: Paragraph[] = [];

  // Header : brand
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({ text: b.brandName, bold: true, size: 28, color: NEUTRAL_DARK }),
        ...(b.footerTagline
          ? [
              new TextRun({
                text: `   ${b.footerTagline}`,
                size: 14,
                color: NEUTRAL_MUTED,
                characterSpacing: 40,
              }),
            ]
          : []),
      ],
    }),
  );
  children.push(rule(ACCENT));

  // Identity
  children.push(
    new Paragraph({
      spacing: { before: 120, after: 40 },
      children: [
        new TextRun({
          text: content.header.displayName,
          bold: true,
          size: 48,
          color: NEUTRAL_DARK,
        }),
      ],
    }),
  );
  children.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: content.header.jobTitle,
          size: 26,
          color: PRIMARY,
          bold: true,
        }),
      ],
    }),
  );
  if (content.header.subTitle) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: content.header.subTitle, size: 20, color: NEUTRAL_MUTED }),
        ],
      }),
    );
  }

  // Meta line
  const metaParts: string[] = [];
  metaParts.push(`Expérience : ${content.header.yearsExperience} ans`);
  if (content.header.location) metaParts.push(`Localisation : ${content.header.location}`);
  if (content.header.mobility) metaParts.push(`Mobilité : ${content.header.mobility}`);
  if (content.header.availability) metaParts.push(content.header.availability);

  children.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: metaParts.join('  •  '),
          size: 18,
          color: NEUTRAL_MUTED,
        }),
      ],
    }),
  );

  const sections: Record<CVSectionId, () => void> = {
    summary: () => {
      if (!content.summary) return;
      children.push(sectionTitle(sectionTitle_(content, 'summary', 'Profil'), PRIMARY));
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: content.summary, size: 20, color: NEUTRAL_DARK })],
        }),
      );
    },
    skills: () => {
      const cats = visibleCategories(content);
      if (cats.length === 0) return;
      children.push(sectionTitle(sectionTitle_(content, 'skills', 'Compétences'), PRIMARY));
      for (const { cat, items: visible } of cats) {
        const highlighted = new Set((cat.highlighted ?? []).map((h) => h.toLowerCase()));
        const runs: TextRun[] = [];
        runs.push(
          new TextRun({
            text: cat.name.toUpperCase() + '  ',
            size: 16,
            color: NEUTRAL_MUTED,
            characterSpacing: 30,
          }),
        );
        visible.map((v) => v.item).forEach((item, i) => {
          if (i > 0) runs.push(new TextRun({ text: '  •  ', size: 18, color: NEUTRAL_MUTED }));
          const isHi = highlighted.has(item.toLowerCase());
          runs.push(
            new TextRun({
              text: item,
              size: 20,
              color: isHi ? PRIMARY : NEUTRAL_DARK,
              bold: isHi,
              underline: isHi ? { type: UnderlineType.SINGLE, color: PRIMARY } : undefined,
            }),
          );
        });
        children.push(new Paragraph({ spacing: { after: 60 }, children: runs }));
      }
    },
    experiences: () => {
      if (content.experiences.length === 0) return;
      children.push(sectionTitle(sectionTitle_(content, 'experiences', 'Expériences'), PRIMARY));
      for (const exp of content.experiences) {
        children.push(
          new Paragraph({
            spacing: { before: 160, after: 40 },
            children: [
              new TextRun({
                text: exp.client_name,
                bold: true,
                size: 22,
                color: NEUTRAL_DARK,
              }),
              new TextRun({ text: '  —  ', size: 22, color: NEUTRAL_MUTED }),
              new TextRun({
                text: exp.role,
                size: 22,
                color: PRIMARY,
                italics: true,
              }),
            ],
          }),
        );
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: `${formatMonthYear(exp.start_date)} — ${formatMonthYear(exp.end_date)}`,
                size: 16,
                color: NEUTRAL_MUTED,
              }),
            ],
          }),
        );
        if (exp.context) {
          children.push(
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({
                  text: exp.context,
                  italics: true,
                  size: 18,
                  color: NEUTRAL_MUTED,
                }),
              ],
            }),
          );
        }
        for (const task of exp.tasks) {
          children.push(
            new Paragraph({
              numbering: { reference: 'cv-bullets', level: 0 },
              spacing: { after: 40 },
              children: [new TextRun({ text: task, size: 20, color: NEUTRAL_DARK })],
            }),
          );
        }
        if (exp.environment.length > 0) {
          children.push(
            new Paragraph({
              spacing: { before: 40, after: 120 },
              children: [
                new TextRun({
                  text: 'ENVIRONNEMENT  ',
                  size: 14,
                  color: NEUTRAL_MUTED,
                  characterSpacing: 30,
                }),
                new TextRun({
                  text: exp.environment.join(' • '),
                  size: 16,
                  color: NEUTRAL_DARK,
                }),
              ],
            }),
          );
        }
      }
    },
    educations: () => {
      if (content.educations.length === 0) return;
      children.push(sectionTitle(sectionTitle_(content, 'educations', 'Formation'), PRIMARY));
      for (const ed of content.educations) {
        children.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: `${ed.year}  •  `,
                size: 18,
                color: ACCENT,
                bold: true,
              }),
              new TextRun({ text: ed.degree, bold: true, size: 20, color: NEUTRAL_DARK }),
              ...(ed.institution
                ? [new TextRun({ text: `  —  ${ed.institution}`, size: 18, color: NEUTRAL_MUTED })]
                : []),
            ],
          }),
        );
      }
    },
    certifications: () => {
      const certs = content.certifications ?? [];
      if (certs.length === 0) return;
      children.push(sectionTitle(sectionTitle_(content, 'certifications', 'Certifications'), PRIMARY));
      for (const cert of certs) {
        children.push(
          new Paragraph({
            numbering: { reference: 'cv-bullets', level: 0 },
            spacing: { after: 40 },
            children: [new TextRun({ text: certificationLine(cert), size: 20, color: NEUTRAL_DARK })],
          }),
        );
      }
    },
    languages: () => {
      if (content.languages.length === 0) return;
      children.push(sectionTitle(sectionTitle_(content, 'languages', 'Langues'), PRIMARY));
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: content.languages.map((l) => `${l.code.toUpperCase()} (${l.level})`).join('  •  '),
              size: 20,
              color: NEUTRAL_DARK,
            }),
          ],
        }),
      );
    },
  };
  for (const id of sectionOrder(content)) sections[id]();

  // Footer confidentiality
  children.push(rule(ACCENT));
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: [showConfidential ? 'DOCUMENT CONFIDENTIEL' : null, [b.brandName, b.footerTagline].filter(Boolean).join(' ')].filter(Boolean).join(' — '),
          size: 14,
          color: NEUTRAL_MUTED,
          characterSpacing: 40,
        }),
      ],
    }),
  );

  const doc = new Document({
    creator: b.brandName || 'Dossier de compétences',
    title: `CV ${content.header.displayName}`,
    styles: {
      default: {
        document: {
          run: { font: 'Calibri' },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'cv-bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '▸',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 360, hanging: 220 } },
                run: { color: PRIMARY },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
