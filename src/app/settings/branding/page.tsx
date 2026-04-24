'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Palette, Upload, Trash2, Loader2, RotateCcw, LayoutTemplate } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';
import { useOrganization } from '@/lib/auth/context';

const DEFAULT_PRIMARY = '#6d28d9';
const DEFAULT_ACCENT = '#e11d74';

type TemplateId = 'standard' | 'dense' | 'executive';

const TEMPLATE_OPTIONS: Array<{
  id: TemplateId;
  name: string;
  description: string;
}> = [
  {
    id: 'standard',
    name: 'Standard',
    description:
      'Équilibré, lisible. Bon défaut pour la majorité des profils. Édition inline supportée.',
  },
  {
    id: 'dense',
    name: 'Dense',
    description:
      'Typographie serrée, header sombre. Idéal pour les profils seniors avec 8+ missions.',
  },
  {
    id: 'executive',
    name: 'Executive',
    description:
      'Très aéré, typo large. Conseillé pour les profils lead, architectes, direction.',
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
};

export default function BrandingSettingsPage() {
  const { role, reloadBranding } = useOrganization();
  const isAdmin = role === 'admin';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);

  const [initial, setInitial] = useState<Branding | null>(null);
  const [brandName, setBrandName] = useState('');
  const [footerTagline, setFooterTagline] = useState('');
  const [primary, setPrimary] = useState(DEFAULT_PRIMARY);
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [defaultTemplate, setDefaultTemplate] = useState<TemplateId>('standard');

  const fileRef = useRef<HTMLInputElement | null>(null);

  const applyFromApi = useCallback((b: Branding) => {
    setInitial(b);
    setBrandName(b.brand_name ?? '');
    setFooterTagline(b.footer_tagline ?? '');
    setPrimary(b.brand_primary_color ?? DEFAULT_PRIMARY);
    setAccent(b.brand_accent_color ?? DEFAULT_ACCENT);
    setLogoUrl(b.logo_url);
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
        if (alive) toast.error("Impossible de charger l'identité visuelle.");
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
      toast.success('Identité visuelle enregistrée.');
    } catch {
      toast.error("Échec de l'enregistrement.");
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
      toast.success('Logo mis à jour.');
    } catch (e) {
      toast.error(`Upload du logo échoué${e instanceof Error ? ` : ${e.message}` : ''}.`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeLogo = async () => {
    if (!isAdmin) return;
    if (!confirm('Supprimer le logo ? Les CV utiliseront le logo QuadCore par défaut.')) return;
    setDeletingLogo(true);
    try {
      const res = await fetch('/api/organizations/branding/logo', { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLogoUrl(null);
      await reloadBranding();
      toast.success('Logo supprimé.');
    } catch {
      toast.error('Suppression du logo échouée.');
    } finally {
      setDeletingLogo(false);
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
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
          <Palette className="h-7 w-7 text-violet-glow" />
          Identité visuelle
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Ces éléments remplacent le branding QuadCore sur les CV générés par votre organisation.
        </p>
      </div>

      {!isAdmin && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Seuls les administrateurs peuvent modifier l'identité visuelle.
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Logo</CardTitle>
                <CardDescription>
                  PNG, JPG, WebP ou SVG — 5 Mo maximum. Affiché en en-tête des CV.
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                        {logoUrl ? 'Remplacer' : 'Téléverser'}
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
                          Supprimer
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Transparent recommandé. Fallback = logo QuadCore.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Texte de marque</CardTitle>
                <CardDescription>
                  Remplace "QuadCore — IT Services &amp; Consulting" dans le footer des CV.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brand_name">Nom de marque</Label>
                  <Input
                    id="brand_name"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder={initial?.name ?? 'Votre ESN'}
                    disabled={!isAdmin}
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footer_tagline">Tagline du footer</Label>
                  <Input
                    id="footer_tagline"
                    value={footerTagline}
                    onChange={(e) => setFooterTagline(e.target.value)}
                    placeholder="IT Services & Consulting"
                    disabled={!isAdmin}
                    maxLength={160}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Couleurs
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!isAdmin}
                    onClick={resetColors}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Réinitialiser
                  </Button>
                </CardTitle>
                <CardDescription>
                  Séparateurs, intitulés de poste et accents décoratifs des CV.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <ColorField
                  label="Couleur principale"
                  hint="Utilisée pour les titres, bandeaux et intitulés."
                  value={primary}
                  onChange={setPrimary}
                  disabled={!isAdmin}
                />
                <ColorField
                  label="Couleur d'accent"
                  hint="Utilisée pour les puces, séparateurs et highlights."
                  value={accent}
                  onChange={setAccent}
                  disabled={!isAdmin}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4" />
                  Template CV par défaut
                </CardTitle>
                <CardDescription>
                  Layout présélectionné à l'ouverture du CV Optimizer. Chaque utilisateur peut
                  toujours changer ponctuellement.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
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
                            Sélectionné
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="button" disabled={!isAdmin || !dirty || saving} onClick={save}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Aperçu</CardTitle>
                <CardDescription>Rendu appliqué sur les CV.</CardDescription>
              </CardHeader>
              <CardContent>
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
                      Consultant Senior
                    </div>
                  </div>
                  <div className="mt-4 text-[10px] text-neutral-400 flex justify-between border-t border-neutral-200 pt-2">
                    <span>
                      {brandName.trim() || initial?.name || 'Votre ESN'}
                      {(footerTagline.trim() || '') && ` — ${footerTagline.trim()}`}
                    </span>
                    <span className="uppercase tracking-wider">Confidentiel</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </AppShell>
  );
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
