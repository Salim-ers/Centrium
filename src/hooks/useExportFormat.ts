'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_EXPORT_FORMAT, exportFormatSchema, type ExportFormat } from '@/lib/finance/export-format';

const KEY = 'centrium-export-format';

/** Format d'export préféré, mémorisé dans ce navigateur (confort, pas une donnée métier). */
export function useExportFormat() {
  const [format, setFormat] = useState<ExportFormat>(DEFAULT_EXPORT_FORMAT);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = exportFormatSchema.safeParse(JSON.parse(raw));
      if (parsed.success) setFormat(parsed.data);
    } catch {
      // stockage indisponible : format par défaut
    }
  }, []);
  const update = useCallback((patch: Partial<ExportFormat>) => {
    setFormat((f) => {
      const next = { ...f, ...patch };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // stockage indisponible : le choix vaut pour la session
      }
      return next;
    });
  }, []);
  return { format, update };
}

/** Télécharge l'export CSV des préfactures validées ; renvoie un message d'erreur sinon. */
export async function downloadPrefactures(ids: string[], format: ExportFormat, fr: boolean): Promise<string | null> {
  const res = await fetch('/api/finance/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, format }),
  }).catch(() => null);
  if (!res) return fr ? 'Connexion impossible' : 'Network error';
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { message?: string };
    return json.message ?? (fr ? 'Export impossible' : 'Export failed');
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = `prefactures-${new Date().toISOString().slice(0, 10)}.${format.separator === 'tab' ? 'tsv' : 'csv'}`;
  a.click();
  URL.revokeObjectURL(href);
  return null;
}
