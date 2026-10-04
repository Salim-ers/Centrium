'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type Props = {
  children: ReactNode;
  /** Appelé quand l'utilisateur clique "Réinitialiser l'édition". */
  onReset?: () => void;
};

type State = {
  error: Error | null;
  errorInfo: string | null;
};

/**
 * Error Boundary qui isole les exceptions du preview CV.
 *
 * Sans ça, une erreur dans un sous-composant (EditableDate, Editable, etc.)
 * fait crasher TOUTE la page cv-optimizer avec "Application error: a
 * client-side exception has occurred". L'utilisateur perd le bouton
 * "Reset overrides" et doit recharger manuellement.
 *
 * Avec ça : on contient l'erreur dans la zone preview, on affiche un
 * message clair + bouton de récupération, le reste de la page (sélection
 * consultant, controls) reste fonctionnel.
 */
export class CVPreviewBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, errorInfo: error.message };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[CVPreviewBoundary] rendering error', error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-6 text-sm">
          <div className="flex items-start gap-3 mb-3">
            <div className="rounded-md bg-destructive/15 p-2 text-destructive shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-destructive">
                Erreur d'affichage du CV
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Une modification a déclenché une exception. Le CV n'est plus rendu pour
                éviter de bloquer toute la page.
              </p>
              {this.state.errorInfo && (
                <details className="mt-3 text-[11px] text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">
                    Détails techniques
                  </summary>
                  <pre className="mt-2 p-2 rounded bg-foreground/30 overflow-auto font-mono">
                    {this.state.errorInfo}
                  </pre>
                </details>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition text-xs font-medium"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Réinitialiser & ré-afficher
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md hover-surface border border-hairline transition text-xs"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
