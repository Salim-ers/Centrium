'use client';

import { parseCsv, type CsvRow } from '@/lib/consultants/csv-import';

// On réutilise le tokenizer CSV des consultants (parseCsv) — pas la peine
// de doubler. Ici on ne définit que la partie mapping spécifique aux
// contacts (carnet de contacts CRM).

export { parseCsv } from '@/lib/consultants/csv-import';

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

const HEADER_ALIASES: Record<string, string> = {
  prenom: 'first_name',
  first_name: 'first_name',
  firstname: 'first_name',
  nom: 'last_name',
  last_name: 'last_name',
  lastname: 'last_name',
  email: 'email',
  mail: 'email',
  e_mail: 'email',
  telephone: 'phone',
  tel: 'phone',
  phone: 'phone',
  mobile: 'phone',
  linkedin: 'linkedin_url',
  linkedin_url: 'linkedin_url',
  poste: 'job_title',
  intitule: 'job_title',
  intitule_de_poste: 'job_title',
  job_title: 'job_title',
  title: 'job_title',
  fonction: 'job_title',
  ville: 'city',
  city: 'city',
  type: 'contact_type',
  type_contact: 'contact_type',
  contact_type: 'contact_type',
  source: 'source',
  origine: 'source',
  notes: 'notes',
  remarque: 'notes',
  remarques: 'notes',
};

// Type FR/EN → enum DB
const TYPE_FR: Record<string, string> = {
  recruteur: 'recruiter',
  recruiter: 'recruiter',
  commercial: 'sales',
  sales: 'sales',
  manager: 'manager',
  client_final: 'client_final',
  'client': 'client_final',
  'client final': 'client_final',
  esn_partenaire: 'esn_partner',
  esn: 'esn_partner',
  partenaire: 'esn_partner',
  partner: 'esn_partner',
  esn_partner: 'esn_partner',
  acheteur: 'buyer',
  buyer: 'buyer',
  rh: 'hr',
  hr: 'hr',
  consultant: 'consultant',
  autre: 'other',
  other: 'other',
};

export type ContactImportRow = {
  first_name: string;
  last_name: string;
  contact_type: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  city: string | null;
  source: string | null;
  notes: string | null;
};

export type ContactImportRowDraft = {
  index: number;
  raw: CsvRow;
  parsed: ContactImportRow | null;
  errors: string[];
};

export function csvRowsToContacts(rows: CsvRow[]): ContactImportRowDraft[] {
  return rows.map((raw, i) => {
    const errors: string[] = [];
    const get = (key: string): string => {
      if (raw[key] != null) return raw[key];
      for (const [alias, target] of Object.entries(HEADER_ALIASES)) {
        if (target === key && raw[alias] != null) return raw[alias];
      }
      return '';
    };

    const first_name = get('first_name').trim();
    const last_name = get('last_name').trim();
    if (!first_name) errors.push('first_name manquant');
    if (!last_name) errors.push('last_name manquant');

    const rawType = normalizeHeader(get('contact_type') || 'other');
    const contact_type = TYPE_FR[rawType] ?? 'other';

    const linkedin = get('linkedin_url').trim();
    let linkedinNorm: string | null = null;
    if (linkedin) {
      try {
        const u = linkedin.startsWith('http')
          ? new URL(linkedin)
          : new URL(`https://${linkedin}`);
        linkedinNorm = u.toString();
      } catch {
        errors.push('linkedin_url invalide');
      }
    }

    const email = get('email').trim() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('email invalide');
    }

    if (errors.length > 0) {
      return { index: i, raw, parsed: null, errors };
    }

    const parsed: ContactImportRow = {
      first_name,
      last_name,
      contact_type,
      job_title: get('job_title').trim() || null,
      email,
      phone: get('phone').trim() || null,
      linkedin_url: linkedinNorm,
      city: get('city').trim() || null,
      source: get('source').trim() || null,
      notes: get('notes').trim() || null,
    };
    return { index: i, raw, parsed, errors: [] };
  });
}
