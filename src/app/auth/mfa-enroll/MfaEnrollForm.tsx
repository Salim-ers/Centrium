'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { Loader2, Copy, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type EnrolledFactor = {
  factor_id: string;
  qr_code: string; // data:image/svg+xml;utf-8,...
  secret: string;
};

export function MfaEnrollForm({ next }: { next: string }) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const router = useRouter();
  const [factor, setFactor] = useState<EnrolledFactor | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [enrolling, setEnrolling] = useState(true);
  const [copied, setCopied] = useState(false);

  // Lance l'enrôlement au mount (génère le QR code Supabase)
  useEffect(() => {
    let cancelled = false;
    async function enroll() {
      try {
        const res = await fetch('/api/auth/mfa/enroll', { method: 'POST' });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? (isEn ? 'Failed to generate the QR code.' : 'Échec de la génération du QR code.'));
          return;
        }
        setFactor(json.data);
      } catch {
        if (!cancelled) setError(isEn ? 'Network error. Please reload the page.' : 'Erreur réseau. Rechargez la page.');
      } finally {
        if (!cancelled) setEnrolling(false);
      }
    }
    enroll();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCopySecret() {
    if (!factor) return;
    try {
      await navigator.clipboard.writeText(factor.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(isEn ? 'Unable to copy' : 'Impossible de copier');
    }
  }

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factor) return;
    setError(null);

    const trimmed = code.replace(/\D/g, '');
    if (trimmed.length !== 6) {
      setError(isEn ? 'The code must contain 6 digits.' : 'Le code doit contenir 6 chiffres.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/mfa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ factor_id: factor.factor_id, code: trimmed }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.message ?? json.error ?? (isEn ? 'Invalid code.' : 'Code invalide.'));
          return;
        }
        toast.success(isEn ? 'MFA enabled' : 'MFA activé');
        router.push(next);
        router.refresh();
      } catch {
        setError(isEn ? 'Network error. Please try again.' : 'Erreur réseau. Réessayez.');
      }
    });
  }

  if (enrolling) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        {isEn ? 'Generating the QR code…' : 'Génération du QR code…'}
      </div>
    );
  }

  if (!factor) {
    return (
      <p className="text-sm text-rose-400">
        {error ?? (isEn ? 'Unable to generate the QR code. Please reload the page.' : 'Impossible de générer le QR code. Rechargez la page.')}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Étape 1 : scan QR */}
      <div>
        <h2 className="text-sm font-semibold mb-2">{isEn ? '1. Scan the QR code' : '1. Scannez le QR code'}</h2>
        <div className="rounded-lg bg-white p-4 inline-block">
          <Image
            src={factor.qr_code}
            alt="QR code TOTP"
            width={180}
            height={180}
            unoptimized
          />
        </div>
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-1">{isEn ? 'Or enter manually (secret):' : 'Ou saisie manuelle (secret) :'}</p>
          <button
            type="button"
            onClick={handleCopySecret}
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-mono hover:bg-white/[0.06] transition"
          >
            {factor.secret}
            {copied ? (
              <Check className="h-3 w-3 text-emerald-300" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

      {/* Étape 2 : saisir code */}
      <form onSubmit={handleVerify} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="enroll-code">
            {isEn
              ? '2. Enter the 6-digit code shown in your app'
              : '2. Entrez le code à 6 chiffres affiché dans votre app'}
          </Label>
          <Input
            id="enroll-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            autoFocus
            className="text-center text-2xl tracking-[0.4em] font-mono"
            disabled={pending}
          />
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        <Button type="submit" disabled={pending || code.length !== 6} className="w-full">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEn ? 'Enabling…' : 'Activation…'}
            </>
          ) : (
            isEn ? 'Enable MFA' : 'Activer le MFA'
          )}
        </Button>
      </form>
    </div>
  );
}
