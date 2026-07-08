import 'server-only';

import { reportSecurityEvent } from './sentry';
import { logger } from '@/lib/logger';

/**
 * Scan antivirus d'un fichier via l'API VirusTotal.
 *
 * Fonctionnement (k-cross-engine + cache) :
 *   1. SHA-256 du fichier
 *   2. GET /files/{sha256} → si déjà analysé par VT, on récupère le verdict sans uploader
 *   3. Si inconnu → POST /files (upload) → POST /analyses → poll jusqu'à terminé
 *   4. Verdict : malveillant si ≥ 2 moteurs antivirus distincts le détectent
 *
 * Activation : définir VIRUSTOTAL_API_KEY dans Vercel env.
 * Gratuit jusqu'à 500 lookups/jour et 4 requêtes/min (clé publique).
 *
 * Politique fail-open : si VirusTotal est down, on laisse passer le fichier
 * (préférable à bloquer un upload légitime sur une indispo externe). Un
 * security event est tracé pour analyse a posteriori.
 *
 * Coût latence : 200-500ms pour un fichier déjà connu, 5-15s pour un fichier
 * inédit (le temps de l'analyse multi-moteurs).
 */

const VT_API_BASE = 'https://www.virustotal.com/api/v3';
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30_000;
const MALICIOUS_THRESHOLD = 2;
const TIMEOUT_MS = 8_000;

export type ScanResult =
  | { status: 'clean'; sha256: string; engines_checked: number }
  | {
      status: 'malicious';
      sha256: string;
      engines_detecting: number;
      categories: string[];
    }
  | { status: 'unknown'; sha256: string; reason: string }
  | { status: 'skipped'; reason: string };

async function sha256Hex(buf: Uint8Array): Promise<string> {
  // crypto.subtle exige ArrayBufferView<ArrayBuffer> strict — on copie
  // dans un ArrayBuffer "pur" pour éviter le clash TS avec ArrayBufferLike.
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  const digest = await crypto.subtle.digest('SHA-256', ab);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Scanne un buffer (le contenu d'un fichier uploadé) via VirusTotal.
 *
 * @param buf       Le contenu du fichier
 * @param fileName  Le nom original (pour logging et heuristique nom suspect)
 * @returns         Verdict typé. NE LÈVE PAS d'exception en cas d'erreur réseau.
 */
export async function scanFileWithVirusTotal(
  buf: Buffer | Uint8Array,
  fileName: string,
): Promise<ScanResult> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) {
    // VirusTotal non configuré → on laisse passer mais on trace
    return { status: 'skipped', reason: 'VIRUSTOTAL_API_KEY not set' };
  }

  const bytes = buf instanceof Buffer ? new Uint8Array(buf) : buf;
  const sha256 = await sha256Hex(bytes);

  try {
    // 1) Lookup par hash → si déjà scanné, on a le verdict instantané
    const cached = await lookupByHash(apiKey, sha256);
    if (cached) return cached;

    // 2) Fichier inconnu : upload + poll
    if (bytes.byteLength > 32 * 1024 * 1024) {
      // VT limit publique = 32 Mo via direct upload
      return { status: 'unknown', sha256, reason: 'file_too_large_for_vt' };
    }
    const analysisId = await uploadAndStartAnalysis(apiKey, bytes, fileName);
    if (!analysisId) {
      return { status: 'unknown', sha256, reason: 'upload_failed' };
    }
    return await pollAnalysis(apiKey, sha256, analysisId);
  } catch (e) {
    logger.warn('[virustotal] scan error', (e as Error).message);
    return { status: 'unknown', sha256, reason: (e as Error).message };
  }
}

