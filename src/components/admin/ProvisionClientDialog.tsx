'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sparkles, Building2, Palette, Scale, Banknote, UserCog, Wand2 } from 'lucide-react';

import { extractColorsFromImage } from '@/lib/colors/extract-from-image';

import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormDialogContent } from '@/components/ui/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { notifyCreated, notifyError } from '@/lib/notify';
import { AssetUploader } from './AssetUploader';

type QuoteRequest = {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  /** Logo uploadé par le prospect (URL Supabase Storage public). */
  logo_url?: string | null;
  /** Formule choisie par le prospect sur /devis. */
  plan_id?: 'starter' | 'growth' | 'enterprise' | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteRequest: QuoteRequest | null;
  onProvisioned: () => void;
};

type FormState = {
  name: string;
  slug: string;
  brand_name: string;
  logo_url: string;
  signature_url: string;
  brand_primary_color: string;
  brand_accent_color: string;
  footer_tagline: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  legal_form: string;
  siren: string;
  siret: string;
  vat_number: string;
  rcs: string;
  capital_eur: string;
  representative_name: string;
  representative_title: string;
  iban: string;
  bic: string;
  bank_name: string;
  admin_email: string;
  admin_first_name: string;
  admin_last_name: string;
  plan_id: 'starter' | 'growth' | 'enterprise';
  billing_mode: 'trial_7d' | 'paid_only' | 'exempt';
};

const PLAN_OPTIONS: { id: FormState['plan_id']; label: string }[] = [
  { id: 'starter', label: 'Starter — 74,99 € HT/mois' },
  { id: 'growth', label: 'Medium — 149,99 € HT/mois' },
  { id: 'enterprise', label: 'Illimité — 299,99 € HT/mois' },
];

