'use client';

/**
 * Pile d'avatars "Google Docs" : pastilles colorées avec initiales pour
 * chaque utilisateur actuellement connecté dans la même organisation.
 *
 * - Le user courant a un anneau émeraude et est TOUJOURS épinglé en tête.
 * - Maximum 5 pastilles visibles à la fois (1 pour me + 4 autres).
 * - Si > 5 connectés : rotation des "autres" toutes les 4 secondes
 *   pour les faire défiler sans surcharger l'UI.
 * - Tooltip natif avec nom complet + email.
 * - Petit "live dot" vert qui pulse pour signaler le temps réel.
 */

import { useEffect, useState } from 'react';
import { useOrgPresence, type PresentUser } from '@/hooks/useOrgPresence';
import { cn } from '@/lib/utils';

const MAX_VISIBLE = 5;
const ROTATION_INTERVAL_MS = 4000;

export function PresenceAvatars() {
  const { users, me, others } = useOrgPresence();
  const [rotationOffset, setRotationOffset] = useState(0);

  // Rotation des "autres" quand il y en a plus que ce qu'on peut afficher.
  const slotsForOthers = me ? MAX_VISIBLE - 1 : MAX_VISIBLE;
  const needsRotation = others.length > slotsForOthers;

  useEffect(() => {
    if (!needsRotation) {
      setRotationOffset(0);
      return;
    }
    const id = setInterval(() => {
      setRotationOffset((o) => (o + 1) % others.length);
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(id);
  }, [needsRotation, others.length]);

  if (users.length === 0) return null;

  // Sélection des "autres" à afficher : tranche circulaire à partir de l'offset
  const rotatedOthers: PresentUser[] = needsRotation
    ? Array.from({ length: slotsForOthers }, (_, i) => others[(rotationOffset + i) % others.length]!)
    : others.slice(0, slotsForOthers);

  const visible: PresentUser[] = me ? [me, ...rotatedOthers] : rotatedOthers;
  const overflow = Math.max(0, others.length - slotsForOthers);

  return (
    <div
      className="hidden sm:flex items-center gap-1.5"
      title={`${users.length} personne${users.length > 1 ? 's' : ''} en ligne`}
    >
      <span
        aria-hidden
        className="relative flex h-2 w-2"
        title="Synchronisation temps réel active"
      >
        <span className="absolute inline-flex h-full w-full rounded-full bg-success/80 opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>

      <div className="flex -space-x-1.5">
        {visible.map((u) => (
          <Avatar key={u.userId} user={u} isMe={me?.userId === u.userId} />
        ))}
        {overflow > 0 && (
          <div
            className="relative z-0 h-7 w-7 rounded-full bg-card border border-hairline text-foreground text-[10px] font-semibold flex items-center justify-center"
            title={others
              .slice(slotsForOthers)
              .map((u) => u.displayName)
              .join(', ')}
          >
            +{overflow}
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({ user, isMe }: { user: PresentUser; isMe: boolean }) {
  return (
    <div
      title={`${user.displayName}${isMe ? ' (vous)' : ''}\n${user.email}`}
      className={cn(
        'relative h-7 w-7 rounded-full flex items-center justify-center',
        'text-[10px] font-semibold tracking-wide select-none',
        user.color.bg,
        user.color.text,
        'ring-2',
        isMe ? 'ring-success' : 'ring-card',
        'shadow-[0_2px_8px_-2px_rgba(0,0,0,0.4)]',
        'transition-opacity duration-500',
      )}
    >
      {user.initials}
    </div>
  );
}
