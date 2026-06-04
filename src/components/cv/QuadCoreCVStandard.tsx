'use client';

import type { CVContent } from '@/types';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';
import { Editable } from './Editable';
import { EditableDate } from './EditableDate';
import type { CVBrand } from '@/lib/cv/branding';
import { resolveBrand } from '@/lib/cv/branding';

type Props = {
  content: CVContent;
  showConfidential?: boolean;
  editable?: boolean;
  onEdit?: (path: string, value: string) => void;
  /** Branding de l'org. Si omis, fallback QuadCore. */
  brand?: CVBrand;
  /** QR code (LinkedIn / vCard du consultant) à coller à côté du logo. */
  qrSrc?: string | null;
};

/**
 * QuadCore CV Standard — template imprimable A4
 * Direction artistique : cabinet de conseil premium, sobre, sérieux.
 * Fond blanc. Accents QuadCore violet/magenta uniquement sur les séparateurs.
 * Rendu parfait pour envoi client final.
 */
export function QuadCoreCVStandard({
  content,
  showConfidential = true,
  editable = false,
  onEdit,
  brand,
  qrSrc,
}: Props) {
  const b = brand ?? resolveBrand(null);
  return (
    <div className="cv-print-page bg-white text-neutral-900 shadow-2xl mx-auto break-words"
         style={{ width: '210mm', fontFamily: 'Georgia, serif', overflowWrap: 'anywhere' }}>
      {/* ============ HEADER ============ */}
      <header className="relative px-12 pt-10 pb-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <QuadCoreLogo
              size="md"
              variant="light"
              src={b.logoUrl}
              alt={`${b.brandName} — ${b.footerTagline}`}
            />
            {qrSrc && (
              <div className="flex flex-col items-center gap-1">
                <div
                  className="rounded-lg p-1"
                  style={{ background: `linear-gradient(135deg, ${b.primary}, ${b.accent})` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrSrc}
                    alt="vCard contact"
                    className="h-[60px] w-[60px] rounded-md bg-white p-0.5"
                  />
                </div>
                <span
                  className="text-[8px] font-bold tracking-[0.22em]"
                  style={{ color: b.primary }}
                >
                  vCARD
                </span>
              </div>
            )}
          </div>

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
            background: `linear-gradient(90deg, ${b.primary} 0%, ${b.accent} 55%, transparent 100%)`,
          }}
        />
      </header>

      {/* ============ IDENTITY ============ */}
      <section className="px-12 pt-2 pb-4">
        <Editable
          as="h1"
          path="header.displayName"
          value={content.header.displayName}
          editable={editable}
          onEdit={onEdit}
          placeholder="Nom du consultant"
          className="block font-sans text-[32px] font-bold leading-tight tracking-tight text-neutral-900"
          style={{ letterSpacing: '-0.02em' }}
        />
        <Editable
          as="p"
          path="header.jobTitle"
          value={content.header.jobTitle}
          editable={editable}
          onEdit={onEdit}
          placeholder="Intitulé de poste"
          className="block font-sans text-[17px] font-semibold mt-1"
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
            className="block font-sans text-[13px] text-neutral-600 mt-0.5"
          />
        )}

        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[11px] text-neutral-700 font-sans">
          <EditableInfoItem
            label="Expérience"
            path="header.yearsExperience"
            value={`${content.header.yearsExperience} ans`}
            editable={editable}
            onEdit={onEdit}
          />
          {(content.header.location || editable) && (
            <EditableInfoItem
              label="Localisation"
              path="header.location"
              value={content.header.location ?? ''}
              editable={editable}
              onEdit={onEdit}
              placeholder="Ville"
            />
          )}
          {(content.header.mobility || editable) && (
            <EditableInfoItem
              label="Mobilité"
              path="header.mobility"
              value={content.header.mobility ?? ''}
              editable={editable}
              onEdit={onEdit}
              placeholder="ex: France"
            />
          )}
          {(content.header.availability || editable) && (
            <EditableInfoItem
              label="Disponibilité"
              path="header.availability"
              value={content.header.availability ?? ''}
              editable={editable}
              onEdit={onEdit}
              placeholder="ex: Immédiate"
            />
          )}
          {content.languages.length > 0 && (
            <div className="font-sans">
              <span className="uppercase tracking-wider text-[9px] text-neutral-500 mr-1.5">
                Langues
              </span>
              <span className="font-semibold inline-flex flex-wrap gap-x-1 gap-y-0">
                {content.languages.map((l, i) => (
                  <span key={`${l.code}-${i}`} className="inline-flex items-center">
                    <Editable
                      as="span"
                      path={`language.${i}.code`}
                      value={l.code.toUpperCase()}
                      editable={editable}
                      onEdit={onEdit}
                      placeholder="FR"
                    />
                    <span className="text-neutral-400">&nbsp;(</span>
                    <Editable
                      as="span"
                      path={`language.${i}.level`}
                      value={l.level}
                      editable={editable}
                      onEdit={onEdit}
                      placeholder="Niveau"
                    />
                    <span className="text-neutral-400">)</span>
                    {i < content.languages.length - 1 && (
                      <span className="text-neutral-400 mx-1">·</span>
                    )}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ============ EXECUTIVE SUMMARY ============ */}
      <section className="px-12 py-4 border-t border-neutral-200">
        <SectionTitle color={b.primary}>Résumé exécutif</SectionTitle>
        <Editable
          as="p"
          path="summary"
          value={content.summary}
          editable={editable}
          onEdit={onEdit}
          placeholder="Résumé exécutif du profil…"
          multiline
          className="block mt-2 text-[12px] leading-[1.65] text-neutral-800 font-sans whitespace-pre-wrap"
        />
      </section>

      {/* ============ TECH SKILLS ============ */}
      <section className="px-12 py-4 border-t border-neutral-200">
        <SectionTitle color={b.primary}>Compétences techniques</SectionTitle>
        <div className="mt-3 space-y-1.5">
          {content.skillCategories.map((cat, catIdx) => (
            <div key={`cat-${catIdx}`} className="flex gap-3 text-[11.5px] font-sans">
              <div className="w-36 shrink-0 font-semibold text-neutral-700 uppercase text-[10px] tracking-wider pt-0.5">
                <Editable
                  as="span"
                  path={`skill.${catIdx}.name`}
                  value={cat.name}
                  editable={editable}
                  onEdit={onEdit}
                  placeholder="Catégorie"
                />
              </div>
              <div className="flex-1 min-w-0 text-neutral-800 leading-[1.6]">
                {cat.items.map((item, i) => (
                  <span key={`${catIdx}-${i}`}>
                    <Editable
                      as="span"
                      path={`skill.${catIdx}.item.${i}`}
                      value={item}
                      editable={editable}
                      onEdit={onEdit}
                      placeholder="—"
                    />
                    {i < cat.items.length - 1 && (
                      <span className="text-neutral-400 mx-1.5">·</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ EXPERIENCES ============ */}
      {content.experiences.length > 0 && (
      <section className="px-12 py-4 border-t border-neutral-200 cv-section">
        <SectionTitle color={b.primary}>Expériences professionnelles</SectionTitle>
        <div className="mt-4 space-y-5">
          {content.experiences.map((exp) => (
            <article key={exp.id} className="cv-article">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="flex-1 min-w-0 font-sans font-bold text-[13px] text-neutral-900">
                  <Editable
                    as="span"
                    path={`experience.${exp.id}.client_name`}
                    value={exp.client_name}
                    editable={editable}
                    onEdit={onEdit}
                    placeholder="Client"
                  />
                  <span className="font-normal text-neutral-500 ml-2">
                    —{' '}
                    <Editable
                      as="span"
                      path={`experience.${exp.id}.role`}
                      value={exp.role}
                      editable={editable}
                      onEdit={onEdit}
                      placeholder="Rôle"
                    />
                  </span>
                </h3>
                <div className="text-[10px] uppercase tracking-wider text-neutral-500 whitespace-nowrap font-sans inline-flex items-center gap-1">
                  <EditableDate
                    path={`experience.${exp.id}.start_date`}
                    value={exp.start_date}
                    editable={editable}
                    onEdit={onEdit}
                  />
                  <span>—</span>
                  <EditableDate
                    path={`experience.${exp.id}.end_date`}
                    value={exp.end_date}
                    editable={editable}
                    onEdit={onEdit}
                    allowNull
                  />
                </div>
              </div>

              {(exp.context || editable) && (
                <Editable
                  as="p"
                  path={`experience.${exp.id}.context`}
                  value={exp.context ?? ''}
                  editable={editable}
                  onEdit={onEdit}
                  placeholder="Contexte de la mission…"
                  multiline
                  className="block mt-1 text-[11px] leading-[1.55] text-neutral-600 italic font-sans whitespace-pre-wrap"
                />
              )}

              {exp.tasks && exp.tasks.length > 0 && (
                <ul className="mt-2 space-y-1 font-sans">
                  {exp.tasks.map((task, i) => (
                    <li key={i} className="flex gap-2 text-[11px] leading-[1.55] text-neutral-800">
                      <span
                        className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full"
                        style={{ backgroundColor: b.accent }}
                      />
                      <Editable
                        as="span"
                        path={`experience.${exp.id}.task.${i}`}
                        value={task}
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

              {((exp.environment && exp.environment.length > 0) || editable) && (
                <p className="mt-2 text-[10px] text-neutral-500 font-sans">
                  <span className="uppercase tracking-wider font-semibold">
                    Environnement :
                  </span>{' '}
                  {(exp.environment ?? []).map((env, i) => (
                    <span key={`${exp.id}-env-${i}`}>
                      <Editable
                        as="span"
                        path={`experience.${exp.id}.environment.${i}`}
                        value={env}
                        editable={editable}
                        onEdit={onEdit}
                        placeholder="—"
                      />
                      {i < (exp.environment?.length ?? 0) - 1 && (
                        <span className="text-neutral-400 mx-1">·</span>
                      )}
                    </span>
                  ))}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
      )}

      {/* ============ EDUCATION ============ */}
      {content.educations.length > 0 && (
        <section className="px-12 py-4 border-t border-neutral-200">
          <SectionTitle color={b.primary}>Formation</SectionTitle>
          <div className="mt-3 space-y-1.5 font-sans">
            {content.educations.map((edu) => (
              <div key={edu.id} className="flex items-baseline gap-3 text-[11.5px]">
                <Editable
                  as="span"
                  path={`education.${edu.id}.year`}
                  value={String(edu.year)}
                  editable={editable}
                  onEdit={onEdit}
                  placeholder="2024"
                  className="w-14 shrink-0 font-semibold text-neutral-500"
                />
                <Editable
                  as="span"
                  path={`education.${edu.id}.degree`}
                  value={edu.degree}
                  editable={editable}
                  onEdit={onEdit}
                  placeholder="Diplôme"
                  className="font-semibold text-neutral-900"
                />
                {(edu.institution || editable) && (
                  <span className="text-neutral-500">
                    —{' '}
                    <Editable
                      as="span"
                      path={`education.${edu.id}.institution`}
                      value={edu.institution ?? ''}
                      editable={editable}
                      onEdit={onEdit}
                      placeholder="École / université"
                    />
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============ FOOTER ============ */}
      <footer className="px-12 pt-6 pb-8 border-t border-neutral-200">
        <div className="flex items-center justify-between text-[9px] text-neutral-400 font-sans">
          <span>{b.brandName} — {b.footerTagline}</span>
          <span className="uppercase tracking-[0.18em]">Document confidentiel</span>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ children, color }: { children: React.ReactNode; color?: string }) {
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
          background: `linear-gradient(90deg, ${color ?? '#6d28d9'} 0%, transparent 100%)`,
        }}
      />
    </div>
  );
}

function EditableInfoItem({
  label,
  path,
  value,
  editable,
  onEdit,
  placeholder,
}: {
  label: string;
  path: string;
  value: string;
  editable?: boolean;
  onEdit?: (path: string, value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <span className="uppercase tracking-wider text-[9px] text-neutral-500 mr-1.5">
        {label}
      </span>
      <Editable
        as="span"
        path={path}
        value={value}
        editable={!!editable}
        onEdit={onEdit}
        placeholder={placeholder ?? '—'}
        className="font-semibold"
      />
    </div>
  );
}
