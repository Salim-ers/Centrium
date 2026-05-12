'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'centrium-theme';

function readTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  // Fallback : préférence système
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.style.colorScheme = theme;
}

/**
 * Bouton sun/moon : bascule light ↔ dark, persiste la préférence.
 *
 * Pas de flash au boot grâce au script inline dans layout.tsx qui applique
 * la classe `.dark` avant le 1er render React.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // Sync avec ce qui a été appliqué par le script inline (layout)
    const initial = readTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
      aria-label="Basculer le thème"
      className={cn(
        'group relative inline-flex h-9 w-9 items-center justify-center rounded-md',
        'border border-hairline surface-1 hover-surface transition-all',
        'hover:border-violet-glow/40 hover:shadow-[0_0_24px_-12px_rgba(225,29,116,0.6)]',
        className,
      )}
    >
      {/* Sun : visible en dark (pour passer en light) */}
      <Sun
        className={cn(
          'h-4 w-4 text-amber-400 transition-all',
          theme === 'dark' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0 absolute',
        )}
      />
      {/* Moon : visible en light (pour passer en dark) */}
      <Moon
        className={cn(
          'h-4 w-4 text-violet-glow transition-all',
          theme === 'light' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0 absolute',
        )}
      />
    </button>
  );
}
