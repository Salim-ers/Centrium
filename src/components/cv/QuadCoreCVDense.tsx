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
  brand?: CVBrand;
  qrSrc?: string | null;
};

/**
 * QuadCore Dense — template compact, deux colonnes latérales
 * Pour seniors avec beaucoup d'expériences. Maxi 2 pages.
 */
export function QuadCoreCVDense({
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
      className="cv-print-page bg-white text-neutral-900 shadow-2xl mx-auto font-sans break-words"
      style={{ width: '210mm', overflowWrap: 'anywhere' }}
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
          <div className="flex items-start gap-3">
            <QuadCoreLogo size="md" variant="dark" src={b.logoUrl} alt={b.brandName} />
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
                    className="h-12 w-12 rounded-md bg-white p-0.5"
                  />
                </div>
                <span className="text-[8px] font-bold tracking-[0.22em] text-white/80">
                  vCARD
                </span>
              </div>
            )}
          </div>
          {showConfidential && (
            <div className="text-[9px] uppercase tracking-[0.2em] text-white/50">
              Document confidentiel
            </div>
          )}
        </div>

        <div className="mt-4 text-white">
          <Editable
            as="h1"
            path="header.displayName"
            value={content.header.displayName}
            editable={editable}
            onEdit={onEdit}
            placeholder="Nom du consultant"
            className="block text-[28px] font-bold leading-none"
          />
          <Editable
            as="p"
            path="header.jobTitle"
            value={content.header.jobTitle}
            editable={editable}
            onEdit={onEdit}
            placeholder="Intitulé de poste"
            className="block mt-1.5 text-[14px]"
            style={{ color: b.accent }}
          />
          {(content.header.subTitle || editable) && (
            <Editable
              as="p"
              path="header.subTitle"
              value={content.header.subTitle ?? ''}
              editable={editable}
              onEdit={onEdit}
              placeholder="Sous-titre (stack, spécialité…)"
              className="block text-[11px] text-white/70 mt-0.5"
            />
          )}
        </div>
      </header>

      <div className="grid grid-cols-[220px_1fr]">
        {/* Sidebar gauche */}
        <aside className="bg-neutral-50 px-6 py-6 border-r border-neutral-200">
          <SideBlock title="Profil" color={b.primary}>
            <Editable
              as="p"
              path="summary"
              value={content.summary}
              editable={editable}
              onEdit={onEdit}
              placeholder="Résumé exécutif…"
              multiline
              className="block text-[10.5px] leading-[1.5] text-neutral-700 whitespace-pre-wrap"
            />
          </SideBlock>

          <SideBlock title="Infos" color={b.primary}>
            <ul className="space-y-1 text-[10px] text-neutral-700">
              <li>
                <Editable
                  as="span"
                  path="header.yearsExperience"
                  value={`${content.header.yearsExperience} ans`}
                  editable={editable}
                  onEdit={onEdit}
                  placeholder="X ans"
                  className="font-bold"
                />{' '}
                d'expérience
              </li>
              {(content.header.location || editable) && (
                <li>
                  <Editable
                    as="span"
                    path="header.location"
                    value={content.header.location ?? ''}
                    editable={editable}
                    onEdit={onEdit}
                    placeholder="Ville"
                  />
                </li>
              )}
              {(content.header.mobility || editable) && (
                <li className="text-neutral-500">
                  <Editable
                    as="span"
                    path="header.mobility"
                    value={content.header.mobility ?? ''}
                    editable={editable}
                    onEdit={onEdit}
                    placeholder="Mobilité"
                  />
                </li>
              )}
              {(content.header.availability || editable) && (
                <li className="font-semibold" style={{ color: b.primary }}>
                  <Editable
                    as="span"
                    path="header.availability"
                    value={content.header.availability ?? ''}
                    editable={editable}
                    onEdit={onEdit}
                    placeholder="Disponibilité"
                  />
                </li>
              )}
            </ul>
          </SideBlock>

          {content.languages.length > 0 && (
            <SideBlock title="Langues" color={b.primary}>
              <ul className="space-y-0.5 text-[10px] text-neutral-700">
                {content.languages.map((l, i) => (
                  <li key={`${l.code}-${i}`}>
                    <Editable
                      as="span"
                      path={`language.${i}.code`}
                      value={l.code.toUpperCase()}
                      editable={editable}
                      onEdit={onEdit}
                      placeholder="FR"
                      className="font-bold"
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
            </SideBlock>
          )}

          {content.educations.length > 0 && (
            <SideBlock title="Formation" color={b.primary}>
              <ul className="space-y-1.5 text-[10px] text-neutral-700">
                {content.educations.map((edu) => (
                  <li key={edu.id}>
                    <Editable
                      as="div"
                      path={`education.${edu.id}.year`}
                      value={String(edu.year)}
                      editable={editable}
                      onEdit={onEdit}
                      placeholder="2024"
                      className="font-semibold"
                    />
                    <Editable
                      as="div"
                      path={`education.${edu.id}.degree`}
                      value={edu.degree}
                      editable={editable}
                      onEdit={onEdit}
                      placeholder="Diplôme"
                    />
                    {(edu.institution || editable) && (
                      <Editable
                        as="div"
                        path={`education.${edu.id}.institution`}
                        value={edu.institution ?? ''}
                        editable={editable}
                        onEdit={onEdit}
                        placeholder="École"
                        className="text-neutral-500"
                      />
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
              {content.skillCategories.map((cat, catIdx) => (
                <div key={`cat-${catIdx}`} className="flex gap-2 text-[10.5px]">
                  <div className="w-28 shrink-0 uppercase tracking-wider text-[9px] font-semibold text-neutral-600 pt-[1px]">
                    <Editable
                      as="span"
                      path={`skill.${catIdx}.name`}
                      value={cat.name}
                      editable={editable}
                      onEdit={onEdit}
                      placeholder="Catégorie"
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-neutral-800 leading-[1.5]">
                    {cat.items.map((item, i) => {
                      return (
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
                    <h3 className="flex-1 min-w-0 text-[12px] font-bold text-neutral-900">
                      <Editable
                        as="span"
                        path={`experience.${exp.id}.client_name`}
                        value={exp.client_name}
                        editable={editable}
                        onEdit={onEdit}
                        placeholder="Client"
                      />
                      <span className="font-normal text-neutral-500 ml-1.5">
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
                    <span className="text-[9px] uppercase tracking-wider text-neutral-500 whitespace-nowrap inline-flex items-center gap-1">
                      <EditableDate
                        path={`experience.${exp.id}.start_date`}
                        value={exp.start_date}
                        editable={editable}
                        onEdit={onEdit}
                      />
                      <span>→</span>
                      <EditableDate
                        path={`experience.${exp.id}.end_date`}
                        value={exp.end_date}
                        editable={editable}
                        onEdit={onEdit}
                        allowNull
                      />
                    </span>
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
                      className="block text-[10.5px] text-neutral-600 italic leading-[1.45] mt-0.5 whitespace-pre-wrap"
                    />
                  )}
                  {exp.tasks && exp.tasks.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {exp.tasks.slice(0, 6).map((t, i) => (
                        <li key={i} className="flex gap-1.5 text-[10.5px] leading-[1.45] text-neutral-800">
                          <span
                            className="mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full"
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
                  {((exp.environment && exp.environment.length > 0) || editable) && (
                    <p className="text-[9.5px] text-neutral-500 mt-1">
                      <span className="uppercase tracking-wider font-semibold">Env :</span>{' '}
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
