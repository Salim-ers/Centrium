import type { CVContent, Language } from '@/types';

/**
 * Map de surcharges d'édition inline sur le CV généré. Clés = "paths" texte,
 * valeurs = chaîne éditée par l'utilisateur dans le preview.
 *
 * Une string vide ('') sur une ITEM d'array → supprime l'item.
 *
 * Paths supportés :
 *
 *   Header
 *   - "header.displayName"
 *   - "header.jobTitle"
 *   - "header.subTitle"
 *   - "header.yearsExperience"   (input numérique mais stocké string)
 *   - "header.location"
 *   - "header.mobility"
 *   - "header.availability"
 *
 *   Résumé
 *   - "summary"
 *
 *   Compétences
 *   - "skill.<catIdx>.name"            (nom de la catégorie)
 *   - "skill.<catIdx>.item.<itemIdx>"  (un item ; vide = supprimer)
 *
 *   Expériences
 *   - "experience.<id>.client_name"
 *   - "experience.<id>.role"
 *   - "experience.<id>.context"
 *   - "experience.<id>.task.<index>"          (vide = supprimer la tâche)
 *   - "experience.<id>.environment.<index>"   (vide = supprimer l'item env)
 *
 *   Formation
 *   - "education.<id>.year"
 *   - "education.<id>.degree"
 *   - "education.<id>.institution"
 *
 *   Langues
 *   - "language.<index>.code"
 *   - "language.<index>.level"
 */
export type CVOverrides = Record<string, string>;

export function applyOverrides(content: CVContent, overrides: CVOverrides): CVContent {
  if (!overrides || Object.keys(overrides).length === 0) return content;

  const out: CVContent = {
    ...content,
    header: { ...content.header },
    skillCategories: content.skillCategories.map((c) => ({
      ...c,
      items: [...c.items],
      highlighted: c.highlighted ? [...c.highlighted] : undefined,
    })),
    experiences: content.experiences.map((e) => ({
      ...e,
      tasks: [...(e.tasks ?? [])],
      environment: [...(e.environment ?? [])],
    })),
    educations: content.educations.map((e) => ({ ...e })),
    languages: content.languages.map((l) => ({ ...l })),
  };

  const get = (k: string): string | undefined => overrides[k];

  // === Header
  if (get('header.displayName') !== undefined)
    out.header.displayName = overrides['header.displayName'];
  if (get('header.jobTitle') !== undefined)
    out.header.jobTitle = overrides['header.jobTitle'];
  if (get('header.subTitle') !== undefined)
    out.header.subTitle = overrides['header.subTitle'];
  if (get('header.yearsExperience') !== undefined) {
    const n = parseInt(overrides['header.yearsExperience'].replace(/\D/g, ''), 10);
    if (!Number.isNaN(n)) out.header.yearsExperience = n;
  }
  if (get('header.location') !== undefined)
    out.header.location = overrides['header.location'];
  if (get('header.mobility') !== undefined)
    out.header.mobility = overrides['header.mobility'];
  if (get('header.availability') !== undefined)
    out.header.availability = overrides['header.availability'];

  // === Résumé
  if (get('summary') !== undefined) out.summary = overrides['summary'];

  // === Skills (catégorie name + items)
  out.skillCategories = out.skillCategories.map((cat, catIdx) => {
    const nameOverride = get(`skill.${catIdx}.name`);
    const newName = nameOverride !== undefined ? nameOverride : cat.name;

    // Pour chaque item : si override = '', on le retire ; sinon on remplace.
    const newItems = cat.items
      .map((item, i) => {
        const ov = get(`skill.${catIdx}.item.${i}`);
        return ov !== undefined ? ov : item;
      })
      .filter((s) => s.trim().length > 0);

    // Highlighted : on garde uniquement ceux qui existent encore (par valeur)
    const newHighlighted = cat.highlighted?.filter((h) => newItems.includes(h));

    return { ...cat, name: newName, items: newItems, highlighted: newHighlighted };
  });

  // === Expériences
  for (const exp of out.experiences) {
    if (get(`experience.${exp.id}.role`) !== undefined)
      exp.role = overrides[`experience.${exp.id}.role`];
    if (get(`experience.${exp.id}.client_name`) !== undefined)
      exp.client_name = overrides[`experience.${exp.id}.client_name`];
    if (get(`experience.${exp.id}.context`) !== undefined)
      exp.context = overrides[`experience.${exp.id}.context`];

    if (exp.tasks) {
      exp.tasks = exp.tasks
        .map((t, i) => {
          const k = `experience.${exp.id}.task.${i}`;
          return overrides[k] !== undefined ? overrides[k] : t;
        })
        .filter((t) => t.trim().length > 0);
    }

    if (exp.environment) {
      exp.environment = exp.environment
        .map((e, i) => {
          const k = `experience.${exp.id}.environment.${i}`;
          return overrides[k] !== undefined ? overrides[k] : e;
        })
        .filter((e) => e.trim().length > 0);
    }
  }

  // === Formation
  for (const edu of out.educations) {
    if (get(`education.${edu.id}.degree`) !== undefined)
      edu.degree = overrides[`education.${edu.id}.degree`];
    if (get(`education.${edu.id}.institution`) !== undefined)
      edu.institution = overrides[`education.${edu.id}.institution`];
    if (get(`education.${edu.id}.year`) !== undefined) {
      const n = parseInt(overrides[`education.${edu.id}.year`].replace(/\D/g, ''), 10);
      if (!Number.isNaN(n)) edu.year = n;
    }
  }

  // === Langues
  out.languages = out.languages
    .map((lang, i) => {
      const codeOv = get(`language.${i}.code`);
      const levelOv = get(`language.${i}.level`);
      const next: Language = { ...lang };
      if (codeOv !== undefined) next.code = codeOv;
      if (levelOv !== undefined) next.level = levelOv as Language['level'];
      return next;
    })
    .filter((l) => l.code.trim().length > 0);

  return out;
}
