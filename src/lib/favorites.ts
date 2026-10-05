// =========================================================================
// Favoris : clients, consultants, missions et opportunités épinglés, par
// organisation, dans le navigateur. Ils apparaissent en tête de la
// recherche rapide. Confort d'interface uniquement : jamais une source de
// données (un favori supprimé ou inaccessible mène simplement à sa page).
// =========================================================================

export type FavoriteKind = 'client' | 'consultant' | 'mission' | 'opportunity';
export type Favorite = { href: string; label: string; kind: FavoriteKind };

const MAX = 20;
const EVENT = 'centrium-favorites-change';
const key = (orgId: string | null | undefined) => `centrium-favorites:${orgId ?? 'none'}`;

export function readFavorites(orgId: string | null | undefined): Favorite[] {
  try {
    const raw = window.localStorage.getItem(key(orgId));
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? (list as Favorite[]).filter((f) => typeof f?.href === 'string' && typeof f?.label === 'string') : [];
  } catch {
    return [];
  }
}

function write(orgId: string | null | undefined, list: Favorite[]) {
  try {
    window.localStorage.setItem(key(orgId), JSON.stringify(list.slice(0, MAX)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* stockage indisponible : on ignore */
  }
}

export function isFavorite(orgId: string | null | undefined, href: string): boolean {
  return readFavorites(orgId).some((f) => f.href === href);
}

/** Ajoute ou retire le favori ; renvoie le nouvel état. */
export function toggleFavorite(orgId: string | null | undefined, fav: Favorite): boolean {
  const list = readFavorites(orgId);
  const exists = list.some((f) => f.href === fav.href);
  write(orgId, exists ? list.filter((f) => f.href !== fav.href) : [fav, ...list]);
  return !exists;
}

/** Garde le libellé d'un favori à jour (client renommé, mission modifiée…). */
export function refreshFavorite(orgId: string | null | undefined, fav: Favorite) {
  const list = readFavorites(orgId);
  const i = list.findIndex((f) => f.href === fav.href);
  if (i < 0 || list[i]!.label === fav.label) return;
  list[i] = fav;
  write(orgId, list);
}

/** Abonnement aux changements (même onglet et autres onglets). */
export function onFavoritesChange(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith('centrium-favorites:')) cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
}
