'use client';

import { useRef, useState } from 'react';
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
import {
  parseCsv,
  csvRowsToContacts,
  type ContactImportRowDraft,
} from '@/lib/contacts/csv-import';
import { notifyCreated, notifyError, notifyWarning } from '@/lib/notify';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (count: number) => void;
};

export function ContactCsvImportDialog({ open, onOpenChange, onImported }: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [drafts, setDrafts] = useState<ContactImportRowDraft[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function reset() {
    setDrafts([]);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      notifyError(isEn ? 'File too large (5 MB max).' : 'Fichier trop gros (5 Mo max).');
      return;
    }
    const text = await file.text();
    const { rows } = parseCsv(text);
    if (rows.length === 0) {
      notifyError(isEn ? 'Empty or unreadable CSV.' : 'CSV vide ou illisible.');
      return;
    }
    if (rows.length > 1000) {
      notifyError(isEn ? 'Maximum 1000 rows per import.' : 'Maximum 1000 lignes par import.');
      return;
    }
    const parsed = csvRowsToContacts(rows);
    setDrafts(parsed);
    setFileName(file.name);
  }

  async function handleImport() {
    const valid = drafts.filter((d) => d.parsed !== null).map((d) => d.parsed!);
    if (valid.length === 0) {
      notifyError(isEn ? 'No valid row to import.' : 'Aucune ligne valide à importer.');
      return;
    }
    setImporting(true);
    try {
      const res = await fetch('/api/contacts/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: valid }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        notifyError(body.message ?? (isEn ? `Import failed (${res.status})` : `Import échoué (${res.status})`));
        return;
      }
      const inserted = body.inserted as number;
      const errCount = (body.errors as unknown[])?.length ?? 0;
      if (errCount > 0) {
        notifyWarning(
          isEn
            ? `${inserted} contact${inserted > 1 ? 's' : ''} imported`
            : `${inserted} contact${inserted > 1 ? 's' : ''} importé${inserted > 1 ? 's' : ''}`,
          {
            description: isEn
              ? `${errCount} row${errCount > 1 ? 's' : ''} failed on the server — fix and retry`
              : `${errCount} ligne${errCount > 1 ? 's' : ''} en erreur côté serveur — corrige et re-tente`,
          },
        );
      } else {
        notifyCreated(
          isEn
            ? `${inserted} contact${inserted > 1 ? 's' : ''} imported into the address book`
            : `${inserted} contact${inserted > 1 ? 's' : ''} importé${inserted > 1 ? 's' : ''} dans le carnet`,
        );
      }
      onImported?.(inserted);
      onOpenChange(false);
      reset();
    } catch (e) {
      notifyError((isEn ? 'Network error: ' : 'Erreur réseau : ') + (e instanceof Error ? e.message : (isEn ? 'unknown' : 'inconnue')));
    } finally {
      setImporting(false);
    }
  }

  const validCount = drafts.filter((d) => d.parsed !== null).length;
  const errorCount = drafts.length - validCount;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEn ? 'Import a contacts CSV' : 'Importer un CSV de contacts'}</DialogTitle>
          <DialogDescription>
            {isEn ? (
              <>
                <strong>Very tolerant</strong> headers — comma, semicolon or tab,
                FR or EN, case / accents ignored.
                <br />
                <span className="text-primary">Identity (at least one)</span> :
                <code className="mx-1">first_name</code>+<code className="mx-1">last_name</code>{' '}
                as separate fields <em>OR</em> <code className="mx-1">Contact Name</code>{' '}
                (will be split on the 1st space).
                <br />
                <span className="text-primary">Optional</span> : Email / Email address,
                Phone / Phone number, LinkedIn URL, Job title / Contact role,
                City, Company / ESN / ESN name (added as source), Description / Notes /
                Comments, Progress status, Last date (added to notes),
                Type (recruteur, commercial, manager, client_final, esn_partenaire,
                acheteur, rh, consultant, autre).
              </>
            ) : (
              <>
                Headers <strong>très tolérants</strong> — virgule, point-virgule ou tab,
                FR ou EN, casse / accents ignorés.
                <br />
                <span className="text-primary">Identité (au moins l&apos;un)</span> :
                <code className="mx-1">first_name</code>+<code className="mx-1">last_name</code>{' '}
                séparés <em>OU</em> <code className="mx-1">Contact Nom/Prénom</code>{' '}
                (sera scindé sur le 1er espace).
                <br />
                <span className="text-primary">Optionnel</span> : Email / Adresse mail,
                Téléphone / Numéro de téléphone, URL LinkedIn, Poste / Poste du contact,
                Ville, Société / ESN / Nom ESN (ajouté en source), Description / Notes /
                Commentaires, Statut d&apos;avancement, Date dernière (mises en notes),
                Type (recruteur, commercial, manager, client_final, esn_partenaire,
                acheteur, rh, consultant, autre).
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
                {isEn ? 'Up to 1000 rows, 5 MB maximum.' : 'Jusqu’à 1000 lignes, 5 Mo maximum.'}
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
                  <Button type="button" variant="ghost" size="sm" onClick={reset}>
                    {isEn ? 'Start over' : 'Recommencer'}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-hairline overflow-hidden">
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-card sticky top-0">
                      <tr className="text-left text-muted-foreground">
                        <th className="px-3 py-2 font-semibold">#</th>
                        <th className="px-3 py-2 font-semibold">{isEn ? 'Name' : 'Nom'}</th>
                        <th className="px-3 py-2 font-semibold">{isEn ? 'Type' : 'Type'}</th>
                        <th className="px-3 py-2 font-semibold">{isEn ? 'Job title' : 'Poste'}</th>
                        <th className="px-3 py-2 font-semibold">Email</th>
                        <th className="px-3 py-2 font-semibold">{isEn ? 'Phone' : 'Téléphone'}</th>
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
                                {d.parsed.contact_type}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {d.parsed.job_title ?? '—'}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {d.parsed.email ?? '—'}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {d.parsed.phone ?? '—'}
                              </td>
                            </>
                          ) : (
                            <td colSpan={5} className="px-3 py-2 text-destructive">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <div>
                                  <div className="font-semibold">
                                    {(d.raw.first_name || d.raw.prenom || '').trim()}{' '}
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
            {isEn ? 'Import ' : 'Importer '}{validCount > 0 ? `${validCount} ` : ''}
            contact{validCount > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
