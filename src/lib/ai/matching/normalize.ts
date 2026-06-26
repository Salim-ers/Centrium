/**
 * Pipeline de normalisation des compétences pour le matching consultant↔mission.
 *
 * Étapes appliquées sur chaque skill brut :
 *   1. lowercase + trim
 *   2. NFKD Unicode + strip diacritics (Café → cafe)
 *   3. remplacements techniques (# → sharp, ++ → plusplus, ASP.NET reste géré par dict)
 *   4. compactage ponctuation (.,-_/ → espace)
 *   5. extraction version optionnelle (React 18.2 → base='react', version='18.2')
 *   6. lookup dictionnaire de synonymes (alias → canonical)
 *   7. fuzzy fallback Jaro-Winkler si pas de match exact (seuil 0.88)
 *
 * Le résultat est un identifiant CANONIQUE comparable entre offre et consultant.
 */

import SYNONYMS from './synonyms.json';

type SynonymEntry = {
  canonical: string;
  aliases: string[];
  category?: string;
};

const ALL_ENTRIES = SYNONYMS as SynonymEntry[];

/** Index inverse : forme normalisée → canonique. Construit au load du module. */
const ALIAS_INDEX = (() => {
  const map = new Map<string, string>();
  for (const entry of ALL_ENTRIES) {
    const canonNorm = baseNormalize(entry.canonical);
    map.set(canonNorm, entry.canonical);
    for (const alias of entry.aliases) {
      const aliasNorm = baseNormalize(alias);
      // On ne fail pas en cas de collision : le 1er gagne (priorité ordre fichier)
      if (!map.has(aliasNorm)) map.set(aliasNorm, entry.canonical);
    }
  }
  return map;
})();

/** Liste des canoniques pour le fuzzy fallback. */
const CANONICALS_NORM: Array<{ norm: string; canonical: string }> = Array.from(
  new Set(Array.from(ALIAS_INDEX.values()))
).map((c) => ({ norm: baseNormalize(c), canonical: c }));

/**
 * Normalisation de base SANS lookup dict — utilisée pour construire l'index
 * inverse + pour la comparaison fuzzy.
 */
function baseNormalize(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // accents
    .replace(/c#/g, 'csharp')
    .replace(/c\+\+/g, 'cplusplus')
    .replace(/[\s\-_./,;:()[\]]+/g, ' ')
    .trim();
}

const VERSION_RE = /\s+v?(\d+(?:\.\d+)*)$/;

export type NormalizedSkill = {
  /** Forme canonique (= clé pour matcher). */
  canonical: string;
  /** Version optionnelle extraite (ex: "18.2" pour "React 18.2"). */
  version?: string;
  /** Skill brute originale (utile pour affichage). */
  raw: string;
  /** Confiance du match (1.0 = exact dict, 0.9 = fuzzy, 0.7 = passthrough). */
  matchConfidence: number;
};

/**
 * Normalise une compétence brute en clé canonique comparable.
 *
 * - "K8s" → { canonical: "kubernetes", confidence: 1.0 }
 * - "React 18" → { canonical: "react", version: "18", confidence: 1.0 }
 * - "Postgrs" → { canonical: "postgresql", confidence: 0.9 } (fuzzy)
 * - "TutuTech" → { canonical: "tututech", confidence: 0.7 } (inconnu, passthrough)
 */
export function normalizeSkill(raw: string): NormalizedSkill {
  if (!raw || typeof raw !== 'string') {
    return { canonical: '', raw: raw ?? '', matchConfidence: 0 };
  }

  // 1. Base normalize
  let work = baseNormalize(raw);

  // 2. Extraction version
  let version: string | undefined;
  const vm = work.match(VERSION_RE);
  if (vm) {
    version = vm[1];
    work = work.replace(VERSION_RE, '').trim();
  }

  // 3. Lookup dict exact (sur la forme normalisée)
  const dictHit = ALIAS_INDEX.get(work);
  if (dictHit) {
    return { canonical: dictHit, version, raw, matchConfidence: 1.0 };
  }

  // 4. Fuzzy fallback Jaro-Winkler (seuil 0.88)
  const fuzzy = bestFuzzyMatch(work);
  if (fuzzy) {
    return { canonical: fuzzy.canonical, version, raw, matchConfidence: 0.9 };
  }

  // 5. Passthrough : on conserve la forme normalisée comme canonique
  return { canonical: work, version, raw, matchConfidence: 0.7 };
}

/**
 * Recherche le meilleur match fuzzy parmi les canoniques connus.
 * Retourne null si aucun ne dépasse le seuil 0.88.
 */
function bestFuzzyMatch(query: string): { canonical: string; score: number } | null {
  // Skip si trop court (risque de faux positifs sur mots de 2-3 lettres)
  if (query.length < 4) return null;

  let best: { canonical: string; score: number } | null = null;
  for (const c of CANONICALS_NORM) {
    // Optim : skip si les longueurs diffèrent de plus de 40%
    const lenDiff = Math.abs(c.norm.length - query.length) / Math.max(c.norm.length, query.length);
    if (lenDiff > 0.4) continue;

    const score = jaroWinkler(query, c.norm);
    if (score >= 0.88 && (!best || score > best.score)) {
      best = { canonical: c.canonical, score };
    }
  }
  return best;
}

/**
 * Implémentation Jaro-Winkler (sans dépendance externe).
 * Retourne un score entre 0 (totalement différent) et 1 (identique).
 *
 * https://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance
 */
export function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (!s1.length || !s2.length) return 0;

  const matchDistance = Math.max(0, Math.floor(Math.max(s1.length, s2.length) / 2) - 1);
  const s1Matches: boolean[] = new Array(s1.length).fill(false);
  const s2Matches: boolean[] = new Array(s2.length).fill(false);

  let matches = 0;
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  transpositions /= 2;

  const jaro =
    (matches / s1.length + matches / s2.length + (matches - transpositions) / matches) / 3;

  // Préfixe commun (max 4 chars) → bonus Winkler
  let prefix = 0;
  const maxPrefix = Math.min(4, s1.length, s2.length);
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Normalise un tableau de skills en dédupliquant par forme canonique.
 * Préserve l'ordre d'apparition (1ère occurrence gagne pour le raw).
 */
export function normalizeSkillList(raws: string[]): NormalizedSkill[] {
  const seen = new Set<string>();
  const out: NormalizedSkill[] = [];
  for (const r of raws) {
    const n = normalizeSkill(r);
    if (!n.canonical) continue;
    if (seen.has(n.canonical)) continue;
    seen.add(n.canonical);
    out.push(n);
  }
  return out;
}

/** Pour les tests : expose le nombre d'entrées dict chargées. */
export function _debugDictSize(): number {
  return ALIAS_INDEX.size;
}
