'use client';

import type { CVContent } from '@/types';
import { formatMonthYear } from '@/lib/utils';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';

type Props = {
  content: CVContent;
  showConfidential?: boolean;
};

/**
 * QuadCore CV Standard — template imprimable A4
 * Direction artistique : cabinet de conseil premium, sobre, sérieux.
 * Fond blanc. Accents QuadCore violet/magenta uniquement sur les séparateurs.
 * Rendu parfait pour envoi client final.
 */
export function QuadCoreCVStandard({ content, showConfidential = true }: Props) {
  return (
    <div className="cv-print-page bg-white text-neutral-900 shadow-2xl mx-auto"
         style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Georgia, serif' }}>
      {/* ============ HEADER ============ */}
      <header className="relative px-12 pt-10 pb-6">
        <div className="flex items-start justify-between gap-6">
          <QuadCoreLogo size="md" variant="light" />

          {showConfidential && (
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-[0.2em] text-neutral-400">
                Document confidentiel
              </div>
              <div className="text-[9px] text-neutral-400 mt-0.5">
                Ne pas diffuser sans accord
              </div>
            </div>
          )}
        </div>

        <div
          className="mt-5 h-[2px] w-full"
          style={{
            background:
              'linear-gradient(90deg, #6d28d9 0%, #e11d74 55%, transparent 100%)',
          }}
        />
      </header>

      {/* ============ IDENTITY ============ */}
      <section className="px-12 pt-2 pb-4">
        <h1
          className="font-sans text-[32px] font-bold leading-tight tracking-tight text-neutral-900"
          style={{ letterSpacing: '-0.02em' }}
        >
          {content.header.displayName}
        </h1>
        <p
          className="font-sans text-[17px] font-semibold mt-1"
          style={{ color: '#6d28d9' }}
        >
          {content.header.jobTitle}
        </p>
        {content.header.subTitle && (
          <p className="font-sans text-[13px] text-neutral-600 mt-0.5">
            {content.header.subTitle}
          </p>
        )}

        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[11px] text-neutral-700 font-sans">
          <InfoItem label="Expérience" value={`${content.header.yearsExperience} ans`} />
          {content.header.location && (
            <InfoItem label="Localisation" value={content.header.location} />
          )}
          {content.header.mobility && (
            <InfoItem label="Mobilité" value={content.header.mobility} />
          )}
          {content.header.availability && (
            <InfoItem label="Disponibilité" value={content.header.availability} />
          )}
          {content.languages.length > 0 && (
            <InfoItem
              label="Langues"
              value={content.languages
                .map((l) => `${l.code.toUpperCase()} (${l.level})`)
                .join(' · ')}
            />
          )}
        </div>
      </section>

      {/* ============ EXECUTIVE SUMMARY ============ */}
      <section className="px-12 py-4 border-t border-neutral-200">
        <SectionTitle>Résumé exécutif</SectionTitle>
        <p className="mt-2 text-[12px] leading-[1.65] text-neutral-800 font-sans">
          {content.summary}
        </p>
      </section>

      {/* ============ TECH SKILLS ============ */}
      <section className="px-12 py-4 border-t border-neutral-200">
        <SectionTitle>Compétences techniques</SectionTitle>
        <div className="mt-3 space-y-1.5">
          {content.skillCategories.map((cat) => (
            <div key={cat.name} className="flex gap-3 text-[11.5px] font-sans">
              <div
                className="w-36 shrink-0 font-semibold text-neutral-700 uppercase text-[10px] tracking-wider pt-0.5"
              >
                {cat.name}
              </div>
              <div className="flex-1 text-neutral-800 leading-[1.6]">
                {cat.items.map((item, i) => {
                  const highlighted = cat.highlighted?.includes(item);
                  return (
                    <span key={item}>
                      <span
                        className={highlighted ? 'font-bold' : ''}
                        style={highlighted ? { color: '#6d28d9' } : undefined}
                      >
                        {item}
                      </span>
                      {i < cat.items.length - 1 && (
                        <span className="text-neutral-400 mx-1.5">·</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ EXPERIENCES ============ */}
      <section className="px-12 py-4 border-t border-neutral-200">
        <SectionTitle>Expériences professionnelles</SectionTitle>
        <div className="mt-4 space-y-5">
          {content.experiences.map((exp) => (
            <article key={exp.id}>
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-sans font-bold text-[13px] text-neutral-900">
                  {exp.client_name}
                  <span className="font-normal text-neutral-500 ml-2">
                    — {exp.role}
                  </span>
                </h3>
                <div className="text-[10px] uppercase tracking-wider text-neutral-500 whitespace-nowrap font-sans">
                  {formatMonthYear(exp.start_date)} — {formatMonthYear(exp.end_date)}
                </div>
              </div>

              {exp.context && (
                <p className="mt-1 text-[11px] leading-[1.55] text-neutral-600 italic font-sans">
                  {exp.context}
                </p>
              )}

              {exp.tasks && exp.tasks.length > 0 && (
                <ul className="mt-2 space-y-1 font-sans">
                  {exp.tasks.map((task, i) => (
                    <li key={i} className="flex gap-2 text-[11px] leading-[1.55] text-neutral-800">
                      <span
                        className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full"
                        style={{ backgroundColor: '#e11d74' }}
                      />
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              )}

              {exp.environment && exp.environment.length > 0 && (
                <p className="mt-2 text-[10px] text-neutral-500 font-sans">
                  <span className="uppercase tracking-wider font-semibold">
                    Environnement :
                  </span>{' '}
                  {exp.environment.join(' · ')}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* ============ EDUCATION ============ */}
      {content.educations.length > 0 && (
        <section className="px-12 py-4 border-t border-neutral-200">
          <SectionTitle>Formation</SectionTitle>
          <div className="mt-3 space-y-1.5 font-sans">
            {content.educations.map((edu) => (
              <div key={edu.id} className="flex items-baseline gap-3 text-[11.5px]">
                <span className="w-14 shrink-0 font-semibold text-neutral-500">
                  {edu.year}
                </span>
                <span className="font-semibold text-neutral-900">{edu.degree}</span>
                {edu.institution && (
                  <span className="text-neutral-500">— {edu.institution}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============ FOOTER ============ */}
      <footer className="mt-auto px-12 pt-6 pb-8 border-t border-neutral-200">
        <div className="flex items-center justify-between text-[9px] text-neutral-400 font-sans">
          <span>QuadCore — IT Services &amp; Consulting</span>
          <span className="uppercase tracking-[0.18em]">Document confidentiel</span>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2
        className="font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-900"
      >
        {children}
      </h2>
      <div
        className="h-[1px] flex-1"
        style={{
          background: 'linear-gradient(90deg, #6d28d9 0%, transparent 100%)',
        }}
      />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="uppercase tracking-wider text-[9px] text-neutral-500 mr-1.5">
        {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
