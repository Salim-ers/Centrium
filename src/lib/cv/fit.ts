// =========================================================================
// Pertinence d'un dossier pour un besoin : score Matching IA (engine.ts,
// sur le profil), expériences les plus pertinentes, mots-clés du besoin
// retrouvés (ou non) dans le dossier tel qu'il sera envoyé. Fonctions
// pures : rien n'est supposé, seules les données saisies comptent.
// =========================================================================

import { normalizeSkill } from '@/lib/ai/matching/normalize';
import { scoreMatch, titleSimilarity, type MatchNeed, type MatchProfile, type MatchResult } from '@/lib/matching/engine';
import { dayDiff } from '@/lib/utils/dates';
import { fold } from '@/lib/utils/text';
import type { ConsultantExperience, CVContent } from '@/types';
import { visibleCategories } from './layout';

export type RelevantExperience = {
  id: string;
  client: string;
  role: string;
  /** Exigences du besoin citées dans l'environnement ou les réalisations. */
  shared: string[];
  /** Intitulé proche de celui du besoin. */
  similarRole: boolean;
  recent: boolean;
  score: number;
};

export type DossierFit = {
  match: MatchResult;
  /** Expériences classées par pertinence (score > 0 seulement). */
  relevant: RelevantExperience[];
  keywords: { found: string[]; missing: string[] };
};

const canonical = (s: string) => normalizeSkill(s).canonical || fold(s);

/**
 * Termes techniques reconnus dans un texte (mots et paires de mots du
 * dictionnaire de compétences ; correspondances exactes uniquement).
 */
export function techTerms(text: string): string[] {
  const words = text.split(/[^\p{L}\p{N}+#.\-/]+/u).map((w) => w.replace(/[.,;:]+$/, '')).filter((w) => w.length > 1);
  const found = new Map<string, string>();
  const consider = (term: string) => {
    const n = normalizeSkill(term);
    if (n.matchConfidence === 1 && n.canonical && !found.has(n.canonical)) found.set(n.canonical, term);
  };
  for (let i = 0; i < words.length; i++) {
    if (i + 1 < words.length) consider(`${words[i]} ${words[i + 1]}`);
    consider(words[i]!);
  }
  return [...found.values()];
}

/** Mots-clés du besoin : exigences listées puis termes techniques de sa description. */
export function needKeywords(need: MatchNeed, description = ''): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of [...need.mandatory, ...need.optional, ...techTerms(`${need.title} ${description}`)]) {
    const c = canonical(k);
    if (!k.trim() || seen.has(c)) continue;
    seen.add(c);
    out.push(k.trim());
  }
  return out;
}

/** Texte du dossier tel qu'il sera envoyé (sections visibles uniquement). */
export function dossierText(c: CVContent): string {
  return [
    c.header.jobTitle,
    c.header.subTitle ?? '',
    c.summary,
    ...visibleCategories(c).flatMap((x) => x.items.map((i) => i.item)),
    ...c.experiences.flatMap((e) => [e.role, e.context ?? '', ...(e.tasks ?? []), ...(e.environment ?? [])]),
    ...(c.certifications ?? []).map((x) => x.name),
  ].join(' \n ');
}

/** Exigences du besoin présentes dans une expérience (environnement, réalisations, contexte). */
function sharedWith(e: Pick<ConsultantExperience, 'environment' | 'tasks' | 'context' | 'role'>, wanted: Array<{ raw: string; canon: string }>): string[] {
  const env = new Set((e.environment ?? []).map(canonical));
  const text = fold([e.role, e.context ?? '', ...(e.tasks ?? [])].join(' '));
  const terms = new Set(techTerms([e.role, e.context ?? '', ...(e.tasks ?? [])].join(' ')).map(canonical));
  return wanted.filter((w) => env.has(w.canon) || terms.has(w.canon) || (w.raw.length > 2 && text.includes(fold(w.raw)))).map((w) => w.raw);
}

/**
 * Expériences classées par pertinence pour le besoin : exigences partagées
 * (2 points chacune), intitulé proche (2), récence (1, moins de 3 ans).
 */
export function rankExperiences(experiences: ConsultantExperience[], need: MatchNeed, today: string): RelevantExperience[] {
  const wanted = [...need.mandatory, ...need.optional].filter((s) => s.trim()).map((raw) => ({ raw, canon: canonical(raw) }));
  return experiences
    .map((e) => {
      const shared = sharedWith(e, wanted);
      const sim = titleSimilarity(need.title, e.role);
      const similarRole = sim >= 0.5;
      const recent = !e.end_date || dayDiff(e.end_date, today) <= 3 * 365;
      const score = shared.length * 2 + (similarRole ? 2 : sim > 0 ? 1 : 0) + (recent ? 1 : 0);
      return { id: e.id, client: e.client_name, role: e.role, shared, similarRole, recent, score };
    })
    .filter((r) => r.shared.length > 0 || r.similarRole)
    .sort((a, b) => b.score - a.score);
}

/** Mots-clés du besoin retrouvés ou absents dans le dossier affiché. */
export function keywordCoverage(keywords: string[], content: CVContent): { found: string[]; missing: string[] } {
  const text = dossierText(content);
  const folded = fold(text);
  const terms = new Set(techTerms(text).map(canonical));
  const found: string[] = [];
  const missing: string[] = [];
  for (const k of keywords) {
    const c = canonical(k);
    if (terms.has(c) || (k.trim().length > 2 && folded.includes(fold(k)))) found.push(k);
    else missing.push(k);
  }
  return { found, missing };
}

/** Pertinence complète : score du profil, expériences, mots-clés du dossier. */
export function analyzeDossierFit(input: {
  need: MatchNeed;
  description?: string;
  profile: MatchProfile;
  experiences: ConsultantExperience[];
  content: CVContent;
  today?: string;
}): DossierFit {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  return {
    match: scoreMatch(input.need, input.profile, { today }),
    relevant: rankExperiences(input.experiences, input.need, today),
    keywords: keywordCoverage(needKeywords(input.need, input.description), input.content),
  };
}
