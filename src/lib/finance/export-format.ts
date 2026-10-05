// =========================================================================
// Format d'export des préfactures : séparateur de colonnes, séparateur
// décimal et format de date, selon ce qu'attend l'outil comptable. Le
// format par défaut reproduit l'export historique (« ; », point, ISO).
// =========================================================================

import { z } from 'zod';

export const exportFormatSchema = z.object({
  separator: z.enum([';', ',', 'tab']).default(';'),
  decimal: z.enum(['.', ',']).default('.'),
  date: z.enum(['iso', 'fr']).default('iso'),
});

export type ExportFormat = z.infer<typeof exportFormatSchema>;

export const DEFAULT_EXPORT_FORMAT: ExportFormat = { separator: ';', decimal: '.', date: 'iso' };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function cell(v: unknown, f: ExportFormat, sep: string): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    const n = f.decimal === ',' ? String(v).replace('.', ',') : String(v);
    return n.includes(sep) ? `"${n}"` : n;
  }
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (f.date === 'fr' && ISO_DATE.test(s)) s = `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
  // Comme l'export historique : guillemets dès qu'un séparateur courant apparaît.
  return /[";,\n\r\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV délimité selon le format choisi ; les valeurs ambiguës sont entre guillemets. */
export function toDelimited(rows: Array<Record<string, unknown>>, format: Partial<ExportFormat> = {}): string {
  const f = { ...DEFAULT_EXPORT_FORMAT, ...format };
  if (rows.length === 0) return '';
  const sep = f.separator === 'tab' ? '\t' : f.separator;
  const cols = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );
  const header = cols.join(sep);
  const body = rows.map((r) => cols.map((c) => cell(r[c], f, sep)).join(sep)).join('\n');
  return `${header}\n${body}`;
}
