// =========================================================================
// CV Parser – QuadCore Platform (heuristique, best-effort)
// -------------------------------------------------------------------------
// Prend le texte brut d'un CV (extrait via pdfjs / mammoth) et tente
// d'identifier :
//   - résumé exécutif
//   - compétences par catégorie
//   - expériences professionnelles (client, rôle, dates, bullet points)
//   - formation (année + intitulé)
//   - langues
//
// Limites : regex-based, dépend du format du CV. Pour une extraction
// fiable, brancher un LLM (Claude API) en V1.
// =========================================================================

import { logger } from '@/lib/logger';

export type ParsedCV = {
  /** Identité extraite du CV — tous les champs sont nullables (best-effort). */
  identity?: {
    first_name: string | null;
    last_name: string | null;
    job_title: string | null;
    sub_title: string | null;
    city: string | null;
    country: string | null;
    seniority:
      | 'junior'
      | 'confirmed'
      | 'senior'
      | 'expert'
      | 'lead'
      | 'architect'
      | null;
    years_experience: number | null;
    email: string | null;
    phone: string | null;
    linkedin_url: string | null;
  } | null;
  summary: string | null;
  skills: Array<{ category: string; name: string; is_highlighted: boolean }>;
  experiences: Array<{
    client_name: string;
    role: string;
    start_date: string | null; // ISO YYYY-MM-DD
    end_date: string | null;
    context: string | null;
    tasks: string[];
    environment: string[];
  }>;
  educations: Array<{
    year: number;
    degree: string;
    institution: string | null;
  }>;
  languages: Array<{
    code: string;
    level: 'Natif' | 'Bilingue' | 'Professionnel' | 'Intermédiaire' | 'Notions';
  }>;
};

type SectionKey = 'summary' | 'experience' | 'skills' | 'education' | 'languages';

const SECTION_PATTERNS: Record<SectionKey, RegExp> = {
  summary:
    /(?:^|\n|\s)(profil(?:\s+professionnel)?|résumé(?:\s+exécutif)?|synthèse|à\s+propos|about\s+me|executive\s+summary|summary|bio)\s*[:\-–—]?\s*(?:\n|$)/i,
  experience:
    /(?:^|\n|\s)(expériences?(?:\s+professionnelles?)?|parcours(?:\s+professionnel)?|carrière|work\s+experience|professional\s+experience|experience|emplois?)\s*[:\-–—]?\s*(?:\n|$)/i,
  skills:
    /(?:^|\n|\s)(compétences?(?:\s+techniques?|\s+clés)?|savoir[-\s]faire|skills|technical\s+skills|stack(?:\s+technique)?|technologies|outils(?:\s+et\s+technologies)?)\s*[:\-–—]?\s*(?:\n|$)/i,
  education:
    /(?:^|\n|\s)(formations?(?:\s+et\s+diplômes?)?|éducation|diplômes?|cursus|education|academic\s+background|études)\s*[:\-–—]?\s*(?:\n|$)/i,
  languages:
    /(?:^|\n|\s)(langues?(?:\s+parlées?)?|languages?|spoken\s+languages)\s*[:\-–—]?\s*(?:\n|$)/i,
};

const MONTHS_FR: Record<string, number> = {
  janv: 1, janvier: 1, jan: 1,
  févr: 2, février: 2, fev: 2, fév: 2, feb: 2,
  mars: 3, mar: 3, march: 3,
  avr: 4, avril: 4, apr: 4, april: 4,
  mai: 5, may: 5,
  juin: 6, jun: 6, june: 6,
  juil: 7, juillet: 7, jul: 7, july: 7,
  août: 8, aout: 8, aug: 8, august: 8,
  sept: 9, septembre: 9, sep: 9, september: 9,
  oct: 10, octobre: 10, october: 10,
  nov: 11, novembre: 11, november: 11,
  déc: 12, décembre: 12, dec: 12, december: 12,
};

