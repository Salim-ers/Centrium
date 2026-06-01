'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Send,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Mail,
  Phone,
  Sparkles,
  User as UserIcon,
  HandHelping,
  FileText,
  FileSignature,
  Image as ImageIcon,
  Palette,
  Scale,
  PenLine,
  Briefcase,
  Upload,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/LocaleProvider';

/**
 * Page publique "Demande de devis" — remplace l'ancien signup self-service.
 *
 * Un prospect (ESN) remplit ses infos, on les insère dans quote_requests
 * via POST /api/quote-requests + on notifie par email à
 * contact@centrium-platform.com (via Formspree, best-effort).
 *
 * Pas de création de compte ici : c'est l'équipe Centrium qui
 * provisionne ensuite l'organisation client avec son branding via
 * /admin/clients.
 */

const NOTIFICATION_EMAIL = 'contact@centrium-platform.com';
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xqenvzve';

// Technical keys used as backend payload (wanted_help) — DO NOT change,
// they are persisted in DB and consumed by /admin/clients. The displayed
// labels come from the i18n dict (t.devis.helpOptions[i].full / .short).
const HELP_KEYS = [
  'cv_template',
  'contract_template',
  'logo',
  'brand_colors',
  'mentions_legales',
  'signature',
  'fiche_poste',
  'autre',
] as const;

/**
 * Envoi de la notification email côté navigateur — Formspree accepte
 * mieux les soumissions browser que les fetch server-to-server.
 * Best-effort : on n'attend pas plus de 5s, et on ne bloque pas
 * l'UX si l'email échoue (la trace en DB est la source de vérité).
 */
