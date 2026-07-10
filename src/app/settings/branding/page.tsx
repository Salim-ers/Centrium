'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Palette, Upload, Trash2, Loader2, RotateCcw, LayoutTemplate, PenLine } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import {
  PageHeader,
  SectionHeader,
  AppCard,
  AppCardBody,
} from '@/components/app';

const DEFAULT_PRIMARY = '#6d28d9';
const DEFAULT_ACCENT = '#e11d74';

type TemplateId = 'standard' | 'dense' | 'executive';

const TEMPLATE_OPTIONS: Array<{
  id: TemplateId;
  name: string;
  description: string;
  description_en: string;
}> = [
  {
    id: 'standard',
    name: 'Standard',
    description:
      'Équilibré, lisible. Bon défaut pour la majorité des profils. Édition inline supportée.',
    description_en:
      'Balanced and readable. A solid default for most profiles. Inline editing supported.',
  },
  {
    id: 'dense',
    name: 'Dense',
    description:
      'Typographie serrée, header sombre. Idéal pour les profils seniors avec 8+ missions.',
    description_en:
      'Tight typography, dark header. Ideal for senior profiles with 8+ assignments.',
  },
  {
    id: 'executive',
    name: 'Executive',
    description:
      'Très aéré, typo large. Conseillé pour les profils lead, architectes, direction.',
    description_en:
      'Very airy, large typography. Recommended for lead, architect and management profiles.',
  },
];

type Branding = {
  id: string;
  name: string;
  logo_url: string | null;
  brand_name: string | null;
  footer_tagline: string | null;
  brand_primary_color: string | null;
  brand_accent_color: string | null;
  default_cv_template: TemplateId | null;
  signature_url: string | null;
};

