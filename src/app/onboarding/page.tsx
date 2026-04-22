'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Building2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { organizationSchema, type OrganizationInput } from '@/lib/validators';
import { useOrganization } from '@/lib/auth/context';

export default function OnboardingPage() {
  const router = useRouter();
  const { reload } = useOrganization();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrganizationInput>({
    resolver: zodResolver(organizationSchema),
  });

  const name = watch('name');

  // Auto-slug : "Mon ESN SA" → "mon-esn-sa"
  function generateSlug(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  async function onSubmit(values: OrganizationInput) {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch('/api/orgs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.message ?? 'Création impossible');
        setLoading(false);
        return;
      }
      toast.success('Organisation créée 🎉');
      // Ne pas bloquer la navigation sur reload() — si le contexte stall,
      // le /dashboard re-chargera son propre état via son provider.
      void reload().catch(() => undefined);
      router.push('/dashboard');
      router.refresh();
    } catch (e) {
      clearTimeout(timeoutId);
      if ((e as Error).name === 'AbortError') {
        toast.error('Délai dépassé — réessaie dans un instant');
      } else {
        toast.error('Erreur réseau');
      }
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight-300 p-6">
      <div className="absolute inset-0 bg-gradient-radial opacity-30 pointer-events-none" />
      <Card className="w-full max-w-md relative">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-violet-500/10 rounded-full">
              <Building2 className="h-6 w-6 text-violet-300" />
            </div>
          </div>
          <CardTitle className="text-xl font-display">Crée ton organisation</CardTitle>
          <CardDescription>
            Une organisation = une ESN. Tu en seras admin.
            <br />
            <span className="text-[11px] text-violet-300/80 inline-flex items-center gap-1 mt-1">
              <Sparkles className="h-3 w-3" /> 14 jours d&apos;essai gratuit, aucune CB demandée
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom de l&apos;organisation</Label>
              <Input
                id="name"
                placeholder="Mon ESN SA"
                {...register('name', {
                  onChange: (e) => {
                    const v = e.target.value;
                    setValue('slug', generateSlug(v), { shouldValidate: true });
                  },
                })}
              />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Identifiant (URL)</Label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">quadcore.app/</span>
                <Input id="slug" {...register('slug')} />
              </div>
              {errors.slug && <p className="text-xs text-red-400">{errors.slug.message}</p>}
              <p className="text-[10px] text-muted-foreground">
                Auto-généré depuis le nom, modifiable.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="city">Ville (optionnel)</Label>
                <Input id="city" placeholder="Paris" {...register('city')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="siren">SIREN (optionnel)</Label>
                <Input id="siren" placeholder="123456789" {...register('siren')} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !name}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer l&apos;organisation
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
