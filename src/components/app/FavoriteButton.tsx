'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { useOrganizationSafe } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { isFavorite, onFavoritesChange, refreshFavorite, toggleFavorite, type Favorite } from '@/lib/favorites';
import { pushRecent } from '@/lib/recents';
import { cn } from '@/lib/utils';

/**
 * Étoile des fiches (client, consultant, mission, opportunité) : épingle la
 * fiche en tête de la recherche rapide. Ouvrir la fiche l'ajoute aussi aux
 * « récemment consultés ».
 */
export function FavoriteButton({ kind, href, label }: Favorite) {
  const orgId = useOrganizationSafe()?.activeOrgId;
  const { locale } = useLocale();
  const fr = locale !== 'en';
  const [fav, setFav] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    pushRecent(orgId, { href, label, kind });
    refreshFavorite(orgId, { href, label, kind });
    const sync = () => setFav(isFavorite(orgId, href));
    sync();
    return onFavoritesChange(sync);
  }, [orgId, href, label, kind]);

  const text = fav ? (fr ? 'Retirer des favoris' : 'Remove from favorites') : fr ? 'Ajouter aux favoris' : 'Add to favorites';
  return (
    <Tooltip label={text}>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label={text}
        aria-pressed={fav}
        disabled={!orgId}
        onClick={() => setFav(toggleFavorite(orgId, { href, label, kind }))}
      >
        <Star className={cn(fav && 'fill-primary text-primary')} />
      </Button>
    </Tooltip>
  );
}