export default function BrandingSettingsPage() {
  const { role, reloadBranding } = useOrganization();
  const isAdmin = role === 'admin';
  const { locale } = useLocale();
  const isEn = locale === 'en';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [deletingSig, setDeletingSig] = useState(false);

  const [initial, setInitial] = useState<Branding | null>(null);
  const [brandName, setBrandName] = useState('');
  const [footerTagline, setFooterTagline] = useState('');
  const [primary, setPrimary] = useState(DEFAULT_PRIMARY);
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [defaultTemplate, setDefaultTemplate] = useState<TemplateId>('standard');

  const fileRef = useRef<HTMLInputElement | null>(null);
  const sigRef = useRef<HTMLInputElement | null>(null);

  const applyFromApi = useCallback((b: Branding) => {
    setInitial(b);
    setBrandName(b.brand_name ?? '');
    setFooterTagline(b.footer_tagline ?? '');
    setPrimary(b.brand_primary_color ?? DEFAULT_PRIMARY);
    setAccent(b.brand_accent_color ?? DEFAULT_ACCENT);
    setLogoUrl(b.logo_url);
    setSignatureUrl(b.signature_url);
    setDefaultTemplate(b.default_cv_template ?? 'standard');
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/organizations/branding', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { data } = (await res.json()) as { data: Branding };
        if (alive) applyFromApi(data);
      } catch {
        if (alive)
          toast.error(
            isEn
              ? 'Unable to load the visual identity.'
              : "Impossible de charger l'identité visuelle.",
          );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [applyFromApi]);

  const save = async () => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const body = {
        brand_name: brandName.trim() || null,
        footer_tagline: footerTagline.trim() || null,
        brand_primary_color: primary || null,
        brand_accent_color: accent || null,
        default_cv_template: defaultTemplate,
      };
      const res = await fetch('/api/organizations/branding', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data } = (await res.json()) as { data: Branding };
      applyFromApi(data);
      await reloadBranding();
      toast.success(isEn ? 'Visual identity saved.' : 'Identité visuelle enregistrée.');
    } catch {
      toast.error(isEn ? 'Save failed.' : "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    if (!isAdmin) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/organizations/branding/logo', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }
      const url = json?.data?.logo_url as string | null;
      setLogoUrl(url);
      await reloadBranding();
      toast.success(isEn ? 'Logo updated.' : 'Logo mis à jour.');

      if (url) {
        const palette = await extractPaletteFromImage(file).catch(() => null);
        if (palette) {
          setPrimary(palette.primary);
          setAccent(palette.accent);
          toast.info(
            isEn
              ? 'Colors suggested from the logo. Adjust them before saving if needed.'
              : 'Couleurs suggérées depuis le logo. Ajustez-les avant d\'enregistrer si besoin.',
          );
        }
      }
    } catch (e) {
      toast.error(
        `${isEn ? 'Logo upload failed' : 'Upload du logo échoué'}${e instanceof Error ? ` : ${e.message}` : ''}.`,
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeLogo = async () => {
    if (!isAdmin) return;
    if (
      !confirm(
        isEn
          ? 'Delete the logo? The generic logo will be shown instead.'
          : 'Supprimer le logo ? Le logo générique sera affiché à la place.',
      )
    )
      return;
    setDeletingLogo(true);
    try {
      const res = await fetch('/api/organizations/branding/logo', { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLogoUrl(null);
      await reloadBranding();
      toast.success(isEn ? 'Logo deleted.' : 'Logo supprimé.');
    } catch {
      toast.error(isEn ? 'Failed to delete the logo.' : 'Suppression du logo échouée.');
    } finally {
      setDeletingLogo(false);
    }
  };

  const uploadSignature = async (file: File) => {
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
      if (!res.ok) {
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }
      setSignatureUrl((json?.data?.signature_url as string | null) ?? null);
      await reloadBranding();
      toast.success(isEn ? 'Signature updated.' : 'Signature mise à jour.');
    } catch (e) {
      toast.error(
        `${isEn ? 'Signature upload failed' : 'Upload de la signature échoué'}${e instanceof Error ? ` : ${e.message}` : ''}.`,
      );
    } finally {
      setUploadingSig(false);
      if (sigRef.current) sigRef.current.value = '';
    }
  };

  const removeSignature = async () => {
    if (!isAdmin) return;
    if (
      !confirm(
        isEn
          ? 'Delete the signature? Documents will use the default text rendering.'
          : 'Supprimer la signature ? Les documents utiliseront le rendu texte par défaut.',
      )
    )
      return;
    setDeletingSig(true);
    try {
      const res = await fetch('/api/organizations/branding/signature', { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSignatureUrl(null);
      await reloadBranding();
      toast.success(isEn ? 'Signature deleted.' : 'Signature supprimée.');
    } catch {
      toast.error(
        isEn ? 'Failed to delete the signature.' : 'Suppression de la signature échouée.',
      );
    } finally {
      setDeletingSig(false);
    }
  };

  const resetColors = () => {
    setPrimary(DEFAULT_PRIMARY);
    setAccent(DEFAULT_ACCENT);
  };

  const dirty =
    !!initial &&
    (brandName !== (initial.brand_name ?? '') ||
      footerTagline !== (initial.footer_tagline ?? '') ||
      primary !== (initial.brand_primary_color ?? DEFAULT_PRIMARY) ||
      accent !== (initial.brand_accent_color ?? DEFAULT_ACCENT) ||
      defaultTemplate !== (initial.default_cv_template ?? 'standard'));

  return (
    <AppShell>
      <PageHeader
        backHref="/settings"
        backLabel={isEn ? 'Back to settings' : 'Retour aux paramètres'}
        eyebrow={isEn ? 'Organization' : 'Organisation'}
        title={
          <>
            {isEn ? 'Visual' : 'Identité'}{' '}
            <span className="qc-italic-accent font-editorial italic">
              {isEn ? 'identity.' : 'visuelle.'}
            </span>
          </>
        }
        description={
          isEn
            ? 'Branding shown to your consultants and clients: sidebar, generated CVs, contracts, invoices, CRA.'
            : 'Branding affiché à vos consultants et à vos clients : sidebar, CV générés, contrats, factures, CRA.'
        }
        actions={<Palette className="h-5 w-5 text-magenta" />}
      />

      {!isAdmin && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {isEn
            ? 'Only administrators can modify the visual identity.'
            : "Seuls les administrateurs peuvent modifier l'identité visuelle."}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> {isEn ? 'Loading…' : 'Chargement…'}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            <section>
              <SectionHeader
                eyebrow="Assets"
                title={
                  <>
                    {isEn ? 'Brand' : 'Logo'}{' '}
                    <span className="qc-italic-accent font-editorial italic">
                      {isEn ? 'logo.' : 'de marque.'}
                    </span>
                  </>
                }
                description={
                  isEn
                    ? 'PNG, JPG, WebP or SVG — 5 MB max. Shown in the header of CVs.'
                    : 'PNG, JPG, WebP ou SVG — 5 Mo maximum. Affiché en en-tête des CV.'
                }
              />
              <AppCard variant="default" tone="magenta">
                <AppCardBody size="md">
                <div className="flex items-start gap-5">
                  <div className="h-24 w-40 rounded-md border border-border bg-neutral-900/40 flex items-center justify-center overflow-hidden">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
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
                    <div className="flex gap-2">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadLogo(f);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!isAdmin || uploading}
                        onClick={() => fileRef.current?.click()}
                      >
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {logoUrl
                          ? isEn
                            ? 'Replace'
                            : 'Remplacer'
                          : isEn
                            ? 'Upload'
                            : 'Téléverser'}
                      </Button>
                      {logoUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!isAdmin || deletingLogo}
                          onClick={removeLogo}
                        >
                          {deletingLogo ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          {isEn ? 'Delete' : 'Supprimer'}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isEn
                        ? 'Transparent background recommended. Otherwise a generic logo is used.'
                        : 'Transparent recommandé. À défaut, un logo générique est utilisé.'}
                    </p>
                  </div>
                </div>
                </AppCardBody>
              </AppCard>
            </section>

            <section>
              <SectionHeader
                eyebrow={isEn ? 'Official document' : 'Document officiel'}
                title={
                  <>
                    {isEn ? 'Official' : 'Signature'}{' '}
                    <span className="qc-italic-accent font-editorial italic">
                      {isEn ? 'signature.' : 'officielle.'}
                    </span>
                  </>
                }
                description={
                  isEn
                    ? 'Transparent PNG strongly recommended — 3 MB max. Embedded in contracts, CRA and invoices in place of the styled text rendering.'
                    : 'PNG transparent fortement recommandé — 3 Mo maximum. Incrustée dans les contrats, CRA et factures à la place du rendu texte stylisé.'
                }
                actions={<PenLine className="h-4 w-4 text-magenta" />}
              />
              <AppCard variant="default" tone="violet">
                <AppCardBody size="md">
                <div className="flex items-start gap-5">
                  <div className="h-24 w-40 rounded-md border border-border bg-neutral-50 flex items-center justify-center overflow-hidden">
                    {signatureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={signatureUrl}
                        alt="Signature"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                        {isEn ? 'No signature' : 'Aucune signature'}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
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
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!isAdmin || uploadingSig}
                        onClick={() => sigRef.current?.click()}
                      >
                        {uploadingSig ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {signatureUrl
                          ? isEn
                            ? 'Replace'
                            : 'Remplacer'
                          : isEn
                            ? 'Upload'
                            : 'Téléverser'}
                      </Button>
                      {signatureUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!isAdmin || deletingSig}
                          onClick={removeSignature}
                        >
                          {deletingSig ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          {isEn ? 'Delete' : 'Supprimer'}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isEn
                        ? 'Scan or export of a signed stroke, on a transparent background.'
                        : "Scan ou export d'un trait signé, sur fond transparent."}
                    </p>
                  </div>
                </div>
                </AppCardBody>
              </AppCard>
            </section>

            <section>
              <SectionHeader
                eyebrow={isEn ? 'Footer' : 'Mentions'}
                title={
                  <>
                    {isEn ? 'Brand' : 'Texte'}{' '}
                    <span className="qc-italic-accent font-editorial italic">
                      {isEn ? 'text.' : 'de marque.'}
                    </span>
                  </>
                }
                description={
                  isEn
                    ? `Shown in the footer of CVs, contracts and invoices (e.g. "MyCompany — IT Services & Consulting").`
                    : `Affiché dans le footer des CV, contrats et factures (ex: "MaSociété — IT Services & Consulting").`
                }
              />
              <AppCard variant="default" tone="cyan">
                <AppCardBody size="md" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand_name">{isEn ? 'Brand name' : 'Nom de marque'}</Label>
                    <Input
                      id="brand_name"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder={initial?.name ?? (isEn ? 'Your company' : 'Votre ESN')}
                      disabled={!isAdmin}
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="footer_tagline">
                      {isEn ? 'Footer tagline' : 'Tagline du footer'}
                    </Label>
                    <Input
                      id="footer_tagline"
                      value={footerTagline}
                      onChange={(e) => setFooterTagline(e.target.value)}
                      placeholder="IT Services & Consulting"
                      disabled={!isAdmin}
                      maxLength={160}
                    />
                  </div>
                </AppCardBody>
              </AppCard>
            </section>

            <section>
              <SectionHeader
                eyebrow="Palette"
                title={
                  <>
                    {isEn ? 'Brand' : 'Couleurs'}{' '}
                    <span className="qc-italic-accent font-editorial italic">
                      {isEn ? 'colors.' : 'de marque.'}
                    </span>
                  </>
                }
                description={
                  isEn
                    ? 'Separators, job titles and decorative accents on CVs.'
                    : 'Séparateurs, intitulés de poste et accents décoratifs des CV.'
                }
                actions={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!isAdmin}
                    onClick={resetColors}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {isEn ? 'Reset' : 'Réinitialiser'}
                  </Button>
                }
              />
              <AppCard variant="default" tone="rose">
                <AppCardBody size="md" className="grid gap-4 sm:grid-cols-2">
                  <ColorField
                    label={isEn ? 'Primary color' : 'Couleur principale'}
                    hint={
                      isEn
                        ? 'Used for headings, banners and titles.'
                        : 'Utilisée pour les titres, bandeaux et intitulés.'
                    }
                    value={primary}
                    onChange={setPrimary}
                    disabled={!isAdmin}
                  />
                  <ColorField
                    label={isEn ? 'Accent color' : "Couleur d'accent"}
                    hint={
                      isEn
                        ? 'Used for bullets, separators and highlights.'
                        : 'Utilisée pour les puces, séparateurs et highlights.'
                    }
                    value={accent}
                    onChange={setAccent}
                    disabled={!isAdmin}
                  />
                </AppCardBody>
              </AppCard>
            </section>

            <section>
              <SectionHeader
                eyebrow="Layout"
                title={
                  <>
                    {isEn ? 'Default' : 'Template'}{' '}
                    <span className="qc-italic-accent font-editorial italic">
                      {isEn ? 'template.' : 'par défaut.'}
                    </span>
                  </>
                }
                description={
                  isEn
                    ? 'Layout preselected when opening the CV Optimizer. Each user can still switch it on a one-off basis.'
                    : "Layout présélectionné à l'ouverture du CV Optimizer. Chaque utilisateur peut toujours changer ponctuellement."
                }
                actions={<LayoutTemplate className="h-4 w-4 text-magenta" />}
              />
              <AppCard variant="default" tone="amber">
                <AppCardBody size="md" className="space-y-2">
                  {TEMPLATE_OPTIONS.map((opt) => {
                    const selected = defaultTemplate === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => setDefaultTemplate(opt.id)}
                        className={[
                          'w-full rounded-md border px-4 py-3 text-left transition-colors',
                          'disabled:cursor-not-allowed disabled:opacity-60',
                          selected
                            ? 'border-violet-glow/70 bg-violet-glow/10'
                            : 'border-border hover:border-border/80 hover:bg-muted/30',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{opt.name}</span>
                          {selected && (
                            <span className="text-[10px] uppercase tracking-wider text-violet-glow font-bold">
                              {isEn ? 'Selected' : 'Sélectionné'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isEn ? opt.description_en : opt.description}
                        </p>
                      </button>
                    );
                  })}
                </AppCardBody>
              </AppCard>
            </section>

            <div className="flex justify-end">
              <Button
                type="button"
                disabled={!isAdmin || !dirty || saving}
                onClick={save}
                className="bg-gradient-to-r from-violet-glow to-magenta-neon hover:opacity-95"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEn ? 'Save' : 'Enregistrer'}
              </Button>
            </div>
          </div>

          <aside className="space-y-4">
            <SectionHeader
              eyebrow="Preview"
              title={
                <>
                  {isEn ? 'CV' : 'Aperçu'}{' '}
                  <span className="qc-italic-accent font-editorial italic">
                    {isEn ? 'preview.' : 'CV.'}
                  </span>
                </>
              }
              description={isEn ? 'Rendering applied to CVs.' : 'Rendu appliqué sur les CV.'}
            />
            <AppCard variant="luminous" tone="magenta">
              <AppCardBody size="md">
                <div className="rounded-md border border-border bg-white text-neutral-900 p-5">
                  <div className="h-12 flex items-center">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoUrl}
                        alt=""
                        className="h-10 w-auto object-contain"
                      />
                    ) : (
                      <QuadCoreLogo size="sm" variant="light" />
                    )}
                  </div>
                  <div
                    className="mt-4 h-[2px] w-full"
                    style={{
                      background: `linear-gradient(90deg, ${primary} 0%, ${accent} 55%, transparent 100%)`,
                    }}
                  />
                  <div className="mt-4">
                    <div className="text-[20px] font-bold leading-tight text-neutral-900">
                      Jean Dupont
                    </div>
                    <div className="text-[13px] font-semibold mt-1" style={{ color: primary }}>
                      {isEn ? 'Senior Consultant' : 'Consultant Senior'}
                    </div>
                  </div>
                  <div className="mt-4 text-[10px] text-neutral-400 flex justify-between border-t border-neutral-200 pt-2">
                    <span>
                      {brandName.trim() || initial?.name || (isEn ? 'Your company' : 'Votre ESN')}
                      {(footerTagline.trim() || '') && ` — ${footerTagline.trim()}`}
                    </span>
                    <span className="uppercase tracking-wider">
                      {isEn ? 'Confidential' : 'Confidentiel'}
                    </span>
                  </div>
                </div>
              </AppCardBody>
            </AppCard>
          </aside>
        </div>
      )}
    </AppShell>
  );
}

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

function ColorField({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-md border border-border bg-transparent disabled:opacity-50"
        />
        <Input
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (/^#([0-9a-fA-F]{3}){1,2}$/.test(v) || v === '') onChange(v || '#000000');
          }}
          className="font-mono text-sm"
          maxLength={7}
        />
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
