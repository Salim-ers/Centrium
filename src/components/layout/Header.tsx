'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, Bell, User, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useOrganizationSafe } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { TutorialButton } from '@/components/onboarding/NewUserTutorial';
import { PresenceAvatars } from '@/components/presence/PresenceAvatars';
import { MobileNav } from '@/components/layout/MobileNav';
import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';

export function Header() {
  const org = useOrganizationSafe();
  const [collapsed] = useSidebarCollapsed();
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
    <header
      className={`qc-app-header fixed top-0 right-0 left-0 z-20 h-16 bg-background/95 backdrop-blur-xl border-b border-hairline transition-[left] duration-300 ease-out ${
        collapsed ? 'md:left-0' : 'md:left-64'
      }`}
    >
      {/* Hairline rose/violet en bas du header — DARK uniquement.
          En light : invisible (demande utilisateur : zéro halo rose).
          On bascule via opacity sans changer le background pour garder
          la teinte rose/violet identitaire en dark. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0 dark:opacity-60 transition-opacity"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(236,72,153,0.45) 40%, rgba(168,85,247,0.35) 60%, transparent)',
        }}
      />
      <div
        className={`relative flex h-full items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 transition-[padding] duration-300 ease-out ${
          collapsed ? 'md:pl-16' : ''
        }`}
      >
        {/* À gauche : burger + wordmark sur mobile (la sidebar est cachée).
            Sur desktop : barre de recherche large. */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <MobileNav />
          {/* Wordmark seulement sur mobile (la sidebar le montre sur desktop) */}
          <Link
            href="/dashboard"
            className="md:hidden inline-flex items-center"
            aria-label="Centrium — accueil"
          >
            <CentriumWordmark size="sm" orientation="horizontal" />
          </Link>
          <div className="relative w-full max-w-sm hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher un consultant, contact, opportunité…"
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <PresenceAvatars />
          <div className="hidden sm:block">
            <TutorialButton variant="cta" />
          </div>
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
              <div className="absolute right-0 mt-2 w-64 rounded-lg border border-hairline bg-card/95 backdrop-blur-xl shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-hairline">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Connecté en tant que
                  </div>
                  {(() => {
                    const fullName = `${org?.user?.firstName ?? ''} ${org?.user?.lastName ?? ''}`.trim();
                    return (
                      <>
                        <div className="text-sm font-medium truncate mt-0.5">
                          {fullName || org?.user?.email || '—'}
                        </div>
                        {fullName && (
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {org?.user?.email}
                          </div>
                        )}
                      </>
                    );
                  })()}
                  {activeMembership && (
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {activeMembership.name} · {activeMembership.role}
                    </div>
                  )}
                </div>
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm hover-surface transition"
                >
                  Paramètres
                </Link>
                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition border-t border-hairline"
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
