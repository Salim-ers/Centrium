'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type Notif = { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

/**
 * Notifications de l'utilisateur du portail (consultant ou client). La
 * lecture est limitée à ses propres notifications par la RLS
 * (user_id = auth.uid()) ; un clic les marque comme lues.
 */
export function PortalNotifications({ userId, limit = 6 }: { userId: string; limit?: number }) {
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const [items, setItems] = useState<Notif[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createClient()
      .from('notifications')
      .select('id, title, body, link, read_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (!cancelled) setItems((data ?? []) as Notif[]);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, limit]);

  async function markRead(n: Notif) {
    if (n.read_at) return;
    setItems((prev) => (prev ?? []).map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    await createClient().from('notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id);
  }

  if (!items || items.length === 0) return null;
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          {fr ? 'Notifications' : 'Notifications'}
        </CardTitle>
        {unread > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-white">{unread}</span>}
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border border-t border-border">
          {items.map((n) => {
            const inner = (
              <>
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', n.read_at ? 'bg-transparent' : 'bg-primary')} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-[13.5px]', !n.read_at && 'font-medium')}>{n.title}</span>
                  {n.body && <span className="block truncate text-[12.5px] text-muted-foreground">{n.body}</span>}
                </span>
                <span className="shrink-0 text-[11.5px] text-muted-foreground">{formatDate(n.created_at, lang)}</span>
              </>
            );
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link href={n.link} onClick={() => void markRead(n)} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/50">
                    {inner}
                  </Link>
                ) : (
                  <button type="button" onClick={() => void markRead(n)} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-muted/50">
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
