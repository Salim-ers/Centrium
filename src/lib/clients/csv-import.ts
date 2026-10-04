// =========================================================================
// Import de clients (sociétés) depuis un CSV : correspondance souple des
// en-têtes (FR/EN), normalisation et validation par ligne. Fonctions pures.
// =========================================================================

import { clientSchema, type ClientInput } from '@/lib/validators/v2';

const ALIASES: Record<keyof Pick<ClientInput, 'name' | 'kind' | 'industry' | 'size' | 'website' | 'linkedin_url' | 'address' | 'city' | 'country' | 'notes'>, string[]> = {
  name: ['name', 'nom', 'societe', 'société', 'raison sociale', 'company', 'entreprise', 'client'],
  kind: ['kind', 'type', 'categorie', 'catégorie'],
  industry: ['industry', 'secteur', 'activite', 'activité'],
  size: ['size', 'taille', 'effectif'],
  website: ['website', 'site', 'site web', 'url'],
  linkedin_url: ['linkedin', 'linkedin_url', 'linkedin url'],
  address: ['address', 'adresse'],
  city: ['city', 'ville'],
  country: ['country', 'pays'],
  notes: ['notes', 'note', 'commentaire', 'commentaires'],
};

const KIND_ALIASES: Record<string, ClientInput['kind']> = {
  client: 'client',
  customer: 'client',
  prospect: 'prospect',
  partenaire: 'esn_partner',
  partner: 'esn_partner',
  esn: 'esn_partner',
  esn_partner: 'esn_partner',
};

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export type ClientImportDraft = { line: number; value: ClientInput | null; error: string | null };

/** Associe chaque champ à la colonne CSV correspondante (en-têtes FR ou EN). */
export function mapClientHeaders(headers: string[]): Partial<Record<keyof typeof ALIASES, string>> {
  const out: Partial<Record<keyof typeof ALIASES, string>> = {};
  const normalized = headers.map((h) => ({ raw: h, n: norm(h) }));
  for (const [field, aliases] of Object.entries(ALIASES) as Array<[keyof typeof ALIASES, string[]]>) {
    const hit = normalized.find((h) => aliases.map(norm).includes(h.n));
    if (hit) out[field] = hit.raw;
  }
  return out;
}

/** Valide chaque ligne ; les lignes sans nom sont ignorées (lignes vides de tableur). */
export function draftClientRows(headers: string[], rows: Array<Record<string, string>>): ClientImportDraft[] {
  const map = mapClientHeaders(headers);
  const drafts: ClientImportDraft[] = [];
  rows.forEach((row, i) => {
    const get = (k: keyof typeof ALIASES) => (map[k] ? (row[map[k]!] ?? '').trim() : '');
    const name = get('name');
    if (!name && Object.values(row).every((v) => !String(v ?? '').trim())) return;
    const kindRaw = norm(get('kind'));
    let website = get('website');
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    const parsed = clientSchema.safeParse({
      name,
      kind: KIND_ALIASES[kindRaw] ?? 'client',
      industry: get('industry'),
      size: get('size'),
      website,
      linkedin_url: get('linkedin_url'),
      address: get('address'),
      city: get('city'),
      country: get('country'),
      notes: get('notes'),
    });
    drafts.push(
      parsed.success
        ? { line: i + 2, value: parsed.data as ClientInput, error: null }
        : { line: i + 2, value: null, error: parsed.error.issues[0]?.message ?? 'Ligne invalide' },
    );
  });
  return drafts;
}