function parseMonthYear(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/[.,]/g, '');
  if (/^(aujourd'?hui|actuel|actuellement|present|en\s+cours|today|now|current)$/.test(s)) return null;
  let m = s.match(/^([a-zéû]+)\.?\s+(\d{4})$/);
  if (m) {
    const key = m[1];
    const month = MONTHS_FR[key] ?? MONTHS_FR[key.slice(0, 4)] ?? MONTHS_FR[key.slice(0, 3)];
    if (month) return `${m[2]}-${String(month).padStart(2, '0')}-01`;
  }
  m = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[2]}-${String(+m[1]).padStart(2, '0')}-01`;
  m = s.match(/^(\d{4})$/);
  if (m) return `${m[1]}-01-01`;
  return null;
}

// Découpe le texte en sections selon les headers détectés
function splitByHeaders(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const marks: Array<{ key: SectionKey; startAfterHeader: number; headerStart: number }> = [];

  for (const [key, rx] of Object.entries(SECTION_PATTERNS) as Array<[SectionKey, RegExp]>) {
    const m = text.match(rx);
    if (m && m.index !== undefined) {
      marks.push({
        key,
        headerStart: m.index,
        startAfterHeader: m.index + m[0].length,
      });
    }
  }
  marks.sort((a, b) => a.headerStart - b.headerStart);

  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].startAfterHeader;
    const end = i + 1 < marks.length ? marks[i + 1].headerStart : text.length;
    out[marks[i].key] = text.slice(start, end).trim();
  }
  return out;
}

// --- SUMMARY ---

function parseSummary(block: string | undefined, fallback: string): string | null {
  const source = block && block.trim().length > 40 ? block : fallback;
  if (!source) return null;
  // Premier paragraphe non trivial
  const paragraphs = source.split(/\n\s*\n/);
  for (const p of paragraphs) {
    const clean = p.replace(/\s+/g, ' ').trim();
    if (clean.length >= 60 && clean.length <= 600 && !/^[\d\s\-•*]+$/.test(clean)) {
      return clean;
    }
  }
  return null;
}

// --- SKILLS ---

const SKILL_CATEGORY_MAP: Array<[string, RegExp]> = [
  ['languages', /\b(langages?\s*(?:de\s+)?(?:programmation)?|languages?|programming\s+languages?)\b/i],
  ['frameworks', /\b(frameworks?|librairies?|libraries|stack\s+front|stack\s+back)\b/i],
  ['automation', /\b(automatisation|automation|outils?\s+qa|test\s+automation|e2e)\b/i],
  ['testing', /\b(tests?\s*\/?\s*qa|\bqa\b|testing|assurance qualité|tests\s+logiciels?)\b/i],
  ['databases', /\b(bases?\s+de\s+données|databases?|sgbd|sql|nosql)\b/i],
  ['cloud', /\b(cloud|aws|azure|gcp|cloud\s+computing)\b/i],
  ['ci_cd', /\b(ci\s*\/?\s*cd|devops|intégration continue|continuous\s+integration)\b/i],
  ['tools', /\b(outils?|tools?)\b/i],
  ['methodologies', /\b(méthodologies?|methodologies|agile|scrum|kanban|safe)\b/i],
  ['data', /\b(data|big\s+data|etl|datascience|data\s+science)\b/i],
  ['platforms', /\b(plateformes?|platforms?|cms)\b/i],
];

function detectCategory(line: string): string {
  for (const [cat, rx] of SKILL_CATEGORY_MAP) {
    if (rx.test(line)) return cat;
  }
  return 'tools';
}

// Liste de techs communes — si on détecte un de ces tokens dans le texte global,
// on l'ajoute en fallback même si la section Compétences n'est pas bien parsée
const COMMON_TECHS: Array<[string, string]> = [
  // languages
  ['javascript', 'languages'],
  ['typescript', 'languages'],
  ['python', 'languages'],
  ['java', 'languages'],
  ['c#', 'languages'],
  ['c++', 'languages'],
  ['go', 'languages'],
  ['rust', 'languages'],
  ['php', 'languages'],
  ['ruby', 'languages'],
  ['kotlin', 'languages'],
  ['swift', 'languages'],
  ['scala', 'languages'],
  ['sql', 'languages'],
  ['html', 'languages'],
  ['css', 'languages'],
  ['bash', 'languages'],
  ['powershell', 'languages'],
  // frameworks
  ['react', 'frameworks'],
  ['next.js', 'frameworks'],
  ['nextjs', 'frameworks'],
  ['vue', 'frameworks'],
  ['vue.js', 'frameworks'],
  ['angular', 'frameworks'],
  ['svelte', 'frameworks'],
  ['node.js', 'frameworks'],
  ['nodejs', 'frameworks'],
  ['express', 'frameworks'],
  ['nestjs', 'frameworks'],
  ['django', 'frameworks'],
  ['flask', 'frameworks'],
  ['fastapi', 'frameworks'],
  ['spring', 'frameworks'],
  ['spring boot', 'frameworks'],
  ['.net', 'frameworks'],
  ['laravel', 'frameworks'],
  ['symfony', 'frameworks'],
  // testing / automation
  ['playwright', 'automation'],
  ['cypress', 'automation'],
  ['selenium', 'automation'],
  ['puppeteer', 'automation'],
  ['jest', 'testing'],
  ['vitest', 'testing'],
  ['mocha', 'testing'],
  ['pytest', 'testing'],
  ['junit', 'testing'],
  ['postman', 'testing'],
  ['soapui', 'testing'],
  ['gherkin', 'testing'],
  ['cucumber', 'testing'],
  // databases
  ['postgresql', 'databases'],
  ['postgres', 'databases'],
  ['mysql', 'databases'],
  ['mongodb', 'databases'],
  ['redis', 'databases'],
  ['elasticsearch', 'databases'],
  ['oracle', 'databases'],
  ['sqlite', 'databases'],
  ['snowflake', 'databases'],
  ['bigquery', 'databases'],
  // cloud
  ['aws', 'cloud'],
  ['azure', 'cloud'],
  ['gcp', 'cloud'],
  ['google cloud', 'cloud'],
  ['firebase', 'cloud'],
  ['vercel', 'cloud'],
  ['netlify', 'cloud'],
  ['heroku', 'cloud'],
  // ci_cd / devops
  ['docker', 'ci_cd'],
  ['kubernetes', 'ci_cd'],
  ['jenkins', 'ci_cd'],
  ['github actions', 'ci_cd'],
  ['gitlab ci', 'ci_cd'],
  ['circleci', 'ci_cd'],
  ['terraform', 'ci_cd'],
  ['ansible', 'ci_cd'],
  // data
  ['spark', 'data'],
  ['kafka', 'data'],
  ['airflow', 'data'],
  ['dbt', 'data'],
  ['pandas', 'data'],
  ['numpy', 'data'],
  // tools
  ['git', 'tools'],
  ['github', 'tools'],
  ['gitlab', 'tools'],
  ['bitbucket', 'tools'],
  ['jira', 'tools'],
  ['confluence', 'tools'],
  ['figma', 'tools'],
  ['slack', 'tools'],
  // methodologies
  ['agile', 'methodologies'],
  ['scrum', 'methodologies'],
  ['kanban', 'methodologies'],
  ['safe', 'methodologies'],
  ['devops', 'methodologies'],
  // platforms
  ['salesforce', 'platforms'],
  ['sap', 'platforms'],
  ['shopify', 'platforms'],
  ['wordpress', 'platforms'],
];

const TECH_CATEGORY = new Map<string, string>(COMMON_TECHS);

/** Catégorie d'une compétence connue (« react » → frameworks), sinon « Outils ». */
export function skillCategoryFor(name: string): string {
  return TECH_CATEGORY.get(name.trim().toLowerCase()) ?? 'tools';
}

function parseSkillsFromBlock(
  block: string | undefined,
): Array<{ category: string; name: string; is_highlighted: boolean }> {
  if (!block) return [];
  const out: Array<{ category: string; name: string; is_highlighted: boolean }> = [];
  const seen = new Set<string>();

  const lines = block
    .split(/\n/)
    .map((l) => l.trim().replace(/^[-–—▸•*·]\s*/, ''))
    .filter(Boolean);

  let currentCategory: string | null = null;

  for (const line of lines) {
    const colonSplit = line.split(/[:：]/);
    let items: string[] = [];
    let category: string;

    if (colonSplit.length >= 2 && colonSplit[0].length < 40 && colonSplit[0].length > 2) {
      category = detectCategory(colonSplit[0]);
      currentCategory = category;
      items = colonSplit.slice(1).join(':').split(/[•,;|·\/]/);
    } else {
      category = currentCategory ?? detectCategory(line);
      items = line.split(/[•,;|·]/);
    }

    for (const raw of items) {
      const name = raw
        .trim()
        .replace(/^[-–—▸•*·]\s*/, '')
        .replace(/\s+/g, ' ')
        .replace(/\.+$/, '');
      if (!name || name.length < 2 || name.length > 40) continue;
      if (/^\d+$/.test(name)) continue; // purely numeric
      const key = `${category}::${name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ category, name, is_highlighted: false });
    }
  }
  return out;
}

