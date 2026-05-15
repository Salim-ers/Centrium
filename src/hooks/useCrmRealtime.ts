'use client';

/**
 * Temps réel pour le Kanban /crm :
 *
 * 1. **Postgres Changes** sur `opportunities` → quand un collègue déplace,
 *    crée ou supprime une carte, on déclenche le callback `onDataChange`
 *    (la page rafraîchit sa liste). Debounce 120 ms pour éviter les rafales
 *    sans pour autant laisser l'UI traîner.
 *
 * 2. **Broadcast** (channel ad-hoc, pas de persistance DB). Trois events :
 *      - `drag-state` { user_id, opp_id, to_status } pendant le drag
 *      - `drop`       { user_id, opp_id, to_status } au moment du dépôt
 *                     → le peer applique l'optimistic move chez lui via
 *                     `onPeerDrop`. Sans ça, le card "sautait" : pickup
 *                     visible, peer-badge qui disparaît, puis 500 ms plus
 *                     tard la carte changeait de colonne. Maintenant tout
 *                     est synchrone.
 *      - `cancel`     { user_id } si le drag est abandonné sans drop
 *
 * Les deux mécanismes vivent dans deux channels Supabase séparés. Auto-
 * cleanup à unmount et auto-cleanup d'un peer-drag bloqué (TTL 20 s).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrganizationSafe } from '@/lib/auth/context';
import { useOrgPresence, type PresentUser } from '@/hooks/useOrgPresence';
import type { OpportunityStatus } from '@/types';

export type PeerDrag = {
  user: PresentUser;
  oppId: string;
  toStatus: OpportunityStatus | null;
  /** Date locale de réception (pour TTL et cleanup). */
  receivedAt: number;
};

type DragStatePayload = {
  user_id: string;
  opp_id: string | null;
  to_status: OpportunityStatus | null;
};

type DropPayload = {
  user_id: string;
  opp_id: string;
  to_status: OpportunityStatus;
};

type CancelPayload = {
  user_id: string;
};

const TTL_MS = 20_000;

