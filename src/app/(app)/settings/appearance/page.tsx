'use client';

import { Rows3, Rows4, Languages } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppearance, type Density } from '@/hooks/useAppearance';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

function Choice({
  active,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Rows3;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex flex-1 items-start gap-3 rounded-lg border p-4 text-left transition-colors',
        active ? 'border-primary bg-brand-50/50 ring-1 ring-primary' : 'border-border bg-card hover:border-sand-300',
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

export default function AppearancePage() {
  const { density, setDensity } = useAppearance();
  const { locale, setLocale } = useLocale();
  const fr = locale !== 'en';

  const densities: Array<{ value: Density; icon: typeof Rows3; title: string; description: string }> = [
    {
      value: 'normal',
      icon: Rows3,
      title: fr ? 'Confortable' : 'Comfortable',
      description: fr ? 'Espacements standard, recommandé.' : 'Standard spacing, recommended.',
    },
    {
      value: 'compact',
      icon: Rows4,
      title: fr ? 'Compact' : 'Compact',
      description: fr ? 'Plus de lignes visibles à l’écran.' : 'More rows visible on screen.',
    },
  ];

  return (
    <AppShell>
      <PageHeader
        backHref="/settings"
        backLabel={fr ? 'Paramètres' : 'Settings'}
        title={fr ? 'Affichage' : 'Display'}
        description={
          fr
            ? 'Préférences personnelles, enregistrées sur cet appareil.'
            : 'Personal preferences, saved on this device.'
        }
      />
      <div className="grid max-w-3xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{fr ? 'Densité' : 'Density'}</CardTitle>
            <CardDescription>
              {fr ? 'Ajuste l’espacement des listes et des tableaux.' : 'Adjusts spacing in lists and tables.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            {densities.map((d) => (
              <Choice
                key={d.value}
                active={density === d.value}
                onClick={() => setDensity(d.value)}
                icon={d.icon}
                title={d.title}
                description={d.description}
              />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{fr ? 'Langue' : 'Language'}</CardTitle>
            <CardDescription>
              {fr ? 'Langue de l’interface.' : 'Interface language.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Choice
              active={locale === 'fr'}
              onClick={() => setLocale('fr')}
              icon={Languages}
              title="Français"
              description="Interface en français"
            />
            <Choice
              active={locale === 'en'}
              onClick={() => setLocale('en')}
              icon={Languages}
              title="English"
              description="Interface in English"
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
