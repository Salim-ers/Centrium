// =========================================================================
// Vues enregistrées : des filtres nommés d'une liste (« DevOps disponibles »,
// « Missions fin < 30 j »…), par organisation et par page, dans le
// navigateur. Confort d'interface uniquement : jamais une source de données.
// =========================================================================

export type ViewFilters = Record<string, string>;
export type SavedView = { id: string; name: string; filters: ViewFilters };

const MAX = 12;
const EVENT = 'centrium-views-change';
const key = (orgId: string | null | undefined, page: string) => `centrium-views:${orgId ?? 'none'}:${page}`;

export function readViews(orgId: string | null | undefined, page: string): SavedView[] {
  try {
    const raw = window.localStorage.getItem(key(orgId, page));
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list)
      ? (list as SavedView[]).filter((v) => typeof v?.id === 'string' && typeof v?.name === 'string' && v.filters && typeof v.filters === 'object')
      : [];
  } catch {
    return [];
  }
}

function write(orgId: string | null | undefined, page: string, list: SavedView[]) {
  try {
    window.localStorage.setItem(key(orgId, page), JSON.stringify(list.slice(0, MAX)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* stockage indisponible : on ignore */
  }
}

/** Enregistre (ou remplace, à nom égal) une vue ; la plus récente en tête. */
export function saveView(orgId: string | null | undefined, page: string, name: string, filters: ViewFilters): SavedView {
  const clean = name.trim();
  const list = readViews(orgId, page).filter((v) => v.name.toLowerCase() !== clean.toLowerCase());
  const view: SavedView = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: clean, filters: { ...filters } };
  write(orgId, page, [view, ...list]);
  return view;
}

export function removeView(orgId: string | null | undefined, page: string, id: string) {
  write(
    orgId,
    page,
    readViews(orgId, page).filter((v) => v.id !== id),
  );
}

/** Mêmes filtres (clés absentes = valeur vide). */
export function sameFilters(a: ViewFilters, b: ViewFilters): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] ?? '') !== (b[k] ?? '')) return false;
  return true;
}

export function onViewsChange(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith('centrium-views:')) cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
}
