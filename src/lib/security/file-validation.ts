// =========================================================================
// Validation des fichiers téléversés : type réel (signature binaire), pas
// seulement l'extension ou le type MIME déclaré par le navigateur.
// =========================================================================

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export type DetectedType = 'pdf' | 'docx' | 'xlsx' | 'doc' | 'png' | 'jpeg' | 'text' | 'csv';

export const MIME_BY_TYPE: Record<DetectedType, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  doc: 'application/msword',
  png: 'image/png',
  jpeg: 'image/jpeg',
  text: 'text/plain',
  csv: 'text/csv',
};

const EXT_BY_TYPE: Record<DetectedType, string[]> = {
  pdf: ['pdf'],
  docx: ['docx'],
  xlsx: ['xlsx'],
  doc: ['doc'],
  png: ['png'],
  jpeg: ['jpg', 'jpeg'],
  text: ['txt'],
  csv: ['csv'],
};

function startsWith(bytes: Uint8Array, sig: number[]): boolean {
  return sig.every((b, i) => bytes[i] === b);
}

/** Détecte le type réel d'après les premiers octets et l'extension. */
export function detectFileType(bytes: Uint8Array, fileName: string): DetectedType | null {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return 'pdf'; // %PDF
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return 'png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return ext === 'doc' ? 'doc' : null;
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    // Conteneur ZIP : seuls les formats Office ouverts sont acceptés.
    if (ext === 'docx') return 'docx';
    if (ext === 'xlsx') return 'xlsx';
    return null;
  }
  if (ext === 'txt' || ext === 'csv') {
    const head = bytes.subarray(0, 4096);
    if (head.includes(0)) return null; // binaire déguisé
    return ext === 'csv' ? 'csv' : 'text';
  }
  return null;
}

export type FileCheck = { ok: true; type: DetectedType; mime: string; safeName: string } | { ok: false; reason: string };

/** Nom de fichier sûr pour le stockage (ASCII, sans chemin). */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'document';
  const normalized = base.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cleaned = normalized.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+/, '');
  return (cleaned || 'document').slice(0, 120);
}

export function checkUpload(bytes: Uint8Array, fileName: string, size: number): FileCheck {
  if (size <= 0) return { ok: false, reason: 'Fichier vide' };
  if (size > MAX_DOCUMENT_BYTES) return { ok: false, reason: 'Fichier trop volumineux (25 Mo maximum)' };
  const type = detectFileType(bytes, fileName);
  if (!type) return { ok: false, reason: 'Format non accepté (PDF, Word, Excel, PNG, JPEG, TXT ou CSV)' };
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  if (!EXT_BY_TYPE[type].includes(ext)) return { ok: false, reason: 'L’extension ne correspond pas au contenu du fichier' };
  return { ok: true, type, mime: MIME_BY_TYPE[type], safeName: safeFileName(fileName) };
}
