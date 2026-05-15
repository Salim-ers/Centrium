'use client';

/**
 * Curseurs en direct façon Figma / Google Docs.
 *
 * - Channel broadcast par organisation (pas de persistance DB).
 * - On émet notre position de souris debounced à ~30 fps (33 ms).
 * - Les coords sont en "page space" (clientX/Y + scrollX/Y) pour
 *   rester stables si l'autre user scrolle.
 * - Scope par pathname : un curseur n'apparaît que sur la même page.
 * - TTL 3 s : si le peer ne bouge plus / a quitté, son curseur s'estompe.
 *
 * RLS : la channel est nommée par activeOrgId → seuls les membres
 * d'une même org reçoivent les positions.
 */

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useOrganizationSafe } from '@/lib/auth/context';
import { useOrgPresence, type PresentUser } from '@/hooks/useOrgPresence';

export type PeerCursor = {
  user: PresentUser;
  x: number;
  y: number;
  /** Date locale du dernier event (pour TTL/cleanup). */
  ts: number;
};

type CursorPayload = {
  user_id: string;
  path: string;
  x: number;
  y: number;
};

const TICK_MS = 33; // ~30 fps
const TTL_MS = 3_000;

export function useOrgCursors() {
  const org = useOrganizationSafe();
  const orgId = org?.activeOrgId ?? null;
  const userId = org?.user?.id ?? null;
  const pathname = usePathname();

  const { users } = useOrgPresence();
  const [cursorsRaw, setCursorsRaw] = useState<Record<string, Omit<PeerCursor, 'user'>>>({});

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  // -------- Listen --------
  useEffect(() => {
    if (!orgId || !userId) return;
    const supabase = createClient();
    const channel = supabase.channel(`cursors:${orgId}`, {
      config: { broadcast: { self: false, ack: false } },
    });

    channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      const p = payload as CursorPayload;
      if (!p?.user_id || p.user_id === userId) return;
      // On ignore les curseurs d'une autre page : si je suis sur /crm
      // et qu'un collègue est sur /dashboard, son curseur ne s'affiche pas.
      if (p.path !== pathname) {
        // Si on a un cursor cache pour ce user, on l'enlève (il a navigué).
        setCursorsRaw((prev) => {
          if (!prev[p.user_id]) return prev;
          const { [p.user_id]: _gone, ...rest } = prev;
          return rest;
        });
        return;
      }
      setCursorsRaw((prev) => ({
        ...prev,
        [p.user_id]: { x: p.x, y: p.y, ts: Date.now() },
      }));
    });

    channel.on('broadcast', { event: 'cursor-leave' }, ({ payload }) => {
      const p = payload as { user_id: string };
      if (!p?.user_id || p.user_id === userId) return;
      setCursorsRaw((prev) => {
        if (!prev[p.user_id]) return prev;
        const { [p.user_id]: _gone, ...rest } = prev;
        return rest;
      });
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [orgId, userId, pathname]);

  // -------- Emit --------
  useEffect(() => {
    if (!orgId || !userId) return;
    let lastSent = 0;
    let pending: { x: number; y: number } | null = null;
    let raf: number | null = null;

    const flush = () => {
      raf = null;
      const c = channelRef.current;
      if (!c || !pending) return;
      const now = Date.now();
      if (now - lastSent < TICK_MS) {
        raf = window.requestAnimationFrame(flush);
        return;
      }
      lastSent = now;
      const payload: CursorPayload = {
        user_id: userId,
        path: pathname,
        x: pending.x,
        y: pending.y,
      };
      pending = null;
      c.send({ type: 'broadcast', event: 'cursor', payload }).catch(() => {});
    };

    const onMove = (e: MouseEvent) => {
      pending = { x: e.clientX + window.scrollX, y: e.clientY + window.scrollY };
      if (raf === null) raf = window.requestAnimationFrame(flush);
    };

    const onLeave = () => {
      const c = channelRef.current;
      c?.send({
        type: 'broadcast',
        event: 'cursor-leave',
        payload: { user_id: userId },
      }).catch(() => {});
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onLeave();
    });

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      if (raf !== null) window.cancelAnimationFrame(raf);
      onLeave();
    };
  }, [orgId, userId, pathname]);

  // -------- TTL cleanup --------
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursorsRaw((prev) => {
        let changed = false;
        const next: typeof prev = {};
        for (const [uid, c] of Object.entries(prev)) {
          if (now - c.ts > TTL_MS) {
            changed = true;
            continue;
          }
          next[uid] = c;
        }
        return changed ? next : prev;
      });
    }, 1_000);
    return () => clearInterval(interval);
  }, []);

  // Hydrate avec les profils (couleurs + initiales depuis useOrgPresence).
  const cursors: PeerCursor[] = [];
  const usersById = new Map(users.map((u) => [u.userId, u] as const));
  for (const [uid, c] of Object.entries(cursorsRaw)) {
    const user = usersById.get(uid);
    if (!user) continue;
    cursors.push({ user, x: c.x, y: c.y, ts: c.ts });
  }
  return cursors;
}
