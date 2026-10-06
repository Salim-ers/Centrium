// =========================================================================
// Mise en page d'un dossier de compétences : ordre et visibilité des
// sections, titres personnalisés, expériences retenues (et leur ordre),
// compétences mises en avant ou masquées, certifications affichées, nom
// affiché. Appliquée au contenu avant le rendu (aperçu, PDF, Word) : ce que
// l'on voit est ce que l'on exporte. Rien n'est ajouté — on choisit, on
// ordonne, on masque, à partir des seules données du profil.
// =========================================================================

import { fold } from '@/lib/utils/text';
import type { Certification, CVContent, CVSectionId } from '@/types';

export const SECTION_IDS: CVSectionId[] = ['summary', 'skills', 'experiences', 'educations', 'certifications', 'languages'];

export const SECTION_LABEL: Record<CVSectionId, { fr: string; en: string }> = {
  summary: { fr: 'Profil', en: 'Profile' },
  skills: { fr: 'Compétences', en: 'Skills' },
  experiences: { fr: 'Expériences', en: 'Experience' },
  educations: { fr: 'Formation', en: 'Education' },
  certifications: { fr: 'Certifications', en: 'Certifications' },
  languages: { fr: 'Langues', en: 'Languages' },
};

/**
 * Nom affiché. Par défaut le dossier est anonymisé comme le générateur le
 * produit (initiales du profil) ; prénom + initiale ou nom complet sur choix.
 */
export type NameFormat = 'initials' | 'first_initial' | 'full';

export type DossierLayout = {
  order: CVSectionId[];
  hidden: CVSectionId[];
  titles: Partial<Record<CVSectionId, string>>;
  /** Expériences retenues, dans l'ordre ; null : toutes, dans l'ordre généré. */
  experienceIds: string[] | null;
  hiddenSkills: string[];
  /** Compétences mises en avant ; null : choix du générateur. */
  highlightedSkills: string[] | null;
  /** Certifications affichées (par nom) ; null : toutes. */
  certificationNames: string[] | null;
  nameFormat: NameFormat;
};

export const DEFAULT_LAYOUT: DossierLayout = {
  order: SECTION_IDS,
  hidden: [],
  titles: {},
  experienceIds: null,
  hiddenSkills: [],
  highlightedSkills: null,
  certificationNames: null,
  nameFormat: 'initials',
};

