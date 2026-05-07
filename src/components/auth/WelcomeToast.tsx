'use client';

import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { CentriumMark } from '@/components/brand/CentriumMark';

type WelcomeToastProps = {
  /** Prénom du user, optionnel — on le glisse en gros si présent. */
  firstName?: string | null;
  /** Sous-ligne d'accroche. Défaut : “Ravis de te revoir sur Centrium”. */
  subtitle?: string;
  toastId: string | number;
};

/**
 * Toast custom "Bon retour" affiché à la connexion réussie.
 * Plus stylé que le success Sonner par défaut : carte glassy noire,
 * bordure dégradée violet→magenta, mark Centrium + accroche brand.
 */
function WelcomeToastInner({
  firstName,
  subtitle = 'Ravis de te revoir sur Centrium',
  toastId,
}: WelcomeToastProps) {
  const greeting = firstName ? `Bon retour, ${firstName}` : 'Bon retour';

  return (
    <div
      className="relative w-[360px] max-w-[90vw] rounded-2xl p-[1.5px] shadow-[0_24px_60px_-15px_rgba(225,29,116,0.45)]"
      style={{
        background:
          'linear-gradient(135deg, #8b5cf6 0%, #c026d3 50%, #e11d74 100%)',
      }}
    >
      <div className="rounded-2xl bg-[#0d0e16]/95 backdrop-blur-xl px-5 py-4 flex items-center gap-4 overflow-hidden relative">
        {/* Halo doux violet en fond */}
        <div
          aria-hidden
          className="absolute -left-10 -top-10 h-32 w-32 rounded-full opacity-40 blur-2xl pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(139,92,246,0.55), transparent 70%)',
          }}
        />
        <div
          aria-hidden
          className="absolute -right-12 -bottom-12 h-32 w-32 rounded-full opacity-30 blur-2xl pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(225,29,116,0.55), transparent 70%)',
          }}
        />

        {/* Pastille sparkle */}
        <div className="relative shrink-0">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center"
            style={{
              background:
                'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(225,29,116,0.25))',
              border: '1px solid rgba(139,92,246,0.4)',
            }}
          >
            <Sparkles className="h-5 w-5 text-violet-200" />
          </div>
          <span
            className="absolute -top-1 -right-1 h-3 w-3 rounded-full"
            style={{
              background:
                'radial-gradient(circle, #f5d0fe 0%, #e11d74 70%)',
              boxShadow: '0 0 12px rgba(225,29,116,0.7)',
            }}
          />
        </div>

        <div className="flex-1 min-w-0 relative">
          <div className="text-[13px] font-semibold leading-tight tracking-tight">
            <span className="qc-gradient-text">{greeting}</span>
          </div>
          <p className="text-[11px] text-white/65 mt-0.5 leading-snug">
            {subtitle}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <CentriumMark size="sm" />
            <span className="text-[9px] uppercase tracking-[0.18em] text-white/40">
              Session ouverte
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => toast.dismiss(toastId)}
          className="absolute top-2 right-3 text-white/40 hover:text-white/80 transition text-xs"
          aria-label="Fermer"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/**
 * Helper d'invocation : toastWelcome({ firstName: 'Salim' }).
 * Auto-dismiss à 4s comme un success classique.
 */
export function toastWelcome(opts: { firstName?: string | null } = {}) {
  return toast.custom(
    (id) => <WelcomeToastInner toastId={id} firstName={opts.firstName ?? null} />,
    { duration: 4000 },
  );
}
