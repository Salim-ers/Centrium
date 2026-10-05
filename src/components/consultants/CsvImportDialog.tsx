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
  applyMapping,
  detectMapping,
  MAPPED_FIELDS,
  type ColumnMapping,
  type CsvRow,
  type ImportRowDraft,
  type MappedField,
} from '@/lib/consultants/csv-import';
import { showBrandToast } from '@/components/ui/BrandToast';

const FIELD_LABEL: Record<MappedField, { fr: string; en: string }> = {
  first_name: { fr: 'Prénom', en: 'First name' },
  last_name: { fr: 'Nom', en: 'Last name' },
  email: { fr: 'Email', en: 'Email' },
  job_title: { fr: 'Poste', en: 'Job title' },
  seniority: { fr: 'Séniorité', en: 'Seniority' },
  years_experience: { fr: 'Années d’expérience', en: 'Years of experience' },
  skills: { fr: 'Compétences', en: 'Skills' },
  daily_rate_eur: { fr: 'TJM', en: 'Day rate' },
  status: { fr: 'Disponibilité', en: 'Availability' },
  city: { fr: 'Ville', en: 'City' },
};
const REQUIRED = new Set<MappedField>(['first_name', 'last_name', 'job_title', 'seniority']);
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
  const [rawRows, setRawRows] = useState<CsvRow[]>([]);
  const [columns, setColumns] = useState<Array<{ key: string; label: string }>>([]);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [planLimit, setPlanLimit] = useState<PlanLimitPayload | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function reset() {
    setDrafts([]);
    setRawRows([]);
    setColumns([]);
    setMapping(null);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error(isEn ? 'File too large (5 MB max).' : 'Fichier trop gros (5 Mo max).');
      return;
    }
    const text = await file.text();
    const { headers, labels, rows } = parseCsv(text);
    if (rows.length === 0) {
      toast.error(isEn ? 'Empty or unreadable CSV.' : 'CSV vide ou illisible.');
      return;
    }
    if (rows.length > 500) {
      toast.error(isEn ? 'Maximum 500 rows per import.' : 'Maximum 500 lignes par import.');
      return;
    }
    // Correspondance proposée d'après les en-têtes, ajustable avant l'import.
    const detected = detectMapping(headers);
    setRawRows(rows);
    setColumns(headers.map((h, i) => ({ key: h, label: labels[i] || h })));
    setMapping(detected);
    setDrafts(csvRowsToConsultants(applyMapping(rows, detected)));
    setFileName(file.name);
  }

  function remap(field: MappedField, column: string) {
    if (!mapping) return;
    const next = { ...mapping, [field]: column || null };
    setMapping(next);
    setDrafts(csvRowsToConsultants(applyMapping(rawRows, next)));
  }

  async function handleImport() {
    const validDrafts = drafts.filter((d) => d.parsed !== null);
    const valid = validDrafts.map((d) => d.parsed!);
    if (valid.length === 0) {
      toast.error(isEn ? 'No valid row to import.' : 'Aucune ligne valide à importer.');
      return;
    }
    setImporting(true);
    try {
      const res = await fetch('/api/consultants/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: valid, is_prospect: isProspect, skills: validDrafts.map((d) => d.skills) }),
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
      const skillsAdded = Number(body.skills_added ?? 0);
      showBrandToast(
        errCount > 0 ? 'warning' : 'success',
        isEn ? `${inserted} ${noun}${inserted > 1 ? 's' : ''} imported` : `${inserted} ${noun}${inserted > 1 ? 's' : ''} importé${inserted > 1 ? 's' : ''}`,
        {
          description:
            [
              skillsAdded > 0 ? (isEn ? `${skillsAdded} skills added` : `${skillsAdded} compétences ajoutées`) : null,
              errCount > 0 ? (isEn ? `${errCount} failed server-side` : `${errCount} en erreur côté serveur`) : null,
            ]
              .filter(Boolean)
              .join(' · ') || undefined,
        },
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
            {isEn
              ? 'One row per profile, with a header row. Columns are recognised automatically (first name, last name, job title, seniority, skills, day rate, availability…); adjust the mapping before importing. Seniority: junior, confirmed, senior or expert. Comma, semicolon or tab separator.'
              : 'Une ligne par profil, avec une ligne d’en-têtes. Les colonnes sont reconnues automatiquement (prénom, nom, poste, séniorité, compétences, TJM, disponibilité…) ; ajustez la correspondance avant d’importer. Séniorité : junior, confirmé, senior ou expert. Séparateur virgule, point-virgule ou tabulation.'}
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
                <span className="text-muted-foreground truncate">{fileName}</span>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {validCount} {isEn ? 'valid' : 'valides'}
                  </span>
                  {errorCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-destructive">
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

              {mapping && (
                <section className="rounded-lg border border-hairline p-3" aria-label={isEn ? 'Column mapping' : 'Correspondance des colonnes'}>
                  <div className="mb-2 text-xs font-semibold">{isEn ? 'Column mapping' : 'Correspondance des colonnes'}</div>
                  <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                    {MAPPED_FIELDS.map((field) => (
                      <label key={field} className="flex items-center justify-between gap-2 text-xs">
                        <span className={mapping[field] || !REQUIRED.has(field) ? 'text-muted-foreground' : 'font-medium text-destructive'}>
                          {FIELD_LABEL[field][isEn ? 'en' : 'fr']}
                          {REQUIRED.has(field) && ' *'}
                        </span>
                        <select
                          value={mapping[field] ?? ''}
                          onChange={(e) => remap(field, e.target.value)}
                          className="h-8 w-44 rounded-md border border-border bg-card px-2 text-xs"
                        >
                          <option value="">{isEn ? '— Ignore —' : '— Ignorer —'}</option>
                          {columns.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              <div className="rounded-lg border border-hairline overflow-hidden">
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-card sticky top-0">
                      <tr className="text-left text-muted-foreground">
                        <th className="px-3 py-2 font-semibold">#</th>
                        <th className="px-3 py-2 font-semibold">{isEn ? 'Name' : 'Nom'}</th>
                        <th className="px-3 py-2 font-semibold">{isEn ? 'Title' : 'Intitulé'}</th>
                        <th className="px-3 py-2 font-semibold">{isEn ? 'Lvl' : 'Niv.'}</th>
                        <th className="px-3 py-2 font-semibold">{isEn ? 'Day rate' : 'TJM'}</th>
                        <th className="px-3 py-2 font-semibold">{isEn ? 'Status' : 'Statut'}</th>
                        <th className="px-3 py-2 font-semibold">{isEn ? 'Skills' : 'Compétences'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drafts.map((d) => (
                        <tr
                          key={d.index}
                          className={
                            d.parsed
                              ? 'border-t border-hairline'
                              : 'border-t border-destructive/20 bg-destructive/[0.04]'
                          }
                        >
                          <td className="px-3 py-2 text-muted-foreground">{d.index + 1}</td>
                          {d.parsed ? (
                            <>
                              <td className="px-3 py-2">
                                {d.parsed.first_name} {d.parsed.last_name}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {d.parsed.job_title}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {d.parsed.seniority}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {d.parsed.daily_rate_eur ?? '—'}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {d.parsed.status}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {d.skills.length === 0
                                  ? '—'
                                  : d.skills
                                      .slice(0, 3)
                                      .map((sk) => sk.name)
                                      .join(', ') + (d.skills.length > 3 ? ` +${d.skills.length - 3}` : '')}
                              </td>
                            </>
                          ) : (
                            <td colSpan={6} className="px-3 py-2 text-destructive">
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
