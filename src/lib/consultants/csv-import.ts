'use client';

// Parser CSV minimal — pas de dépendance externe. Gère :
// - séparateurs , ; ou tab (auto-détecté sur la 1ère ligne)
// - guillemets doubles avec escaping ""
// - lignes multilignes dans un champ entre guillemets

import { skillCategoryFor } from '@/lib/cv/parse-cv';

export type CsvRow = Record<string, string>;

export function parseCsv(text: string): { headers: string[]; labels: string[]; rows: CsvRow[] } {
  const stripped = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  if (!stripped.trim()) return { headers: [], labels: [], rows: [] };

  // Détection du séparateur sur la 1ère ligne
  const firstLine = stripped.split('\n', 1)[0];
  const counts = {
    ',': (firstLine.match(/,/g) || []).length,
    ';': (firstLine.match(/;/g) || []).length,
    '\t': (firstLine.match(/\t/g) || []).length,
  };
  const sep = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ',') as
    | ','
    | ';'
    | '\t';

  // Tokenizer simple
  const records: string[][] = [];
  let cur = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (inQuotes) {
      if (ch === '"') {
        if (stripped[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === sep) {
        row.push(cur);
        cur = '';
      } else if (ch === '\n') {
        row.push(cur);
        records.push(row);
        cur = '';
        row = [];
      } else {
        cur += ch;
      }
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    records.push(row);
  }

  if (records.length === 0) return { headers: [], labels: [], rows: [] };
  const labels = records[0].map((h) => h.trim());
  const headers = records[0].map((h) => normalizeHeader(h));
  const rows: CsvRow[] = [];
  for (let i = 1; i < records.length; i++) {
    const r = records[i];
    if (r.length === 1 && r[0].trim() === '') continue; // ligne vide
    const obj: CsvRow = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = (r[j] ?? '').trim();
    }
    rows.push(obj);
  }
  return { headers, labels, rows };
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[éèê]/g, 'e')
    .replace(/[àâ]/g, 'a')
    .replace(/[ôö]/g, 'o')
    .replace(/[ûü]/g, 'u')
    .replace(/[îï]/g, 'i')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Mapping tolérant header CSV → champ consultant.
const HEADER_ALIASES: Record<string, string> = {
  prenom: 'first_name',
  first_name: 'first_name',
  firstname: 'first_name',
  nom: 'last_name',
  last_name: 'last_name',
  lastname: 'last_name',
  email: 'email',
  mail: 'email',
  telephone: 'phone',
  tel: 'phone',
  phone: 'phone',
  linkedin: 'linkedin_url',
  linkedin_url: 'linkedin_url',
  intitule: 'job_title',
  intitule_de_poste: 'job_title',
  poste: 'job_title',
  job_title: 'job_title',
  title: 'job_title',
  sous_titre: 'sub_title',
  sub_title: 'sub_title',
  subtitle: 'sub_title',
  seniorite: 'seniority',
  seniority: 'seniority',
  niveau: 'seniority',
  annees_d_experience: 'years_experience',
  annees_experience: 'years_experience',
  experience: 'years_experience',
  years_experience: 'years_experience',
  tjm: 'daily_rate_eur',
  tjm_eur: 'daily_rate_eur',
  daily_rate: 'daily_rate_eur',
  daily_rate_eur: 'daily_rate_eur',
  ville: 'city',
  city: 'city',
  pays: 'country',
  country: 'country',
  mobilite: 'mobility',
  mobility: 'mobility',
  statut: 'status',
  status: 'status',
  disponibilite: 'status',
  resume: 'summary',
  summary: 'summary',
  contract_type: 'contract_type',
  type_contrat: 'contract_type',
  competences: 'skills',
  competence: 'skills',
  skills: 'skills',
  skill: 'skills',
  stack: 'skills',
  technologies: 'skills',
  technos: 'skills',
};

const SENIORITY_FR: Record<string, string> = {
  junior: 'junior',
  confirme: 'confirmed',
  confirmed: 'confirmed',
  senior: 'senior',
  expert: 'expert',
  lead: 'lead',
  architecte: 'architect',
  architect: 'architect',
};

const STATUS_FR: Record<string, string> = {
  disponible: 'available',
  available: 'available',
  bientot_disponible: 'soon_available',
  bientot: 'soon_available',
  soon_available: 'soon_available',
  en_mission: 'on_mission',
  on_mission: 'on_mission',
  indisponible: 'unavailable',
  unavailable: 'unavailable',
  archive: 'archived',
  archived: 'archived',
};

export type ConsultantImportRow = {
  first_name: string;
  last_name: string;
  job_title: string;
  seniority: string;
  years_experience: number;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  sub_title: string | null;
  city: string | null;
  country: string;
  mobility: string | null;
  daily_rate_eur: number | null;
  contract_type: string | null;
  status: string;
  summary: string | null;
};

export type ImportSkill = { category: string; name: string };

export type ImportRowDraft = {
  index: number;
  raw: CsvRow;
  parsed: ConsultantImportRow | null;
  errors: string[];
  /** Compétences lues dans la colonne « compétences » (séparées par , ; |). */
  skills: ImportSkill[];
};

