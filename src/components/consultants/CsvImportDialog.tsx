'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, FileUp, AlertCircle, CheckCircle2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  parseCsv,
  csvRowsToConsultants,
  type ImportRowDraft,
} from '@/lib/consultants/csv-import';
import { PlanLimitDialog, type PlanLimitPayload } from '@/components/billing/PlanLimitDialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** true → les lignes seront créées comme prospects (vivier). */
  isProspect?: boolean;
  onImported?: (count: number) => void;
};

export function CsvImportDialog({
  open,
  onOpenChange,
  isProspect = false,
  onImported,
}: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [drafts, setDrafts] = useState<ImportRowDraft[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [planLimit, setPlanLimit] = useState<PlanLimitPayload | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function reset() {
    setDrafts([]);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error(isEn ? 'File too large (5 MB max).' : 'Fichier trop gros (5 Mo max).');
      return;
    }
    const text = await file.text();
    const { rows } = parseCsv(text);
    if (rows.length === 0) {
      toast.error(isEn ? 'Empty or unreadable CSV.' : 'CSV vide ou illisible.');
      return;
    }
    if (rows.length > 500) {
      toast.error(isEn ? 'Maximum 500 rows per import.' : 'Maximum 500 lignes par import.');
      return;
    }
    const parsed = csvRowsToConsultants(rows);
    setDrafts(parsed);
    setFileName(file.name);
  }

  async function handleImport() {
    const valid = drafts.filter((d) => d.parsed !== null).map((d) => d.parsed!);
    if (valid.length === 0) {
      toast.error(isEn ? 'No valid row to import.' : 'Aucune ligne valide à importer.');
      return;
    }
    setImporting(true);
    try {
      const res = await fetch('/api/consultants/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: valid, is_prospect: isProspect }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 402 && body?.error === 'plan_limit_reached') {
        setPlanLimit(body as PlanLimitPayload);
        return;
      }
      if (!res.ok) {
        toast.error(body.message ?? (isEn ? `Import failed (${res.status})` : `Import échoué (${res.status})`));
        return;
      }
      const inserted = body.inserted as number;
      const errCount = (body.errors as unknown[])?.length ?? 0;
      const noun = isProspect ? (isEn ? 'prospect' : 'prospect') : (isEn ? 'consultant' : 'consultant');
      toast.success(
        isEn
          ? `${inserted} ${noun}${inserted > 1 ? 's' : ''} imported` +
              (errCount > 0 ? ` (${errCount} failed server-side)` : '')
          : `${inserted} ${noun}${inserted > 1 ? 's' : ''} importé${inserted > 1 ? 's' : ''}` +
              (errCount > 0 ? ` (${errCount} en erreur côté serveur)` : ''),
      );
      onImported?.(inserted);
      onOpenChange(false);
      reset();
    } catch (e) {
      toast.error(
        (isEn ? 'Network error: ' : 'Erreur réseau : ') +
          (e instanceof Error ? e.message : isEn ? 'unknown' : 'inconnue'),
      );
    } finally {
      setImporting(false);
    }
  }

  const validCount = drafts.filter((d) => d.parsed !== null).length;
  const errorCount = drafts.length - validCount;
  const noun = isProspect ? (isEn ? 'prospects' : 'prospects') : (isEn ? 'consultants' : 'consultants');
  const nounSingular = isProspect ? 'prospect' : 'consultant';

  return (
    <>
    <PlanLimitDialog
      payload={planLimit}
      onOpenChange={(o) => {
        if (!o) setPlanLimit(null);
      }}
    />
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEn ? `Import a ${noun} CSV` : `Importer un CSV de ${noun}`}
          </DialogTitle>
          <DialogDescription>
            {isEn ? (
              <>
                Expected format: 1 row per profile with headers. Minimum columns:
                <code className="mx-1 text-violet-300">first_name</code>,
                <code className="mx-1 text-violet-300">last_name</code>,
                <code className="mx-1 text-violet-300">job_title</code>,
                <code className="mx-1 text-violet-300">seniority</code> (junior/confirmed/senior/expert),
                <code className="mx-1 text-violet-300">years_experience</code>. Optional:
                email, phone, linkedin_url, sub_title, city, country, daily_rate_eur, status, summary.
                Comma, semicolon or tab separator.
              </>
            ) : (
              <>
                Format attendu : 1 ligne par profil avec en-têtes. Colonnes minimum :
                <code className="mx-1 text-violet-300">first_name</code>,
                <code className="mx-1 text-violet-300">last_name</code>,
                <code className="mx-1 text-violet-300">job_title</code>,
                <code className="mx-1 text-violet-300">seniority</code> (junior/confirmed/senior/expert),
                <code className="mx-1 text-violet-300">years_experience</code>. Optionnel :
                email, phone, linkedin_url, sub_title, city, country, daily_rate_eur, status, summary.
                Séparateur virgule, point-virgule ou tab.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {drafts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-hairline p-8 text-center">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
              >
                <FileUp className="h-4 w-4" />
                {isEn ? 'Choose a CSV' : 'Choisir un CSV'}
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                {isEn ? 'Up to 500 rows, 5 MB maximum.' : 'Jusqu\'à 500 lignes, 5 Mo maximum.'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/70 truncate">{fileName}</span>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {validCount} {isEn ? 'valid' : 'valides'}
                  </span>
                  {errorCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-red-300">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errorCount} {isEn ? 'in error' : 'en erreur'}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={reset}
                  >
                    {isEn ? 'Start over' : 'Recommencer'}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-hairline overflow-hidden">
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-white/[0.02] sticky top-0">
                      <tr className="text-left text-white/60">
                        <th className="px-3 py-2 font-semibold">#</th>
                        <th className="px-3 py-2 font-semibold">{isEn ? 'Name' : 'Nom'}</th>
                        <th className="px-3 py-2 font-semibold">{isEn ? 'Title' : 'Intitulé'}</th>
                        <th className="px-3 py-2 font-semibold">{isEn ? 'Lvl' : 'Niv.'}</th>
                        <th className="px-3 py-2 font-semibold">{isEn ? 'Day rate' : 'TJM'}</th>
                        <th className="px-3 py-2 font-semibold">{isEn ? 'Status' : 'Statut'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drafts.map((d) => (
                        <tr
                          key={d.index}
                          className={
                            d.parsed
                              ? 'border-t border-hairline'
                              : 'border-t border-red-500/20 bg-red-500/[0.04]'
                          }
                        >
                          <td className="px-3 py-2 text-white/40">{d.index + 1}</td>
                          {d.parsed ? (
                            <>
                              <td className="px-3 py-2">
                                {d.parsed.first_name} {d.parsed.last_name}
                              </td>
                              <td className="px-3 py-2 text-white/70">
                                {d.parsed.job_title}
                              </td>
                              <td className="px-3 py-2 text-white/70">
                                {d.parsed.seniority}
                              </td>
                              <td className="px-3 py-2 text-white/70">
                                {d.parsed.daily_rate_eur ?? '—'}
                              </td>
                              <td className="px-3 py-2 text-white/70">
                                {d.parsed.status}
                              </td>
                            </>
                          ) : (
                            <td colSpan={5} className="px-3 py-2 text-red-300">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <div>
                                  <div className="font-semibold">
                                    {(d.raw.first_name ||
                                      d.raw.prenom ||
                                      '').trim()}{' '}
                                    {(d.raw.last_name || d.raw.nom || '').trim() ||
                                      (isEn ? '(unknown row)' : '(ligne inconnue)')}
                                  </div>
                                  <div className="text-[11px] mt-0.5">
                                    {d.errors.join(' · ')}
                                  </div>
                                </div>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importing}
          >
            {isEn ? 'Cancel' : 'Annuler'}
          </Button>
          <Button
            type="button"
            disabled={importing || validCount === 0}
            onClick={handleImport}
          >
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEn ? 'Import' : 'Importer'} {validCount > 0 ? `${validCount} ` : ''}
            {nounSingular}
            {validCount > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
