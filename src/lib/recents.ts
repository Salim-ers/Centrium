// =========================================================================
// « Récemment consulté » de la palette de commandes : les derniers objets
// ouverts depuis la recherche, par organisation, dans le navigateur.
// Confort d'interface uniquement : jamais une source de données.
// =========================================================================

export type Recent = { href: string; label: string; kind?: string };

const MAX = 8;
const key = (orgId: string | null | undefined) => `centrium-recents:${orgId ?? 'none'}`;

export function readRecents(orgId: string | null | undefined): Recent[] {
  try {
    const raw = window.localStorage.getItem(key(orgId));
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? (list as Recent[]).filter((r) => typeof r?.href === 'string' && typeof r?.label === 'string') : [];
  } catch {
    return [];
  }
}

export function pushRecent(orgId: string | null | undefined, recent: Recent) {
  try {
    const list = [recent, ...readRecents(orgId).filter((r) => r.href !== recent.href)].slice(0, MAX);
    window.localStorage.setItem(key(orgId), JSON.stringify(list));
  } catch {
    /* stockage indisponible : on ignore */
  }
}