function extractSkillsFallback(
  fullText: string,
): Array<{ category: string; name: string; is_highlighted: boolean }> {
  const low = fullText.toLowerCase();
  const out: Array<{ category: string; name: string; is_highlighted: boolean }> = [];
  const seen = new Set<string>();
  for (const [tech, cat] of COMMON_TECHS) {
    // Word-boundary-ish check: look for the tech surrounded by non-word chars
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(`(?:^|[^a-z0-9+#.])${escaped}(?=[^a-z0-9+#.]|$)`, 'i');
    if (rx.test(low)) {
      const key = `${cat}::${tech}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // Capitalize nicely
      const pretty =
        tech === 'aws' || tech === 'gcp' || tech === 'sap' || tech === 'sql' || tech === 'html' || tech === 'css' || tech === 'php'
          ? tech.toUpperCase()
          : tech.replace(/\b\w/g, (c) => c.toUpperCase());
      out.push({ category: cat, name: pretty, is_highlighted: false });
    }
  }
  return out;
}

// --- EXPERIENCES ---

const DATE_RANGE_RX =
  /((?:[a-zéû]+\.?\s+)?\d{4}|\d{1,2}[\/\-]\d{4})\s*(?:[-–—to à]|au|jusqu'?au)\s*((?:[a-zéû]+\.?\s+)?\d{4}|\d{1,2}[\/\-]\d{4}|aujourd'?hui|actuel|actuellement|present|en\s+cours|today|now|current)/i;

function parseExperiences(block: string | undefined): ParsedCV['experiences'] {
  if (!block) return [];
  const out: ParsedCV['experiences'] = [];

  const chunks = block
    .split(/\n\s*\n/)
    .map((c) => c.trim())
    .filter((c) => c.length > 20);

  for (const chunk of chunks) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 1) continue;

    let start: string | null = null;
    let end: string | null = null;
    let titleLine = lines[0];
    let contextIdx = -1;

    for (let i = 0; i < Math.min(lines.length, 4); i++) {
      const m = lines[i].match(DATE_RANGE_RX);
      if (m) {
        start = parseMonthYear(m[1]);
        end = parseMonthYear(m[2]);
        if (i === 0) {
          titleLine = lines[0].replace(m[0], '').trim().replace(/^[-–—|·:]+\s*/, '').trim();
          if (!titleLine && lines[1]) titleLine = lines[1];
        }
        contextIdx = i + 1;
        break;
      }
    }

    if (!start) continue;

    let client = '';
    let role = '';
    const sep = titleLine.match(/^(.+?)\s*(?:[—–-]|[|·•])\s*(.+)$/);
    if (sep) {
      client = sep[1].trim();
      role = sep[2].trim();
    } else {
      const chez = titleLine.match(/^(.+?)\s+(?:chez|at|@)\s+(.+)$/i);
      if (chez) {
        role = chez[1].trim();
        client = chez[2].trim();
      } else {
        client = titleLine;
        role = lines[1] && !DATE_RANGE_RX.test(lines[1]) ? lines[1] : '';
      }
    }

    if (!client || client.length < 2) continue;

    const tasks: string[] = [];
    const contextParts: string[] = [];
    let environment: string[] = [];
    const startIdx = contextIdx > 0 ? contextIdx : 2;

    for (let i = startIdx; i < lines.length; i++) {
      const l = lines[i];
      if (/^(?:environnement|stack|tech\.?|environment|technos?)\s*[:：]/i.test(l)) {
        environment = l
          .split(/[:：]/)
          .slice(1)
          .join(':')
          .split(/[,•;|·\/]/)
          .map((s) => s.trim().replace(/\.+$/, ''))
          .filter((s) => s.length > 1 && s.length < 40);
        continue;
      }
      if (/^[-–—▸•*·]\s+/.test(l)) {
        tasks.push(l.replace(/^[-–—▸•*·]\s+/, '').trim());
      } else if (tasks.length === 0 && l.length > 20) {
        contextParts.push(l);
      } else if (tasks.length > 0 && l.length > 0) {
        tasks[tasks.length - 1] += ' ' + l;
      }
    }

    out.push({
      client_name: client.slice(0, 200),
      role: (role || 'Consultant').slice(0, 200),
      start_date: start,
      end_date: end,
      context: contextParts.length > 0 ? contextParts.join(' ').slice(0, 500) : null,
      tasks: tasks.slice(0, 15),
      environment: environment.slice(0, 20),
    });
  }

  return out;
}

// --- EDUCATION ---

function parseEducations(block: string | undefined): ParsedCV['educations'] {
  if (!block) return [];
  const out: ParsedCV['educations'] = [];
  const seen = new Set<string>();

  const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const yearMatch = line.match(/\b(19|20)\d{2}\b/);
    if (!yearMatch) continue;
    const year = parseInt(yearMatch[0], 10);
    if (year < 1970 || year > new Date().getFullYear() + 1) continue;

    const rest = line.replace(yearMatch[0], '').replace(/^\s*[-–—|:]\s*/, '').trim();
    if (!rest || rest.length < 4) continue;

    let degree = rest;
    let institution: string | null = null;
    const sep = rest.match(/^(.+?)\s*(?:[—–-]|,)\s*(.+)$/);
    if (sep) {
      degree = sep[1].trim();
      institution = sep[2].trim();
    }

    const key = `${year}-${degree.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      year,
      degree: degree.slice(0, 200),
      institution: institution?.slice(0, 200) ?? null,
    });
  }

  return out;
}

