'use client';

// Client-only text extraction from PDF / DOCX.

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    return extractPdfText(file);
  }
  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    return extractDocxText(file);
  }
  if (file.type.startsWith('text/') || name.endsWith('.txt')) {
    return file.text();
  }
  throw new Error(
    `Format non supporté pour l'extraction : ${file.type || file.name}. Utilise PDF, DOCX ou TXT.`,
  );
}

type PdfJsLib = {
  GlobalWorkerOptions?: { workerSrc?: string };
  getDocument: (params: { data: Uint8Array }) => { promise: Promise<PdfDocument> };
  version?: string;
};

type PdfDocument = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
};

type PdfPage = {
  getTextContent: () => Promise<{ items: Array<{ str?: string; hasEOL?: boolean }> }>;
};

async function loadPdfjs(): Promise<PdfJsLib> {
  // Les builds Next parfois retournent le module en `.default`, parfois direct.
  const mod = (await import('pdfjs-dist')) as unknown as Record<string, unknown>;
  const lib = (mod.default ?? mod) as PdfJsLib;
  if (!lib || typeof lib.getDocument !== 'function') {
    throw new Error(
      'pdfjs-dist introuvable (import renvoyé vide). Vérifie que le paquet est bien installé.',
    );
  }
  return lib;
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await loadPdfjs();

  if (typeof window !== 'undefined') {
    if (!pdfjs.GlobalWorkerOptions) {
      throw new Error(
        'pdfjs.GlobalWorkerOptions introuvable — version de pdfjs-dist incompatible.',
      );
    }
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items ?? [];

    let pageText = '';
    for (const it of items) {
      pageText += it.str ?? '';
      pageText += it.hasEOL ? '\n' : ' ';
    }
    pages.push(pageText);
  }

  const full = pages.join('\n\n');
  return normalize(full);
}

async function extractDocxText(file: File): Promise<string> {
  const mod = (await import('mammoth')) as unknown as Record<string, unknown>;
  const mammoth = (mod.default ?? mod) as {
    extractRawText: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
  };
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return normalize(result.value);
}

function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[\u00A0\u2028\u2029]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
