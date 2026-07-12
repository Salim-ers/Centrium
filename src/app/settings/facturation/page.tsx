'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Landmark, Building2, Loader2 } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { PageHeader, SectionHeader, AppCard, AppCardBody } from '@/components/app';

// =========================================================================
// /settings/facturation — RIB + mentions légales de l'ESN.
// -------------------------------------------------------------------------
// Ces champs alimentent l'API /api/organizations/identity et sont IMPRIMÉS
// sur les factures (bloc « Coordonnées bancaires ») et les contrats. Le RIB
// (IBAN/BIC/banque) est la partie demandée en priorité ; les mentions légales
// (SIREN, TVA, RCS…) sont dans la même fiche car elles apparaissent aussi sur
// les documents et n'avaient jusqu'ici aucun éditeur self-service.
// =========================================================================

type Identity = {
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  siren: string | null;
  siret: string | null;
  vat_number: string | null;
  rcs: string | null;
  capital_eur: number | null;
  legal_form: string | null;
  representative_name: string | null;
  representative_title: string | null;
  iban: string | null;
  bic: string | null;
  bank_name: string | null;
};

const EMPTY: Identity = {
  address: null,
  city: null,
  postal_code: null,
  country: null,
  siren: null,
  siret: null,
  vat_number: null,
  rcs: null,
  capital_eur: null,
  legal_form: null,
  representative_name: null,
  representative_title: null,
  iban: null,
  bic: null,
  bank_name: null,
};

