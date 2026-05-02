'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, Bell, User, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useOrganizationSafe } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { CentriumMark } from '@/components/brand/CentriumMark';

export function Header() {
  const org = useOrganizationSafe();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!org?.activeOrgId) {
      setUnreadAlerts(0);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    const load = async () => {
      const { count } = await supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new');
      if (!cancelled) setUnreadAlerts(count ?? 0);
    };
    load();
    const channel = supabase
      .channel('alerts-header-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [org?.activeOrgId]);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  const activeMembership = org?.memberships.find((m) => m.id === org.activeOrgId);

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 z-20 h-16 border-b border-white/5 bg-midnight-300/60 backdrop-blur-xl">
      {/* Aura subtile derrière le logo Centrium au centre */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-full w-64 -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(225,29,116,0.12),rgba(139,92,246,0.06),transparent_70%)]"
      />
      <div className="relative flex h-full items-center justify-between gap-4 px-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher un consultant, contact, opportunité…"
            className="pl-9 h-9 bg-white/[0.03] border-white/5"
          />
        </div>

        {/* Centrium au centre — rappel permanent de la plateforme */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:block">
          <Link href="/dashboard" aria-label="Centrium">
            <CentriumMark size="md" />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notifications"
            asChild
          >
            <Link href="/alerts">
              <Bell className="h-4 w-4" />
              {unreadAlerts > 0 && (
                <span
                  aria-label={`${unreadAlerts} alerte${unreadAlerts > 1 ? 's' : ''} non lue${unreadAlerts > 1 ? 's' : ''}`}
                  className="absolute top-2 right-2 h-2 w-2 rounded-full bg-magenta shadow-glow-magenta"
                />
              )}
            </Link>
          </Button>

          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Profil"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <User className="h-4 w-4" />
            </Button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-lg border border-white/10 bg-midnight-200/95 backdrop-blur-xl shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Connecté en tant que
                  </div>
                  <div className="text-sm font-medium truncate mt-0.5">
                    {org?.user?.email ?? '—'}
                  </div>
                  {activeMembership && (
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {activeMembership.name} · {activeMembership.role}
                    </div>
                  )}
                </div>
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm hover:bg-white/5 transition"
                >
                  Paramètres
                </Link>
                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200 transition border-t border-white/5"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Déconnexion
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
