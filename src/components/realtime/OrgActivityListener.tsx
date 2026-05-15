'use client';

/**
 * Écoute la channel `activity:org:{orgId}` et toast les actions
 * notables des autres membres. Mountable une seule fois (dans AppShell),
 * pas par page : la channel survit aux navigations internes.
 *
 * Le toast est non bloquant, en haut à droite, durée 4s. Si l'event
 * inclut un href, cliquer dessus emmène l'utilisateur sur la page.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useOrganizationSafe } from '@/lib/auth/context';
import { useOrgPresence } from '@/hooks/useOrgPresence';
import {
  describeActivity,
  type ActivityPayload,
} from '@/lib/realtime/org-activity';

export function OrgActivityListener() {
  const org = useOrganizationSafe();
  const orgId = org?.activeOrgId ?? null;
  const userId = org?.user?.id ?? null;
  const { users } = useOrgPresence();
  const router = useRouter();

  useEffect(() => {
    if (!orgId || !userId) return;
    const supabase = createClient();

    const channel = supabase.channel(`activity:org:${orgId}`, {
      config: { broadcast: { self: false, ack: false } },
    });

    channel.on('broadcast', { event: 'activity' }, ({ payload }) => {
      const p = payload as ActivityPayload;
      if (!p?.user_id || p.user_id === userId) return;
      // Cherche le profil dans la présence pour avoir le prénom.
      const actor = users.find((u) => u.userId === p.user_id);
      const actorName = actor?.displayName ?? 'Un collègue';
      const initials = actor?.initials ?? '??';
      const message = describeActivity(p.kind, actorName, p.label);

      toast(message, {
        duration: 4500,
        icon: (
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${actor?.color.bg ?? 'bg-violet-500'} ${actor?.color.text ?? 'text-white'}`}
          >
            {initials}
          </span>
        ),
        action: p.href
          ? {
              label: 'Voir',
              onClick: () => router.push(p.href!),
            }
          : undefined,
      });
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // users change rapidement (présence) mais on n'a pas besoin de
    // resubscribe à chaque fois — la lookup se fait au moment de l'event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, userId, router]);

  return null;
}