const BILLING_MODES: {
  id: FormState['billing_mode'];
  label: string;
  hint: string;
}[] = [
  {
    id: 'paid_only',
    label: 'Paiement requis',
    hint: 'Email « Activer mon compte et payer » — accès dès le paiement.',
  },
  {
    id: 'trial_7d',
    label: 'Essai 7 jours',
    hint: 'Accès immédiat, paiement à la fin de l\'essai (relance auto J-3).',
  },
  {
    id: 'exempt',
    label: 'Exempté',
    hint: 'Partenaire / interne — jamais facturé, aucune limite.',
  },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const INITIAL: FormState = {
  name: '',
  slug: '',
  brand_name: '',
  logo_url: '',
  signature_url: '',
  brand_primary_color: '#8b5cf6',
  brand_accent_color: '#e11d74',
  footer_tagline: '',
  address: '',
  city: '',
  postal_code: '',
  country: 'France',
  legal_form: 'SAS',
  siren: '',
  siret: '',
  vat_number: '',
  rcs: '',
  capital_eur: '',
  representative_name: '',
  representative_title: 'Président',
  iban: '',
  bic: '',
  bank_name: '',
  admin_email: '',
  admin_first_name: '',
  admin_last_name: '',
  plan_id: 'starter',
  billing_mode: 'paid_only',
};

/**
 * Provisioning d'un nouvel espace client (super_admin only).
 *
 * Pré-remplit depuis la demande de devis si fournie. L'utilisateur saisit
 * tout le branding + les mentions légales en une fois → en sortie, l'org
 * est créée, l'admin client reçoit un email d'invitation, le quote_request
 * est marqué "won".
 */
export function ProvisionClientDialog({
  open,
  onOpenChange,
  quoteRequest,
  onProvisioned,
}: Props) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (quoteRequest) {
      const fullName = quoteRequest.contact_name.trim();
      const parts = fullName.split(/\s+/);
      const first = parts.length > 1 ? parts[0] : fullName;
      const last = parts.length > 1 ? parts.slice(1).join(' ') : '';
      setForm({
        ...INITIAL,
        name: quoteRequest.company_name,
        slug: slugify(quoteRequest.company_name),
        brand_name: quoteRequest.company_name,
        // Si le prospect a uploadé un logo via /devis, on le pré-remplit
        // directement — l'admin n'a plus qu'à valider.
        logo_url: quoteRequest.logo_url ?? '',
        admin_email: quoteRequest.contact_email,
        admin_first_name: first,
        admin_last_name: last,
        // Formule choisie par le prospect sur /devis — pré-sélectionnée,
        // le fondateur peut toujours la corriger avant confirmation.
        plan_id: quoteRequest.plan_id ?? 'starter',
        billing_mode: 'paid_only',
      });
    } else {
      setForm(INITIAL);
    }
    setError(null);
  }, [open, quoteRequest]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      // Auto-slug à partir du nom tant que slug n'a pas été édité manuellement.
      if (key === 'name' && f.slug === slugify(f.name)) {
        next.slug = slugify(value as string);
      }
      return next;
    });
  }

  async function submit() {
    setError(null);
    if (!form.name.trim() || !form.slug.trim() || !form.admin_email.trim()) {
      setError('Nom de société, slug et email admin sont requis.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          capital_eur: form.capital_eur ? Number(form.capital_eur) : null,
          quote_request_id: quoteRequest?.id ?? null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.message ?? body.error ?? 'Provisioning impossible');
        return;
      }
      notifyCreated(
        `Espace "${form.name}" créé — invitation envoyée à ${form.admin_email}`,
      );
      onProvisioned();
      onOpenChange(false);
    } catch (e) {
      notifyError('Erreur réseau : ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <FormDialogContent className="w-[min(1400px,96vw)] max-w-[96vw] max-h-[96vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-glow" />
            Provisionner un nouvel espace client
          </DialogTitle>
          <DialogDescription>
            Renseigne tous les champs pour que le client retrouve son identité
            visuelle, ses mentions légales et ses coordonnées bancaires dès la
            première connexion. Un email d&apos;invitation est envoyé en fin de
            processus.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/[0.07] px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 pt-2">
          {/* Identité */}
          <Section title="Identité" icon={<Building2 className="h-3.5 w-3.5" />}>
            <Row>
              <Field label="Nom légal *">
                <Input
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="Futurmaster SAS"
                />
              </Field>
              <Field label="Slug (URL) *" hint="lettres minuscules, chiffres, tirets">
                <Input
                  value={form.slug}
                  onChange={(e) => update('slug', slugify(e.target.value))}
                  placeholder="futurmaster"
                />
              </Field>
            </Row>
            <Field label="Nom commercial (affiché dans l'app)">
              <Input
                value={form.brand_name}
                onChange={(e) => update('brand_name', e.target.value)}
                placeholder="Futurmaster"
              />
            </Field>
          </Section>

          {/* Branding visuel */}
          <Section title="Identité visuelle" icon={<Palette className="h-3.5 w-3.5" />}>
            <Field label="Logo (PNG/SVG, fond transparent)">
              <AssetUploader
                kind="logo"
                value={form.logo_url}
                onChange={(url) => update('logo_url', url)}
              />
            </Field>
            <Field label="Signature (PNG fond transparent)">
              <AssetUploader
                kind="signature"
                value={form.signature_url}
                onChange={(url) => update('signature_url', url)}
              />
            </Field>
            {form.logo_url && (
              <button
                type="button"
                onClick={async () => {
                  const colors = await extractColorsFromImage(form.logo_url);
                  setForm((f) => ({
                    ...f,
                    brand_primary_color: colors.primary,
                    brand_accent_color: colors.accent,
                  }));
                }}
                className="inline-flex items-center gap-2 rounded-md border border-magenta/30 bg-magenta/[0.08] px-3 py-1.5 text-xs font-medium text-magenta hover:bg-magenta/[0.14] transition"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Extraire les couleurs depuis le logo
              </button>
            )}
            <Row>
              <Field label="Couleur primaire">
                <ColorInput
                  value={form.brand_primary_color}
                  onChange={(v) => update('brand_primary_color', v)}
                />
              </Field>
              <Field label="Couleur accent">
                <ColorInput
                  value={form.brand_accent_color}
                  onChange={(v) => update('brand_accent_color', v)}
                />
              </Field>
            </Row>
            <Field label="Footer tagline (bas de page PDF)">
              <Input
                value={form.footer_tagline}
                onChange={(e) => update('footer_tagline', e.target.value)}
                placeholder="L'ESN qui révèle le potentiel"
              />
            </Field>
          </Section>

          {/* Adresse */}
          <Section title="Coordonnées" icon={<Building2 className="h-3.5 w-3.5" />}>
            <Field label="Adresse">
              <Input
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="123 rue de la République"
              />
            </Field>
            <Row3>
              <Field label="CP">
                <Input
                  value={form.postal_code}
                  onChange={(e) => update('postal_code', e.target.value)}
                  placeholder="75001"
                />
              </Field>
              <Field label="Ville">
                <Input
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  placeholder="Paris"
                />
              </Field>
              <Field label="Pays">
                <Input
                  value={form.country}
                  onChange={(e) => update('country', e.target.value)}
                />
              </Field>
            </Row3>
          </Section>

          {/* Mentions légales */}
          <Section title="Mentions légales" icon={<Scale className="h-3.5 w-3.5" />}>
            <Row3>
              <Field label="Forme juridique">
                <Input
                  value={form.legal_form}
                  onChange={(e) => update('legal_form', e.target.value)}
                />
              </Field>
              <Field label="Capital (€)">
                <Input
                  type="number"
                  value={form.capital_eur}
                  onChange={(e) => update('capital_eur', e.target.value)}
                />
              </Field>
              <Field label="N° TVA">
                <Input
                  value={form.vat_number}
                  onChange={(e) => update('vat_number', e.target.value)}
                  placeholder="FR12 345678901"
                />
              </Field>
            </Row3>
            <Row3>
              <Field label="SIREN">
                <Input
                  value={form.siren}
                  onChange={(e) => update('siren', e.target.value)}
                />
              </Field>
              <Field label="SIRET">
                <Input
                  value={form.siret}
                  onChange={(e) => update('siret', e.target.value)}
                />
              </Field>
              <Field label="RCS">
                <Input
                  value={form.rcs}
                  onChange={(e) => update('rcs', e.target.value)}
                  placeholder="Paris 123 456 789"
                />
              </Field>
            </Row3>
            <Row>
              <Field label="Nom du signataire">
                <Input
                  value={form.representative_name}
                  onChange={(e) => update('representative_name', e.target.value)}
                  placeholder="Jean Dupont"
                />
              </Field>
              <Field label="Titre">
                <Input
                  value={form.representative_title}
                  onChange={(e) => update('representative_title', e.target.value)}
                  placeholder="Président"
                />
              </Field>
            </Row>
          </Section>

          {/* Banque */}
          <Section title="Coordonnées bancaires" icon={<Banknote className="h-3.5 w-3.5" />}>
            <Field label="Banque">
              <Input
                value={form.bank_name}
                onChange={(e) => update('bank_name', e.target.value)}
                placeholder="BNP Paribas"
              />
            </Field>
            <Row>
              <Field label="IBAN">
                <Input
                  value={form.iban}
                  onChange={(e) => update('iban', e.target.value)}
                  placeholder="FR76 1234 …"
                />
              </Field>
              <Field label="BIC / SWIFT">
                <Input
                  value={form.bic}
                  onChange={(e) => update('bic', e.target.value)}
                  placeholder="BNPAFRPPXXX"
                />
              </Field>
            </Row>
          </Section>

          {/* Premier admin */}
          <Section title="Premier administrateur du client" icon={<UserCog className="h-3.5 w-3.5" />}>
            <Row>
              <Field label="Prénom">
                <Input
                  value={form.admin_first_name}
                  onChange={(e) => update('admin_first_name', e.target.value)}
                />
              </Field>
              <Field label="Nom">
                <Input
                  value={form.admin_last_name}
                  onChange={(e) => update('admin_last_name', e.target.value)}
                />
              </Field>
            </Row>
            <Field label="Email d'invitation *" hint="Recevra le lien pour activer son compte">
              <Input
                type="email"
                value={form.admin_email}
                onChange={(e) => update('admin_email', e.target.value)}
              />
            </Field>
          </Section>

          {/* Abonnement */}
          <Section title="Abonnement" icon={<Sparkles className="h-3.5 w-3.5" />}>
            <Field label="Plan">
              <select
                value={form.plan_id}
                onChange={(e) => update('plan_id', e.target.value as FormState['plan_id'])}
                className="flex h-9 w-full rounded-md border border-hairline bg-transparent px-3 py-1 text-sm"
              >
                {PLAN_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mode de facturation">
              <div className="space-y-1.5">
                {BILLING_MODES.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition ${
                      form.billing_mode === m.id
                        ? 'border-violet-glow/50 bg-violet-glow/[0.08]'
                        : 'border-hairline hover:border-foreground/25'
                    }`}
                  >
                    <input
                      type="radio"
                      name="billing_mode"
                      checked={form.billing_mode === m.id}
                      onChange={() => update('billing_mode', m.id)}
                      className="mt-0.5 accent-magenta"
                    />
                    <span>
                      <span className="block text-sm font-medium">{m.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{m.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </Field>
          </Section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button
            onClick={submit}
            disabled={busy}
            className="bg-gradient-to-r from-violet-glow to-magenta-neon hover:opacity-95"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Créer l&apos;espace et inviter l&apos;admin
          </Button>
        </DialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-hairline bg-card/40 p-4 space-y-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-magenta">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function Row3({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{children}</div>;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-12 rounded-md border border-hairline bg-transparent cursor-pointer"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#8b5cf6"
        className="flex-1"
      />
    </div>
  );
}
