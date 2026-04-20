'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  Target,
  Send,
  ClipboardCheck,
  Receipt,
  UserCircle,
  BellRing,
  FileSignature,
  FileCheck,
  Kanban,
  Settings,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';

const navigation = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'CV Optimizer', href: '/cv-optimizer', icon: FileText },
  { label: 'Matching', href: '/matching', icon: Target },
  { label: 'Réponse AO', href: '/responses', icon: Send },
  { label: 'CRA', href: '/timesheets', icon: ClipboardCheck },
  { label: 'Factures', href: '/invoices', icon: Receipt },
  { label: 'Assistant compta', href: '/accounting', icon: Calculator },
  { label: 'Contrats', href: '/contracts', icon: FileSignature },
  { label: 'Consultants', href: '/consultants', icon: Users },
  { label: 'Templates CV', href: '/templates', icon: FileCheck },
  { label: 'Suivi commercial', href: '/crm', icon: Kanban },
  { label: 'Contacts', href: '/contacts', icon: UserCircle },
  { label: 'Alertes', href: '/alerts', icon: BellRing },
  { label: 'Paramètres', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 z-30 h-screen w-64 flex-col border-r border-white/5 bg-midnight-200/80 backdrop-blur-xl">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex h-32 items-center justify-center border-b border-white/5 px-2 hover:opacity-80 transition"
      >
        <QuadCoreLogo size="xl" variant="dark" />
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {navigation.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
                    active
                      ? 'bg-violet-glow/10 text-violet-glow border border-violet-glow/20'
                      : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground border border-transparent'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 p-4">
        <div className="rounded-lg bg-qc-card-gradient border border-violet-glow/10 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-glow">
            Plan Trial
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            14 jours restants. Passez au Plan Pro.
          </p>
        </div>
      </div>
    </aside>
  );
}
