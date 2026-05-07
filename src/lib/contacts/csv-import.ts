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
  // === Identité ===
  prenom: 'first_name',
  first_name: 'first_name',
  firstname: 'first_name',
  nom: 'last_name',
  last_name: 'last_name',
  lastname: 'last_name',
  // Nom complet sur une seule colonne (cas le plus fréquent en ESN /
  // exports manuels) — sera scindé sur le 1er espace : prénom puis nom.
  nom_prenom: 'full_name',
  prenom_nom: 'full_name',
  nom_complet: 'full_name',
  contact: 'full_name',
  contact_nom: 'full_name',
  contact_nom_prenom: 'full_name',
  contact_prenom_nom: 'full_name',
  full_name: 'full_name',
  fullname: 'full_name',
  name: 'full_name',
  // === Coordonnées ===
  email: 'email',
  mail: 'email',
  e_mail: 'email',
  adresse_mail: 'email',
  adresse_email: 'email',
  courriel: 'email',
  telephone: 'phone',
  tel: 'phone',
  phone: 'phone',
  mobile: 'phone',
  numero: 'phone',
  numero_de_telephone: 'phone',
  numero_telephone: 'phone',
  no_tel: 'phone',
  linkedin: 'linkedin_url',
  linkedin_url: 'linkedin_url',
  url_linkedin: 'linkedin_url',
  lien_linkedin: 'linkedin_url',
  profil_linkedin: 'linkedin_url',
  // === Métier ===
  poste: 'job_title',
  poste_du_contact: 'job_title',
  poste_contact: 'job_title',
  intitule: 'job_title',
  intitule_de_poste: 'job_title',
  job_title: 'job_title',
  title: 'job_title',
  fonction: 'job_title',
  ville: 'city',
  city: 'city',
  // === Catégorisation ===
  type: 'contact_type',
  type_contact: 'contact_type',
  contact_type: 'contact_type',
  // === Société (sera transformée en source "ESN: <nom>") ===
  societe: 'company_name',
  entreprise: 'company_name',
  esn: 'company_name',
  nom_esn: 'company_name',
  nom_societe: 'company_name',
  client: 'company_name',
  company: 'company_name',
  company_name: 'company_name',
  // === Notes / source / divers (tous regroupés en notes si non typés) ===
  source: 'source',
  origine: 'source',
  notes: 'notes',
  note: 'notes',
  remarque: 'notes',
  remarques: 'notes',
  description: 'notes',
  commentaire: 'notes',
  commentaires: 'notes',
  statut: 'extra_status',
  statut_d_avancement: 'extra_status',
  statut_avancement: 'extra_status',
  // Date de dernière interaction (juste informative côté CSV — la
  // colonne reçoit du texte libre, on l'ajoute aux notes plutôt que
  // d'essayer de parser une date au format imprévisible).
  date_derniere: 'extra_last_seen',
  date_derniere_interaction: 'extra_last_seen',
  derniere_interaction: 'extra_last_seen',
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

    // Identité : on accepte either (first_name + last_name) séparés,
    // soit un "full_name" sur une seule colonne qu'on scinde sur le
    // 1er espace (heuristique : 1er token = prénom, reste = nom).
    let first_name = get('first_name').trim();
    let last_name = get('last_name').trim();
    if (!first_name && !last_name) {
      const full = get('full_name').trim();
      if (full) {
        const parts = full.split(/\s+/);
        if (parts.length >= 2) {
          first_name = parts[0];
          last_name = parts.slice(1).join(' ');
        } else {
          // 1 seul token : on le met en nom (cas "INFORMATIS", "Bloomays").
          last_name = parts[0];
        }
      }
    }
    if (!first_name && !last_name) {
      errors.push('nom manquant (renseigne first_name + last_name OU une colonne nom complet)');
    } else if (!last_name) {
      // 1 seul token disponible → on l'accepte côté last_name.
      last_name = first_name;
      first_name = '';
    }

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

    // Source : on combine company_name (ESN d'origine) + source explicite
    // pour ne pas perdre l'info d'où vient le contact.
    const sourceParts: string[] = [];
    const companyName = get('company_name').trim();
    if (companyName) sourceParts.push(`ESN: ${companyName}`);
    const explicitSource = get('source').trim();
    if (explicitSource) sourceParts.push(explicitSource);
    const source = sourceParts.length > 0 ? sourceParts.join(' · ') : null;

    // Notes : on agrège description + statut_avancement + date_derniere
    // pour préserver toute l'info, même les colonnes qu'on ne mappe pas
    // proprement vers une colonne typée.
    const noteParts: string[] = [];
    const baseNote = get('notes').trim();
    if (baseNote) noteParts.push(baseNote);
    const status = get('extra_status').trim();
    if (status) noteParts.push(`Statut : ${status}`);
    const lastSeen = get('extra_last_seen').trim();
    if (lastSeen) noteParts.push(`Dernière interaction (CSV) : ${lastSeen}`);
    const notes = noteParts.length > 0 ? noteParts.join('\n') : null;

    const parsed: ContactImportRow = {
      first_name: first_name || '—',
      last_name,
      contact_type,
      job_title: get('job_title').trim() || null,
      email,
      phone: get('phone').trim() || null,
      linkedin_url: linkedinNorm,
      city: get('city').trim() || null,
      source,
      notes,
    };
    return { index: i, raw, parsed, errors: [] };
  });
}
