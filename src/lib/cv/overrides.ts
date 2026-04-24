import type { CVContent } from '@/types';

/**
 * Map de surcharges d'édition inline sur le CV généré. Clés = "paths" texte,
 * valeurs = chaîne éditée par l'utilisateur dans le preview.
 *
 * Paths supportés :
 *   - "header.displayName"
 *   - "header.jobTitle"
 *   - "header.subTitle"
 *   - "summary"
 *   - "experience.<id>.role"
 *   - "experience.<id>.client_name"
 *   - "experience.<id>.context"
 *   - "experience.<id>.task.<index>"
 *   - "education.<id>.degree"
 *   - "education.<id>.institution"
 */
export type CVOverrides = Record<string, string>;

export function applyOverrides(content: CVContent, overrides: CVOverrides): CVContent {
  if (!overrides || Object.keys(overrides).length === 0) return content;

  const out: CVContent = {
    ...content,
    header: { ...content.header },
    experiences: content.experiences.map((e) => ({ ...e, tasks: [...(e.tasks ?? [])] })),
    educations: content.educations.map((e) => ({ ...e })),
  };

  const get = (k: string) => overrides[k];

  if (get('header.displayName') !== undefined)
    out.header.displayName = overrides['header.displayName'];
  if (get('header.jobTitle') !== undefined)
    out.header.jobTitle = overrides['header.jobTitle'];
  if (get('header.subTitle') !== undefined)
    out.header.subTitle = overrides['header.subTitle'];
  if (get('summary') !== undefined) out.summary = overrides['summary'];

  for (const exp of out.experiences) {
    if (get(`experience.${exp.id}.role`) !== undefined)
      exp.role = overrides[`experience.${exp.id}.role`];
    if (get(`experience.${exp.id}.client_name`) !== undefined)
      exp.client_name = overrides[`experience.${exp.id}.client_name`];
    if (get(`experience.${exp.id}.context`) !== undefined)
      exp.context = overrides[`experience.${exp.id}.context`];
    if (exp.tasks) {
      exp.tasks = exp.tasks.map((t, i) => {
        const k = `experience.${exp.id}.task.${i}`;
        return overrides[k] !== undefined ? overrides[k] : t;
      });
    }
  }

  for (const edu of out.educations) {
    if (get(`education.${edu.id}.degree`) !== undefined)
      edu.degree = overrides[`education.${edu.id}.degree`];
    if (get(`education.${edu.id}.institution`) !== undefined)
      edu.institution = overrides[`education.${edu.id}.institution`];
  }

  return out;
}
