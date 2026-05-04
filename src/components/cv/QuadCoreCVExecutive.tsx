'use client';

import type { CVContent } from '@/types';
import { formatMonthYear } from '@/lib/utils';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';
import { Editable } from './Editable';
import type { CVBrand } from '@/lib/cv/branding';
import { resolveBrand } from '@/lib/cv/branding';

type Props = {
  content: CVContent;
  showConfidential?: boolean;
  editable?: boolean;
  onEdit?: (path: string, value: string) => void;
  brand?: CVBrand;
  qrSrc?: string | null;
};

/**
 * QuadCore Executive — Pour directeurs, leads, architectes.
 * Met en avant le résumé exécutif et le pilotage plutôt que la technique.
 */
export function QuadCoreCVExecutive({
  content,
  showConfidential = true,
  editable = false,
  onEdit,
  brand,
  qrSrc,
}: Props) {
  const b = brand ?? resolveBrand(null);
  return (
    <div
      className="cv-print-page bg-white text-neutral-900 shadow-2xl mx-auto font-sans"
      style={{ width: '210mm' }}
    >
      {/* Header large et majestueux */}
      <header className="px-14 pt-14 pb-10 relative">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <QuadCoreLogo size="lg" variant="light" src={b.logoUrl} alt={b.brandName} />
            {qrSrc && (
              <div className="flex flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrSrc}
                  alt="QR contact"
                  className="h-20 w-20 rounded-md border border-neutral-200"
                />
                <span className="text-[7px] uppercase tracking-[0.18em] text-neutral-400">
                  Scanner contact
                </span>
              </div>
            )}
          </div>
          {showConfidential && (
            <div className="text-right text-[9px] uppercase tracking-[0.22em] text-neutral-400">
              <div>Profil Executive</div>
              <div className="mt-0.5">Document confidentiel</div>
            </div>
          )}
        </div>

        <div className="mt-10 max-w-2xl">
          <Editable
            as="h1"
            path="header.displayName"
            value={content.header.displayName}
            editable={editable}
            onEdit={onEdit}
            placeholder="Nom du consultant"
            className="block text-[44px] font-bold leading-[0.95] tracking-tight"
            style={{ letterSpacing: '-0.03em' }}
          />
          <Editable
            as="p"
            path="header.jobTitle"
            value={content.header.jobTitle}
            editable={editable}
            onEdit={onEdit}
            placeholder="Intitulé de poste"
            className="block text-[19px] font-semibold mt-3"
            style={{ color: b.primary }}
          />
          {(content.header.subTitle || editable) && (
            <Editable
              as="p"
              path="header.subTitle"
              value={content.header.subTitle ?? ''}
              editable={editable}
              onEdit={onEdit}
              placeholder="Sous-titre (stack, spécialité…)"
              className="block text-[13px] text-neutral-500 mt-1"
            />
          )}
        </div>

        <div
          className="mt-8 h-[3px] w-24"
          style={{ background: `linear-gradient(90deg, ${b.primary}, ${b.accent})` }}
        />
      </header>

      {/* Résumé exécutif proéminent */}
      <section className="px-14 py-6 bg-neutral-50 border-y border-neutral-200">
        <div className="grid grid-cols-[1fr_auto] gap-8">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 mb-2">
              Résumé exécutif
            </div>
            <Editable
              as="p"
              path="summary"
              value={content.summary}
              editable={editable}
              onEdit={onEdit}
              placeholder="Résumé exécutif du profil…"
              multiline
              className="block text-[13px] leading-[1.65] text-neutral-800 whitespace-pre-wrap"
            />
          </div>
          <div className="text-right border-l border-neutral-300 pl-8 space-y-3">
            <EditableKeyValue
              label="Expérience"
              path="header.yearsExperience"
              value={`${content.header.yearsExperience} ans`}
              editable={editable}
              onEdit={onEdit}
              placeholder="X ans"
              highlight
              highlightColor={b.primary}
            />
            {(content.header.location || editable) && (
              <EditableKeyValue
                label="Base"
                path="header.location"
                value={content.header.location ?? ''}
                editable={editable}
                onEdit={onEdit}
                placeholder="Ville"
              />
            )}
            {(content.header.mobility || editable) && (
              <EditableKeyValue
                label="Mobilité"
                path="header.mobility"
                value={content.header.mobility ?? ''}
                editable={editable}
                onEdit={onEdit}
                placeholder="—"
              />
            )}
            {(content.header.availability || editable) && (
              <EditableKeyValue
                label="Disponibilité"
                path="header.availability"
                value={content.header.availability ?? ''}
                editable={editable}
                onEdit={onEdit}
                placeholder="—"
              />
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
            style={{ background: `linear-gradient(90deg, ${b.primary} 0%, transparent 100%)` }}
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
                <Editable
                  as="h3"
                  path={`experience.${exp.id}.client_name`}
                  value={exp.client_name}
                  editable={editable}
                  onEdit={onEdit}
                  placeholder="Client"
                  className="block text-[14px] font-bold text-neutral-900"
                />
                <Editable
                  as="p"
                  path={`experience.${exp.id}.role`}
                  value={exp.role}
                  editable={editable}
                  onEdit={onEdit}
                  placeholder="Rôle"
                  className="block text-[12px] font-semibold"
                  style={{ color: b.primary }}
                />
                {(exp.context || editable) && (
                  <Editable
                    as="p"
                    path={`experience.${exp.id}.context`}
                    value={exp.context ?? ''}
                    editable={editable}
                    onEdit={onEdit}
                    placeholder="Contexte de la mission…"
                    multiline
                    className="block text-[11px] text-neutral-600 mt-1 leading-[1.5] italic whitespace-pre-wrap"
                  />
                )}
                {exp.tasks && exp.tasks.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {exp.tasks.slice(0, 4).map((t, i) => (
                      <li key={i} className="flex gap-2 text-[11px] leading-[1.55] text-neutral-800">
                        <span
                          className="mt-[6px] h-[4px] w-[4px] shrink-0"
                          style={{ backgroundColor: b.accent }}
                        />
                        <Editable
                          as="span"
                          path={`experience.${exp.id}.task.${i}`}
                          value={t}
                          editable={editable}
                          onEdit={onEdit}
                          placeholder="Tâche / responsabilité"
                          multiline
                          className="flex-1 whitespace-pre-wrap"
                        />
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
            style={{ background: `linear-gradient(90deg, ${b.primary} 0%, transparent 100%)` }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {content.skillCategories.flatMap((cat, catIdx) =>
            cat.items.slice(0, 6).map((item, i) => (
              <Editable
                key={`${catIdx}-${i}`}
                as="span"
                path={`skill.${catIdx}.item.${i}`}
                value={item}
                editable={editable}
                onEdit={onEdit}
                placeholder="—"
                className="text-[10.5px] font-semibold px-3 py-1 rounded-full border border-neutral-300 text-neutral-800"
              />
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
                <Editable
                  as="span"
                  path={`education.${edu.id}.year`}
                  value={String(edu.year)}
                  editable={editable}
                  onEdit={onEdit}
                  placeholder="2024"
                  className="font-semibold"
                />
                {' — '}
                <Editable
                  as="span"
                  path={`education.${edu.id}.degree`}
                  value={edu.degree}
                  editable={editable}
                  onEdit={onEdit}
                  placeholder="Diplôme"
                  className="font-semibold"
                />
                {(edu.institution || editable) && (
                  <span className="text-neutral-500">
                    {' · '}
                    <Editable
                      as="span"
                      path={`education.${edu.id}.institution`}
                      value={edu.institution ?? ''}
                      editable={editable}
                      onEdit={onEdit}
                      placeholder="École"
                    />
                  </span>
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
            {content.languages.map((l, i) => (
              <li key={`${l.code}-${i}`}>
                <Editable
                  as="span"
                  path={`language.${i}.code`}
                  value={l.code.toUpperCase()}
                  editable={editable}
                  onEdit={onEdit}
                  placeholder="FR"
                  className="font-semibold"
                />
                {' — '}
                <Editable
                  as="span"
                  path={`language.${i}.level`}
                  value={l.level}
                  editable={editable}
                  onEdit={onEdit}
                  placeholder="Niveau"
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="px-14 py-4 border-t border-neutral-200 flex justify-between text-[9px] text-neutral-400">
        <span>{b.brandName} — {b.footerTagline}</span>
        <span className="uppercase tracking-[0.2em]">Document confidentiel</span>
      </footer>
    </div>
  );
}

function EditableKeyValue({
  label,
  path,
  value,
  editable,
  onEdit,
  placeholder,
  highlight = false,
  highlightColor,
}: {
  label: string;
  path: string;
  value: string;
  editable?: boolean;
  onEdit?: (path: string, value: string) => void;
  placeholder?: string;
  highlight?: boolean;
  highlightColor?: string;
}) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-neutral-500">{label}</div>
      <Editable
        as="div"
        path={path}
        value={value}
        editable={!!editable}
        onEdit={onEdit}
        placeholder={placeholder ?? '—'}
        className="text-[12px] font-semibold"
        style={highlight ? { color: highlightColor ?? '#6d28d9' } : undefined}
      />
    </div>
  );
}