// --- LANGUAGES ---

const LANG_CODE_MAP: Record<string, string> = {
  français: 'fr', francais: 'fr', french: 'fr',
  anglais: 'en', english: 'en',
  espagnol: 'es', spanish: 'es', español: 'es',
  allemand: 'de', german: 'de', deutsch: 'de',
  italien: 'it', italian: 'it',
  portugais: 'pt', portuguese: 'pt',
  arabe: 'ar', arabic: 'ar',
  chinois: 'zh', chinese: 'zh',
  japonais: 'ja', japanese: 'ja',
  russe: 'ru', russian: 'ru',
};

const LEVEL_MAP: Array<[RegExp, 'Natif' | 'Bilingue' | 'Professionnel' | 'Intermédiaire' | 'Notions']> = [
  [/\b(natif|native|maternelle?|mother\s*tongue|c2)\b/i, 'Natif'],
  [/\b(bilingue|bilingual|fluent|courant)\b/i, 'Bilingue'],
  [/\b(professionnel|professional|business|c1|b2)\b/i, 'Professionnel'],
  [/\b(intermédiaire|intermediate|b1|a2)\b/i, 'Intermédiaire'],
  [/\b(notions?|basic|basique|débutant|a1)\b/i, 'Notions'],
];

function parseLanguages(block: string | undefined): ParsedCV['languages'] {
  if (!block) return [];
  const out: ParsedCV['languages'] = [];
  const seen = new Set<string>();

  const lines = block.split(/\n|[;]/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const low = line.toLowerCase();
    let code: string | null = null;
    for (const [label, c] of Object.entries(LANG_CODE_MAP)) {
      if (low.includes(label)) {
        code = c;
        break;
      }
    }
    if (!code) continue;

    let level: ParsedCV['languages'][number]['level'] = 'Professionnel';
    for (const [rx, lvl] of LEVEL_MAP) {
      if (rx.test(line)) {
        level = lvl;
        break;
      }
    }

    if (seen.has(code)) continue;
    seen.add(code);
    out.push({ code, level });
  }
  return out;
}

