'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function MfaChallengeForm({
  factorId,
  next,
}: {
  factorId: string;
  next: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = code.replace(/\D/g, '');
    if (trimmed.length !== 6) {
      setError('Le code doit contenir 6 chiffres.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/mfa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ factor_id: factorId, code: trimmed }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.message ?? json.error ?? 'Code invalide.');
          return;
        }
        toast.success('MFA validé');
        router.push(next);
        router.refresh();
      } catch {
        setError('Erreur réseau. Réessayez.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="mfa-code">Code à 6 chiffres</Label>
        <Input
          id="mfa-code"
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
            Validation…
          </>
        ) : (
          'Valider'
        )}
      </Button>
    </form>
  );
}