/** Ordre complet et sans doublon (sections inconnues retirées, manquantes ajoutées). */
export function normalizeOrder(order: CVSectionId[]): CVSectionId[] {
  const seen = new Set<CVSectionId>();
  const out: CVSectionId[] = [];
  for (const id of [...order, ...SECTION_IDS]) {
    if (!SECTION_IDS.includes(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function formatDisplayName(first: string, last: string, format: NameFormat): string {
  const f = first.trim();
  const l = last.trim();
  const initial = (s: string) => (s ? `${s.charAt(0).toUpperCase()}.` : '');
  if (format === 'initials') return [initial(f), initial(l)].filter(Boolean).join(' ');
  if (format === 'first_initial') return [f, initial(l)].filter(Boolean).join(' ');
  return [f, l].filter(Boolean).join(' ');
}

/**
 * Applique la mise en page au contenu (après les retouches de texte) :
 * sections masquées vidées, expériences filtrées et ordonnées, compétences
 * masquées marquées (les indices d'édition restent valides), mises en avant,
 * certifications retenues, nom affiché.
 */
export function applyLayout(
  content: CVContent,
  layout: DossierLayout,
  extras: { certifications?: Certification[] | null; firstName?: string; lastName?: string } = {},
): CVContent {
  const hidden = new Set(layout.hidden);

  let experiences = content.experiences;
  if (layout.experienceIds) {
    const byId = new Map(content.experiences.map((e) => [e.id, e]));
    experiences = layout.experienceIds.map((id) => byId.get(id)).filter((e): e is NonNullable<typeof e> => !!e);
  }

  const hiddenSkills = new Set(layout.hiddenSkills.map(fold));
  const chosen = layout.highlightedSkills ? new Set(layout.highlightedSkills.map(fold)) : null;
  const skillCategories = content.skillCategories.map((cat) => {
    const hiddenItems = cat.items.filter((it) => hiddenSkills.has(fold(it)));
    const visible = cat.items.filter((it) => !hiddenSkills.has(fold(it)));
    const highlighted = chosen ? visible.filter((it) => chosen.has(fold(it))) : (cat.highlighted ?? []).filter((h) => visible.some((v) => fold(v) === fold(h)));
    return { ...cat, highlighted, hiddenItems };
  });

  const certs = (extras.certifications ?? content.certifications ?? []).filter((c) => c?.name?.trim());
  const certifications = layout.certificationNames ? certs.filter((c) => layout.certificationNames!.includes(c.name)) : certs;

  // Initiales : celles du générateur (champ « initiales » du profil, sinon calculées).
  const displayName =
    layout.nameFormat !== 'initials' && extras.firstName != null && extras.lastName != null
      ? formatDisplayName(extras.firstName, extras.lastName, layout.nameFormat)
      : content.header.displayName;

  return {
    ...content,
    header: { ...content.header, displayName },
    summary: hidden.has('summary') ? '' : content.summary,
    skillCategories: hidden.has('skills') ? [] : skillCategories,
    experiences: hidden.has('experiences') ? [] : experiences,
    educations: hidden.has('educations') ? [] : content.educations,
    certifications: hidden.has('certifications') ? [] : certifications,
    languages: hidden.has('languages') ? [] : content.languages,
    layout: { order: normalizeOrder(layout.order).filter((id) => !hidden.has(id)), titles: layout.titles },
  };
}

// ── Lecture côté rendu ─────────────────────────────────────────────────

/** Ordre des sections à rendre (toutes, dans l'ordre par défaut, sans mise en page). */
export function sectionOrder(c: CVContent): CVSectionId[] {
  return c.layout?.order ?? SECTION_IDS;
}

/** Titre d'une section : personnalisé, sinon celui du modèle. */
export function sectionTitle(c: CVContent, id: CVSectionId, fallback: string): string {
  return c.layout?.titles?.[id]?.trim() || fallback;
}

/** Compétences visibles d'une catégorie, avec leur indice d'origine (chemins d'édition). */
export function visibleItems(cat: CVContent['skillCategories'][number]): Array<{ item: string; index: number }> {
  const hidden = new Set((cat.hiddenItems ?? []).map(fold));
  return cat.items.map((item, index) => ({ item, index })).filter((x) => !hidden.has(fold(x.item)));
}

/** Catégories ayant au moins une compétence visible. */
export function visibleCategories(c: CVContent): Array<{ cat: CVContent['skillCategories'][number]; index: number; items: Array<{ item: string; index: number }> }> {
  return c.skillCategories.map((cat, index) => ({ cat, index, items: visibleItems(cat) })).filter((x) => x.items.length > 0);
}

/** « AWS Certified Solutions Architect — Amazon (2024) ». */
export function certificationLine(c: Certification): string {
  return [c.name, c.issuer].filter(Boolean).join(' — ') + (c.year ? ` (${c.year})` : '');
}

/**
 * Dossier figé tel qu'affiché (version enregistrée) : compétences masquées
 * retirées pour de bon, ordre et titres conservés. Rouvert, il s'affiche
 * à l'identique, quelle que soit la mise en page du moment.
 */
export function materialize(c: CVContent): CVContent {
  return {
    ...c,
    skillCategories: visibleCategories(c).map(({ cat, items }) => ({ name: cat.name, items: items.map((x) => x.item), highlighted: cat.highlighted ?? [] })),
  };
}

// ── Modifications (éditeur) ────────────────────────────────────────────

export function moveInList<T>(list: T[], item: T, dir: -1 | 1): T[] {
  const i = list.indexOf(item);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j]!, out[i]!];
  return out;
}

export function toggleInList<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}