// --- ENTRY POINT ---

export function parseCVText(text: string): ParsedCV {
  const normalized = text
    .replace(/\r\n?/g, '\n')
    .replace(/[\u00A0\u2028\u2029]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();

  const sections = splitByHeaders(normalized);

  const summary = parseSummary(sections.summary, normalized.slice(0, 1500));

  // Skills : on combine la section dédiée + les technos détectées dans tout le CV
  const skillsFromSection = parseSkillsFromBlock(sections.skills);
  const skillsFromFallback = extractSkillsFallback(normalized);

  // Merge : on préfère la catégorie de la section si elle existe, sinon le fallback
  const skillsMap = new Map<string, { category: string; name: string; is_highlighted: boolean }>();
  for (const s of skillsFromFallback) {
    skillsMap.set(s.name.toLowerCase(), s);
  }
  for (const s of skillsFromSection) {
    // Section a priorité
    skillsMap.set(s.name.toLowerCase(), s);
  }
  const skills = Array.from(skillsMap.values());

  const experiences = parseExperiences(sections.experience);
  const educations = parseEducations(sections.education);
  const languages = parseLanguages(sections.languages);

  // Debug log pour diagnostic utilisateur
  if (typeof window !== 'undefined' && (window as unknown as { __QC_DEBUG?: boolean }).__QC_DEBUG) {
    logger.info('[QC parse-cv] sections détectées :', Object.keys(sections));
    logger.info('[QC parse-cv] résultat :', {
      summary: !!summary,
      skills: skills.length,
      experiences: experiences.length,
      educations: educations.length,
      languages: languages.length,
    });
  }

  return { summary, skills, experiences, educations, languages };
}
