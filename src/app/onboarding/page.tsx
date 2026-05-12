'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Building2, Sparkles, MailCheck, ArrowLeft, LogOut } from 'lucide-react';

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

type PendingInvite = {
  token: string;
  organization_id: string;
  organization_name: string;
  role: string;
  email: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const { reload } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(true);

  // Au mount, on vérifie si le user a une invitation non acceptée
  // (a pu être amené ici par erreur après le redirect Supabase /verify
  // si le cookie de session n'était pas encore posé).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/invitations/pending', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { data: PendingInvite | null } | null) => {
        if (cancelled) return;
        if (body?.data) {
          setPendingInvite(body.data);
          // Auto-redirect : si on a une invitation pendante, on va direct
          // sur /invite/accept au lieu de proposer la création d'une org.
          window.location.href = `/invite/accept?token=${body.data.token}`;
          return;
        }
        setCheckingInvite(false);
      })
      .catch(() => {
        if (!cancelled) setCheckingInvite(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      // le /onboarding/setup re-chargera son propre état via son provider.
      void reload().catch(() => undefined);
      // Redirige vers le wizard d'identité visuelle (logo, couleurs,
      // signature, identité légale). Le user peut skip s'il veut.
      router.push('/onboarding/setup');
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

  async function acceptInvite() {
    if (!pendingInvite) return;
    setLoading(true);
    // /invite/accept est un Server Component qui fait l'insert + redirect.
    window.location.href = `/invite/accept?token=${pendingInvite.token}`;
  }

  // Pendant qu'on check l'invitation pendante, on affiche un loader
  // pour éviter un flash du formulaire de création d'org alors qu'on
  // va auto-rediriger vers /invite/accept.
  if (checkingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-violet-glow" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="absolute inset-0 bg-gradient-radial opacity-30 pointer-events-none" />

      {/* Retour vers la home — accessible si l'utilisateur n'a pas encore d'org */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour à l&apos;accueil
      </Link>

      {/* Logout — pour utiliser un autre compte si on est bloqué ici */}
      <form action="/api/auth/logout" method="POST" className="absolute top-6 right-6 z-20">
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition"
        >
          <LogOut className="h-3.5 w-3.5" />
          Se déconnecter
        </button>
      </form>

      <Card className="w-full max-w-md relative">
        {/* Banner invitation détectée — prioritaire sur la création d'org */}
        {pendingInvite && (
          <div className="border-b border-emerald-500/30 bg-emerald-500/[0.06] p-5 rounded-t-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-emerald-500/15 p-2 shrink-0">
                <MailCheck className="h-4 w-4 text-emerald-300" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-emerald-200">
                  Invitation détectée
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Tu as été invité à rejoindre{' '}
                  <strong className="text-foreground">{pendingInvite.organization_name}</strong>{' '}
                  en tant que <strong className="text-foreground">{pendingInvite.role}</strong>.
                  Pas besoin de créer une nouvelle organisation.
                </p>
                <Button
                  size="sm"
                  className="w-full mt-3 bg-emerald-500/80 hover:bg-emerald-500 text-white"
                  onClick={acceptInvite}
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Rejoindre {pendingInvite.organization_name}
                </Button>
              </div>
            </div>
          </div>
        )}

        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-violet-500/10 rounded-full">
              <Building2 className="h-6 w-6 text-violet-300" />
            </div>
          </div>
          <CardTitle className="text-xl font-display">
            {pendingInvite ? 'Ou crée une nouvelle organisation' : 'Crée ton organisation'}
          </CardTitle>
          <CardDescription>
            {pendingInvite ? (
              <>Tu peux aussi créer ta propre ESN si l&apos;invitation ci-dessus ne te concerne pas.</>
            ) : (
              <>
                Une organisation = une ESN. Tu en seras admin.
                <br />
                <span className="text-[11px] text-violet-300/80 inline-flex items-center gap-1 mt-1">
                  <Sparkles className="h-3 w-3" /> 14 jours d&apos;essai gratuit, aucune CB demandée
                </span>
              </>
            )}
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