export function useCrmRealtime(opts: {
  onDataChange: () => void;
  /** Appelé quand un collègue vient de drop une carte. Sert à appliquer
   *  l'optimistic move local AVANT que postgres_changes ne confirme. */
  onPeerDrop?: (oppId: string, toStatus: OpportunityStatus) => void;
}) {
  const { onDataChange, onPeerDrop } = opts;
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;
  const onPeerDropRef = useRef(onPeerDrop);
  onPeerDropRef.current = onPeerDrop;

  const org = useOrganizationSafe();
  const orgId = org?.activeOrgId ?? null;
  const userId = org?.user?.id ?? null;

  const { users } = useOrgPresence();
  const usersById = useMemo(() => {
    const m = new Map<string, PresentUser>();
    users.forEach((u) => m.set(u.userId, u));
    return m;
  }, [users]);

  // Map userId → drag-state. Un seul drag actif par user.
  const [peerDragsRaw, setPeerDragsRaw] = useState<Record<string, Omit<PeerDrag, 'user'>>>({});

  // Channel broadcast — on garde la ref pour pouvoir send() depuis les handlers.
  const dragChannelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  // ============================================================
  // 1) Postgres Changes — sync des données opportunities
  // ============================================================
  useEffect(() => {
    if (!orgId) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onDataChangeRef.current(), 120);
    };

    const channel = supabase
      .channel(`opportunities-realtime:${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opportunities' },
        () => trigger(),
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  // ============================================================
  // 2) Broadcast — drag en direct (drag-state / drop / cancel)
  // ============================================================
  useEffect(() => {
    if (!orgId || !userId) return;
    const supabase = createClient();

    const channel = supabase.channel(`crm-drag:${orgId}`, {
      // self: false → on ne reçoit pas nos propres broadcasts.
      config: { broadcast: { self: false, ack: false } },
    });

    channel.on('broadcast', { event: 'drag-state' }, ({ payload }) => {
      const p = payload as DragStatePayload;
      if (!p?.user_id || p.user_id === userId || !p.opp_id) return;
      setPeerDragsRaw((prev) => ({
        ...prev,
        [p.user_id]: {
          oppId: p.opp_id!,
          toStatus: p.to_status,
          receivedAt: Date.now(),
        },
      }));
    });

    channel.on('broadcast', { event: 'drop' }, ({ payload }) => {
      const p = payload as DropPayload;
      if (!p?.user_id || p.user_id === userId) return;
      // 1) Optimistic local : on déplace la carte côté local immédiatement,
      //    sans attendre que postgres_changes confirme. Si la confirmation
      //    finit par dire autre chose (rollback côté peer), le reload qui
      //    suivra rectifiera.
      onPeerDropRef.current?.(p.opp_id, p.to_status);
      // 2) Nettoyage de l'indicateur peer-drag.
      setPeerDragsRaw((prev) => {
        if (!prev[p.user_id]) return prev;
        const { [p.user_id]: _gone, ...rest } = prev;
        return rest;
      });
    });

    channel.on('broadcast', { event: 'cancel' }, ({ payload }) => {
      const p = payload as CancelPayload;
      if (!p?.user_id || p.user_id === userId) return;
      setPeerDragsRaw((prev) => {
        if (!prev[p.user_id]) return prev;
        const { [p.user_id]: _gone, ...rest } = prev;
        return rest;
      });
    });

    channel.subscribe();
    dragChannelRef.current = channel;

    return () => {
      dragChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [orgId, userId]);

  // GC : si un peer-drag traîne >TTL sans update, on le retire (au cas où le
  // peer aurait crashé / fermé l'onglet sans envoyer son "drag-end").
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setPeerDragsRaw((prev) => {
        let changed = false;
        const next: typeof prev = {};
        for (const [uid, d] of Object.entries(prev)) {
          if (now - d.receivedAt > TTL_MS) {
            changed = true;
            continue;
          }
          next[uid] = d;
        }
        return changed ? next : prev;
      });
    }, 5_000);
    return () => clearInterval(interval);
  }, []);

  const broadcastDrag = useCallback(
    (oppId: string | null, toStatus: OpportunityStatus | null) => {
      const channel = dragChannelRef.current;
      if (!channel || !userId || !oppId) return;
      channel
        .send({
          type: 'broadcast',
          event: 'drag-state',
          payload: { user_id: userId, opp_id: oppId, to_status: toStatus } satisfies DragStatePayload,
        })
        .catch(() => {});
    },
    [userId],
  );

  const broadcastDrop = useCallback(
    (oppId: string, toStatus: OpportunityStatus) => {
      const channel = dragChannelRef.current;
      if (!channel || !userId) return;
      channel
        .send({
          type: 'broadcast',
          event: 'drop',
          payload: { user_id: userId, opp_id: oppId, to_status: toStatus } satisfies DropPayload,
        })
        .catch(() => {});
    },
    [userId],
  );

  const broadcastCancel = useCallback(() => {
    const channel = dragChannelRef.current;
    if (!channel || !userId) return;
    channel
      .send({
        type: 'broadcast',
        event: 'cancel',
        payload: { user_id: userId } satisfies CancelPayload,
      })
      .catch(() => {});
  }, [userId]);

  // Hydrate les peer-drags avec leur profil (couleur + initiales).
  const peerDrags = useMemo<PeerDrag[]>(() => {
    return Object.entries(peerDragsRaw)
      .map(([uid, d]) => {
        const user = usersById.get(uid);
        if (!user) return null;
        return { user, oppId: d.oppId, toStatus: d.toStatus, receivedAt: d.receivedAt };
      })
      .filter((x): x is PeerDrag => x !== null);
  }, [peerDragsRaw, usersById]);

  // Lookups pratiques pour l'UI.
  const peerByOpp = useMemo(() => {
    const m = new Map<string, PeerDrag>();
    peerDrags.forEach((d) => m.set(d.oppId, d));
    return m;
  }, [peerDrags]);

  const peerByColumn = useMemo(() => {
    const m = new Map<OpportunityStatus, PeerDrag>();
    peerDrags.forEach((d) => {
      if (d.toStatus) m.set(d.toStatus, d);
    });
    return m;
  }, [peerDrags]);

  return {
    broadcastDrag,
    broadcastDrop,
    broadcastCancel,
    peerDrags,
    peerByOpp,
    peerByColumn,
  };
}
