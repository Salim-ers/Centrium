'use client';

import type { CSSProperties, ReactNode } from 'react';

import type { CVContent } from '@/types';
import type { CVBrand } from '@/lib/cv/branding';
import type { DossierTemplateId } from '@/lib/cv/templates';
import { cn } from '@/lib/utils';
import { Editable } from './Editable';
import { EditableDate } from './EditableDate';

// =========================================================================
// Dossier de compétences — quatre mises en page neutres (Minimal,
// Consulting, Executive, Compact). Même contenu, mêmes chemins d'édition ;
// seule l'identité de l'organisation (logo, couleurs, mentions) varie.
// =========================================================================

type Props = {
  content: CVContent;
  template: DossierTemplateId;
  brand: CVBrand;
  showConfidential?: boolean;
  editable?: boolean;
  onEdit?: (path: string, value: string) => void;
  qrSrc?: string | null;
};

type Ctx = { editable: boolean; onEdit?: (path: string, value: string) => void };

const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

/** Couleur de marque adoucie (fonds, contours). */
export function tint(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return `rgba(0,0,0,${alpha})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function E({ ctx, ...p }: { ctx: Ctx; path: string; value: string; placeholder?: string; multiline?: boolean; className?: string; as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3'; style?: CSSProperties }) {
  return <Editable {...p} editable={ctx.editable} onEdit={ctx.onEdit} />;
}

/** Logo de l'organisation, ou son nom en toutes lettres. Jamais un autre logo. */
function BrandMark({ b, className, onDark = false }: { b: CVBrand; className?: string; onDark?: boolean }) {
  if (b.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={b.logoUrl} alt={b.brandName} className={cn('w-auto object-contain', className)} />;
  }
  if (!b.brandName) return null;
  return (
    <span className="text-[15px] font-bold tracking-[-0.01em]" style={{ color: onDark ? '#fff' : b.primary, fontFamily: SANS }}>
      {b.brandName}
    </span>
  );
}

function Qr({ src, b }: { src: string; b: CVBrand }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="vCard" className="h-[54px] w-[54px] rounded-md bg-white p-0.5" style={{ boxShadow: `0 0 0 1px ${tint(b.primary, 0.25)}` }} />
  );
}

function footerText(b: CVBrand) {
  return [b.brandName, b.footerTagline].filter(Boolean).join(' — ');
}

function infoItems(c: CVContent, editable: boolean) {
  const h = c.header;
  return [
    { label: 'Expérience', path: 'header.yearsExperience', value: `${h.yearsExperience} ans`, placeholder: '10 ans' },
    { label: 'Localisation', path: 'header.location', value: h.location ?? '', placeholder: 'Ville' },
    { label: 'Mobilité', path: 'header.mobility', value: h.mobility ?? '', placeholder: 'ex. France' },
    { label: 'Disponibilité', path: 'header.availability', value: h.availability ?? '', placeholder: 'ex. Immédiate' },
  ].filter((i) => i.value || editable);
}

function Languages({ c, ctx, sep = ' · ', itemClass }: { c: CVContent; ctx: Ctx; sep?: string; itemClass?: string }) {
  return (
    <>
      {c.languages.map((l, i) => (
        <span key={`${l.code}-${i}`} className={cn('inline-flex items-baseline', itemClass)}>
          <E ctx={ctx} path={`language.${i}.code`} value={l.code.toUpperCase()} placeholder="FR" className="font-semibold" />
          <span className="opacity-60">&nbsp;</span>
          <E ctx={ctx} path={`language.${i}.level`} value={l.level} placeholder="Niveau" className="opacity-80" />
          {i < c.languages.length - 1 && <span className="mx-1 opacity-40">{sep.trim()}</span>}
        </span>
      ))}
    </>
  );
}

function Dates({ ctx, id, start, end, className }: { ctx: Ctx; id: string; start: string; end: string | null; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap', className)}>
      <EditableDate path={`experience.${id}.start_date`} value={start} editable={ctx.editable} onEdit={ctx.onEdit} />
      <span>–</span>
      <EditableDate path={`experience.${id}.end_date`} value={end} editable={ctx.editable} onEdit={ctx.onEdit} allowNull />
    </span>
  );
}

function Tasks({ ctx, id, tasks, bullet, className }: { ctx: Ctx; id: string; tasks: string[]; bullet: ReactNode; className?: string }) {
  if (!tasks?.length) return null;
  return (
    <ul className={cn('space-y-1', className)}>
      {tasks.map((t, i) => (
        <li key={i} className="flex gap-2">
          {bullet}
          <E ctx={ctx} as="span" path={`experience.${id}.task.${i}`} value={t} placeholder="Réalisation" multiline className="flex-1 whitespace-pre-wrap" />
        </li>
      ))}
    </ul>
  );
}

function Environment({ ctx, id, env, label = true, chip, className }: { ctx: Ctx; id: string; env: string[]; label?: boolean; chip?: CSSProperties; className?: string }) {
  if (!(env?.length || ctx.editable)) return null;
  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-1.5 gap-y-1', className)}>
      {label && <span className="font-semibold uppercase tracking-[0.12em] opacity-70">Environnement</span>}
      {(env ?? []).map((e, i) =>
        chip ? (
          <span key={i} className="rounded px-1.5 py-px" style={chip}>
            <E ctx={ctx} path={`experience.${id}.environment.${i}`} value={e} placeholder="—" />
          </span>
        ) : (
          <span key={i}>
            <E ctx={ctx} path={`experience.${id}.environment.${i}`} value={e} placeholder="—" />
            {i < env.length - 1 && <span className="ml-1.5 opacity-40">·</span>}
          </span>
        ),
      )}
    </p>
  );
}

function Educations({ c, ctx, stacked = false, yearClass }: { c: CVContent; ctx: Ctx; stacked?: boolean; yearClass?: string }) {
  return (
    <div className={stacked ? 'space-y-2' : 'space-y-1.5'}>
      {c.educations.map((ed) =>
        stacked ? (
          <div key={ed.id}>
            <E ctx={ctx} as="p" path={`education.${ed.id}.year`} value={String(ed.year)} placeholder="2024" className={cn('font-semibold', yearClass)} />
            <E ctx={ctx} as="p" path={`education.${ed.id}.degree`} value={ed.degree} placeholder="Diplôme" className="font-medium" />
            {(ed.institution || ctx.editable) && <E ctx={ctx} as="p" path={`education.${ed.id}.institution`} value={ed.institution ?? ''} placeholder="École" className="opacity-70" />}
          </div>
        ) : (
          <div key={ed.id} className="flex items-baseline gap-3">
            <E ctx={ctx} path={`education.${ed.id}.year`} value={String(ed.year)} placeholder="2024" className={cn('w-12 shrink-0 font-semibold', yearClass)} />
            <span className="min-w-0">
              <E ctx={ctx} path={`education.${ed.id}.degree`} value={ed.degree} placeholder="Diplôme" className="font-semibold" />
              {(ed.institution || ctx.editable) && (
                <span className="opacity-70">
                  {' — '}
                  <E ctx={ctx} path={`education.${ed.id}.institution`} value={ed.institution ?? ''} placeholder="École" />
                </span>
              )}
            </span>
          </div>
        ),
      )}
    </div>
  );
}

function Confidential({ show, className }: { show: boolean; className?: string }) {
  if (!show) return null;
  return <span className={cn('text-[8.5px] uppercase tracking-[0.2em] text-neutral-400', className)}>Document confidentiel</span>;
}

function Footer({ b, show, className }: { b: CVBrand; show: boolean; className?: string }) {
  return (
    <footer className={cn('flex items-center justify-between gap-4 border-t border-neutral-200 pt-2 text-[8.5px] text-neutral-400', className)}>
      <span className="truncate">{footerText(b)}</span>
      {show && <span className="shrink-0 uppercase tracking-[0.18em]">Confidentiel</span>}
    </footer>
  );
}

export function DossierDocument({ content: c, template, brand: b, showConfidential = true, editable = false, onEdit, qrSrc }: Props) {
  const ctx: Ctx = { editable, onEdit };
  const page = 'cv-print-page mx-auto break-words bg-white text-neutral-900 shadow-2xl';
  const pageStyle: CSSProperties = { width: '210mm', minHeight: '297mm', overflowWrap: 'anywhere', fontFamily: SANS };
  const props = { c, b, ctx, showConfidential, qrSrc: qrSrc ?? null };
  if (template === 'minimal') return <Minimal {...props} page={page} pageStyle={pageStyle} />;
  if (template === 'executive') return <Executive {...props} page={page} pageStyle={pageStyle} />;
  if (template === 'dense') return <Compact {...props} page={page} pageStyle={pageStyle} />;
  return <Consulting {...props} page={page} pageStyle={pageStyle} />;
}

type VariantProps = { c: CVContent; b: CVBrand; ctx: Ctx; showConfidential: boolean; qrSrc: string | null; page: string; pageStyle: CSSProperties };

// ── 01 Minimal ─────────────────────────────────────────────────────────────

function Minimal({ c, b, ctx, showConfidential, qrSrc, page, pageStyle }: VariantProps) {
  const Title = ({ children }: { children: ReactNode }) => (
    <h2 className="mb-3 flex items-center gap-2.5 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
      <span className="h-px w-4" style={{ background: b.accent }} />
      {children}
    </h2>
  );
  return (
    <div className={cn(page, 'flex flex-col px-[18mm] py-[15mm]')} style={pageStyle}>
      <header className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          <BrandMark b={b} className="h-8" />
          {qrSrc && <Qr src={qrSrc} b={b} />}
        </div>
        <Confidential show={showConfidential} />
      </header>

      <section className="mt-11">
        <E ctx={ctx} as="h1" path="header.displayName" value={c.header.displayName} placeholder="Nom du consultant" className="block text-[30px] font-semibold leading-tight tracking-[-0.02em]" />
        <E ctx={ctx} as="p" path="header.jobTitle" value={c.header.jobTitle} placeholder="Intitulé du poste" className="mt-1 block text-[14px] font-medium" style={{ color: b.primary }} />
        {(c.header.subTitle || ctx.editable) && (
          <E ctx={ctx} as="p" path="header.subTitle" value={c.header.subTitle ?? ''} placeholder="Spécialité" className="mt-0.5 block text-[12px] text-neutral-500" />
        )}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[10.5px] text-neutral-700">
          {infoItems(c, ctx.editable).map((i) => (
            <span key={i.path}>
              <span className="mr-1.5 text-[8.5px] uppercase tracking-[0.14em] text-neutral-400">{i.label}</span>
              <E ctx={ctx} path={i.path} value={i.value} placeholder={i.placeholder} className="font-medium" />
            </span>
          ))}
          {c.languages.length > 0 && (
            <span>
              <span className="mr-1.5 text-[8.5px] uppercase tracking-[0.14em] text-neutral-400">Langues</span>
              <Languages c={c} ctx={ctx} />
            </span>
          )}
        </div>
      </section>

      <section className="mt-9">
        <Title>Profil</Title>
        <E ctx={ctx} as="p" path="summary" value={c.summary} placeholder="Résumé du profil…" multiline className="block whitespace-pre-wrap text-[11.5px] leading-[1.7] text-neutral-800" />
      </section>

      {c.skillCategories.length > 0 && (
        <section className="mt-8">
          <Title>Compétences</Title>
          <div className="space-y-1.5 text-[11px]">
            {c.skillCategories.map((cat, ci) => (
              <div key={ci} className="flex gap-4">
                <E ctx={ctx} path={`skill.${ci}.name`} value={cat.name} placeholder="Catégorie" className="w-32 shrink-0 pt-px text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-500" />
                <span className="min-w-0 flex-1 leading-[1.6] text-neutral-800">
                  {cat.items.map((it, i) => (
                    <span key={i}>
                      <E ctx={ctx} path={`skill.${ci}.item.${i}`} value={it} placeholder="—" />
                      {i < cat.items.length - 1 && <span className="mx-1.5 text-neutral-300">·</span>}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {c.experiences.length > 0 && (
        <section className="cv-section mt-8">
          <Title>Expériences</Title>
          <div className="space-y-6">
            {c.experiences.map((x) => (
              <article key={x.id} className="cv-article">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="min-w-0 flex-1 text-[12.5px]">
                    <E ctx={ctx} path={`experience.${x.id}.role`} value={x.role} placeholder="Rôle" className="font-semibold" />
                    <span className="text-neutral-400"> · </span>
                    <E ctx={ctx} path={`experience.${x.id}.client_name`} value={x.client_name} placeholder="Client" style={{ color: b.primary }} className="font-medium" />
                  </h3>
                  <Dates ctx={ctx} id={x.id} start={x.start_date} end={x.end_date} className="text-[9.5px] uppercase tracking-[0.1em] text-neutral-500" />
                </div>
                {(x.context || ctx.editable) && (
                  <E ctx={ctx} as="p" path={`experience.${x.id}.context`} value={x.context ?? ''} placeholder="Contexte de la mission…" multiline className="mt-1 block whitespace-pre-wrap text-[10.5px] leading-[1.6] text-neutral-500" />
                )}
                <Tasks ctx={ctx} id={x.id} tasks={x.tasks} className="mt-2 text-[10.8px] leading-[1.55] text-neutral-800" bullet={<span className="shrink-0" style={{ color: b.accent }}>–</span>} />
                <Environment ctx={ctx} id={x.id} env={x.environment} className="mt-2 text-[9.5px] text-neutral-500" />
              </article>
            ))}
          </div>
        </section>
      )}

      {c.educations.length > 0 && (
        <section className="mt-8 text-[11px] text-neutral-800">
          <Title>Formation</Title>
          <Educations c={c} ctx={ctx} yearClass="text-neutral-400" />
        </section>
      )}

      <Footer b={b} show={showConfidential} className="mt-auto pt-3" />
    </div>
  );
}

// ── 02 Consulting ──────────────────────────────────────────────────────────

function Consulting({ c, b, ctx, showConfidential, qrSrc, page, pageStyle }: VariantProps) {
  const AsideTitle = ({ children }: { children: ReactNode }) => (
    <h2 className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: b.primary }}>
      {children}
    </h2>
  );
  const Title = ({ children }: { children: ReactNode }) => (
    <h2 className="mb-3 border-b border-neutral-200 pb-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em]" style={{ color: b.primary }}>
      {children}
    </h2>
  );
  return (
    <div className={cn(page, 'flex')} style={pageStyle}>
      <aside className="w-[34%] shrink-0 space-y-6 px-[8mm] py-[13mm]" style={{ background: tint(b.primary, 0.055) }}>
        <div className="flex items-center gap-3">
          <BrandMark b={b} className="h-8" />
          {qrSrc && <Qr src={qrSrc} b={b} />}
        </div>
        <div>
          <E ctx={ctx} as="h1" path="header.displayName" value={c.header.displayName} placeholder="Nom du consultant" className="block text-[22px] font-bold leading-[1.15] tracking-[-0.02em]" />
          <E ctx={ctx} as="p" path="header.jobTitle" value={c.header.jobTitle} placeholder="Intitulé du poste" className="mt-1.5 block text-[12px] font-semibold leading-snug" style={{ color: b.primary }} />
          {(c.header.subTitle || ctx.editable) && (
            <E ctx={ctx} as="p" path="header.subTitle" value={c.header.subTitle ?? ''} placeholder="Spécialité" className="mt-0.5 block text-[10.5px] text-neutral-600" />
          )}
        </div>
        <div className="space-y-2">
          {infoItems(c, ctx.editable).map((i) => (
            <div key={i.path}>
              <p className="text-[8px] uppercase tracking-[0.16em] text-neutral-500">{i.label}</p>
              <E ctx={ctx} as="p" path={i.path} value={i.value} placeholder={i.placeholder} className="text-[10.5px] font-semibold" />
            </div>
          ))}
        </div>
        {c.languages.length > 0 && (
          <div className="text-[10.5px]">
            <AsideTitle>Langues</AsideTitle>
            <div className="flex flex-col gap-0.5">
              {c.languages.map((l, i) => (
                <span key={i} className="flex justify-between gap-2">
                  <E ctx={ctx} path={`language.${i}.code`} value={l.code.toUpperCase()} placeholder="FR" className="font-semibold" />
                  <E ctx={ctx} path={`language.${i}.level`} value={l.level} placeholder="Niveau" className="text-neutral-600" />
                </span>
              ))}
            </div>
          </div>
        )}
        {c.skillCategories.length > 0 && (
          <div className="space-y-3">
            <AsideTitle>Compétences</AsideTitle>
            {c.skillCategories.map((cat, ci) => (
              <div key={ci}>
                <E ctx={ctx} as="p" path={`skill.${ci}.name`} value={cat.name} placeholder="Catégorie" className="mb-1 block text-[9.5px] font-semibold text-neutral-700" />
                <div className="flex flex-wrap gap-1">
                  {cat.items.map((it, i) => (
                    <span key={i} className="rounded-[4px] bg-white px-1.5 py-[2px] text-[9.5px]" style={{ boxShadow: `inset 0 0 0 1px ${tint(b.accent, 0.35)}` }}>
                      <E ctx={ctx} path={`skill.${ci}.item.${i}`} value={it} placeholder="—" />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {c.educations.length > 0 && (
          <div className="text-[10px]">
            <AsideTitle>Formation</AsideTitle>
            <Educations c={c} ctx={ctx} stacked yearClass="text-neutral-500" />
          </div>
        )}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col px-[10mm] py-[13mm]">
        <div className="flex justify-end">
          <Confidential show={showConfidential} />
        </div>
        <section className="mt-4">
          <Title>Profil</Title>
          <E ctx={ctx} as="p" path="summary" value={c.summary} placeholder="Résumé du profil…" multiline className="block whitespace-pre-wrap text-[11px] leading-[1.65] text-neutral-800" />
        </section>
        {c.experiences.length > 0 && (
          <section className="cv-section mt-7">
            <Title>Expériences</Title>
            <div className="space-y-5">
              {c.experiences.map((x) => (
                <article key={x.id} className="cv-article">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="min-w-0 flex-1 text-[12px]">
                      <E ctx={ctx} path={`experience.${x.id}.client_name`} value={x.client_name} placeholder="Client" className="font-bold" />
                      <span className="text-neutral-400"> — </span>
                      <E ctx={ctx} path={`experience.${x.id}.role`} value={x.role} placeholder="Rôle" className="text-neutral-700" />
                    </h3>
                    <Dates ctx={ctx} id={x.id} start={x.start_date} end={x.end_date} className="text-[9px] font-semibold uppercase tracking-[0.08em] text-neutral-500" />
                  </div>
                  {(x.context || ctx.editable) && (
                    <E ctx={ctx} as="p" path={`experience.${x.id}.context`} value={x.context ?? ''} placeholder="Contexte de la mission…" multiline className="mt-1 block whitespace-pre-wrap text-[10.3px] italic leading-[1.55] text-neutral-600" />
                  )}
                  <Tasks
                    ctx={ctx}
                    id={x.id}
                    tasks={x.tasks}
                    className="mt-1.5 text-[10.5px] leading-[1.55] text-neutral-800"
                    bullet={<span className="mt-[6px] h-[4px] w-[4px] shrink-0 rounded-full" style={{ background: b.accent }} />}
                  />
                  <Environment ctx={ctx} id={x.id} env={x.environment} label={false} className="mt-2 text-[9px] text-neutral-600" chip={{ background: tint(b.primary, 0.07) }} />
                </article>
              ))}
            </div>
          </section>
        )}
        <Footer b={b} show={showConfidential} className="mt-auto pt-3" />
      </main>
    </div>
  );
}

// ── 03 Executive ───────────────────────────────────────────────────────────

function Executive({ c, b, ctx, showConfidential, qrSrc, page, pageStyle }: VariantProps) {
  const Title = ({ children }: { children: ReactNode }) => (
    <h2 className="mb-3" style={{ fontFamily: SERIF }}>
      <span className="block text-[16px] font-semibold text-neutral-900">{children}</span>
      <span className="mt-1.5 block h-[2px] w-7" style={{ background: b.accent }} />
    </h2>
  );
  return (
    <div className={cn(page, 'flex flex-col px-[20mm] py-[16mm]')} style={pageStyle}>
      <header className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          <BrandMark b={b} className="h-9" />
          {qrSrc && <Qr src={qrSrc} b={b} />}
        </div>
        <Confidential show={showConfidential} />
      </header>

      <section className="mt-12">
        <E ctx={ctx} as="h1" path="header.displayName" value={c.header.displayName} placeholder="Nom du consultant" className="block text-[34px] font-normal leading-[1.1] tracking-[-0.015em]" style={{ fontFamily: SERIF }} />
        <E ctx={ctx} as="p" path="header.jobTitle" value={c.header.jobTitle} placeholder="Intitulé du poste" className="mt-2.5 block text-[10.5px] font-semibold uppercase tracking-[0.24em]" style={{ color: b.primary }} />
        {(c.header.subTitle || ctx.editable) && (
          <E ctx={ctx} as="p" path="header.subTitle" value={c.header.subTitle ?? ''} placeholder="Spécialité" className="mt-1 block text-[12.5px] italic text-neutral-600" style={{ fontFamily: SERIF }} />
        )}
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 border-y border-neutral-200 py-2.5 text-[10px] text-neutral-700">
          {infoItems(c, ctx.editable).map((i) => (
            <span key={i.path}>
              <span className="mr-1.5 text-[8px] uppercase tracking-[0.16em] text-neutral-400">{i.label}</span>
              <E ctx={ctx} path={i.path} value={i.value} placeholder={i.placeholder} className="font-semibold" />
            </span>
          ))}
          {c.languages.length > 0 && (
            <span>
              <span className="mr-1.5 text-[8px] uppercase tracking-[0.16em] text-neutral-400">Langues</span>
              <Languages c={c} ctx={ctx} />
            </span>
          )}
        </div>
      </section>

      <section className="mt-9">
        <E
          ctx={ctx}
          as="p"
          path="summary"
          value={c.summary}
          placeholder="Résumé du profil…"
          multiline
          className="block whitespace-pre-wrap border-l-2 pl-5 text-[13px] leading-[1.75] text-neutral-800"
          style={{ fontFamily: SERIF, borderColor: b.accent }}
        />
      </section>

      {c.skillCategories.length > 0 && (
        <section className="mt-9">
          <Title>Compétences clés</Title>
          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            {c.skillCategories.map((cat, ci) => (
              <div key={ci}>
                <E ctx={ctx} as="p" path={`skill.${ci}.name`} value={cat.name} placeholder="Catégorie" className="mb-1 block text-[11.5px] font-semibold" style={{ fontFamily: SERIF, color: b.primary }} />
                <ul className="space-y-0.5 text-[10.3px] text-neutral-700">
                  {cat.items.map((it, i) => (
                    <li key={i}>
                      <E ctx={ctx} path={`skill.${ci}.item.${i}`} value={it} placeholder="—" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {c.experiences.length > 0 && (
        <section className="cv-section mt-9">
          <Title>Parcours</Title>
          <div className="space-y-7">
            {c.experiences.map((x) => (
              <article key={x.id} className="cv-article">
                <div className="flex items-baseline justify-between gap-4">
                  <E ctx={ctx} as="h3" path={`experience.${x.id}.role`} value={x.role} placeholder="Rôle" className="block min-w-0 flex-1 text-[15px] font-semibold leading-snug" style={{ fontFamily: SERIF }} />
                  <Dates ctx={ctx} id={x.id} start={x.start_date} end={x.end_date} className="text-[9.5px] uppercase tracking-[0.14em] text-neutral-500" />
                </div>
                <E ctx={ctx} as="p" path={`experience.${x.id}.client_name`} value={x.client_name} placeholder="Client" className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: b.primary }} />
                {(x.context || ctx.editable) && (
                  <E ctx={ctx} as="p" path={`experience.${x.id}.context`} value={x.context ?? ''} placeholder="Contexte de la mission…" multiline className="mt-2 block whitespace-pre-wrap text-[11px] italic leading-[1.6] text-neutral-600" style={{ fontFamily: SERIF }} />
                )}
                <Tasks ctx={ctx} id={x.id} tasks={x.tasks} className="mt-2 text-[10.8px] leading-[1.6] text-neutral-800" bullet={<span className="mt-[8px] h-px w-3 shrink-0" style={{ background: b.accent }} />} />
                <Environment ctx={ctx} id={x.id} env={x.environment} className="mt-2 text-[9.5px] text-neutral-500" />
              </article>
            ))}
          </div>
        </section>
      )}

      {c.educations.length > 0 && (
        <section className="mt-9 text-[11px] text-neutral-800">
          <Title>Formation</Title>
          <Educations c={c} ctx={ctx} yearClass="text-neutral-400" />
        </section>
      )}

      <Footer b={b} show={showConfidential} className="mt-auto pt-3" />
    </div>
  );
}

// ── 04 Compact ─────────────────────────────────────────────────────────────

function Compact({ c, b, ctx, showConfidential, qrSrc, page, pageStyle }: VariantProps) {
  const Title = ({ children }: { children: ReactNode }) => (
    <h2 className="mb-2 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: b.primary }}>
      {children}
      <span className="h-px flex-1" style={{ background: tint(b.primary, 0.25) }} />
    </h2>
  );
  return (
    <div className={cn(page, 'flex flex-col px-[12mm] py-[10mm] text-[10px]')} style={pageStyle}>
      <header className="flex items-end justify-between gap-6 border-b-2 pb-3" style={{ borderColor: b.primary }}>
        <div className="min-w-0">
          <E ctx={ctx} as="h1" path="header.displayName" value={c.header.displayName} placeholder="Nom du consultant" className="block text-[21px] font-bold leading-tight tracking-[-0.02em]" />
          <p className="mt-0.5 text-[11.5px]">
            <E ctx={ctx} path="header.jobTitle" value={c.header.jobTitle} placeholder="Intitulé du poste" className="font-semibold" style={{ color: b.primary }} />
            {(c.header.subTitle || ctx.editable) && (
              <>
                <span className="text-neutral-400"> · </span>
                <E ctx={ctx} path="header.subTitle" value={c.header.subTitle ?? ''} placeholder="Spécialité" className="text-neutral-600" />
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {qrSrc && <Qr src={qrSrc} b={b} />}
          <BrandMark b={b} className="h-7" />
        </div>
      </header>

      <div className="mt-2.5 grid grid-cols-4 gap-2 rounded-md px-3 py-2" style={{ background: tint(b.primary, 0.05) }}>
        {infoItems(c, ctx.editable).map((i) => (
          <div key={i.path} className="min-w-0">
            <p className="text-[7.5px] uppercase tracking-[0.14em] text-neutral-500">{i.label}</p>
            <E ctx={ctx} as="p" path={i.path} value={i.value} placeholder={i.placeholder} className="truncate text-[10px] font-semibold" />
          </div>
        ))}
      </div>

      <section className="mt-4">
        <Title>Profil</Title>
        <E ctx={ctx} as="p" path="summary" value={c.summary} placeholder="Résumé du profil…" multiline className="block whitespace-pre-wrap text-[10px] leading-[1.55] text-neutral-800" />
      </section>

      {c.skillCategories.length > 0 && (
        <section className="mt-4">
          <Title>Compétences</Title>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {c.skillCategories.map((cat, ci) => (
              <div key={ci} className="flex gap-2">
                <E ctx={ctx} path={`skill.${ci}.name`} value={cat.name} placeholder="Catégorie" className="w-24 shrink-0 text-[8.5px] font-semibold uppercase tracking-[0.08em] text-neutral-500" />
                <span className="min-w-0 flex-1 leading-[1.5] text-neutral-800">
                  {cat.items.map((it, i) => (
                    <span key={i}>
                      <E ctx={ctx} path={`skill.${ci}.item.${i}`} value={it} placeholder="—" />
                      {i < cat.items.length - 1 && <span className="mx-1 text-neutral-300">·</span>}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {c.experiences.length > 0 && (
        <section className="cv-section mt-4">
          <Title>Expériences</Title>
          <div className="space-y-3">
            {c.experiences.map((x) => (
              <article key={x.id} className="cv-article grid grid-cols-[24mm_minmax(0,1fr)] gap-3">
                <Dates ctx={ctx} id={x.id} start={x.start_date} end={x.end_date} className="flex-wrap content-start self-start pt-px text-[8.5px] font-semibold uppercase tracking-[0.06em] text-neutral-500" />
                <div className="min-w-0 border-l pl-3" style={{ borderColor: tint(b.accent, 0.45) }}>
                  <h3 className="text-[10.8px]">
                    <E ctx={ctx} path={`experience.${x.id}.client_name`} value={x.client_name} placeholder="Client" className="font-bold" />
                    <span className="text-neutral-400"> · </span>
                    <E ctx={ctx} path={`experience.${x.id}.role`} value={x.role} placeholder="Rôle" className="font-medium" style={{ color: b.primary }} />
                  </h3>
                  {(x.context || ctx.editable) && (
                    <E ctx={ctx} as="p" path={`experience.${x.id}.context`} value={x.context ?? ''} placeholder="Contexte…" multiline className="mt-0.5 block whitespace-pre-wrap text-[9.5px] leading-[1.5] text-neutral-500" />
                  )}
                  <Tasks ctx={ctx} id={x.id} tasks={x.tasks} className="mt-1 space-y-0.5 text-[9.8px] leading-[1.45] text-neutral-800" bullet={<span className="shrink-0" style={{ color: b.accent }}>›</span>} />
                  <Environment ctx={ctx} id={x.id} env={x.environment} label={false} className="mt-1 text-[8.5px] text-neutral-600" chip={{ background: tint(b.primary, 0.07) }} />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {(c.educations.length > 0 || c.languages.length > 0) && (
        <section className="mt-4 grid grid-cols-2 gap-6">
          {c.educations.length > 0 && (
            <div className="text-[10px] text-neutral-800">
              <Title>Formation</Title>
              <Educations c={c} ctx={ctx} yearClass="text-neutral-400" />
            </div>
          )}
          {c.languages.length > 0 && (
            <div className="text-[10px] text-neutral-800">
              <Title>Langues</Title>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <Languages c={c} ctx={ctx} />
              </div>
            </div>
          )}
        </section>
      )}

      <Footer b={b} show={showConfidential} className="mt-auto pt-2" />
    </div>
  );
}
