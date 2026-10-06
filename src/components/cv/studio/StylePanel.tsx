'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { Switch } from '@/components/ui/switch';
import { DOSSIER_TEMPLATES, type DossierTemplateId } from '@/lib/cv/templates';
import type { CVBrand } from '@/lib/cv/branding';
import { cn } from '@/lib/utils';

type Props = {
  templateId: DossierTemplateId;
  onTemplate: (id: DossierTemplateId) => void;
  brand: CVBrand;
  showConfidential: boolean;
  onShowConfidential: (v: boolean) => void;
  lang: 'fr' | 'en';
};

/** Vignette schématique d'un modèle (structure seulement). */
export function TemplateThumb({ id, color }: { id: DossierTemplateId; color: string }) {
  const line = (w: string, strong = false) => <span className={cn('block h-[3px] rounded-full', strong ? 'bg-foreground/40' : 'bg-foreground/15')} style={{ width: w }} />;
  return (
    <span className="flex h-14 overflow-hidden rounded-md border border-border bg-white p-1.5" aria-hidden>
      {id === 'standard' ? (
        <>
          <span className="mr-1.5 w-[34%] space-y-1 rounded-sm p-1" style={{ background: `${color}14` }}>
            {line('80%', true)}
            {line('60%')}
            {line('70%')}
          </span>
          <span className="flex-1 space-y-1 pt-1">
            {line('90%')}
            {line('75%')}
            {line('85%')}
            {line('60%')}
          </span>
        </>
      ) : id === 'executive' ? (
        <span className="flex-1 space-y-1">
          <span className="block h-[5px] w-[60%] rounded-full bg-foreground/45" />
          <span className="block h-[2px] w-[22%] rounded-full" style={{ background: color }} />
          {line('92%')}
          {line('85%')}
          {line('70%')}
        </span>
      ) : id === 'dense' ? (
        <span className="flex-1 space-y-[3px]">
          <span className="block h-[2px] w-full rounded-full" style={{ background: color }} />
          {line('95%', true)}
          {line('90%')}
          {line('92%')}
          {line('88%')}
          {line('94%')}
          {line('80%')}
        </span>
      ) : (
        <span className="flex-1 space-y-1.5 px-1">
          {line('45%', true)}
          {line('30%')}
          {line('80%')}
          {line('65%')}
        </span>
      )}
    </span>
  );
}

/**
 * Habillage du dossier : quatre modèles neutres (Minimal, Consulting,
 * Executive, Compact) aux couleurs de l'organisation — logo, couleurs
 * principale et secondaire, nom et mention de pied de page — et la mention
 * « Document confidentiel ».
 */
export function StylePanel({ templateId, onTemplate, brand, showConfidential, onShowConfidential, lang }: Props) {
  const fr = lang === 'fr';
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-[12.5px] font-semibold">{fr ? 'Modèle' : 'Template'}</h3>
        <div className="grid grid-cols-2 gap-2">
          {DOSSIER_TEMPLATES.map((tpl) => {
            const on = tpl.id === templateId;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onTemplate(tpl.id)}
                aria-pressed={on}
                className={cn(
                  'rounded-xl border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-terra/50',
                  on ? 'border-app-terra bg-app-peach-light' : 'border-border hover:bg-muted/40',
                )}
              >
                <TemplateThumb id={tpl.id} color={brand.primary} />
                <span className="mt-2 flex items-baseline gap-1.5">
                  <span className="num text-[10.5px] font-semibold text-muted-foreground">{tpl.number}</span>
                  <span className="text-[13px] font-semibold">{tpl.name}</span>
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{tpl.description[lang]}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[12.5px] font-semibold">{fr ? 'Identité du document' : 'Document identity'}</h3>
          <Link href="/settings/branding" className="inline-flex items-center gap-0.5 text-[11.5px] font-medium text-app-terra-dark hover:underline">
            {fr ? 'Modifier' : 'Edit'}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-2.5 rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 min-w-10 max-w-[8rem] items-center justify-center overflow-hidden rounded-lg border border-border bg-white px-1.5">
              {brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.logoUrl} alt={brand.brandName} className="max-h-8 w-auto object-contain" />
              ) : (
                <span className="truncate text-[11px] font-bold" style={{ color: brand.primary }}>
                  {brand.brandName || '—'}
                </span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-semibold">{brand.brandName || (fr ? 'Nom de l’organisation' : 'Organization name')}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{brand.footerTagline || (fr ? 'Pas de mention de pied de page' : 'No footer line')}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11.5px]">
            {[
              { label: fr ? 'Principale' : 'Primary', color: brand.primary },
              { label: fr ? 'Secondaire' : 'Secondary', color: brand.accent },
            ].map((c) => (
              <span key={c.label} className="inline-flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: c.color }} aria-hidden />
                {c.label}
                <span className="num text-muted-foreground">{c.color}</span>
              </span>
            ))}
          </div>
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          {fr ? 'Modèles neutres : aucune autre marque que la vôtre n’apparaît sur les dossiers.' : 'Neutral templates: no brand but yours appears on dossiers.'}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-[12.5px] font-semibold">{fr ? 'Mentions' : 'Notices'}</h3>
        <label className="flex items-center justify-between gap-3 text-[12.5px]">
          <span>
            {fr ? '« Document confidentiel »' : '“Confidential document”'}
            <span className="block text-[11px] text-muted-foreground">{fr ? 'En-tête et pied de page, PDF et Word.' : 'Header and footer, PDF and Word.'}</span>
          </span>
          <Switch checked={showConfidential} onCheckedChange={onShowConfidential} aria-label={fr ? 'Mention document confidentiel' : 'Confidential notice'} />
        </label>
      </section>
    </div>
  );
}
