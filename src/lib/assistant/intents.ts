// =========================================================================
// Assistant Centrium — compréhension des questions (déterministe)
// -------------------------------------------------------------------------
// Transforme une question en intention structurée. Aucune donnée n'est lue
// ici : l'exécution (route /api/assistant) interroge la base avec la
// session de l'utilisateur, donc uniquement ce qu'il a le droit de voir.
// Une question non reconnue n'est jamais « devinée » : l'assistant le dit.
// =========================================================================

export type Intent =
  | { kind: 'consultants_available'; from: string; to: string; skill: string | null; periodLabel: string }
  | { kind: 'revenue_forecast'; year: number; month: number }
  | { kind: 'missions_ending'; days: number }
  | { kind: 'client_summary'; clientName: string }
  | { kind: 'intercontract' }
  | { kind: 'pending_timesheets' }
  | { kind: 'unknown' };

const MONTHS_FR = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const MONTHS_EN = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const STOPWORDS = new Set([
  // fr
  'quels', 'quelles', 'quel', 'quelle', 'les', 'des', 'de', 'du', 'la', 'le', 'un', 'une', 'pour', 'cette', 'ce', 'mission',
  'missions', 'consultant', 'consultants', 'disponible', 'disponibles', 'dispo', 'dispos', 'trouve', 'moi', 'qui', 'sont',
  'deviennent', 'devient', 'mois', 'prochain', 'prochaine', 'semaine', 'avec', 'en', 'et', 'sur', 'dans', 'liste', 'montre',
  'bientot', 'actuellement', 'maintenant', 'jours', 'profil', 'profils', 'competence', 'competences', 'experts', 'expert',
  // en
  'which', 'what', 'who', 'are', 'the', 'for', 'this', 'with', 'available', 'next', 'month', 'week', 'find', 'me', 'show',
  'list', 'become', 'becomes', 'soon', 'now', 'in', 'on', 'and', 'skilled', 'skills', 'skill',
]);

export function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’']/g, ' ')
    // Impératifs avec pronom (« trouve-moi », « donne-nous ») : on sépare.
    .replace(/-(moi|nous|lui|leur|les|en|y)\b/g, ' $1')
    // Ponctuation, sauf les points internes aux mots (node.js, asp.net).
    .replace(/\.(?=\s|$)/g, ' ')
    .replace(/[?!,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function findMonth(n: string): number | null {
  for (let i = 0; i < 12; i++) {
    if (new RegExp(`\\b(${MONTHS_FR[i]}|${MONTHS_EN[i]})\\b`).test(n)) return i + 1;
  }
  return null;
}

function monthYear(month: number, today: Date): number {
  // Un mois déjà passé dans l'année désigne l'année suivante.
  return month < today.getMonth() + 1 ? today.getFullYear() + 1 : today.getFullYear();
}

function extractDays(n: string, fallback: number): number {
  const m = /(\d{1,3})\s*(j|jours|days|d)\b/.exec(n);
  if (m) return Math.min(365, Math.max(1, Number(m[1])));
  if (/\b(mois|month)\b/.test(n)) return 30;
  if (/\b(semaine|week)\b/.test(n)) return 7;
  return fallback;
}

/** Mot-clé de compétence : premier terme significatif hors mots outils. */
function extractSkill(n: string): string | null {
  const words = n.split(' ').filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
  const months = new Set([...MONTHS_FR, ...MONTHS_EN]);
  const candidate = words.find((w) => !months.has(w));
  return candidate ?? null;
}

export function parseIntent(question: string, today: Date = new Date()): Intent {
  const n = normalizeQuestion(question);
  if (!n) return { kind: 'unknown' };

  // Résumé d'activité d'un client : « résume l'activité du client Orange »
  // Non-gourmand : on s'arrête au premier « du / de / client » pour garder
  // les noms composés (« Banque de France »).
  const summary = /\b(resume|resumer|synthese|summari[sz]e|summary|activite|activity)\b.*?\b(client|du|de|of)\s+(.+)$/.exec(n);
  if (summary) {
    const raw = summary[3]!.replace(/^(client|la societe|societe|the client)\s+/, '').trim();
    if (raw.length >= 2) return { kind: 'client_summary', clientName: raw };
  }

  // CA prévisionnel d'un mois
  if (/\b(ca|chiffre d affaires|revenue|turnover|ca previsionnel|forecast)\b/.test(n)) {
    const m = findMonth(n);
    if (m) return { kind: 'revenue_forecast', month: m, year: monthYear(m, today) };
    if (/\b(mois prochain|next month)\b/.test(n)) {
      const d = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return { kind: 'revenue_forecast', month: d.getMonth() + 1, year: d.getFullYear() };
    }
    return { kind: 'revenue_forecast', month: today.getMonth() + 1, year: today.getFullYear() };
  }

  // Missions qui se terminent
  if (/\bmissions?\b/.test(n) && /\b(termin|fin|finissent|s achevent|ending|end|ends|expire)/.test(n)) {
    return { kind: 'missions_ending', days: extractDays(n, 30) };
  }

  // Intercontrat
  if (/\b(intercontrat|inter contrat|intercontrats|bench|sans mission)\b/.test(n)) {
    return { kind: 'intercontract' };
  }

  // CRA en attente
  if (/\b(cra|timesheets?|comptes? rendus?)\b/.test(n) && /\b(attente|valider|validation|pending|approve)/.test(n)) {
    return { kind: 'pending_timesheets' };
  }

  // Consultants disponibles (période + compétence optionnelle)
  if (/\b(disponibles?|dispos?|available|libres?|free)\b/.test(n) || /\bdeviennent disponibles\b/.test(n)) {
    let from = today;
    let to = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
    let periodLabel = '30j';
    const month = findMonth(n);
    if (/\b(mois prochain|next month)\b/.test(n)) {
      from = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      to = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      periodLabel = 'next_month';
    } else if (month) {
      const y = monthYear(month, today);
      from = new Date(y, month - 1, 1);
      to = new Date(y, month, 0);
      periodLabel = 'month';
    } else if (/(\d{1,3})\s*(j|jours|days)\b/.test(n)) {
      const days = extractDays(n, 30);
      to = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
      periodLabel = `${days}j`;
    } else if (/\b(maintenant|now|actuellement|currently|immediat)/.test(n)) {
      to = today;
      periodLabel = 'now';
    }
    return { kind: 'consultants_available', from: iso(from), to: iso(to), skill: extractSkill(n), periodLabel };
  }

  return { kind: 'unknown' };
}
