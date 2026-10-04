'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Inbox } from 'lucide-react';

import { cn, relativeDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { notificationService } from '@/lib/services';
import { useOrganizationSafe } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { ALERT_CATEGORY } from '@/lib/alerts/config';
import type { AlertType, AppNotification } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { EmptyState } from '@/components/app/EmptyState';
import { SkeletonRows } from '@/components/ui/skeleton';

export type NotificationGroup = 'commercial' | 'staffing' | 'mission' | 'cra' | 'finance' | 'system';

const GROUP_LABEL: Record<NotificationGroup | 'all', { fr: string; en: string }> = {
  all: { fr: 'Toutes', en: 'All' },
  commercial: { fr: 'Commercial', en: 'Sales' },
  staffing: { fr: 'Staffing', en: 'Staffing' },
  mission: { fr: 'Mission', en: 'Mission' },
  cra: { fr: 'CRA', en: 'Timesheets' },
  finance: { fr: 'Finance', en: 'Finance' },
  system: { fr: 'Système', en: 'System' },
};

const GROUP_DOT: Record<NotificationGroup, string> = {
  commercial: 'bg-primary',
  staffing: 'bg-steel-500',
  mission: 'bg-sand-600',
  cra: 'bg-[#7D8B5A]',
  finance: 'bg-[#C2913B]',
  system: 'bg-muted-foreground',
};

/** Catégorie V2 d'une notification, à partir de son type d'alerte. */
export function notificationGroup(kind: string): NotificationGroup {
  const cat = ALERT_CATEGORY[kind as AlertType];
  switch (cat) {
    case 'crm':
      return 'commercial';
    case 'consultants':
      return 'staffing';
    case 'missions':
    case 'contracts':
      return 'mission';
    case 'cra':
      return 'cra';
    case 'invoices':
      return 'finance';
    case 'system':
      return 'system';
    default:
      if (/timesheet|cra/.test(kind)) return 'cra';
      if (/opportun|client|quote|devis|request|demande/.test(kind)) return 'commercial';
      if (/consultant|staffing|available/.test(kind)) return 'staffing';
      if (/invoice|finance|prefact/.test(kind)) return 'finance';
      if (/mission|contract/.test(kind)) return 'mission';
      return 'system';
  }
}

/** Cloche + tiroir de notifications. */
export function NotificationCenter() {
  const router = useRouter();
  const org = useOrganizationSafe();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<AppNotification[] | null>(null);
  const [unread, setUnread] = React.useState(0);
  const [filter, setFilter] = React.useState<NotificationGroup | 'all'>('all');
  const userId = org?.user?.id;

  const refreshCount = React.useCallback(async () => {
    const { data } = await notificationService.unreadCount();
    if (typeof data === 'number') setUnread(data);
  }, []);

  const load = React.useCallback(async () => {
    const { data } = await notificationService.list(60);
    setItems(data ?? []);
  }, []);

  React.useEffect(() => {
    if (!userId) return;
    void refreshCount();
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          void refreshCount();
          if (open) void load();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refreshCount, load, open]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const counts = React.useMemo(() => {
    const c: Record<string, number> = {};
    for (const n of items ?? []) {
      if (n.read_at) continue;
      const g = notificationGroup(n.kind);
      c[g] = (c[g] ?? 0) + 1;
    }
    return c;
  }, [items]);

  const visible = (items ?? []).filter((n) => filter === 'all' || notificationGroup(n.kind) === filter);

  async function openNotification(n: AppNotification) {
    if (!n.read_at) {
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)) ?? prev);
      setUnread((u) => Math.max(0, u - 1));
      void notificationService.markRead(n.id);
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  }

  async function markAll() {
    await notificationService.markAllRead();
    setItems((prev) => prev?.map((x) => (x.read_at ? x : { ...x, read_at: new Date().toISOString() })) ?? prev);
    setUnread(0);
  }

  const groups: Array<NotificationGroup | 'all'> = ['all', 'commercial', 'staffing', 'mission', 'cra', 'finance', 'system'];

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={
          unread > 0
            ? lang === 'fr'
              ? `Notifications, ${unread} non lue${unread > 1 ? 's' : ''}`
              : `Notifications, ${unread} unread`
            : 'Notifications'
        }
        onClick={() => setOpen(true)}
      >
        <Bell />
        {unread > 0 && (
          <span className="num absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground ring-2 ring-background">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent side="right" className="sm:max-w-[26rem]">
          <DrawerHeader>
            <DrawerTitle>Notifications</DrawerTitle>
            <DrawerDescription>
              {lang === 'fr' ? 'Chaque notification mène à l’élément concerné.' : 'Each notification opens the related item.'}
            </DrawerDescription>
          </DrawerHeader>

          <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border px-4 py-2">
            {groups.map((g) => {
              const count = g === 'all' ? unread : (counts[g] ?? 0);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setFilter(g)}
                  aria-pressed={filter === g}
                  className={cn(
                    'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors',
                    filter === g
                      ? 'border-foreground/15 bg-foreground text-background'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground',
                  )}
                >
                  {GROUP_LABEL[g][lang]}
                  {count > 0 && <span className="num opacity-80">{count}</span>}
                </button>
              );
            })}
          </div>

          <DrawerBody className="px-0 py-0">
            {items === null ? (
              <SkeletonRows rows={5} />
            ) : visible.length === 0 ? (
              <EmptyState
                size="compact"
                icon={Inbox}
                title={lang === 'fr' ? 'Rien de neuf' : 'Nothing new'}
                description={
                  lang === 'fr'
                    ? 'Les alertes CRA, missions, opportunités et finance apparaîtront ici.'
                    : 'Timesheet, mission, sales and finance alerts will show up here.'
                }
                className="py-16"
              />
            ) : (
              <ul className="divide-y divide-border">
                {visible.map((n) => {
                  const g = notificationGroup(n.kind);
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => openNotification(n)}
                        className={cn(
                          'flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/60',
                          !n.read_at && 'bg-brand-50/40',
                        )}
                      >
                        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', GROUP_DOT[g], n.read_at && 'opacity-30')} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className={cn('truncate text-[13px]', n.read_at ? 'text-muted-foreground' : 'font-medium text-foreground')}>
                              {n.title}
                            </span>
                            <span className="shrink-0 text-[11px] text-muted-foreground">{relativeDate(n.created_at)}</span>
                          </span>
                          {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>}
                          <span className="mt-1 block text-[11px] text-muted-foreground">{GROUP_LABEL[g][lang]}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </DrawerBody>

          {unread > 0 && (
            <div className="border-t border-border px-5 py-3">
              <Button variant="ghost" size="sm" onClick={markAll} className="w-full">
                <CheckCheck />
                {lang === 'fr' ? 'Tout marquer comme lu' : 'Mark all as read'}
              </Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
