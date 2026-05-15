'use client';

/**
 * Présence "Google Docs style" pour l'organisation active.
 *
 * - Une seule channel Supabase `presence:org:{orgId}` partagée par toute l'app.
 * - On track son profil (prénom, nom, email, avatar) au join.
 * - On déduplique par user_id (un user qui ouvre 3 onglets ne compte qu'une fois).
 * - Couleur stable (dérivée de l'user id) → l'avatar est toujours de la même
 *   couleur, peu importe l'ordre de connexion.
 *
 * Le hook est safe à appeler hors d'une page connectée : il renvoie un état vide
 * tant que `activeOrgId` n'est pas dispo.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useOrganizationSafe } from '@/lib/auth/context';
import {
  presenceColor,
  presenceDisplayName,
  presenceInitials,
  type PresenceColor,
} from '@/lib/realtime/presence-utils';

export type PresentUser = {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  displayName: string;
  initials: string;
  color: PresenceColor;
  /** Heure ISO du dernier "track" reçu (utile pour debug). */
  onlineAt: string;
};

type TrackedPayload = {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  online_at: string;
};

/**
 * Channel singleton par orgId. Quand plusieurs composants montent le hook
 * en parallèle (header + page CRM par ex.), on veut une SEULE channel
 * Supabase, sinon on apparaît "double" dans la présence.
 */
type SharedChannel = {
  channel: RealtimeChannel;
  /** Nombre de hooks abonnés. On ne ferme la channel qu'à 0. */
  refCount: number;
  /** Listeners de mise à jour de l'état (un par hook abonné). */
  listeners: Set<(users: PresentUser[]) => void>;
  /** Dernier état connu (pour rehydrater les nouveaux subscribers). */
  lastUsers: PresentUser[];
};

const sharedChannels = new Map<string, SharedChannel>();

function deriveUsers(state: Record<string, TrackedPayload[]>): PresentUser[] {
  const seen = new Map<string, PresentUser>();
  for (const presences of Object.values(state)) {
    for (const p of presences) {
      if (!p?.user_id || seen.has(p.user_id)) continue;
      seen.set(p.user_id, {
        userId: p.user_id,
        email: p.email,
        firstName: p.first_name,
        lastName: p.last_name,
        avatarUrl: p.avatar_url,
        displayName: presenceDisplayName(p.first_name, p.last_name, p.email),
        initials: presenceInitials(p.first_name, p.last_name, p.email),
        color: presenceColor(p.user_id),
        onlineAt: p.online_at,
      });
    }
  }
  return Array.from(seen.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName, 'fr'),
  );
}

export function useOrgPresence(): {
  users: PresentUser[];
  others: PresentUser[];
  me: PresentUser | null;
} {
  const org = useOrganizationSafe();
  const orgId = org?.activeOrgId ?? null;
  const userId = org?.user?.id ?? null;
  const userEmail = org?.user?.email ?? '';

  const [users, setUsers] = useState<PresentUser[]>([]);
  const profileRef = useRef<{ first: string | null; last: string | null; avatar: string | null }>({
    first: null,
    last: null,
    avatar: null,
  });

  // Charge first/last/avatar depuis profiles (pour les initiales jolies).
  // Pas critique : si la fetch échoue, on tombe sur les initiales basées email.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', userId)
        .single();
      if (cancelled || !data) return;
      profileRef.current = {
        first: data.first_name ?? null,
        last: data.last_name ?? null,
        avatar: data.avatar_url ?? null,
      };
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!orgId || !userId) {
      setUsers([]);
      return;
    }

    const supabase = createClient();
    const key = `${orgId}::${userId}`;

    let shared = sharedChannels.get(orgId);
    if (!shared) {
      const channel = supabase.channel(`presence:org:${orgId}`, {
        config: { presence: { key: userId } },
      });
      shared = {
        channel,
        refCount: 0,
        listeners: new Set(),
        lastUsers: [],
      };
      sharedChannels.set(orgId, shared);

      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<TrackedPayload>();
        const next = deriveUsers(state as Record<string, TrackedPayload[]>);
        shared!.lastUsers = next;
        shared!.listeners.forEach((fn) => fn(next));
      });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const payload: TrackedPayload = {
            user_id: userId,
            email: userEmail,
            first_name: profileRef.current.first,
            last_name: profileRef.current.last,
            avatar_url: profileRef.current.avatar,
            online_at: new Date().toISOString(),
          };
          await channel.track(payload);
        }
      });
    }

    shared.refCount += 1;
    const listener = (next: PresentUser[]) => setUsers(next);
    shared.listeners.add(listener);
    // Rehydrate immédiatement si la channel était déjà active.
    if (shared.lastUsers.length) setUsers(shared.lastUsers);

    return () => {
      const s = sharedChannels.get(orgId);
      if (!s) return;
      s.listeners.delete(listener);
      s.refCount -= 1;
      if (s.refCount <= 0) {
        s.channel.untrack().catch(() => {});
        supabase.removeChannel(s.channel);
        sharedChannels.delete(orgId);
      }
    };
    // userEmail change rarement ; on n'inclut pas profileRef (mutable ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, userId, userEmail]);

  // Re-track quand le profil arrive plus tard (initials passe de "S" à "SE").
  useEffect(() => {
    if (!orgId || !userId) return;
    const handle = setTimeout(() => {
      const s = sharedChannels.get(orgId);
      if (!s) return;
      const payload: TrackedPayload = {
        user_id: userId,
        email: userEmail,
        first_name: profileRef.current.first,
        last_name: profileRef.current.last,
        avatar_url: profileRef.current.avatar,
        online_at: new Date().toISOString(),
      };
      s.channel.track(payload).catch(() => {});
    }, 800);
    return () => clearTimeout(handle);
  }, [orgId, userId, userEmail]);

  const me = useMemo(() => users.find((u) => u.userId === userId) ?? null, [users, userId]);
  const others = useMemo(() => users.filter((u) => u.userId !== userId), [users, userId]);

  return { users, others, me };
}
