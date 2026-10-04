'use client';

import { X } from 'lucide-react';
import { toast } from 'sonner';

import { CentriumLogo } from '@/components/brand/CentriumLogo';

type WelcomeToastProps = {
  /** Prénom du user, optionnel. */
  firstName?: string | null;
  /** Sous-ligne d'accroche. */
  subtitle?: string;
  toastId: string | number;
};

/** Toast « Bon retour » affiché à la connexion réussie (carte sobre, identité Centrium). */
function WelcomeToastInner({ firstName, subtitle = 'Ravi de vous revoir sur Centrium', toastId }: WelcomeToastProps) {
  const greeting = firstName ? `Bon retour, ${firstName}` : 'Bon retour';
  return (
    <div className="relative flex w-[340px] max-w-[90vw] items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-md">
      <CentriumLogo className="h-9 w-9 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold">{greeting}</div>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={() => toast.dismiss(toastId)}
        className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Fermer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Helper d'invocation : toastWelcome({ firstName: 'Salim' }). Auto-dismiss à 4 s. */
export function toastWelcome(opts: { firstName?: string | null } = {}) {
  return toast.custom((id) => <WelcomeToastInner toastId={id} firstName={opts.firstName ?? null} />, { duration: 4000 });
}
