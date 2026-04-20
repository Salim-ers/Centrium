import { NextRequest, NextResponse } from 'next/server';

// =========================================================================
// /api/cv/extract — Extraction texte brut depuis PDF / DOCX / TXT
// -------------------------------------------------------------------------
// POST multipart/form-data : field "file" (Blob)
//   → 200 { text: string, chars: number }
//   → 400 { error: 'invalid_file' | 'unsupported_type' | 'empty_text' }
//   → 500 { error: 'extract_failed', message: string }
// =========================================================================

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch (e) {
    return NextResponse.json(
      { error: 'invalid_form', message: e instanceof Error ? e.message : 'FormData invalide' },
      { status: 400 },
    );
  }

  const file = form.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'invalid_file' }, { status: 400 });
  }

  const name = (form.get('name') as string | null)?.toLowerCase() ?? '';
  const mime = file.type || '';
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    let text = '';
    if (mime === 'application/pdf' || name.endsWith('.pdf')) {
      text = await extractPdfText(buf);
    } else if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      name.endsWith('.docx')
    ) {
      text = await extractDocxText(buf);
    } else if (mime.startsWith('text/') || name.endsWith('.txt')) {
      text = buf.toString('utf8');
    } else {
      return NextResponse.json(
        {
          error: 'unsupported_type',
          message: `Format non supporté : ${mime || name}. Utilise PDF, DOCX ou TXT.`,
        },
        { status: 400 },
      );
    }

    text = normalize(text);

    if (!text || text.length < 30) {
      return NextResponse.json(
        {
          error: 'empty_text',
          message:
            'Aucun texte lisible extrait. Si c\'est un CV scanné en image, l\'OCR n\'est pas disponible — réuploade un PDF texte ou un DOCX.',
          chars: text.length,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ text, chars: text.length });
  } catch (e) {
    console.error('[cv/extract] error', e);
    return NextResponse.json(
      {
        error: 'extract_failed',
        message: e instanceof Error ? e.message : 'Erreur inconnue',
      },
      { status: 500 },
    );
  }
}

async function extractPdfText(buf: Buffer): Promise<string> {
  // unpdf : wrapper Node/serverless autour de pdfjs-dist, sans les bugs de polyfills DOM.
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join('\n\n') : text;
}

async function extractDocxText(buf: Buffer): Promise<string> {
  const mod = (await import('mammoth')) as unknown as Record<string, unknown>;
  const mammoth = (mod.default ?? mod) as {
    extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }>;
  };
  const result = await mammoth.extractRawText({ buffer: buf });
  return result.value;
}

function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[\u00A0\u2028\u2029]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