/** Champs proposés dans l'écran de correspondance ; les autres restent reconnus par leur en-tête. */
export const MAPPED_FIELDS = ['first_name', 'last_name', 'email', 'job_title', 'seniority', 'years_experience', 'skills', 'daily_rate_eur', 'status', 'city'] as const;
export type MappedField = (typeof MAPPED_FIELDS)[number];
export type ColumnMapping = Record<MappedField, string | null>;

const targetOf = (header: string): string => HEADER_ALIASES[header] ?? header;

/** Correspondance proposée d'après les en-têtes (normalisés) du fichier. */
export function detectMapping(headers: string[]): ColumnMapping {
  const mapping = Object.fromEntries(MAPPED_FIELDS.map((f) => [f, null])) as ColumnMapping;
  for (const h of headers) {
    const target = targetOf(h);
    if ((MAPPED_FIELDS as readonly string[]).includes(target) && mapping[target as MappedField] == null) mapping[target as MappedField] = h;
  }
  return mapping;
}

/**
 * Applique la correspondance choisie : chaque champ prend la colonne
 * indiquée (vide si ignoré), sans que la détection automatique ne la
 * contredise. Les autres colonnes passent telles quelles.
 */
export function applyMapping(rows: CsvRow[], mapping: ColumnMapping): CsvRow[] {
  const managed = new Set<string>(MAPPED_FIELDS);
  return rows.map((raw) => {
    const out: CsvRow = {};
    for (const [k, v] of Object.entries(raw)) if (!managed.has(targetOf(k))) out[k] = v;
    for (const f of MAPPED_FIELDS) out[f] = mapping[f] ? (raw[mapping[f]!] ?? '') : '';
    return out;
  });
}

/** « React, TypeScript ; AWS | SQL » → compétences dédoublonnées (30 au plus). */
export function parseSkillList(value: string): ImportSkill[] {
  const seen = new Set<string>();
  const out: ImportSkill[] = [];
  for (const part of value.split(/[,;|•\n]/)) {
    const name = part.trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 60 || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({ category: skillCategoryFor(name), name });
    if (out.length >= 30) break;
  }
  return out;
}

export function csvRowsToConsultants(rows: CsvRow[]): ImportRowDraft[] {
  return rows.map((raw, i) => {
    const errors: string[] = [];
    const get = (key: string): string => {
      // Cherche d'abord la clé exacte dans raw, sinon parmi les aliases.
      if (raw[key] != null) return raw[key];
      for (const [alias, target] of Object.entries(HEADER_ALIASES)) {
        if (target === key && raw[alias] != null) return raw[alias];
      }
      return '';
    };

    const first_name = get('first_name').trim();
    const last_name = get('last_name').trim();
    const job_title = get('job_title').trim();
    if (!first_name) errors.push('first_name manquant');
    if (!last_name) errors.push('last_name manquant');
    if (!job_title) errors.push('job_title manquant');

    const rawSen = normalizeHeader(get('seniority'));
    const seniority = SENIORITY_FR[rawSen] ?? '';
    if (!seniority) errors.push(`seniority invalide ('${get('seniority')}')`);

    const yexpStr = get('years_experience').replace(',', '.').trim();
    const years_experience = yexpStr === '' ? 0 : Number(yexpStr);
    if (!Number.isFinite(years_experience) || years_experience < 0) {
      errors.push('years_experience invalide');
    }

    const tjmStr = get('daily_rate_eur').replace(/[€\s]/g, '').replace(',', '.').trim();
    const daily_rate_eur = tjmStr === '' ? null : Number(tjmStr);
    if (daily_rate_eur != null && !Number.isFinite(daily_rate_eur)) {
      errors.push('daily_rate_eur invalide');
    }

    const rawStatus = normalizeHeader(get('status'));
    const status = rawStatus ? STATUS_FR[rawStatus] ?? 'available' : 'available';

    const linkedin = get('linkedin_url').trim();
    let linkedinNorm: string | null = null;
    if (linkedin) {
      try {
        const u = linkedin.startsWith('http') ? new URL(linkedin) : new URL(`https://${linkedin}`);
        linkedinNorm = u.toString();
      } catch {
        errors.push('linkedin_url invalide');
      }
    }

    const email = get('email').trim() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('email invalide');
    }

    const skills = parseSkillList(get('skills'));
    if (errors.length > 0) {
      return { index: i, raw, parsed: null, errors, skills };
    }

    const parsed: ConsultantImportRow = {
      first_name,
      last_name,
      job_title,
      seniority,
      years_experience: Math.round(years_experience),
      email,
      phone: get('phone').trim() || null,
      linkedin_url: linkedinNorm,
      sub_title: get('sub_title').trim() || null,
      city: get('city').trim() || null,
      country: (get('country').trim() || 'FR').toUpperCase().slice(0, 3),
      mobility: get('mobility').trim() || null,
      daily_rate_eur,
      contract_type: get('contract_type').trim() || null,
      status,
      summary: get('summary').trim() || null,
    };
    return { index: i, raw, parsed, errors: [], skills };
  });
}
