'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';

import { markSessionActive } from '@/hooks/useSessionPresence';
import type { DemoKind } from '@/lib/demo/config';

const TITLE: Record<DemoKind, string> = { esn: 'Démo ESN', consultant: 'Démo Consultant' };

/**
 * Lien direct vers un espace de démonstration (/demo/esn, /demo/consultant).
 * La session s'ouvre côté navigateur, après affichage : un robot qui
 * prévisualise le lien (messagerie, e-mail) n'ouvre rien. Si un vrai compte
 * est connecté, on demande confirmation avant de le remplacer.
 */
export function DemoLauncher({ kind, signedInAs }: { kind: DemoKind; signedInAs?: string | null }) {
  const [state, setState] = useState<'confirm' | 'opening' | 'error'>(signedInAs ? 'confirm' : 'opening');
  const [message, setMessage] = useState<string | null>(null);
  const started = useRef(false);

  async function open() {
    setState('opening');
    try {
      const res = await fetch('/api/demo/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ as: kind }),
      });
      const body = (await res.json().catch(() => ({}))) as { data?: { redirect?: string }; message?: string };
      if (!res.ok || !body.data?.redirect) {
        setMessage(body.message ?? 'La démo est momentanément indisponible. Réessayez dans un instant.');
        setState('error');
        return;
      }
      markSessionActive();
      window.location.replace(body.data.redirect);
    } catch {
      setMessage('Connexion impossible. Vérifiez votre réseau puis réessayez.');
      setState('error');
    }
  }

  useEffect(() => {
    if (signedInAs || started.current) return;
    started.current = true;
    void open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'confirm') {
    return (
      <div className="space-y-5">
        <p className="text-[16px]">
          Vous êtes connecté en tant que <strong>{signedInAs}</strong>. Ouvrir la {TITLE[kind].toLowerCase()} fermera cette session.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void open()}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-terra px-6 text-[13px] font-semibold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90"
          >
            Ouvrir la {TITLE[kind].toLowerCase()}
            <ArrowRight className="h-4 w-4" />
          </button>
          <Link href="/dashboard" className="inline-flex h-12 items-center rounded-full px-6 text-[13px] font-semibold uppercase tracking-[0.14em] text-ink ring-1 ring-ink/15 hover:bg-ink/[0.04]">
            Revenir à mon espace
          </Link>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="space-y-5">
        <p role="alert" className="text-[16px] text-terra-deep">
          {message}
        </p>
        <button
          type="button"
          onClick={() => void open()}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-terra px-6 text-[13px] font-semibold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <p className="flex items-center gap-3 text-[16px] text-ink-soft/80" aria-live="polite">
      <Loader2 className="h-5 w-5 animate-spin text-terra" />
      Ouverture de la {TITLE[kind].toLowerCase()}…
    </p>
  );
}
