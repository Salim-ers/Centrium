'use client';

import { Search, Bell, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 z-20 h-16 border-b border-white/5 bg-midnight-300/60 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between gap-4 px-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher un consultant, contact, opportunité…"
            className="pl-9 h-9 bg-white/[0.03] border-white/5"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-magenta shadow-glow-magenta" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Profil">
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
