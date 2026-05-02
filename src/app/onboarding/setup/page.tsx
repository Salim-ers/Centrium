'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2,
  Sparkles,
  Upload,
  CheckCircle2,
  Building2,
  Palette,
  PenLine,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useOrganization } from '@/lib/auth/context';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';

const DEFAULT_PRIMARY = '#6d28d9';
const DEFAULT_ACCENT = '#e11d74';

type IdentityForm = {
  brand_name: string;
  footer_tagline: string;
  legal_form: string;
  capital_eur: string;
  representative_name: string;
  representative_title: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  siren: string;
  siret: string;
  vat_number: string;
  rcs: string;
};

const EMPTY_IDENTITY: IdentityForm = {
  brand_name: '',
  footer_tagline: '',
  legal_form: 'SAS',
  capital_eur: '',
  representative_name: '',
  representative_title: 'Président',
  address: '',
  postal_code: '',
  city: '',
  country: 'FR',
  siren: '',
  siret: '',
  vat_number: '',
  rcs: '',
};

export default function OnboardingSetupPage() {
  const router = useRouter();
  const { activeOrgId, role, branding, reloadBranding } = useOrganization();
  const isAdmin = role === 'admin';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState<IdentityForm>(EMPTY_IDENTITY);
  const [primary, setPrimary] = useState(DEFAULT_PRIMARY);
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  const [savingIdentity, setSavingIdentity] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [savingColors, setSavingColors] = useState(false);

  const logoRef = useRef<HTMLInputElement>(null);
  const sigRef = useRef<HTMLInputElement>(null);

  // Charge l'état actuel
  const reload = useCallback(async () => {
    try {
      const [identityRes, brandingRes] = await Promise.all([
        fetch('/api/organizations/identity', { cache: 'no-store' }),
        fetch('/api/organizations/branding', { cache: 'no-store' }),
      ]);
      if (identityRes.ok) {
        const { data } = (await identityRes.json()) as { data: Record<string, unknown> };
        setIdentity({
          brand_name: (data.brand_name as string) ?? '',
          footer_tagline: (data.footer_tagline as string) ?? '',
          legal_form: (data.legal_form as string) ?? 'SAS',
          capital_eur: data.capital_eur != null ? String(data.capital_eur) : '',
          representative_name: (data.representative_name as string) ?? '',
          representative_title: (data.representative_title as string) ?? 'Président',
          address: (data.address as string) ?? '',
          postal_code: (data.postal_code as string) ?? '',
          city: (data.city as string) ?? '',
          country: (data.country as string) ?? 'FR',
          siren: (data.siren as string) ?? '',
          siret: (data.siret as string) ?? '',
          vat_number: (data.vat_number as string) ?? '',
          rcs: (data.rcs as string) ?? '',
        });
        setLogoUrl((data.logo_url as string | null) ?? null);
        setSignatureUrl((data.signature_url as string | null) ?? null);
      }
      if (brandingRes.ok) {
        const { data } = (await brandingRes.json()) as { data: Record<string, unknown> };
        setPrimary((data.brand_primary_color as string) ?? DEFAULT_PRIMARY);
        setAccent((data.brand_accent_color as string) ?? DEFAULT_ACCENT);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeOrgId) reload();
  }, [activeOrgId, reload]);

  async function saveIdentity() {
    if (!isAdmin) return;
    setSavingIdentity(true);
    try {
      // Identité visuelle (brand_name, footer)
      const brandRes = await fetch('/api/organizations/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: identity.brand_name.trim() || null,
          footer_tagline: identity.footer_tagline.trim() || null,
        }),
      });
      if (!brandRes.ok) throw new Error('branding');

      // Identité légale
      const idRes = await fetch('/api/organizations/identity', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legal_form: identity.legal_form.trim() || null,
          capital_eur: identity.capital_eur ? Number(identity.capital_eur) : null,
          representative_name: identity.representative_name.trim() || null,
          representative_title: identity.representative_title.trim() || null,
          address: identity.address.trim() || null,
          postal_code: identity.postal_code.trim() || null,
          city: identity.city.trim() || null,
          country: identity.country.trim() || 'FR',
          siren: identity.siren.trim() || null,
          siret: identity.siret.trim() || null,
          vat_number: identity.vat_number.trim() || null,
          rcs: identity.rcs.trim() || null,
        }),
      });
      if (!idRes.ok) throw new Error('identity');

      await reloadBranding();
      toast.success('Identité enregistrée.');
      setStep(2);
    } catch {
      toast.error("Échec d'enregistrement de l'identité.");
    } finally {
      setSavingIdentity(false);
    }
  }

  async function uploadLogo(file: File) {
    if (!isAdmin) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/organizations/branding/logo', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setLogoUrl((json?.data?.logo_url as string | null) ?? null);

      // Extraction palette automatique
      const palette = await extractPaletteFromImage(file).catch(() => null);
      if (palette) {
        setPrimary(palette.primary);
        setAccent(palette.accent);
        toast.info("Couleurs suggérées depuis le logo. Ajustables.");
      } else {
        toast.success('Logo téléversé.');
      }
      await reloadBranding();
    } catch (e) {
      toast.error(`Upload du logo échoué${e instanceof Error ? ` : ${e.message}` : ''}.`);
    } finally {
      setUploadingLogo(false);
      if (logoRef.current) logoRef.current.value = '';
    }
  }

  async function saveColors() {
    if (!isAdmin) return;
    setSavingColors(true);
    try {
      const res = await fetch('/api/organizations/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_primary_color: primary,
          brand_accent_color: accent,
        }),
      });
      if (!res.ok) throw new Error();
      await reloadBranding();
      toast.success('Couleurs enregistrées.');
      setStep(3);
    } catch {
      toast.error('Erreur enregistrement couleurs.');
    } finally {
      setSavingColors(false);
    }
  }

  async function uploadSignature(file: File) {
    if (!isAdmin) return;
    setUploadingSig(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/organizations/branding/signature', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setSignatureUrl((json?.data?.signature_url as string | null) ?? null);
      await reloadBranding();
      toast.success('Signature ajoutée.');
    } catch (e) {
      toast.error(`Upload signature échoué${e instanceof Error ? ` : ${e.message}` : ''}.`);
    } finally {
      setUploadingSig(false);
      if (sigRef.current) sigRef.current.value = '';
    }
  }

  function finish() {
    router.push('/dashboard');
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-midnight-300 p-6">
        <Card className="max-w-md">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Seul un administrateur peut configurer l&apos;identité de l&apos;organisation.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-midnight-300">
        <Loader2 className="h-6 w-6 animate-spin text-violet-glow" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight-300 p-6">
      <div className="mx-auto max-w-3xl">
        {/* Stepper */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-glow" />
            Personnalise ton espace
          </h1>
          <button
            onClick={finish}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Plus tard ↗
          </button>
        </div>
        <div className="mb-8 flex items-center gap-2">
          <StepDot n={1} active={step === 1} done={step > 1} label="Identité" />
          <span className="h-px flex-1 bg-white/10" />
          <StepDot n={2} active={step === 2} done={step > 2} label="Logo & couleurs" />
          <span className="h-px flex-1 bg-white/10" />
          <StepDot n={3} active={step === 3} done={false} label="Signature" />
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-violet-glow" />
                Identité de ton entreprise
              </CardTitle>
              <CardDescription>
                Ces infos apparaîtront sur tes contrats, factures et CRA. Tu pourras tout
                modifier plus tard depuis Paramètres → Identité visuelle.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Section title="Marque (visible)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Nom de marque">
                    <Input
                      value={identity.brand_name}
                      onChange={(e) => setIdentity({ ...identity, brand_name: e.target.value })}
                      placeholder="Ma Société"
                    />
                  </Field>
                  <Field label="Tagline du footer">
                    <Input
                      value={identity.footer_tagline}
                      onChange={(e) => setIdentity({ ...identity, footer_tagline: e.target.value })}
                      placeholder="IT Services & Consulting"
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Identité légale">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Forme juridique">
                    <Select
                      value={identity.legal_form}
                      onChange={(e) => setIdentity({ ...identity, legal_form: e.target.value })}
                    >
                      <option value="SAS">SAS</option>
                      <option value="SASU">SASU</option>
                      <option value="SARL">SARL</option>
                      <option value="EURL">EURL</option>
                      <option value="SA">SA</option>
                      <option value="EI">EI</option>
                      <option value="Auto-entrepreneur">Auto-entrepreneur</option>
                    </Select>
                  </Field>
                  <Field label="Capital social (€)">
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={identity.capital_eur}
                      onChange={(e) => setIdentity({ ...identity, capital_eur: e.target.value })}
                      placeholder="10000"
                    />
                  </Field>
                  <Field label="N° RCS">
                    <Input
                      value={identity.rcs}
                      onChange={(e) => setIdentity({ ...identity, rcs: e.target.value })}
                      placeholder="123 456 789 R.C.S. Paris"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="SIREN">
                    <Input
                      value={identity.siren}
                      onChange={(e) => setIdentity({ ...identity, siren: e.target.value })}
                      placeholder="123456789"
                    />
                  </Field>
                  <Field label="SIRET">
                    <Input
                      value={identity.siret}
                      onChange={(e) => setIdentity({ ...identity, siret: e.target.value })}
                      placeholder="12345678900012"
                    />
                  </Field>
                  <Field label="N° TVA intracommunautaire">
                    <Input
                      value={identity.vat_number}
                      onChange={(e) => setIdentity({ ...identity, vat_number: e.target.value })}
                      placeholder="FR12123456789"
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Adresse du siège">
                <div className="grid grid-cols-1 gap-3">
                  <Field label="Adresse">
                    <Input
                      value={identity.address}
                      onChange={(e) => setIdentity({ ...identity, address: e.target.value })}
                      placeholder="123 rue de la Paix"
                    />
                  </Field>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label="Code postal">
                      <Input
                        value={identity.postal_code}
                        onChange={(e) => setIdentity({ ...identity, postal_code: e.target.value })}
                        placeholder="75001"
                      />
                    </Field>
                    <Field label="Ville">
                      <Input
                        value={identity.city}
                        onChange={(e) => setIdentity({ ...identity, city: e.target.value })}
                        placeholder="Paris"
                      />
                    </Field>
                    <Field label="Pays (code 2)">
                      <Input
                        maxLength={3}
                        value={identity.country}
                        onChange={(e) =>
                          setIdentity({ ...identity, country: e.target.value.toUpperCase() })
                        }
                        placeholder="FR"
                      />
                    </Field>
                  </div>
                </div>
              </Section>

              <Section title="Représentant légal (signataire des contrats)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Nom complet">
                    <Input
                      value={identity.representative_name}
                      onChange={(e) =>
                        setIdentity({ ...identity, representative_name: e.target.value })
                      }
                      placeholder="Jean Dupont"
                    />
                  </Field>
                  <Field label="Fonction">
                    <Input
                      value={identity.representative_title}
                      onChange={(e) =>
                        setIdentity({ ...identity, representative_title: e.target.value })
                      }
                      placeholder="Président"
                    />
                  </Field>
                </div>
              </Section>

              <div className="flex justify-end pt-2">
                <Button onClick={saveIdentity} disabled={savingIdentity}>
                  {savingIdentity && <Loader2 className="h-4 w-4 animate-spin" />}
                  Suivant : logo & couleurs
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4 text-violet-glow" />
                Logo & couleurs
              </CardTitle>
              <CardDescription>
                Le logo apparaît dans la sidebar, les CV générés, contrats et factures. Les
                couleurs personnalisent toute l&apos;application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-5">
                <div className="h-28 w-44 rounded-md border border-border bg-neutral-900/40 flex items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <QuadCoreLogo size="sm" variant="light" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={logoRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadLogo(f);
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => logoRef.current?.click()}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {logoUrl ? 'Remplacer le logo' : 'Téléverser un logo'}
                  </Button>
                  <p className="text-[11px] text-muted-foreground max-w-[280px]">
                    PNG transparent recommandé. Les couleurs ci-dessous seront extraites
                    automatiquement de ton logo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorField
                  label="Couleur principale"
                  value={primary}
                  onChange={setPrimary}
                />
                <ColorField label="Couleur d'accent" value={accent} onChange={setAccent} />
              </div>

              <div
                className="rounded-md p-4 text-white"
                style={{ background: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)` }}
              >
                <div className="font-semibold">Aperçu</div>
                <div className="text-xs opacity-80 mt-1">
                  Voici comment tes deux couleurs apparaîtront en gradient.
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPrimary(DEFAULT_PRIMARY);
                    setAccent(DEFAULT_ACCENT);
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Réinitialiser
                </Button>
                <Button onClick={saveColors} disabled={savingColors}>
                  {savingColors && <Loader2 className="h-4 w-4 animate-spin" />}
                  Suivant : signature
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PenLine className="h-4 w-4 text-violet-glow" />
                Signature officielle (optionnel)
              </CardTitle>
              <CardDescription>
                Image (PNG transparent) qui sera incrustée sur tes contrats, CRA et factures
                à la place du rendu texte par défaut.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-start gap-5">
                <div className="h-24 w-44 rounded-md border border-border bg-neutral-50 flex items-center justify-center overflow-hidden">
                  {signatureUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={signatureUrl}
                      alt="Signature"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                      Aucune signature
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={sigRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadSignature(f);
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploadingSig}
                    onClick={() => sigRef.current?.click()}
                  >
                    {uploadingSig ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {signatureUrl ? 'Remplacer' : 'Téléverser'}
                  </Button>
                  <p className="text-[11px] text-muted-foreground max-w-[280px]">
                    PNG transparent fortement recommandé. Si pas de signature image, un
                    rendu texte stylisé est utilisé par défaut.
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/[0.06] p-4 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-emerald-200">Configuration prête</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Tu pourras à tout moment retoucher tout ça depuis{' '}
                      <strong>Paramètres → Identité visuelle</strong>.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Retour
                </Button>
                <Button onClick={finish}>
                  Accéder au dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StepDot({
  n,
  active,
  done,
  label,
}: {
  n: number;
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs shrink-0">
      <div
        className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
          done
            ? 'bg-emerald-500/20 text-emerald-300'
            : active
              ? 'bg-violet-glow/20 text-violet-glow ring-2 ring-violet-glow/50'
              : 'bg-white/[0.05] text-white/40'
        }`}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : n}
      </div>
      <span
        className={
          active ? 'font-semibold text-foreground' : done ? 'text-emerald-300' : 'text-white/40'
        }
      >
        {label}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 pt-1">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-glow">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-md border border-border bg-transparent"
        />
        <Input
          value={value}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (/^#([0-9a-fA-F]{3}){1,2}$/.test(v) || v === '') onChange(v || '#000000');
          }}
          className="font-mono text-sm"
          maxLength={7}
        />
      </div>
    </div>
  );
}

// Mêmes heuristiques que dans /settings/branding pour pouvoir suggérer
// une palette à partir du logo uploadé.
type RGB = { r: number; g: number; b: number };

function rgbToHex({ r, g, b }: RGB) {
  const hex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function hue({ r, g, b }: RGB) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

async function extractPaletteFromImage(
  file: File,
): Promise<{ primary: string; accent: string } | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('image load failed'));
      el.src = url;
    });
    const MAX = 96;
    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 200) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (sat < 0.18) continue;
      if (lum < 0.08 || lum > 0.92) continue;
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
      const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      bucket.count += 1;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      buckets.set(key, bucket);
    }
    if (buckets.size === 0) return null;
    const ranked = [...buckets.values()]
      .map((b) => ({
        count: b.count,
        r: Math.round(b.r / b.count),
        g: Math.round(b.g / b.count),
        b: Math.round(b.b / b.count),
      }))
      .sort((a, b) => b.count - a.count);
    const first = ranked[0];
    const firstHue = hue(first);
    const second =
      ranked.find((c, idx) => idx > 0 && Math.abs(hue(c) - firstHue) > 25) ??
      ranked[1] ??
      first;
    return { primary: rgbToHex(first), accent: rgbToHex(second) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
