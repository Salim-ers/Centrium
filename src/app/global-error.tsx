'use client';

import { useEffect } from 'react';

/**
 * Garde-fou de dernier recours : si la racine de l'app throw (avant
 * même que le layout puisse se monter), Next remplace l'arbre par ce
 * composant. On garde du HTML autonome pour ne pas dépendre du
 * <html>/<body> de RootLayout (sinon double balisage = warning).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global error boundary]', error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          minHeight: '100vh',
          background: '#0b0b15',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          margin: 0,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#fcd34d',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              marginBottom: 24,
            }}
          >
            !
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            Erreur critique
          </h1>
          <p style={{ marginTop: 12, opacity: 0.75, fontSize: 14, lineHeight: 1.6 }}>
            L&apos;application n&apos;a pas pu se monter. Réessaie — si le problème
            persiste, recharge la page.
          </p>
          {error.digest && (
            <p style={{ marginTop: 12, fontSize: 11, opacity: 0.5, fontFamily: 'monospace' }}>
              ref · {error.digest}
            </p>
          )}
          <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                padding: '10px 18px',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Réessayer
            </button>
            <a
              href="/dashboard"
              style={{
                background: 'transparent',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '10px 18px',
                borderRadius: 8,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
