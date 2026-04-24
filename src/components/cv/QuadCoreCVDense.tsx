'use client';

import type { CVContent } from '@/types';
import { formatMonthYear } from '@/lib/utils';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';
import type { CVBrand } from '@/lib/cv/branding';
import { resolveBrand } from '@/lib/cv/branding';

type Props = {
  content: CVContent;
  showConfidential?: boolean;
  /** Accepté pour interop CVRenderer — l'édition inline est câblée seulement
   *  sur le template Standard pour l'instant. */
  editable?: boolean;
  onEdit?: (path: string, value: string) => void;
  brand?: CVBrand;
};

/**
 * QuadCore Dense — template compact, deux colonnes latérales
 * Pour seniors avec beaucoup d'expériences. Maxi 2 pages.
 */
export function QuadCoreCVDense({ content, showConfidential = true, brand }: Props) {
  const b = brand ?? resolveBrand(null);
  return (
    <div
      className="cv-print-page bg-white text-neutral-900 shadow-2xl mx-auto font-sans"
      style={{ width: '210mm' }}
    >
      {/* Header bandeau sombre */}
      <header
        className="px-10 py-6 relative"
        style={{
          background:
            'linear-gradient(135deg, #0f1119 0%, #2a1a4a 60%, #4a1a3a 100%)',
        }}
      >
        <div className="flex items-start justify-between gap-6 text-white">
          <QuadCoreLogo size="md" variant="dark" src={b.logoUrl} alt={b.brandName} />
          {showConfidential && (
            <div className="text-[9px] uppercase tracking-[0.2em] text-white/50">
              Document confidentiel
            </div>
          )}
        </div>

        <div className="mt-4 text-white">
          <h1 className="text-[28px] font-bold leading-none">{content.header.displayName}</h1>
          <p className="mt-1.5 text-[14px]" style={{ color: b.accent }}>
            {content.header.jobTitle}
          </p>
          {content.header.subTitle && (
            <p className="text-[11px] text-white/70 mt-0.5">{content.header.subTitle}</p>
          )}
        </div>
      </header>

      <div className="grid grid-cols-[220px_1fr]">
        {/* Sidebar gauche */}
        <aside className="bg-neutral-50 px-6 py-6 border-r border-neutral-200">
          <SideBlock title="Profil" color={b.primary}>
            <p className="text-[10.5px] leading-[1.5] text-neutral-700">
              {content.summary}
            </p>
          </SideBlock>

          <SideBlock title="Infos" color={b.primary}>
            <ul className="space-y-1 text-[10px] text-neutral-700">
              <li>
                <strong>{content.header.yearsExperience} ans</strong> d'expérience
              </li>
              {content.header.location && <li>{content.header.location}</li>}
              {content.header.mobility && (
                <li className="text-neutral-500">{content.header.mobility}</li>
              )}
              {content.header.availability && (
                <li className="font-semibold" style={{ color: b.primary }}>
                  {content.header.availability}
                </li>
              )}
            </ul>
          </SideBlock>

          {content.languages.length > 0 && (
            <SideBlock title="Langues" color={b.primary}>
              <ul className="space-y-0.5 text-[10px] text-neutral-700">
                {content.languages.map((l) => (
                  <li key={l.code}>
                    <strong>{l.code.toUpperCase()}</strong> — {l.level}
                  </li>
                ))}
              </ul>
            </SideBlock>
          )}

          {content.educations.length > 0 && (
            <SideBlock title="Formation" color={b.primary}>
              <ul className="space-y-1.5 text-[10px] text-neutral-700">
                {content.educations.map((edu) => (
                  <li key={edu.id}>
                    <div className="font-semibold">{edu.year}</div>
                    <div>{edu.degree}</div>
                    {edu.institution && (
                      <div className="text-neutral-500">{edu.institution}</div>
                    )}
                  </li>
                ))}
              </ul>
            </SideBlock>
          )}
        </aside>

        {/* Contenu principal */}
        <div className="px-8 py-6">
          <DenseSection title="Compétences techniques" color={b.primary}>
            <div className="space-y-1">
              {content.skillCategories.map((cat) => (
                <div key={cat.name} className="flex gap-2 text-[10.5px]">
                  <div className="w-28 shrink-0 uppercase tracking-wider text-[9px] font-semibold text-neutral-600 pt-[1px]">
                    {cat.name}
                  </div>
                  <div className="flex-1 text-neutral-800 leading-[1.5]">
                    {cat.items.map((item, i) => {
                      const h = cat.highlighted?.includes(item);
                      return (
                        <span key={item}>
                          <span
                            className={h ? 'font-bold' : ''}
                            style={h ? { color: b.primary } : undefined}
                          >
                            {item}
                          </span>
                          {i < cat.items.length - 1 && (
                            <span className="text-neutral-400 mx-1">·</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </DenseSection>

          {content.experiences.length > 0 && (
          <DenseSection title="Expériences" color={b.primary}>
            <div className="space-y-3.5">
              {content.experiences.map((exp) => (
                <div key={exp.id} className="cv-article">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[12px] font-bold text-neutral-900">
                      {exp.client_name}
                      <span className="font-normal text-neutral-500 ml-1.5">
                        — {exp.role}
                      </span>
                    </h3>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                      {formatMonthYear(exp.start_date)} → {formatMonthYear(exp.end_date)}
                    </span>
                  </div>
                  {exp.context && (
                    <p className="text-[10.5px] text-neutral-600 italic leading-[1.45] mt-0.5">
                      {exp.context}
                    </p>
                  )}
                  {exp.tasks && exp.tasks.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {exp.tasks.slice(0, 6).map((t, i) => (
                        <li key={i} className="flex gap-1.5 text-[10.5px] leading-[1.45] text-neutral-800">
                          <span
                            className="mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full"
                            style={{ backgroundColor: b.accent }}
                          />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {exp.environment && exp.environment.length > 0 && (
                    <p className="text-[9.5px] text-neutral-500 mt-1">
                      <span className="uppercase tracking-wider font-semibold">Env :</span>{' '}
                      {exp.environment.join(' · ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </DenseSection>
          )}
        </div>
      </div>

      <footer className="border-t border-neutral-200 px-10 py-3 flex items-center justify-between text-[9px] text-neutral-400">
        <span>{b.brandName} — {b.footerTagline}</span>
        <span className="uppercase tracking-[0.18em]">Confidentiel</span>
      </footer>
    </div>
  );
}

function SideBlock({
  title,
  children,
  color,
}: {
  title: string;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="mb-5">
      <h4
        className="text-[9px] font-bold uppercase tracking-[0.22em] mb-2"
        style={{ color: color ?? '#6d28d9' }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

function DenseSection({
  title,
  children,
  color,
}: {
  title: string;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <section className="mb-5">
      <div className="flex items-center gap-3 mb-2.5">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-900">
          {title}
        </h2>
        <div
          className="h-[1px] flex-1"
          style={{ background: `linear-gradient(90deg, ${color ?? '#6d28d9'} 0%, transparent 100%)` }}
        />
      </div>
      {children}
    </section>
  );
}