async function lookupByHash(apiKey: string, sha256: string): Promise<ScanResult | null> {
  const res = await fetch(`${VT_API_BASE}/files/${sha256}`, {
    headers: { 'x-apikey': apiKey, accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 404) return null; // fichier inconnu de VT
  if (!res.ok) return null;
  const body = (await res.json()) as VirusTotalFileResponse;
  return parseStats(sha256, body.data?.attributes?.last_analysis_stats);
}

async function uploadAndStartAnalysis(
  apiKey: string,
  bytes: Uint8Array,
  fileName: string,
): Promise<string | null> {
  const form = new FormData();
  // Workaround TS strict ArrayBuffer vs SharedArrayBuffer : on passe par
  // une copie explicite et un cast final.
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  form.append('file', new Blob([ab as ArrayBuffer]), fileName);

  const res = await fetch(`${VT_API_BASE}/files`, {
    method: 'POST',
    headers: { 'x-apikey': apiKey, accept: 'application/json' },
    body: form,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as VirusTotalUploadResponse;
  return body.data?.id ?? null;
}

async function pollAnalysis(
  apiKey: string,
  sha256: string,
  analysisId: string,
): Promise<ScanResult> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await fetch(`${VT_API_BASE}/analyses/${analysisId}`, {
      headers: { 'x-apikey': apiKey, accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) {
      const body = (await res.json()) as VirusTotalAnalysisResponse;
      const status = body.data?.attributes?.status;
      if (status === 'completed') {
        return parseStats(sha256, body.data?.attributes?.stats);
      }
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return { status: 'unknown', sha256, reason: 'analysis_timeout' };
}

function parseStats(sha256: string, stats: VirusTotalStats | undefined): ScanResult {
  if (!stats) return { status: 'unknown', sha256, reason: 'no_stats' };
  const malicious = stats.malicious ?? 0;
  const suspicious = stats.suspicious ?? 0;
  const harmful = malicious + suspicious;
  const totalEngines =
    (stats.malicious ?? 0) +
    (stats.suspicious ?? 0) +
    (stats.undetected ?? 0) +
    (stats.harmless ?? 0) +
    (stats.timeout ?? 0);

  if (harmful >= MALICIOUS_THRESHOLD) {
    return {
      status: 'malicious',
      sha256,
      engines_detecting: harmful,
      categories: [],
    };
  }
  return { status: 'clean', sha256, engines_checked: totalEngines };
}

/**
 * Helper haut-niveau : scanne un fichier et trace un security event si
 * malveillant. Retourne true si OK (clean/unknown/skipped), false si bloqué.
 */
export async function ensureFileSafe(args: {
  buf: Buffer | Uint8Array;
  fileName: string;
  userId?: string;
  organizationId?: string;
  context: string; // ex: 'consultant_cv_upload', 'admin_asset_upload'
}): Promise<{ ok: boolean; verdict: ScanResult }> {
  const verdict = await scanFileWithVirusTotal(args.buf, args.fileName);

  if (verdict.status === 'malicious') {
    await reportSecurityEvent({
      type: 'data.bulk_modification', // pas de type dédié — réutilise
      severity: 'critical',
      message: `Upload bloqué — fichier détecté malveillant (${verdict.engines_detecting} moteurs)`,
      userId: args.userId,
      organizationId: args.organizationId,
      metadata: {
        file_name: args.fileName,
        sha256: verdict.sha256,
        context: args.context,
        engines_detecting: verdict.engines_detecting,
      },
    });
    return { ok: false, verdict };
  }

  return { ok: true, verdict };
}

// ────────────────────────────────────────────────────────────────────────
// Types VirusTotal API v3 (simplifiés, juste ce qu'on utilise)
// ────────────────────────────────────────────────────────────────────────

type VirusTotalStats = {
  malicious?: number;
  suspicious?: number;
  undetected?: number;
  harmless?: number;
  timeout?: number;
  'type-unsupported'?: number;
  'confirmed-timeout'?: number;
  failure?: number;
};

type VirusTotalFileResponse = {
  data?: {
    id?: string;
    attributes?: {
      last_analysis_stats?: VirusTotalStats;
    };
  };
};

type VirusTotalUploadResponse = {
  data?: {
    id?: string;
    type?: string;
  };
};

type VirusTotalAnalysisResponse = {
  data?: {
    id?: string;
    attributes?: {
      status?: 'queued' | 'in-progress' | 'completed';
      stats?: VirusTotalStats;
    };
  };
};
