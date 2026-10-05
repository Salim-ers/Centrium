// =========================================================================
// Doublons probables : consultants, clients et contacts qui partagent un
// email, un téléphone ou un nom (normalisé). Une proposition seulement :
// rien n'est fusionné ni archivé sans confirmation.
// =========================================================================

export type DuplicateReason = 'email' | 'name' | 'phone';
export type DuplicateGroup<T> = { key: string; reasons: DuplicateReason[]; items: T[] };

/** Minuscules, sans accents ni ponctuation, espaces réduits. */
export function normalizeText(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const LEGAL_FORMS = /\b(sas|sasu|sarl|eurl|sa|sca|snc|sci|selarl|gmbh|ltd|limited|inc|llc|plc|bv|nv|spa|srl|group|groupe|holding)\b/g;

/** Nom de société comparable : sans forme juridique ni ponctuation. */
export function normalizeCompany(s: string | null | undefined): string {
  return normalizeText(s).replace(LEGAL_FORMS, ' ').replace(/\s+/g, ' ').trim();
}

const email = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
const phone = (s: string | null | undefined) => {
  const digits = (s ?? '').replace(/\D/g, '').replace(/^33(?=\d{9}$)/, '0');
  return digits.length >= 9 ? digits.slice(-9) : '';
};

/**
 * Regroupe les éléments qui partagent au moins une clé (union-find) ; ne
 * garde que les groupes d'au moins deux éléments, avec les raisons.
 */
export function groupByKeys<T extends { id: string }>(items: T[], keysOf: (item: T) => Array<{ key: string; reason: DuplicateReason }>): DuplicateGroup<T>[] {
  const parent = new Map<string, string>(items.map((i) => [i.id, i.id]));
  const find = (id: string): string => {
    let r = id;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(id, r);
    return r;
  };
  const owner = new Map<string, string>();
  const reasonsOf = new Map<string, Set<DuplicateReason>>();
  for (const item of items) {
    for (const { key, reason } of keysOf(item)) {
      const other = owner.get(key);
      if (!other) {
        owner.set(key, item.id);
        continue;
      }
      const a = find(other);
      const b = find(item.id);
      const reasons = new Set([...(reasonsOf.get(a) ?? []), ...(reasonsOf.get(b) ?? []), reason]);
      if (a !== b) parent.set(b, a);
      reasonsOf.set(a, reasons);
    }
  }
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const root = find(item.id);
    groups.set(root, [...(groups.get(root) ?? []), item]);
  }
  return [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([root, list]) => ({ key: root, reasons: [...(reasonsOf.get(root) ?? [])], items: list }));
}

type ConsultantLike = { id: string; first_name: string; last_name: string; email?: string | null };
type ContactLike = { id: string; first_name: string; last_name: string; email?: string | null; phone?: string | null; company_id?: string | null };
type CompanyLike = { id: string; name: string };

export function consultantDuplicates<T extends ConsultantLike>(list: T[]): DuplicateGroup<T>[] {
  return groupByKeys(list, (c) => {
    const keys: Array<{ key: string; reason: DuplicateReason }> = [];
    if (email(c.email)) keys.push({ key: `email:${email(c.email)}`, reason: 'email' });
    const name = normalizeText(`${c.first_name} ${c.last_name}`);
    if (name.includes(' ')) keys.push({ key: `name:${name}`, reason: 'name' });
    return keys;
  });
}

/** Contacts : même email, même téléphone, ou même nom dans la même société. */
export function contactDuplicates<T extends ContactLike>(list: T[]): DuplicateGroup<T>[] {
  return groupByKeys(list, (c) => {
    const keys: Array<{ key: string; reason: DuplicateReason }> = [];
    if (email(c.email)) keys.push({ key: `email:${email(c.email)}`, reason: 'email' });
    if (phone(c.phone)) keys.push({ key: `phone:${phone(c.phone)}`, reason: 'phone' });
    const name = normalizeText(`${c.first_name} ${c.last_name}`);
    if (name.includes(' ')) keys.push({ key: `name:${name}|${c.company_id ?? ''}`, reason: 'name' });
    return keys;
  });
}

export function companyDuplicates<T extends CompanyLike>(list: T[]): DuplicateGroup<T>[] {
  return groupByKeys(list, (c) => {
    const name = normalizeCompany(c.name);
    return name.length >= 2 ? [{ key: `name:${name}`, reason: 'name' as const }] : [];
  });
}
