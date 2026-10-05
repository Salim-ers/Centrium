'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Upload, Trash2, Loader2, RotateCcw, LayoutTemplate, PenLine } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { PageHeader } from '@/components/app';
import { Segmented } from '@/components/app/Segmented';
import { DossierPreview, PortalPreview, QuotePreview } from '@/components/settings/BrandPreview';
import { cn } from '@/lib/utils';

const DEFAULT_PRIMARY = '#C65F46';
const DEFAULT_ACCENT = '#9D4432';

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

  const [preview, setPreview] = useState<'dossier' | 'quote' | 'portal'>('dossier');
  const [portalDark, setPortalDark] = useState(false);
  const [identity, setIdentity] = useState<{ address?: string | null; postal_code?: string | null; city?: string | null; siren?: string | null } | null>(null);

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

  useEffect(() => {
    let alive = true;
    fetch('/api/organizations/identity')
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { data?: { address?: string | null; postal_code?: string | null; city?: string | null; siren?: string | null } } | null) => {
        if (alive && body?.data) setIdentity(body.data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

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

  const previewProps = {
    logoUrl,
    primary,
    accent,
    brandName: brandName.trim() || initial?.name || (isEn ? 'Your company' : 'Votre ESN'),
    tagline: footerTagline.trim(),
    identity,
    lang: (isEn ? 'en' : 'fr') as 'fr' | 'en',
  };

  return (
    <AppShell>
      <PageHeader
        title="Branding"
        description={
          isEn
            ? 'Set your identity once: dossiers, quotes, contracts and portals pick it up automatically.'
            : 'Votre identité, réglée une fois : dossiers, devis, contrats et portails la reprennent automatiquement.'
        }
        actions={
          isAdmin && (
            <Button type="button" disabled={!dirty || saving} onClick={save} loading={saving}>
              {isEn ? 'Save' : 'Enregistrer'}
            </Button>
          )
        }
      />

      {!isAdmin && (
        <p className="mb-4 rounded-xl bg-warning-soft px-4 py-2.5 text-[13px] text-warning">
          {isEn ? 'Only administrators can modify the visual identity.' : "Seuls les administrateurs peuvent modifier l'identité visuelle."}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {isEn ? 'Loading…' : 'Chargement…'}
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
          <div className="space-y-3">
            <section className="tile-surface p-4">
              <h2 className="mb-3 text-[13.5px] font-semibold">{isEn ? 'Logo and signature' : 'Logo et signature'}</h2>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white p-2">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <QuadCoreLogo size="sm" variant="light" />
                  )}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadLogo(f);
                    }}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <Button type="button" variant="secondary" size="sm" disabled={!isAdmin || uploading} onClick={() => fileRef.current?.click()}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {logoUrl ? (isEn ? 'Replace' : 'Remplacer') : isEn ? 'Upload logo' : 'Ajouter le logo'}
                    </Button>
                    {logoUrl && (
                      <Button type="button" variant="ghost" size="sm" disabled={!isAdmin || deletingLogo} onClick={removeLogo} aria-label={isEn ? 'Delete the logo' : 'Supprimer le logo'}>
                        {deletingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{isEn ? 'PNG, JPG, WebP or SVG, 5 MB max. Transparent background recommended.' : 'PNG, JPG, WebP ou SVG, 5 Mo max. Fond transparent conseillé.'}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
                <div className="flex h-12 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40 p-1.5">
                  {signatureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{isEn ? 'No signature' : 'Aucune signature'}</span>
                  )}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <input
                    ref={sigRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadSignature(f);
                    }}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <Button type="button" variant="secondary" size="sm" disabled={!isAdmin || uploadingSig} onClick={() => sigRef.current?.click()}>
                      {uploadingSig ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                      {signatureUrl ? (isEn ? 'Replace' : 'Remplacer') : isEn ? 'Add signature' : 'Ajouter la signature'}
                    </Button>
                    {signatureUrl && (
                      <Button type="button" variant="ghost" size="sm" disabled={!isAdmin || deletingSig} onClick={removeSignature} aria-label={isEn ? 'Delete the signature' : 'Supprimer la signature'}>
                        {deletingSig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{isEn ? 'Embedded in contracts and timesheets.' : 'Incrustée dans les contrats et les CRA.'}</p>
                </div>
              </div>
            </section>

            <section className="tile-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[13.5px] font-semibold">{isEn ? 'Colors' : 'Couleurs'}</h2>
                <Button type="button" variant="ghost" size="sm" disabled={!isAdmin} onClick={resetColors}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  {isEn ? 'Reset' : 'Réinitialiser'}
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <ColorField
                  label={isEn ? 'Primary color' : 'Couleur principale'}
                  hint={isEn ? 'Titles, banners, buttons.' : 'Titres, bandeaux, boutons.'}
                  value={primary}
                  onChange={setPrimary}
                  disabled={!isAdmin}
                />
                <ColorField
                  label={isEn ? 'Secondary color' : 'Couleur secondaire'}
                  hint={isEn ? 'Bullets, separators, highlights.' : 'Puces, séparateurs, mises en avant.'}
                  value={accent}
                  onChange={setAccent}
                  disabled={!isAdmin}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{isEn ? 'Uploading a logo suggests colors you can adjust.' : 'Ajouter un logo propose des couleurs, à ajuster.'}</p>
            </section>

            <section className="tile-surface space-y-3 p-4">
              <h2 className="text-[13.5px] font-semibold">{isEn ? 'Name and document footer' : 'Nom et pied de page'}</h2>
              <div className="space-y-1.5">
                <Label htmlFor="brand_name">{isEn ? 'Display name' : 'Nom affiché'}</Label>
                <Input id="brand_name" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder={initial?.name ?? (isEn ? 'Your company' : 'Votre ESN')} disabled={!isAdmin} maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="footer_tagline">{isEn ? 'Footer line' : 'Ligne de pied de page'}</Label>
                <Input id="footer_tagline" value={footerTagline} onChange={(e) => setFooterTagline(e.target.value)} placeholder="IT Services & Consulting" disabled={!isAdmin} maxLength={160} />
              </div>
              <p className="text-xs text-muted-foreground">
                {isEn ? 'Address and legal mentions come from ' : 'Adresse et mentions légales viennent de '}
                <Link href="/settings" className="font-medium text-app-terra-dark underline-offset-2 hover:underline">
                  {isEn ? 'Organization' : 'Organisation'}
                </Link>
                .
              </p>
            </section>

            <section className="tile-surface p-4">
              <h2 className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold">
                <LayoutTemplate className="h-4 w-4 text-app-terra" />
                {isEn ? 'Default dossier layout' : 'Mise en page par défaut des dossiers'}
              </h2>
              <div className="space-y-1.5">
                {TEMPLATE_OPTIONS.map((opt) => {
                  const selected = defaultTemplate === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => setDefaultTemplate(opt.id)}
                      aria-pressed={selected}
                      className={cn(
                        'w-full rounded-xl border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                        selected ? 'border-app-terra/60 bg-app-peach-light' : 'border-border hover:bg-muted/40',
                      )}
                    >
                      <span className="flex items-center justify-between text-[13px] font-semibold">
                        {opt.name}
                        {selected && <span className="text-[10.5px] font-bold uppercase tracking-wider text-app-terra">{isEn ? 'Default' : 'Par défaut'}</span>}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{isEn ? opt.description_en : opt.description}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <section className="tile-surface flex flex-col p-4 xl:sticky xl:top-0 xl:max-h-[calc(100dvh-7.5rem)] xl:self-start">
            <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
              <h2 className="text-[13.5px] font-semibold">{isEn ? 'Live preview' : 'Aperçu en direct'}</h2>
              <div className="flex flex-wrap items-center gap-2">
                {preview === 'portal' && (
                  <Segmented<'light' | 'dark'>
                    label={isEn ? 'Portal menu' : 'Menu du portail'}
                    value={portalDark ? 'dark' : 'light'}
                    onChange={(v) => setPortalDark(v === 'dark')}
                    options={[
                      { value: 'light', label: isEn ? 'Light' : 'Clair' },
                      { value: 'dark', label: isEn ? 'Dark' : 'Sombre' },
                    ]}
                  />
                )}
                <Segmented<'dossier' | 'quote' | 'portal'>
                  label={isEn ? 'Document' : 'Document'}
                  value={preview}
                  onChange={setPreview}
                  options={[
                    { value: 'dossier', label: isEn ? 'Dossier' : 'Dossier' },
                    { value: 'quote', label: isEn ? 'Quote' : 'Devis' },
                    { value: 'portal', label: isEn ? 'Portal' : 'Portail' },
                  ]}
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-app-sand/50 p-4 sm:p-6">
              {preview === 'dossier' && <DossierPreview {...previewProps} />}
              {preview === 'quote' && <QuotePreview {...previewProps} />}
              {preview === 'portal' && <PortalPreview {...previewProps} dark={portalDark} />}
            </div>
            <p className="mt-2 shrink-0 text-xs text-muted-foreground">
              {isEn ? 'Same structure for every organization; your logo, colors and mentions adapt it.' : 'Même structure pour toutes les organisations ; votre logo, vos couleurs et vos mentions l’adaptent.'}
            </p>
          </section>
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
