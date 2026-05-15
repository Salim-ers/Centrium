'use client';

/**
 * Pile d'avatars "Google Docs" : pastilles colorées avec initiales pour
 * chaque utilisateur actuellement connecté dans la même organisation.
 *
 * - Le user courant a un anneau émeraude pour se distinguer.
 * - On affiche au max 4 pastilles, puis "+N" pour le reste.
 * - Tooltip natif (title) avec le nom complet + email.
 * - Petit "live dot" vert qui pulse pour faire savoir que c'est du temps réel.
 */

import { useOrgPresence, type PresentUser } from '@/hooks/useOrgPresence';
import { cn } from '@/lib/utils';

const MAX_VISIBLE = 4;

export function PresenceAvatars() {
  const { users, me, others } = useOrgPresence();

  if (users.length === 0) return null;

  const ordered: PresentUser[] = me ? [me, ...others] : others;
  const visible = ordered.slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, ordered.length - visible.length);

  return (
    <div
      className="hidden sm:flex items-center gap-1.5"
      title={`${ordered.length} personne${ordered.length > 1 ? 's' : ''} en ligne`}
    >
      <span
        aria-hidden
        className="relative flex h-2 w-2"
        title="Synchronisation temps réel active"
      >
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/80 opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>

      <div className="flex -space-x-1.5">
        {visible.map((u) => (
          <Avatar key={u.userId} user={u} isMe={me?.userId === u.userId} />
        ))}
        {overflow > 0 && (
          <div
            className="relative z-0 h-7 w-7 rounded-full bg-card border border-hairline text-foreground text-[10px] font-semibold flex items-center justify-center"
            title={ordered
              .slice(MAX_VISIBLE)
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
        isMe ? 'ring-emerald-400' : 'ring-card',
        'shadow-[0_2px_8px_-2px_rgba(0,0,0,0.4)]',
      )}
    >
      {user.initials}
    </div>
  );
}
