'use client';

import type { CVContent } from '@/types';
import { formatMonthYear } from '@/lib/utils';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';

type Props = { content: CVContent; showConfidential?: boolean };

/**
 * QuadCore Executive — Pour directeurs, leads, architectes.
 * Met en avant le résumé exécutif et le pilotage plutôt que la technique.
 */
export function QuadCoreCVExecutive({ content, showConfidential = true }: Props) {
  return (
    <div
      className="cv-print-page bg-white text-neutral-900 shadow-2xl mx-auto font-sans"
      style={{ width: '210mm' }}
    >
      {/* Header large et majestueux */}
      <header className="px-14 pt-14 pb-10 relative">
        <div className="flex items-start justify-between gap-6">
          <QuadCoreLogo size="lg" variant="light" />
          {showConfidential && (
            <div className="text-right text-[9px] uppercase tracking-[0.22em] text-neutral-400">
              <div>Profil Executive</div>
              <div className="mt-0.5">Document confidentiel</div>
            </div>
          )}
        </div>

        <div className="mt-10 max-w-2xl">
          <h1
            className="text-[44px] font-bold leading-[0.95] tracking-tight"
            style={{ letterSpacing: '-0.03em' }}
          >
            {content.header.displayName}
          </h1>
          <p
            className="text-[19px] font-semibold mt-3"
            style={{ color: '#6d28d9' }}
          >
            {content.header.jobTitle}
          </p>
          {content.header.subTitle && (
            <p className="text-[13px] text-neutral-500 mt-1">{content.header.subTitle}</p>
          )}
        </div>

        <div
          className="mt-8 h-[3px] w-24"
          style={{ background: 'linear-gradient(90deg,#6d28d9,#e11d74)' }}
        />
      </header>

      {/* Résumé exécutif proéminent */}
      <section className="px-14 py-6 bg-neutral-50 border-y border-neutral-200">
        <div className="grid grid-cols-[1fr_auto] gap-8">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 mb-2">
              Résumé exécutif
            </div>
            <p className="text-[13px] leading-[1.65] text-neutral-800">{content.summary}</p>
          </div>
          <div className="text-right border-l border-neutral-300 pl-8 space-y-3">
            <KeyValue label="Expérience" value={`${content.header.yearsExperience} ans`} highlight />
            {content.header.location && (
              <KeyValue label="Base" value={content.header.location} />
            )}
            {content.header.mobility && (
              <KeyValue label="Mobilité" value={content.header.mobility} />
            )}
            {content.header.availability && (
              <KeyValue label="Disponibilité" value={content.header.availability} />
            )}
          </div>
        </div>
      </section>

      {/* Expériences – mise en avant */}
      {content.experiences.length > 0 && (
      <section className="px-14 py-8 cv-section">
        <div className="flex items-center gap-4 mb-5">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.22em]">
            Parcours
          </h2>
          <div
            className="h-[1px] flex-1"
            style={{ background: 'linear-gradient(90deg,#6d28d9 0%, transparent 100%)' }}
          />
        </div>

        <div className="space-y-6">
          {content.experiences.map((exp) => (
            <article key={exp.id} className="cv-article grid grid-cols-[120px_1fr] gap-6">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                  {formatMonthYear(exp.start_date)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                  → {formatMonthYear(exp.end_date)}
                </div>
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-neutral-900">{exp.client_name}</h3>
                <p className="text-[12px] font-semibold" style={{ color: '#6d28d9' }}>
                  {exp.role}
                </p>
                {exp.context && (
                  <p className="text-[11px] text-neutral-600 mt-1 leading-[1.5] italic">
                    {exp.context}
                  </p>
                )}
                {exp.tasks && exp.tasks.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {exp.tasks.slice(0, 4).map((t, i) => (
                      <li key={i} className="flex gap-2 text-[11px] leading-[1.55] text-neutral-800">
                        <span
                          className="mt-[6px] h-[4px] w-[4px] shrink-0"
                          style={{ backgroundColor: '#e11d74' }}
                        />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
      )}

      {/* Compétences clés (compactes) */}
      <section className="px-14 py-6 bg-neutral-50 border-t border-neutral-200">
        <div className="flex items-center gap-4 mb-3">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.22em]">
            Domaines d'expertise
          </h2>
          <div
            className="h-[1px] flex-1"
            style={{ background: 'linear-gradient(90deg,#6d28d9 0%, transparent 100%)' }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {content.skillCategories.flatMap((cat) =>
            cat.items.slice(0, 6).map((item) => (
              <span
                key={`${cat.name}-${item}`}
                className="text-[10.5px] font-semibold px-3 py-1 rounded-full border"
                style={{
                  borderColor: '#6d28d9',
                  color: cat.highlighted?.includes(item) ? '#e11d74' : '#6d28d9',
                }}
              >
                {item}
              </span>
            ))
          )}
        </div>
      </section>

      {/* Formation + langues en pied de page */}
      <section className="px-14 py-6 border-t border-neutral-200 grid grid-cols-2 gap-12">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 mb-2">
            Formation
          </div>
          <ul className="space-y-1.5 text-[11px]">
            {content.educations.map((edu) => (
              <li key={edu.id}>
                <span className="font-semibold">{edu.year}</span> —{' '}
                <span className="font-semibold">{edu.degree}</span>
                {edu.institution && (
                  <span className="text-neutral-500"> · {edu.institution}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 mb-2">
            Langues
          </div>
          <ul className="space-y-1 text-[11px]">
            {content.languages.map((l) => (
              <li key={l.code}>
                <span className="font-semibold">{l.code.toUpperCase()}</span> — {l.level}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="px-14 py-4 border-t border-neutral-200 flex justify-between text-[9px] text-neutral-400">
        <span>QuadCore — IT Services &amp; Consulting</span>
        <span className="uppercase tracking-[0.2em]">Document confidentiel</span>
      </footer>
    </div>
  );
}

function KeyValue({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div
        className="text-[12px] font-semibold"
        style={highlight ? { color: '#6d28d9' } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
