'use client';

/**
 * Temps réel pour le Kanban /crm :
 *
 * 1. **Postgres Changes** sur `opportunities` → quand un collègue déplace,
 *    crée ou supprime une carte, on déclenche le callback `onDataChange`
 *    (la page rafraîchit sa liste). Debounce 250 ms pour éviter les rafales.
 *
 * 2. **Broadcast** (channel ad-hoc, pas de persistance DB) → on diffuse
 *    le drag-state du user courant (oppId + colonne survolée) et on reçoit
 *    celui des autres. C'est ça qui permet de voir "Salim est en train de
 *    glisser Mission Acme vers Won" EN DIRECT, avant même qu'il drop.
 *
 * Les deux mécanismes vivent dans deux channels Supabase séparés pour des
 * raisons de clarté (postgres_changes vs broadcast). Auto-cleanup à unmount
 * et auto-cleanup d'un peer-drag bloqué (TTL 20s).
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

const TTL_MS = 20_000;

export function useCrmRealtime(opts: { onDataChange: () => void }) {
  const { onDataChange } = opts;
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;

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
      timer = setTimeout(() => onDataChangeRef.current(), 250);
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
  // 2) Broadcast — drag en direct
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
      if (!p?.user_id || p.user_id === userId) return;
      setPeerDragsRaw((prev) => {
        const next = { ...prev };
        if (!p.opp_id) {
          delete next[p.user_id];
        } else {
          next[p.user_id] = {
            oppId: p.opp_id,
            toStatus: p.to_status,
            receivedAt: Date.now(),
          };
        }
        return next;
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

  // Émet l'état de drag courant. oppId=null signifie "drag-end".
  const broadcastDrag = useCallback(
    (oppId: string | null, toStatus: OpportunityStatus | null) => {
      const channel = dragChannelRef.current;
      if (!channel || !userId) return;
      const payload: DragStatePayload = {
        user_id: userId,
        opp_id: oppId,
        to_status: toStatus,
      };
      channel.send({ type: 'broadcast', event: 'drag-state', payload }).catch(() => {});
    },
    [userId],
  );

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

  return { broadcastDrag, peerDrags, peerByOpp, peerByColumn };
}
