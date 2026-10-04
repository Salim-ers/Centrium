'use client';

import * as React from 'react';
import { Sparkles, ArrowUpRight, Info } from 'lucide-react';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { AssistantResponse } from '@/app/api/assistant/route';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Réponse de l'assistant dans la palette de commandes. La réponse est
 * calculée côté serveur sur les données accessibles à l'utilisateur.
 */
export function AssistantAnswer({
  question,
  onNavigate,
}: {
  question: string;
  onNavigate: (href: string) => void;
}) {
  const { locale } = useLocale();
  const fr = locale !== 'en';
  const [state, setState] = React.useState<
    { status: 'loading' } | { status: 'done'; data: AssistantResponse } | { status: 'error'; message: string }
  >({ status: 'loading' });

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, locale: fr ? 'fr' : 'en' }),
    })
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (cancelled) return;
        if (!r.ok || !body?.data) {
          setState({
            status: 'error',
            message: body?.error ?? (fr ? 'Impossible de répondre pour le moment.' : 'Unable to answer right now.'),
          });
          return;
        }
        setState({ status: 'done', data: body.data as AssistantResponse });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', message: fr ? 'Connexion impossible.' : 'Network error.' });
      });
    return () => {
      cancelled = true;
    };
  }, [question, fr]);

  return (
    <div className="max-h-[min(60vh,440px)] overflow-y-auto p-4" aria-live="polite">
      <div className="mb-3 flex items-start gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-brand-100 bg-brand-50 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1 pt-1 text-[13px] text-muted-foreground">{question}</div>
      </div>

      {state.status === 'loading' && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="mt-3 h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {state.status === 'error' && <p className="text-sm text-destructive">{state.message}</p>}

      {state.status === 'done' && (
        <div className="animate-fade-up">
          <p className="text-[14px] leading-relaxed text-foreground">{state.data.answer}</p>
          {state.data.items.length > 0 && (
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
              {state.data.items.map((item, i) => {
                const content = (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-foreground">{item.label}</span>
                      {item.sublabel && (
                        <span className="block truncate text-xs text-muted-foreground">{item.sublabel}</span>
                      )}
                    </span>
                    {item.value && <span className="num shrink-0 text-[13px] text-foreground">{item.value}</span>}
                    {item.href && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  </>
                );
                return (
                  <li key={i}>
                    {item.href ? (
                      <button
                        type="button"
                        onClick={() => onNavigate(item.href!)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted"
                      >
                        {content}
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 px-3 py-2">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {state.data.note && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              {state.data.note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
