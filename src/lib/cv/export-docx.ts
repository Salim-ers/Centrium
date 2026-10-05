import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
  UnderlineType,
} from 'docx';
import type { CVContent } from '@/types';
import { formatMonthYear } from '@/lib/utils';
import type { CVBrand } from './branding';
import { resolveBrand } from './branding';

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

function labelValue(label: string, value: string) {
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({
        text: label.toUpperCase() + ' ',
        size: 14,
        color: NEUTRAL_MUTED,
        characterSpacing: 30,
      }),
      new TextRun({ text: value, size: 20, color: NEUTRAL_DARK, bold: true }),
    ],
  });
}

export async function generateCVDocx(
  content: CVContent,
  options: { brand?: CVBrand } = {},
): Promise<Blob> {
  const b = options.brand ?? resolveBrand(null);
  const QC_VIOLET = hex(b.primary);
  const QC_PINK = hex(b.accent);
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
  children.push(rule(QC_PINK));

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
          color: QC_VIOLET,
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

  if (content.languages.length > 0) {
    children.push(
      new Paragraph({
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: 'LANGUES  ',
            size: 14,
            color: NEUTRAL_MUTED,
            characterSpacing: 30,
          }),
          new TextRun({
            text: content.languages.map((l) => `${l.code.toUpperCase()} (${l.level})`).join('  •  '),
            size: 18,
            color: NEUTRAL_DARK,
          }),
        ],
      }),
    );
  }

  // Summary
  if (content.summary) {
    children.push(sectionTitle('Résumé exécutif', QC_VIOLET));
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: content.summary, size: 20, color: NEUTRAL_DARK })],
      }),
    );
  }

  // Skills
  if (content.skillCategories.length > 0) {
    children.push(sectionTitle('Compétences techniques', QC_VIOLET));
    for (const cat of content.skillCategories) {
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
      cat.items.forEach((item, i) => {
        if (i > 0) runs.push(new TextRun({ text: '  •  ', size: 18, color: NEUTRAL_MUTED }));
        const isHi = highlighted.has(item.toLowerCase());
        runs.push(
          new TextRun({
            text: item,
            size: 20,
            color: isHi ? QC_VIOLET : NEUTRAL_DARK,
            bold: isHi,
            underline: isHi ? { type: UnderlineType.SINGLE, color: QC_VIOLET } : undefined,
          }),
        );
      });
      children.push(new Paragraph({ spacing: { after: 60 }, children: runs }));
    }
  }

  // Experiences
  if (content.experiences.length > 0) {
    children.push(sectionTitle('Expériences professionnelles', QC_VIOLET));
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
              color: QC_VIOLET,
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
  }

  // Education
  if (content.educations.length > 0) {
    children.push(sectionTitle('Formation', QC_VIOLET));
    for (const ed of content.educations) {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `${ed.year}  •  `,
              size: 18,
              color: QC_PINK,
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
  }

  // Footer confidentiality
  children.push(rule(QC_PINK));
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: ['DOCUMENT CONFIDENTIEL', [b.brandName, b.footerTagline].filter(Boolean).join(' ')].filter(Boolean).join(' — '),
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
                run: { color: QC_VIOLET },
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
