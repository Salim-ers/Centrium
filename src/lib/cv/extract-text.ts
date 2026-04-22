'use client';

// Client-only text extraction from PDF / DOCX.

/**
 * Extraction serveur prioritaire (plus fiable que pdfjs-dist côté navigateur),
 * avec repli automatique sur l'extracteur client si le serveur est injoignable.
 *
 * Utilisé partout où on upload un CV depuis l'UI.
 */
export async function extractTextSmart(file: File): Promise<string> {
  let serverReached = false;
  try {
    const form = new FormData();
    form.append('file', file);
    form.append('name', file.name);
    const res = await fetch('/api/cv/extract', { method: 'POST', body: form });
    serverReached = true;

    if (res.ok) {
      const data = (await res.json()) as { text?: string };
      if (data.text) return data.text;
      return '';
    }

    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };

    if (res.status === 404) {
      // Route non compilée — on tente le client
      console.warn('[QC CV] /api/cv/extract 404 — fallback client');
    } else {
      // Erreur explicite côté serveur → on remonte
      throw new Error(
        body.message ?? `Serveur a rejeté l'extraction (HTTP ${res.status})`,
      );
    }
  } catch (e) {
    if (serverReached) throw e;
    console.warn('[QC CV] Serveur injoignable — fallback client', e);
  }
  return extractTextFromFile(file);
}

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
