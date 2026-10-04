'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, FileUp } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { parseCsv } from '@/lib/consultants/csv-import';
import { draftClientRows, type ClientImportDraft } from '@/lib/clients/csv-import';
import { useLocale } from '@/lib/i18n/LocaleProvider';

/** Import de clients depuis un fichier CSV (nom obligatoire, autres colonnes facultatives). */
export function ClientCsvImportDialog({ open, onOpenChange, onImported }: { open: boolean; onOpenChange: (o: boolean) => void; onImported?: (created: number) => void }) {
  const { locale } = useLocale();
  const fr = locale !== 'en';
  const [drafts, setDrafts] = useState<ClientImportDraft[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setDrafts([]);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(fr ? 'Fichier trop volumineux (5 Mo maximum).' : 'File too large (5 MB max).');
      return;
    }
    const { headers, rows } = parseCsv(await file.text());
    const d = draftClientRows(headers, rows);
    if (!d.length) {
      toast.error(fr ? 'Aucune ligne exploitable : vérifiez la colonne « nom » ou « société ».' : 'No usable row: check the “name” or “company” column.');
      return;
    }
    setFileName(file.name);
    setDrafts(d.slice(0, 1000));
  }

  const valid = drafts.filter((d) => d.value);
  const invalid = drafts.filter((d) => d.error);

  async function submit() {
    setBusy(true);
    const res = await fetch('/api/clients/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: valid.map((d) => d.value) }),
    });
    setBusy(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.message ?? (fr ? 'Import impossible' : 'Import failed'));
      return;
    }
    const { created, duplicates } = json.data as { created: number; duplicates: number };
    toast.success(
      fr
        ? `${created} client${created > 1 ? 's' : ''} importé${created > 1 ? 's' : ''}${duplicates ? ` · ${duplicates} déjà présent${duplicates > 1 ? 's' : ''}` : ''}`
        : `${created} client${created > 1 ? 's' : ''} imported${duplicates ? ` · ${duplicates} already present` : ''}`,
    );
    onImported?.(created);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{fr ? 'Importer des clients' : 'Import clients'}</DialogTitle>
          <DialogDescription>
            {fr
              ? 'CSV avec une colonne « nom » (ou « société »). Colonnes reconnues : type (client, prospect, partenaire), secteur, site, ville, adresse, pays, notes.'
              : 'CSV with a “name” (or “company”) column. Recognised: type (client, prospect, partner), industry, website, city, address, country, notes.'}
          </DialogDescription>
        </DialogHeader>
        {!fileName ? (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center text-[13.5px] text-muted-foreground hover:bg-muted/40">
            <FileUp className="h-6 w-6" />
            {fr ? 'Choisir un fichier CSV' : 'Choose a CSV file'}
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
          </label>
        ) : (
          <div className="space-y-2 text-[13.5px]">
            <div className="font-medium">{fileName}</div>
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-4 w-4" />
              {fr ? `${valid.length} ligne${valid.length > 1 ? 's' : ''} prête${valid.length > 1 ? 's' : ''}` : `${valid.length} row(s) ready`}
            </div>
            {invalid.length > 0 && (
              <div className="rounded-md bg-warning-soft p-2.5 text-warning">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  {fr ? `${invalid.length} ligne${invalid.length > 1 ? 's' : ''} ignorée${invalid.length > 1 ? 's' : ''}` : `${invalid.length} row(s) skipped`}
                </div>
                <ul className="mt-1 space-y-0.5 text-[12.5px]">
                  {invalid.slice(0, 5).map((d) => (
                    <li key={d.line}>
                      {fr ? 'Ligne' : 'Line'} {d.line} : {d.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {fr ? 'Annuler' : 'Cancel'}
          </Button>
          <Button onClick={() => void submit()} loading={busy} disabled={!valid.length}>
            {fr ? 'Importer' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
