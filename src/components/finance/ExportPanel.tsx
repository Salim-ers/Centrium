'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BookOpenCheck, Download, FileSpreadsheet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/label';
import { showBrandToast } from '@/components/ui/BrandToast';
import { IntegrationsPanel } from '@/components/finance/IntegrationsPanel';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { downloadPrefactures, useExportFormat } from '@/hooks/useExportFormat';
import { useOrganization } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { toDelimited, type ExportFormat } from '@/lib/finance/export-format';
import { loadPrefacturation, prefacturationKey, stageOf, type PrefacturationData } from '@/lib/finance/prefactures';
import { formatEur } from '@/lib/format';

const SAMPLE = [{ numero: 'PF-2026-0042', tiers: 'Client', montant_ht: 12600.5, date: '2026-10-02' }];

/**
 * Export : le format attendu par votre outil comptable (séparateur,
 * décimales, dates), l'export des préfactures prêtes, les journaux de
 * ventes et d'achats, et le webhook. Aucun connecteur simulé.
 */
export function ExportPanel({ lang, canEdit, canManage }: { lang: 'fr' | 'en'; canEdit: boolean; canManage: boolean }) {
  const fr = lang === 'fr';
  const { activeOrgId } = useOrganization();
  const { format, update } = useExportFormat();
  const [busy, setBusy] = useState(false);
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);

  const { data, reload } = useCachedQuery<PrefacturationData>(prefacturationKey(activeOrgId), () => loadPrefacturation(createClient(), activeOrgId!), {
    enabled: !!activeOrgId,
  });
  const ready = useMemo(() => (data?.invoices ?? []).filter((i) => stageOf(i) === 'ready'), [data]);
  const readyAmount = ready.reduce((s, i) => s + Number(i.amount_ht), 0);
  const preview = toDelimited(SAMPLE, format);

  async function exportReady() {
    setBusy(true);
    const error = await downloadPrefactures(
      ready.map((i) => i.id),
      format,
      fr,
    );
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    showBrandToast('success', fr ? `${ready.length} préfacture${ready.length > 1 ? 's' : ''} exportée${ready.length > 1 ? 's' : ''}` : `${ready.length} pre-invoice${ready.length > 1 ? 's' : ''} exported`);
    void reload();
  }

  return (
    <div className="no-scrollbar grid min-h-0 flex-1 content-start gap-4 overflow-y-auto lg:grid-cols-2">
      <section className="tile-surface p-5">
        <h2 className="mb-1 flex items-center gap-2 font-display text-[15px] font-semibold">
          <FileSpreadsheet className="h-4 w-4 text-app-terra" />
          {fr ? 'Exporter les préfactures prêtes' : 'Export ready pre-invoices'}
        </h2>
        <p className="mb-4 text-[13px] text-muted-foreground">
          {fr ? 'Fichier à importer dans votre outil comptable, qui émettra les factures.' : 'File to import into your accounting tool, which will issue the invoices.'}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={fr ? 'Séparateur' : 'Separator'} htmlFor="exp-sep">
            <Select id="exp-sep" value={format.separator} onChange={(e) => update({ separator: e.target.value as ExportFormat['separator'] })}>
              <option value=";">{fr ? 'Point-virgule ( ; )' : 'Semicolon ( ; )'}</option>
              <option value=",">{fr ? 'Virgule ( , )' : 'Comma ( , )'}</option>
              <option value="tab">{fr ? 'Tabulation' : 'Tab'}</option>
            </Select>
          </Field>
          <Field label={fr ? 'Décimales' : 'Decimals'} htmlFor="exp-dec">
            <Select id="exp-dec" value={format.decimal} onChange={(e) => update({ decimal: e.target.value as ExportFormat['decimal'] })}>
              <option value=".">1234.50</option>
              <option value=",">1234,50</option>
            </Select>
          </Field>
          <Field label={fr ? 'Dates' : 'Dates'} htmlFor="exp-date">
            <Select id="exp-date" value={format.date} onChange={(e) => update({ date: e.target.value as ExportFormat['date'] })}>
              <option value="iso">2026-10-02</option>
              <option value="fr">02/10/2026</option>
            </Select>
          </Field>
        </div>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-app-sand/50 px-3 py-2 text-[11.5px] leading-relaxed text-app-terra-deep">{preview.replace(/\t/g, '⇥')}</pre>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="num text-[13px] text-muted-foreground">
            {fr ? `${ready.length} prête${ready.length > 1 ? 's' : ''} · ${formatEur(readyAmount, lang)} HT` : `${ready.length} ready · ${formatEur(readyAmount, lang)} excl. VAT`}
          </span>
          {canEdit && (
            <Button onClick={() => void exportReady()} loading={busy} disabled={ready.length === 0}>
              <Download />
              {fr ? 'Exporter' : 'Export'}
            </Button>
          )}
        </div>
      </section>

      <section className="tile-surface p-5">
        <h2 className="mb-1 flex items-center gap-2 font-display text-[15px] font-semibold">
          <BookOpenCheck className="h-4 w-4 text-app-terra" />
          {fr ? 'Journaux de ventes et d’achats' : 'Sales and purchase journals'}
        </h2>
        <p className="mb-4 text-[13px] text-muted-foreground">
          {fr
            ? 'CSV des préfactures de l’année, à transmettre à votre comptable. Ce n’est pas un fichier des écritures comptables (FEC).'
            : 'CSV of the year’s pre-invoices, for your accountant. This is not a certified accounting entries file (FEC).'}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Field label={fr ? 'Année' : 'Year'} htmlFor="exp-year" className="w-28">
            <Select id="exp-year" value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>
              {[thisYear, thisYear - 1, thisYear - 2].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </Field>
          <Button asChild variant="secondary">
            <a href={`/api/accounting/export?year=${year}&party=client`}>
              <Download />
              {fr ? 'Ventes' : 'Sales'}
            </a>
          </Button>
          <Button asChild variant="secondary">
            <a href={`/api/accounting/export?year=${year}&party=consultant`}>
              <Download />
              {fr ? 'Achats (sous-traitance)' : 'Purchases (subcontracting)'}
            </a>
          </Button>
        </div>
      </section>

      <div className="lg:col-span-2">
        <IntegrationsPanel lang={lang} canManage={canManage} />
      </div>
    </div>
  );
}
