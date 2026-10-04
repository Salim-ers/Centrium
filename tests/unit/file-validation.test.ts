import { describe, expect, it } from 'vitest';
import { checkUpload, detectFileType, safeFileName, MAX_DOCUMENT_BYTES } from '@/lib/security/file-validation';

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0x20)]);
const PDF = bytes(0x25, 0x50, 0x44, 0x46, 0x2d);
const ZIP = bytes(0x50, 0x4b, 0x03, 0x04);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47);
const EXE = bytes(0x4d, 0x5a, 0x90, 0x00);

describe('validation des fichiers téléversés', () => {
  it('détecte le type réel par signature', () => {
    expect(detectFileType(PDF, 'devis.pdf')).toBe('pdf');
    expect(detectFileType(ZIP, 'contrat.docx')).toBe('docx');
    expect(detectFileType(ZIP, 'suivi.xlsx')).toBe('xlsx');
    expect(detectFileType(PNG, 'logo.png')).toBe('png');
  });

  it('refuse un exécutable renommé ou une archive arbitraire', () => {
    expect(checkUpload(EXE, 'facture.pdf', 100)).toEqual({ ok: false, reason: expect.stringContaining('Format') });
    expect(checkUpload(ZIP, 'payload.zip', 100).ok).toBe(false);
    expect(checkUpload(PDF, 'devis.docx', 100)).toEqual({ ok: false, reason: expect.stringContaining('extension') });
  });

  it('refuse un binaire déguisé en texte', () => {
    const fake = new Uint8Array([0x41, 0x00, 0x42]);
    expect(checkUpload(fake, 'notes.txt', 3).ok).toBe(false);
  });

  it('borne la taille', () => {
    expect(checkUpload(PDF, 'a.pdf', 0).ok).toBe(false);
    expect(checkUpload(PDF, 'a.pdf', MAX_DOCUMENT_BYTES + 1).ok).toBe(false);
    expect(checkUpload(PDF, 'a.pdf', 1024)).toMatchObject({ ok: true, mime: 'application/pdf' });
  });

  it('assainit les noms de fichiers', () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd');
    expect(safeFileName('Proposition commerciale — Été 2026.pdf')).toBe('Proposition-commerciale-Ete-2026.pdf');
    expect(safeFileName('...')).toBe('document');
  });
});
