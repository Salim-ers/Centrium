'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, GripVertical, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/label';
import { Combobox } from '@/components/ui/Combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { DocumentCanvas } from '@/components/app/DocumentCanvas';
import { QuoteDocument } from './QuoteDocument';
import { useCompaniesLite, useConsultantsLite, useContactsLite } from '@/hooks/useOrgDirectory';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { quoteSchema, type QuoteInput } from '@/lib/validators/v2';
import { formatDate, formatEur } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DocumentTemplate, Quote } from '@/types';

export type QuoteDraft = QuoteInput;
type SectionId = 'info' | 'lines' | 'terms' | 'notes';

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

/** Déplace un élément d'une liste (glisser-déposer, flèches clavier). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it!);
  return next;
}

const LINE_GRID = 'grid grid-cols-[1.25rem_minmax(0,1fr)_3.25rem_4.75rem_5.25rem_5.5rem_1.75rem] items-start gap-1.5';

/**
 * Configurateur de devis : éditeur compact à gauche (une section ouverte à
 * la fois, lignes en mini-tableau), aperçu A4 toujours visible à droite.
 */
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
  const [open, setOpen] = useState<SectionId>(initial.title ? 'lines' : 'info');
  const [drag, setDrag] = useState<number | null>(null);

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
  const moveTo = (from: number, to: number) => setQ((prev) => ({ ...prev, items: moveItem(prev.items, from, to) }));
  const addLine = () => {
    setQ((p) => ({ ...p, items: [...p.items, { description: '', quantity: 1, unit: 'jour', unit_price: 0 }] }));
    setOpen('lines');
  };

  const totals = useMemo(() => {
    const ht = q.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
    const vat = ht * ((Number(q.vat_rate) || 0) / 100);
    return { ht, vat, ttc: ht + vat };
  }, [q.items, q.vat_rate]);

  async function save() {
    const parsed = quoteSchema.safeParse(q);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setOpen(issue?.path[0] === 'items' ? 'lines' : issue?.path[0] === 'terms_text' || issue?.path[0] === 'vat_rate' ? 'terms' : 'info');
      toast.error(issue?.message ?? (fr ? 'Devis incomplet' : 'Incomplete quote'));
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
      toast.error(json.message ?? (typeof json.error === 'string' ? json.error : fr ? 'Enregistrement impossible' : 'Could not save'));
      return;
    }
    onSaved(json.data as Quote);
  }

  const company = q.company_id ? companies.get(q.company_id) : null;
  const contact = q.contact_id ? contacts.get(q.contact_id) : null;
  const excerpt = (t: string | null | undefined, n = 48) => (t ? (t.length > n ? `${t.slice(0, n).trim()}…` : t) : '');

  return (
    <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,38rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,44rem)_minmax(0,1fr)]">
      <div className="flex flex-col lg:min-h-0">
        <div className="no-scrollbar space-y-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-1">
          <Section
            id="info"
            open={open}
            onOpen={setOpen}
            title={fr ? 'Informations' : 'Details'}
            summary={[q.title || (fr ? 'Objet à définir' : 'No subject yet'), company?.name, formatDate(q.issue_date, lang, 'short')].filter(Boolean).join(' · ')}
          >
            <Field label={fr ? 'Objet du devis' : 'Quote subject'} htmlFor="q-title" required>
              <Input id="q-title" value={q.title} onChange={(e) => set('title', e.target.value)} placeholder={fr ? 'ex. Renfort data engineering, T1' : 'e.g. Data engineering support, Q1'} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Client" htmlFor="q-client">
                <Combobox id="q-client" options={companyOptions} value={q.company_id ?? ''} onChange={(v) => setQ((p) => ({ ...p, company_id: v || null, contact_id: null }))} clearable placeholder={fr ? 'Choisir' : 'Choose'} />
              </Field>
              <Field label="Contact" htmlFor="q-contact">
                <Combobox id="q-contact" options={contactOptionsFor(q.company_id)} value={q.contact_id ?? ''} onChange={(v) => set('contact_id', v || null)} clearable disabled={!q.company_id} placeholder={fr ? 'Choisir' : 'Choose'} />
              </Field>
              <Field label="Date" htmlFor="q-date">
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
            <Field label="Introduction" htmlFor="q-intro">
              <Textarea id="q-intro" rows={3} value={q.intro_text ?? ''} onChange={(e) => set('intro_text', e.target.value)} showCounter={false} />
            </Field>
          </Section>

          <Section
            id="lines"
            open={open}
            onOpen={setOpen}
            title={fr ? 'Lignes' : 'Lines'}
            summary={`${q.items.length} ${fr ? `ligne${q.items.length > 1 ? 's' : ''}` : `line${q.items.length > 1 ? 's' : ''}`} · ${formatEur(totals.ht, lang, 2)} HT`}
          >
            <div className="overflow-hidden rounded-xl border border-border">
              <div className={cn(LINE_GRID, 'items-center bg-muted/50 px-2 py-1.5 text-[11px] font-semibold text-muted-foreground')}>
                <span />
                <span>{fr ? 'Désignation · consultant' : 'Description · consultant'}</span>
                <span className="text-right">{fr ? 'Qté' : 'Qty'}</span>
                <span>{fr ? 'Unité' : 'Unit'}</span>
                <span className="text-right">{fr ? 'Prix HT' : 'Price'}</span>
                <span className="text-right">Total</span>
                <span />
              </div>
              <ol>
                {q.items.map((it, i) => (
                  <li
                    key={i}
                    onDragOver={(e) => {
                      if (drag !== null) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (drag !== null) moveTo(drag, i);
                      setDrag(null);
                    }}
                    className={cn(LINE_GRID, 'border-t border-border px-2 py-1.5', drag === i && 'opacity-40')}
                  >
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        setDrag(i);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => setDrag(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          moveTo(i, i - 1);
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          moveTo(i, i + 1);
                        }
                      }}
                      className="mt-1.5 cursor-grab rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-terra/50"
                      aria-label={fr ? `Déplacer la ligne ${i + 1} (flèches haut / bas)` : `Move line ${i + 1} (up / down arrows)`}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 space-y-1">
                      <Textarea
                        rows={Math.min(5, Math.max(it.description.split('\n').length, Math.ceil(it.description.length / 30), 1))}
                        value={it.description}
                        onChange={(e) => setItem(i, { description: e.target.value })}
                        placeholder={fr ? 'Prestation, profil, livrable…' : 'Service, profile, deliverable…'}
                        aria-label={fr ? `Désignation ligne ${i + 1}` : `Line ${i + 1} description`}
                        showCounter={false}
                        maxLength={500}
                        className="min-h-0 resize-none px-2 py-1.5 text-[13px] leading-snug [field-sizing:content]"
                      />
                      <Select
                        value={it.consultant_id ?? ''}
                        onChange={(e) => setItem(i, { consultant_id: e.target.value || null })}
                        aria-label={fr ? `Consultant ligne ${i + 1}` : `Line ${i + 1} consultant`}
                        className="h-7 px-2 text-[12px] text-muted-foreground"
                      >
                        <option value="">{fr ? 'Consultant (facultatif)' : 'Consultant (optional)'}</option>
                        {consultantOptions.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Input type="number" min={0} step={0.5} inputMode="decimal" value={it.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} aria-label={fr ? 'Quantité' : 'Quantity'} className="h-8 px-1.5 text-right text-[13px]" />
                    <Select value={it.unit ?? 'jour'} onChange={(e) => setItem(i, { unit: e.target.value })} aria-label={fr ? 'Unité' : 'Unit'} className="h-8 px-1.5 text-[13px]">
                      <option value="jour">{fr ? 'jour' : 'day'}</option>
                      <option value="heure">{fr ? 'heure' : 'hour'}</option>
                      <option value="forfait">{fr ? 'forfait' : 'fixed'}</option>
                      <option value="mois">{fr ? 'mois' : 'month'}</option>
                    </Select>
                    <Input type="number" min={0} step={1} inputMode="decimal" value={it.unit_price} onChange={(e) => setItem(i, { unit_price: Number(e.target.value) })} aria-label={fr ? 'Prix unitaire HT' : 'Unit price'} className="h-8 px-1.5 text-right text-[13px]" />
                    <span className="num pt-1.5 text-right text-[12.5px] font-semibold">{formatEur((Number(it.quantity) || 0) * (Number(it.unit_price) || 0), lang, 2)}</span>
                    <Button variant="ghost" size="icon-sm" onClick={() => set('items', q.items.filter((_, j) => j !== i))} disabled={q.items.length === 1} aria-label={fr ? `Supprimer la ligne ${i + 1}` : `Remove line ${i + 1}`}>
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ol>
              <div className="border-t border-border px-2 py-1.5">
                <Button variant="ghost" size="sm" onClick={addLine} disabled={q.items.length >= 50}>
                  <Plus />
                  {fr ? 'Ajouter une ligne' : 'Add a line'}
                </Button>
              </div>
            </div>
          </Section>

          <Section
            id="terms"
            open={open}
            onOpen={setOpen}
            title={fr ? 'Conditions' : 'Terms'}
            summary={[`${fr ? 'TVA' : 'VAT'} ${Number(q.vat_rate) || 0} %`, excerpt(q.terms_text)].filter(Boolean).join(' · ')}
          >
            <Field label={fr ? 'Taux de TVA (%)' : 'VAT rate (%)'} htmlFor="q-vat" className="w-40">
              <Input id="q-vat" type="number" min={0} max={100} step={0.5} value={q.vat_rate} onChange={(e) => set('vat_rate', Number(e.target.value))} />
            </Field>
            <Field label={fr ? 'Conditions (sur le document)' : 'Terms (on the document)'} htmlFor="q-terms">
              <Textarea id="q-terms" rows={5} value={q.terms_text ?? ''} onChange={(e) => set('terms_text', e.target.value)} showCounter={false} />
            </Field>
          </Section>

          <Section id="notes" open={open} onOpen={setOpen} title={fr ? 'Notes internes' : 'Internal notes'} summary={excerpt(q.notes) || (fr ? 'Non imprimées' : 'Not printed')}>
            <Field label={fr ? 'Notes' : 'Notes'} htmlFor="q-notes" hint={fr ? 'Visibles par l’équipe, jamais sur le devis.' : 'Seen by the team, never on the quote.'}>
              <Textarea id="q-notes" rows={4} value={q.notes ?? ''} onChange={(e) => set('notes', e.target.value)} showCounter={false} />
            </Field>
          </Section>
        </div>

        <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl bg-app-sand/60 px-4 py-2.5">
          <p className="num text-[13px]">
            <span className="text-muted-foreground">{fr ? 'Total HT' : 'Total excl. VAT'}</span> <strong className="font-semibold">{formatEur(totals.ht, lang, 2)}</strong>
            <span className="text-muted-foreground"> · TTC {formatEur(totals.ttc, lang, 2)}</span>
          </p>
          <div className="flex gap-2">
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
      </div>

      <DocumentCanvas title={<h2 className="text-[13.5px] font-semibold">{fr ? 'Aperçu' : 'Preview'}</h2>}>
        <QuoteDocument
          quote={{ number: null, title: q.title || (fr ? 'Objet du devis' : 'Quote subject'), issue_date: q.issue_date, valid_until: q.valid_until ?? null, vat_rate: Number(q.vat_rate) || 0, intro_text: q.intro_text ?? null, terms_text: q.terms_text ?? null, version: 1 }}
          items={q.items.map((i) => ({ description: i.description, quantity: Number(i.quantity) || 0, unit: i.unit ?? 'jour', unit_price: Number(i.unit_price) || 0 }))}
          branding={branding}
          client={company ? { name: company.name, city: company.city } : null}
          contact={contact ? { name: `${contact.first_name} ${contact.last_name}`, email: contact.email } : null}
        />
      </DocumentCanvas>
    </div>
  );
}

/** Section repliable : une seule ouverte à la fois, résumé visible une fois repliée. */
function Section({
  id,
  open,
  onOpen,
  title,
  summary,
  children,
}: {
  id: SectionId;
  open: SectionId;
  onOpen: (id: SectionId) => void;
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  const isOpen = open === id;
  return (
    <section className={cn('rounded-2xl', isOpen ? 'tile-surface' : 'bg-card/70 ring-1 ring-border')}>
      <button type="button" onClick={() => onOpen(id)} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold">{title}</span>
          {!isOpen && <span className="block truncate text-[12px] text-muted-foreground">{summary}</span>}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </section>
  );
}
