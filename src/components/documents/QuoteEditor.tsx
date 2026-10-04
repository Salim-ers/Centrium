'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/label';
import { Combobox } from '@/components/ui/Combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { QuoteDocument } from './QuoteDocument';
import { useCompaniesLite, useConsultantsLite, useContactsLite } from '@/hooks/useOrgDirectory';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { quoteSchema, type QuoteInput } from '@/lib/validators/v2';
import { formatEur } from '@/lib/format';
import type { DocumentTemplate, Quote } from '@/types';

export type QuoteDraft = QuoteInput;

export function emptyQuote(): QuoteDraft {
  const today = new Date();
  const until = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    title: '',
    issue_date: iso(today),
    valid_until: iso(until),
    vat_rate: 20,
    intro_text: '',
    terms_text: '',
    notes: '',
    items: [{ description: '', quantity: 1, unit: 'jour', unit_price: 0 }],
  };
}

export function QuoteEditor({
  initial,
  quoteId,
  onSaved,
  onCancel,
}: {
  initial: QuoteDraft;
  quoteId?: string;
  onSaved: (q: Quote) => void;
  onCancel?: () => void;
}) {
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { activeOrgId, branding } = useOrganization();
  const { options: companyOptions, byId: companies } = useCompaniesLite();
  const { optionsFor: contactOptionsFor, byId: contacts } = useContactsLite();
  const { options: consultantOptions } = useConsultantsLite();
  const [q, setQ] = useState<QuoteDraft>(initial);
  const [saving, setSaving] = useState(false);

  const { data: templates } = useCachedQuery<DocumentTemplate[]>(
    `quote-templates:${activeOrgId ?? 'none'}`,
    async () => {
      const { data, error } = await createClient().from('document_templates').select('*').eq('kind', 'quote').order('name');
      return error ? [] : ((data ?? []) as DocumentTemplate[]);
    },
    { enabled: !!activeOrgId },
  );

  const set = <K extends keyof QuoteDraft>(k: K, v: QuoteDraft[K]) => setQ((prev) => ({ ...prev, [k]: v }));
  const setItem = (i: number, patch: Partial<QuoteDraft['items'][number]>) =>
    setQ((prev) => ({ ...prev, items: prev.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
  const move = (i: number, d: -1 | 1) =>
    setQ((prev) => {
      const items = [...prev.items];
      const j = i + d;
      if (j < 0 || j >= items.length) return prev;
      [items[i], items[j]] = [items[j]!, items[i]!];
      return { ...prev, items };
    });

  const totals = useMemo(() => {
    const ht = q.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
    const vat = ht * ((Number(q.vat_rate) || 0) / 100);
    return { ht, vat, ttc: ht + vat };
  }, [q.items, q.vat_rate]);

  async function save() {
    const parsed = quoteSchema.safeParse(q);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? (fr ? 'Devis incomplet' : 'Incomplete quote'));
      return;
    }
    setSaving(true);
    const res = await fetch(quoteId ? `/api/quotes/${quoteId}` : '/api/quotes', {
      method: quoteId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
    setSaving(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.message ?? json.error ?? (fr ? 'Enregistrement impossible' : 'Could not save'));
      return;
    }
    toast.success(quoteId ? (fr ? 'Devis enregistré' : 'Quote saved') : fr ? `Devis ${json.data.number} créé` : `Quote ${json.data.number} created`);
    onSaved(json.data as Quote);
  }

  const company = q.company_id ? companies.get(q.company_id) : null;
  const contact = q.contact_id ? contacts.get(q.contact_id) : null;

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,210mm)]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>{fr ? 'En-tête' : 'Header'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label={fr ? 'Objet du devis' : 'Quote subject'} htmlFor="q-title" required>
              <Input id="q-title" value={q.title} onChange={(e) => set('title', e.target.value)} placeholder={fr ? 'ex. Renfort data engineering — T1' : 'e.g. Data engineering support — Q1'} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={fr ? 'Client' : 'Client'} htmlFor="q-client">
                <Combobox id="q-client" options={companyOptions} value={q.company_id ?? ''} onChange={(v) => setQ((p) => ({ ...p, company_id: v || null, contact_id: null }))} clearable placeholder={fr ? 'Choisir' : 'Choose'} />
              </Field>
              <Field label={fr ? 'Contact' : 'Contact'} htmlFor="q-contact">
                <Combobox id="q-contact" options={contactOptionsFor(q.company_id)} value={q.contact_id ?? ''} onChange={(v) => set('contact_id', v || null)} clearable disabled={!q.company_id} placeholder={fr ? 'Choisir' : 'Choose'} />
              </Field>
              <Field label={fr ? 'Date' : 'Date'} htmlFor="q-date">
                <DatePicker id="q-date" value={q.issue_date} onChange={(v) => set('issue_date', v ?? q.issue_date)} clearable={false} />
              </Field>
              <Field label={fr ? 'Valable jusqu’au' : 'Valid until'} htmlFor="q-until">
                <DatePicker id="q-until" value={q.valid_until ?? null} onChange={(v) => set('valid_until', v)} min={q.issue_date} />
              </Field>
            </div>
            {(templates ?? []).length > 0 && (
              <Field label={fr ? 'Modèle' : 'Template'} htmlFor="q-template" hint={fr ? 'Remplit l’introduction et les conditions.' : 'Fills the intro and terms.'}>
                <Select
                  id="q-template"
                  value={q.template_id ?? ''}
                  onChange={(e) => {
                    const t = (templates ?? []).find((x) => x.id === e.target.value);
                    setQ((p) => ({ ...p, template_id: t?.id ?? null, intro_text: t?.intro_text ?? p.intro_text, terms_text: t?.terms_text ?? p.terms_text }));
                  }}
                >
                  <option value="">{fr ? 'Aucun' : 'None'}</option>
                  {(templates ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label={fr ? 'Introduction' : 'Introduction'} htmlFor="q-intro">
              <Textarea id="q-intro" rows={3} value={q.intro_text ?? ''} onChange={(e) => set('intro_text', e.target.value)} showCounter={false} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{fr ? 'Lignes' : 'Lines'}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => set('items', [...q.items, { description: '', quantity: 1, unit: 'jour', unit_price: 0 }])} disabled={q.items.length >= 50}>
              <Plus />
              {fr ? 'Ajouter une ligne' : 'Add a line'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {q.items.map((it, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_14rem]">
                  <Textarea
                    rows={2}
                    value={it.description}
                    onChange={(e) => setItem(i, { description: e.target.value })}
                    placeholder={fr ? 'Désignation (prestation, profil, livrable…)' : 'Description (service, profile, deliverable…)'}
                    aria-label={fr ? `Désignation ligne ${i + 1}` : `Line ${i + 1} description`}
                    showCounter={false}
                    maxLength={500}
                  />
                  <Combobox
                    options={consultantOptions}
                    value={it.consultant_id ?? ''}
                    onChange={(v) => setItem(i, { consultant_id: v || null })}
                    clearable
                    placeholder={fr ? 'Consultant (facultatif)' : 'Consultant (optional)'}
                    ariaLabel={fr ? 'Consultant' : 'Consultant'}
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[6rem_7rem_8rem_1fr_auto]">
                  <Input type="number" min={0} step={0.5} inputMode="decimal" value={it.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} aria-label={fr ? 'Quantité' : 'Quantity'} />
                  <Select value={it.unit ?? 'jour'} onChange={(e) => setItem(i, { unit: e.target.value })} aria-label={fr ? 'Unité' : 'Unit'}>
                    <option value="jour">{fr ? 'jour' : 'day'}</option>
                    <option value="heure">{fr ? 'heure' : 'hour'}</option>
                    <option value="forfait">{fr ? 'forfait' : 'fixed'}</option>
                    <option value="mois">{fr ? 'mois' : 'month'}</option>
                  </Select>
                  <Input type="number" min={0} step={1} inputMode="decimal" value={it.unit_price} onChange={(e) => setItem(i, { unit_price: Number(e.target.value) })} aria-label={fr ? 'Prix unitaire HT' : 'Unit price'} />
                  <div className="num flex items-center justify-end text-[13px] font-medium sm:justify-start">
                    {formatEur((Number(it.quantity) || 0) * (Number(it.unit_price) || 0), lang, 2)}
                  </div>
                  <div className="col-span-2 flex justify-end gap-1 sm:col-span-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={fr ? 'Monter' : 'Move up'}>
                      <ArrowUp />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => move(i, 1)} disabled={i === q.items.length - 1} aria-label={fr ? 'Descendre' : 'Move down'}>
                      <ArrowDown />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => set('items', q.items.filter((_, j) => j !== i))} disabled={q.items.length === 1} aria-label={fr ? 'Supprimer la ligne' : 'Remove line'}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex flex-col items-end gap-1 border-t border-border pt-3 text-[13px]">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{fr ? 'TVA' : 'VAT'}</span>
                <Input type="number" min={0} max={100} step={0.5} value={q.vat_rate} onChange={(e) => set('vat_rate', Number(e.target.value))} className="h-8 w-20" aria-label={fr ? 'Taux de TVA' : 'VAT rate'} />
                <span className="text-muted-foreground">%</span>
              </div>
              <div className="num">
                {fr ? 'Total HT' : 'Total excl. VAT'} : <span className="font-semibold">{formatEur(totals.ht, lang, 2)}</span>
              </div>
              <div className="num text-muted-foreground">
                {fr ? 'Total TTC' : 'Total incl. VAT'} : {formatEur(totals.ttc, lang, 2)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{fr ? 'Conditions et notes' : 'Terms and notes'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label={fr ? 'Conditions (sur le document)' : 'Terms (on the document)'} htmlFor="q-terms">
              <Textarea id="q-terms" rows={4} value={q.terms_text ?? ''} onChange={(e) => set('terms_text', e.target.value)} showCounter={false} />
            </Field>
            <Field label={fr ? 'Notes internes' : 'Internal notes'} htmlFor="q-notes" hint={fr ? 'Non imprimées.' : 'Not printed.'}>
              <Textarea id="q-notes" rows={2} value={q.notes ?? ''} onChange={(e) => set('notes', e.target.value)} showCounter={false} />
            </Field>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              {fr ? 'Annuler' : 'Cancel'}
            </Button>
          )}
          <Button loading={saving} onClick={() => void save()}>
            {quoteId ? (fr ? 'Enregistrer' : 'Save') : fr ? 'Créer le devis' : 'Create quote'}
          </Button>
        </div>
      </div>

      <div className="hidden 2xl:block">
        <div className="sticky top-20 origin-top scale-[0.82]">
          <QuoteDocument
            quote={{ number: null, title: q.title || (fr ? 'Objet du devis' : 'Quote subject'), issue_date: q.issue_date, valid_until: q.valid_until ?? null, vat_rate: Number(q.vat_rate) || 0, intro_text: q.intro_text ?? null, terms_text: q.terms_text ?? null, version: 1 }}
            items={q.items.map((i) => ({ description: i.description, quantity: Number(i.quantity) || 0, unit: i.unit ?? 'jour', unit_price: Number(i.unit_price) || 0 }))}
            branding={branding}
            client={company ? { name: company.name, city: company.city } : null}
            contact={contact ? { name: `${contact.first_name} ${contact.last_name}`, email: contact.email } : null}
          />
        </div>
      </div>
    </div>
  );
}