export default function FacturationSettingsPage() {
  const { role, reloadBranding } = useOrganization();
  const isAdmin = role === 'admin';
  const { locale } = useLocale();
  const isEn = locale === 'en';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Identity>(EMPTY);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/organizations/identity', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { data } = (await res.json()) as { data: Partial<Identity> };
        if (alive && data) {
          setForm({ ...EMPTY, ...pickIdentity(data) });
        }
      } catch {
        if (alive)
          toast.error(
            isEn
              ? 'Unable to load your billing information.'
              : 'Impossible de charger les informations de facturation.',
          );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const val = (k: keyof Identity) => (form[k] == null ? '' : String(form[k]));
  const setText = (k: keyof Identity) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v.trim() === '' ? null : v }));
  const setCapital = (v: string) =>
    setForm((f) => ({ ...f, capital_eur: v.trim() === '' ? null : Number(v.replace(',', '.')) }));

  async function save() {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const res = await fetch('/api/organizations/identity', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Rafraîchit le contexte branding (qui alimente l'émetteur des factures)
      // pour que le RIB/mentions apparaissent immédiatement, sans F5.
      await reloadBranding();
      toast.success(
        isEn
          ? 'Billing details saved — they will now appear on your invoices.'
          : 'Coordonnées de facturation enregistrées — elles apparaîtront sur vos factures.',
      );
    } catch {
      toast.error(isEn ? 'Save failed. Please try again.' : "Échec de l'enregistrement. Réessaie.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        backHref="/settings"
        backLabel={isEn ? 'Back to settings' : 'Retour aux paramètres'}
        eyebrow={isEn ? 'Organization' : 'Organisation'}
        title={
          <>
            {isEn ? 'Billing' : 'Facturation'}{' '}
            <span className="qc-italic-accent font-editorial italic">
              {isEn ? '& company.' : '& société.'}
            </span>
          </>
        }
        description={
          isEn
            ? 'Bank details and legal information for your company — printed on your invoices and contracts.'
            : 'RIB et mentions légales de votre ESN — imprimés sur vos factures et contrats.'
        }
        actions={<Landmark className="h-5 w-5 text-magenta" />}
      />

      {!isAdmin && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {isEn
            ? 'Only administrators can edit the billing information.'
            : 'Seuls les administrateurs peuvent modifier les informations de facturation.'}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> {isEn ? 'Loading…' : 'Chargement…'}
        </div>
      ) : (
        <div className="max-w-2xl space-y-8">
          {/* ---- RIB / coordonnées bancaires (la demande principale) ---- */}
          <section>
            <SectionHeader
              eyebrow={isEn ? 'Payment' : 'Paiement'}
              title={
                <>
                  {isEn ? 'Bank' : 'Coordonnées'}{' '}
                  <span className="qc-italic-accent font-editorial italic">
                    {isEn ? 'details (RIB).' : 'bancaires (RIB).'}
                  </span>
                </>
              }
              description={
                isEn
                  ? 'Shown on your client invoices in a « Coordonnées bancaires » block so your clients can pay you by bank transfer.'
                  : 'Affichées sur vos factures clients dans un bloc « Coordonnées bancaires » pour que vos clients vous règlent par virement.'
              }
              actions={<Landmark className="h-4 w-4 text-magenta" />}
            />
            <AppCard variant="default" tone="magenta">
              <AppCardBody size="md" className="space-y-4">
                <Field
                  id="bank_name"
                  label={isEn ? 'Bank' : 'Banque'}
                  placeholder={isEn ? 'e.g. BNP Paribas' : 'Ex : BNP Paribas'}
                  value={val('bank_name')}
                  onChange={setText('bank_name')}
                  disabled={!isAdmin}
                  maxLength={120}
                />
                <Field
                  id="iban"
                  label="IBAN"
                  placeholder="FR76 3000 4000 0100 0000 0000 000"
                  value={val('iban')}
                  onChange={setText('iban')}
                  disabled={!isAdmin}
                  maxLength={40}
                  mono
                />
                <Field
                  id="bic"
                  label="BIC / SWIFT"
                  placeholder="BNPAFRPPXXX"
                  value={val('bic')}
                  onChange={setText('bic')}
                  disabled={!isAdmin}
                  maxLength={20}
                  mono
                />
              </AppCardBody>
            </AppCard>
          </section>

          {/* ---- Mentions légales société ---- */}
          <section>
            <SectionHeader
              eyebrow={isEn ? 'Legal information' : 'Mentions légales'}
              title={
                <>
                  {isEn ? 'Company' : 'Identité'}{' '}
                  <span className="qc-italic-accent font-editorial italic">
                    {isEn ? 'identity.' : 'société.'}
                  </span>
                </>
              }
              description={
                isEn
                  ? 'Address, registration and legal representative — reproduced on invoices and contracts (required for a compliant invoice).'
                  : 'Adresse, immatriculation et représentant légal — repris sur factures et contrats (obligatoire pour une facture conforme).'
              }
              actions={<Building2 className="h-4 w-4 text-magenta" />}
            />
            <AppCard variant="default" tone="violet">
              <AppCardBody size="md" className="space-y-4">
                <Field
                  id="address"
                  label={isEn ? 'Address' : 'Adresse'}
                  placeholder={isEn ? '12 Republic Street' : '12 rue de la République'}
                  value={val('address')}
                  onChange={setText('address')}
                  disabled={!isAdmin}
                  maxLength={200}
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field
                    id="postal_code"
                    label={isEn ? 'Postal code' : 'Code postal'}
                    placeholder="75001"
                    value={val('postal_code')}
                    onChange={setText('postal_code')}
                    disabled={!isAdmin}
                    maxLength={20}
                  />
                  <Field
                    id="city"
                    label={isEn ? 'City' : 'Ville'}
                    placeholder="Paris"
                    value={val('city')}
                    onChange={setText('city')}
                    disabled={!isAdmin}
                    maxLength={100}
                    className="sm:col-span-2"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="legal_form"
                    label={isEn ? 'Legal form' : 'Forme juridique'}
                    placeholder="SAS, SARL…"
                    value={val('legal_form')}
                    onChange={setText('legal_form')}
                    disabled={!isAdmin}
                    maxLength={40}
                  />
                  <Field
                    id="capital_eur"
                    label={isEn ? 'Share capital (€)' : 'Capital social (€)'}
                    placeholder="10000"
                    value={val('capital_eur')}
                    onChange={setCapital}
                    disabled={!isAdmin}
                    inputMode="decimal"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="siren"
                    label="SIREN"
                    placeholder="123 456 789"
                    value={val('siren')}
                    onChange={setText('siren')}
                    disabled={!isAdmin}
                    maxLength={20}
                  />
                  <Field
                    id="siret"
                    label="SIRET"
                    placeholder="123 456 789 00012"
                    value={val('siret')}
                    onChange={setText('siret')}
                    disabled={!isAdmin}
                    maxLength={20}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="vat_number"
                    label={isEn ? 'Intra-EU VAT no.' : 'N° TVA intracom.'}
                    placeholder="FR 12 345678901"
                    value={val('vat_number')}
                    onChange={setText('vat_number')}
                    disabled={!isAdmin}
                    maxLength={40}
                  />
                  <Field
                    id="rcs"
                    label="RCS"
                    placeholder="RCS Paris 123 456 789"
                    value={val('rcs')}
                    onChange={setText('rcs')}
                    disabled={!isAdmin}
                    maxLength={120}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="representative_name"
                    label={isEn ? 'Legal representative' : 'Représentant légal'}
                    placeholder="Jean Dupont"
                    value={val('representative_name')}
                    onChange={setText('representative_name')}
                    disabled={!isAdmin}
                    maxLength={120}
                  />
                  <Field
                    id="representative_title"
                    label={isEn ? 'Role' : 'Qualité'}
                    placeholder={isEn ? 'President, Manager…' : 'Président, Gérant…'}
                    value={val('representative_title')}
                    onChange={setText('representative_title')}
                    disabled={!isAdmin}
                    maxLength={120}
                  />
                </div>
              </AppCardBody>
            </AppCard>
          </section>

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={!isAdmin || saving}
              onClick={save}
              className="bg-gradient-to-r from-violet-glow to-magenta-neon hover:opacity-95"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEn ? 'Save' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

/** Ne garde que les champs éditables de la réponse identity. */
function pickIdentity(d: Partial<Identity>): Partial<Identity> {
  const keys: (keyof Identity)[] = [
    'address', 'city', 'postal_code', 'country', 'siren', 'siret', 'vat_number',
    'rcs', 'capital_eur', 'legal_form', 'representative_name', 'representative_title',
    'iban', 'bic', 'bank_name',
  ];
  const out: Partial<Identity> = {};
  for (const k of keys) if (d[k] !== undefined) (out as Record<string, unknown>)[k] = d[k];
  return out;
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  maxLength,
  mono,
  inputMode,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  mono?: boolean;
  inputMode?: 'decimal';
  className?: string;
}) {
  return (
    <div className={['space-y-2', className].filter(Boolean).join(' ')}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        inputMode={inputMode}
        className={mono ? 'font-mono' : undefined}
      />
    </div>
  );
}
