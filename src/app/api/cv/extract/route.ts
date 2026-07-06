import { NextRequest, NextResponse } from 'next/server';

import { guardLlmRoute } from '@/lib/auth/llm-guard';
import { ensureFileSafe } from '@/lib/security/virustotal';

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
  // Auth + rôle + rate-limit + gating abonnement — la route consomme
  // VirusTotal et du parsing fichier : jamais accessible sans session.
  const guard = await guardLlmRoute({ bucket: 'cv-extract' });
  if ('response' in guard) return guard.response;

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

  // Garde-fou serveur (défense en profondeur) : 10 Mo max.
  // Même si le client valide aussi cette limite, on rejette toujours
  // côté serveur pour bloquer les upload directs via curl/postman.
  const MAX_BYTES = 10 * 1024 * 1024;
  if (file.size === 0) {
    return NextResponse.json(
      { error: 'invalid_file', message: 'Fichier vide.' },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    const sizeMb = (file.size / 1024 / 1024).toFixed(1);
    return NextResponse.json(
      {
        error: 'file_too_large',
        message: `Fichier de ${sizeMb} Mo — limite à 10 Mo. Compresse ou exporte en PDF plus léger.`,
      },
      { status: 413 },
    );
  }

  const name = (form.get('name') as string | null)?.toLowerCase() ?? '';
  const mime = file.type || '';
  const buf = Buffer.from(await file.arrayBuffer());

  // Scan antivirus VirusTotal (silencieux si VIRUSTOTAL_API_KEY absente)
  // Bloque l'extraction si ≥ 2 moteurs détectent une menace.
  const scan = await ensureFileSafe({
    buf,
    fileName: name || 'unnamed',
    context: 'cv_upload_extract',
  });
  if (!scan.ok) {
    return NextResponse.json(
      {
        error: 'malicious_file',
        message:
          'Ce fichier a été détecté comme malveillant et a été bloqué. Vérifie sa source ou contacte le support si tu penses que c\'est une erreur.',
      },
      { status: 422 },
    );
  }

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
            'Aucun texte lisible extrait, même via l\'OCR Claude. Le fichier est peut-être chiffré, vide, ou contient uniquement des graphismes. Réessaie avec un PDF texte ou un DOCX.',
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
  // 1) Tentative native via unpdf (gratuit, rapide, marche pour les PDFs
  //    "texte" générés par Word/InDesign/Pages/etc.)
  let nativeText = '';
  try {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    nativeText = Array.isArray(text) ? text.join('\n\n') : text;
  } catch (e) {
    console.warn('[cv/extract] unpdf failed', e);
  }

  // 2) Si le texte natif est insuffisant (PDF scanné/image, layout exotique,
  //    fonts custom non-mappées), on fallback sur Claude vision qui sait
  //    lire les PDFs directement (vision native depuis 3.5 Sonnet).
  if (nativeText.trim().length >= 30) {
    return nativeText;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[cv/extract] PDF text vide et ANTHROPIC_API_KEY absente — pas de fallback OCR');
    return nativeText;
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      // OCR de secours (PDF scanné / image) : Haiku 4.5 est vision-capable et
      // nettement plus rapide que Sonnet pour de la transcription texte.
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: buf.toString('base64'),
              },
            },
            {
              type: 'text',
              text:
                'Extrais le texte brut intégral de ce CV, en respectant l\'ordre de lecture des pages. ' +
                'Garde les sauts de ligne entre sections (expériences, formations, compétences). ' +
                'Renvoie UNIQUEMENT le texte, aucun commentaire, aucun markdown, aucune mise en forme.',
            },
          ],
        },
      ],
    });
    const ocrText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('\n')
      .trim();
    return ocrText.length > nativeText.length ? ocrText : nativeText;
  } catch (e) {
    console.warn('[cv/extract] Claude PDF fallback failed', e);
    return nativeText;
  }
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