async function notifyFormspree(payload: {
  company_name: string;
  industry: string;
  team_size: string;
  consultants_count: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_role: string;
  message: string;
  wanted_help: string[];
  wanted_help_labels: Record<string, string>;
  logo_url?: string | null;
}): Promise<boolean> {
  const help = payload.wanted_help
    .map((k) => payload.wanted_help_labels[k] ?? k)
    .join(', ');
  const body = new FormData();
  body.append('_subject', `Nouvelle demande de devis — ${payload.company_name}`);
  body.append('_replyto', payload.contact_email);
  body.append('email', payload.contact_email);
  body.append('Société', payload.company_name);
  if (payload.industry) body.append('Secteur', payload.industry);
  if (payload.team_size) body.append('Taille équipe', payload.team_size);
  if (payload.consultants_count)
    body.append('Consultants gérés', payload.consultants_count);
  body.append('Contact', payload.contact_name);
  if (payload.contact_role) body.append('Fonction', payload.contact_role);
  body.append('Email', payload.contact_email);
  if (payload.contact_phone) body.append('Téléphone', payload.contact_phone);
  if (help) body.append("Besoins d'accompagnement", help);
  if (payload.message) body.append('Message', payload.message);
  if (payload.logo_url) body.append('Logo (URL)', payload.logo_url);

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      body,
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

type HelpKey = (typeof HELP_KEYS)[number];

// Icons stay tied to technical keys (locale-independent).
const HELP_ICONS: Record<HelpKey, typeof FileText> = {
  cv_template: FileText,
  contract_template: FileSignature,
  logo: ImageIcon,
  brand_colors: Palette,
  mentions_legales: Scale,
  signature: PenLine,
  fiche_poste: Briefcase,
  autre: HandHelping,
};

type FormState = {
  company_name: string;
  industry: string;
  team_size: string;
  consultants_count: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_role: string;
  message: string;
};

const INITIAL_FORM: FormState = {
  company_name: '',
  industry: '',
  team_size: '',
  consultants_count: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  contact_role: '',
  message: '',
};

export default function DevisPage() {
  const { t } = useLocale();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [help, setHelp] = useState<Set<HelpKey>>(new Set());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  async function handleLogoUpload(file: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(t.devis.errors.tooLarge);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError(t.devis.errors.unsupported);
      return;
    }
    setError(null);
    setLogoUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
      // Path = uuid + nom slugifié pour éviter les collisions et garder
      // un nom lisible côté admin (cleanup ultérieur).
      const safe = file.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const path = `${crypto.randomUUID()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from('quote-attachments')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) {
        setError(`${t.devis.errors.uploadFailed} ${upErr.message}`);
        return;
      }
      const { data: pub } = supabase.storage
        .from('quote-attachments')
        .getPublicUrl(path);
      setLogoUrl(pub.publicUrl);
      setLogoFileName(file.name);
    } catch (e) {
      setError(`${t.devis.errors.uploadImpossible} ${(e as Error).message}`);
    } finally {
      setLogoUploading(false);
    }
  }

  async function removeLogo() {
    setLogoUrl(null);
    setLogoFileName(null);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleHelp(key: HelpKey) {
    setHelp((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.company_name.trim() || !form.contact_name.trim() || !form.contact_email.trim()) {
      setError(t.devis.errors.required);
      return;
    }
    setBusy(true);
    try {
      const wantedHelp = Array.from(help);

      // Build {key → full label} map from the dict, used by the email notif.
      const wantedHelpLabels: Record<string, string> = {};
      HELP_KEYS.forEach((k, i) => {
        wantedHelpLabels[k] = t.devis.helpOptions[i]?.full ?? k;
      });

      // 1) Save DB (source de vérité) + 2) Email via Formspree depuis
      // le navigateur (Formspree accepte mieux les requêtes browser).
      // Les deux partent en parallèle pour ne pas allonger l'UX.
      const [dbRes, emailOk] = await Promise.all([
        fetch('/api/quote-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            wanted_help: wantedHelp,
            logo_url: logoUrl,
            source: 'landing',
          }),
        }),
        notifyFormspree({
          ...form,
          wanted_help: wantedHelp,
          wanted_help_labels: wantedHelpLabels,
          logo_url: logoUrl,
        }),
      ]);

      const body = await dbRes.json().catch(() => ({}));
      if (!dbRes.ok) {
        setError(body.message ?? "Envoi impossible — réessaie dans un instant.");
        return;
      }
      // On affiche le succès même si l'email a foiré : le record est en DB,
      // l'équipe Centrium verra la demande dans /admin/clients.
      if (!emailOk) {
        // eslint-disable-next-line no-console
        console.warn('[devis] email notification failed, but DB save OK');
      }
      setDone(true);
    } catch (e) {
      setError('Erreur réseau : ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <MarketingShell>
        <main className="min-h-[80vh] flex items-center justify-center px-6 pt-24">
          <div className="relative max-w-lg w-full text-center space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-300" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">
                {t.devis.success.title}
              </h1>
              <p className="text-muted-foreground mt-3 leading-relaxed">
                {t.devis.success.received1} <strong>{form.company_name}</strong>.{' '}
                {t.devis.success.received2}
                <strong className="text-violet-200"> {form.contact_email}</strong>{' '}
                {t.devis.success.followUp}
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                {t.devis.success.question}{' '}
                <a
                  href={`mailto:${NOTIFICATION_EMAIL}`}
                  className="text-violet-300 hover:text-violet-200 underline underline-offset-2"
                >
                  {NOTIFICATION_EMAIL}
                </a>
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button asChild variant="outline">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" />
                  {t.devis.success.back}
                </Link>
              </Button>
            </div>
          </div>
        </main>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <main className="relative max-w-3xl mx-auto px-6 pt-32 pb-16">
        <div className="text-center mb-10">
          <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-4">
            {t.devis.eyebrow}
          </div>
          <h1 className="font-display font-light tracking-[-0.04em] leading-[1] text-[clamp(2.4rem,5.5vw,4.5rem)] text-white">
            {t.devis.titleA}{' '}
            <span className="qc-italic-accent font-editorial italic font-normal">{t.devis.titleB}</span>
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto leading-relaxed">
            {t.devis.sub}
          </p>
          <p className="text-xs text-muted-foreground mt-4 inline-flex items-center gap-1.5">
            <Mail className="h-3 w-3 text-violet-300" />
            {t.devis.repliesSentBy}{' '}
            <a
              href={`mailto:${NOTIFICATION_EMAIL}`}
              className="text-violet-300 hover:text-violet-200 underline underline-offset-2 font-medium"
            >
              {NOTIFICATION_EMAIL}
            </a>
          </p>
        </div>

        <form
          onSubmit={submit}
          className="qc-luminous-static relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl p-6 md:p-10 space-y-7"
        >
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/[0.07] px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Bloc société */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-violet-300">
              <Building2 className="h-3.5 w-3.5" />
              {t.devis.section.company}
            </div>

            <div>
              <Label>{t.devis.fields.companyName}</Label>
              <Input
                value={form.company_name}
                onChange={(e) => update('company_name', e.target.value)}
                placeholder={t.devis.fields.companyNamePh}
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>{t.devis.fields.sector}</Label>
                <Input
                  value={form.industry}
                  onChange={(e) => update('industry', e.target.value)}
                  placeholder={t.devis.fields.sectorPh}
                />
              </div>
              <div>
                <Label>{t.devis.fields.teamSize}</Label>
                <Select
                  value={form.team_size}
                  onChange={(e) => update('team_size', e.target.value)}
                >
                  <option value="">—</option>
                  {(['1-5', '6-15', '16-50', '51-200', '200+'] as const).map((v, i) => (
                    <option key={v} value={v}>
                      {t.devis.teamSizes[i]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>{t.devis.fields.consultants}</Label>
                <Select
                  value={form.consultants_count}
                  onChange={(e) => update('consultants_count', e.target.value)}
                >
                  <option value="">—</option>
                  {(['0-10', '10-30', '30-100', '100-500', '500+'] as const).map((v, i) => (
                    <option key={v} value={v}>
                      {t.devis.consultantsRanges[i]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </section>

          {/* Bloc contact */}
          <section className="space-y-4 pt-2 border-t border-hairline">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-violet-300 pt-4">
              <UserIcon className="h-3.5 w-3.5" />
              {t.devis.section.contact}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>{t.devis.fields.contactName}</Label>
                <Input
                  value={form.contact_name}
                  onChange={(e) => update('contact_name', e.target.value)}
                  placeholder={t.devis.fields.contactNamePh}
                  required
                />
              </div>
              <div>
                <Label>{t.devis.fields.role}</Label>
                <Input
                  value={form.contact_role}
                  onChange={(e) => update('contact_role', e.target.value)}
                  placeholder={t.devis.fields.rolePh}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>
                  <Mail className="h-3 w-3 inline mr-1" />
                  {t.devis.fields.email}
                </Label>
                <Input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => update('contact_email', e.target.value)}
                  placeholder={t.devis.fields.emailPh}
                  required
                />
              </div>
              <div>
                <Label>
                  <Phone className="h-3 w-3 inline mr-1" />
                  {t.devis.fields.phone}
                </Label>
                <Input
                  type="tel"
                  value={form.contact_phone}
                  onChange={(e) => update('contact_phone', e.target.value)}
                  placeholder={t.devis.fields.phonePh}
                />
              </div>
            </div>
          </section>

          {/* Bloc besoins d'accompagnement */}
          <section className="space-y-3 pt-2 border-t border-hairline">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-violet-300 pt-4">
              <HandHelping className="h-3.5 w-3.5" />
              {t.devis.section.help}
            </div>
            <p className="text-[11px] text-muted-foreground -mt-2">
              {t.devis.helpIntro}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {HELP_KEYS.map((key, i) => {
                const Icon = HELP_ICONS[key];
                const active = help.has(key);
                const opt = t.devis.helpOptions[i];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleHelp(key)}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-left transition',
                      active
                        ? 'border-violet-glow/60 bg-violet-glow/15 text-violet-100 shadow-[0_0_18px_-8px_rgba(168,85,247,0.6)]'
                        : 'border-hairline bg-white/[0.02] text-muted-foreground hover:text-foreground hover:border-white/20',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        active ? 'text-violet-300' : 'text-muted-foreground',
                      )}
                    />
                    <span className="leading-tight">{opt?.short ?? key}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Logo (optionnel) */}
          <section className="space-y-3 pt-2 border-t border-hairline">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-violet-300 pt-4">
              <ImageIcon className="h-3.5 w-3.5" />
              {t.devis.section.logo}
            </div>
            <p className="text-[11px] text-muted-foreground -mt-2">
              {t.devis.logoIntro}
            </p>
            {logoUrl ? (
              <div className="flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-12 w-12 rounded bg-white/5 object-contain p-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {logoFileName ?? 'Logo'}
                  </div>
                  <div className="text-[10px] text-emerald-300 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {t.devis.logoReceived}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeLogo}
                  className="h-7 w-7 rounded-md border border-hairline text-muted-foreground hover:text-foreground hover:border-white/20 inline-flex items-center justify-center"
                  title={t.devis.logoRemove}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label
                className={cn(
                  'flex items-center gap-3 rounded-md border border-dashed px-4 py-4 cursor-pointer transition',
                  logoUploading
                    ? 'border-violet-glow/40 bg-violet-glow/[0.06] cursor-wait'
                    : 'border-hairline bg-white/[0.02] hover:border-violet-glow/40 hover:bg-violet-glow/[0.04]',
                )}
              >
                {logoUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
                ) : (
                  <Upload className="h-4 w-4 text-violet-300" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {logoUploading ? t.devis.logoUploading : t.devis.logoChoose}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t.devis.logoFormats}
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  disabled={logoUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleLogoUpload(f);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </section>

          {/* Message libre */}
          <section className="pt-2 border-t border-hairline">
            <div className="pt-4 space-y-2">
              <Label>{t.devis.section.message}</Label>
              <Textarea
                rows={5}
                value={form.message}
                onChange={(e) => update('message', e.target.value)}
                placeholder={t.devis.messagePh}
              />
              <p className="text-[11px] text-muted-foreground">
                {t.devis.messageHint}
              </p>
            </div>
          </section>

          <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[11px] text-muted-foreground max-w-md">
              {t.devis.legalNote}
            </p>
            <Button
              type="submit"
              disabled={busy}
              className="bg-gradient-to-r from-violet-glow to-magenta-neon hover:opacity-95 shadow-[0_0_30px_-8px_rgba(236,72,153,0.5)]"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t.devis.submit}
            </Button>
          </div>
        </form>
      </main>
    </MarketingShell>
  );
}
