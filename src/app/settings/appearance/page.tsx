'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun, Sparkles, Sparkle, CircleOff, LayoutGrid, Rows } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, SectionHeader, AppCard, AppCardBody } from '@/components/app';
import { useAppearance } from '@/hooks/useAppearance';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

/** Helper visuel pour les choix radio de cette page : carte cliquable
 *  avec icône + label + description, état actif marqué via bordure +
 *  bg accent. */
function ChoiceCard({
  active,
  icon: Icon,
  label,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group text-left p-4 rounded-2xl border transition-all',
        active
          ? 'border-magenta/40 bg-magenta/[0.08] shadow-[0_8px_30px_-12px_rgba(178,58,38,0.25)]'
          : 'border-hairline bg-card/40 hover:border-magenta/25 hover:bg-card/60',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-2 rounded-xl border',
            active
              ? 'border-magenta/40 bg-magenta/15 text-magenta-neon'
              : 'border-hairline text-muted-foreground group-hover:text-foreground',
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm text-foreground">{label}</div>
          <div className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed">
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function AppearancePage() {
  const { starfield, density, setStarfield, setDensity } = useAppearance();
  const theme = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function setTheme(t: 'dark' | 'light') {
    document.documentElement.classList.toggle('dark', t === 'dark');
    try {
      window.localStorage.setItem('centrium-theme', t);
    } catch {
      /* incognito strict */
    }
  }

  return (
    <AppShell>
      <PageHeader
        backHref="/settings"
        backLabel="Retour aux paramètres"
        eyebrow="Organisation"
        title={
          <>
            Apparence &{' '}
            <span className="qc-italic-accent font-editorial italic">design.</span>
          </>
        }
        description="Personnalisez l'ambiance visuelle de Centrium — thème, intensité du fond animé et densité de l'interface."
      />

      <div className="space-y-6">
        {/* Theme */}
        <AppCard>
          <AppCardBody>
            <SectionHeader
              eyebrow="Mode"
              title="Thème"
              description="Sombre pour l'ambiance cosmos (mêmes éléments que la vitrine), clair pour un fond crème terracotta plus reposant."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChoiceCard
                active={mounted && theme === 'dark'}
                icon={Moon}
                label="Sombre"
                description="Fond noir profond, Starfield warp, accents rose et violet — identique à la vitrine."
                onClick={() => setTheme('dark')}
              />
              <ChoiceCard
                active={mounted && theme === 'light'}
                icon={Sun}
                label="Clair"
                description="Blanc crème, accents terracotta, aucune aura colorée. Idéal en plein jour."
                onClick={() => setTheme('light')}
              />
            </div>
          </AppCardBody>
        </AppCard>

        {/* Starfield intensity */}
        <AppCard>
          <AppCardBody>
            <SectionHeader
              eyebrow="Fond animé"
              title="Intensité du Starfield"
              description="Le fond étoilé warp n'est visible qu'en mode sombre. Si la perf GPU est limitée ou que vous préférez un fond uniforme, baissez l'intensité."
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ChoiceCard
                active={starfield === 'off'}
                icon={CircleOff}
                label="Désactivé"
                description="Aucun canvas, fond noir uniforme. Meilleur pour la batterie et la perf."
                onClick={() => setStarfield('off')}
              />
              <ChoiceCard
                active={starfield === 'subtle'}
                icon={Sparkle}
                label="Subtil"
                description="120 étoiles desktop / 70 mobile, vitesse réduite. Présence discrète."
                onClick={() => setStarfield('subtle')}
              />
              <ChoiceCard
                active={starfield === 'normal'}
                icon={Sparkles}
                label="Vitrine"
                description="420 étoiles desktop / 180 mobile, vitesse standard. Identique à la vitrine."
                onClick={() => setStarfield('normal')}
              />
            </div>
          </AppCardBody>
        </AppCard>

        {/* Density */}
        <AppCard>
          <AppCardBody>
            <SectionHeader
              eyebrow="Confort"
              title="Densité de l'interface"
              description="Compact : plus d'informations à l'écran. Confortable : padding standard, plus lisible."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChoiceCard
                active={density === 'compact'}
                icon={Rows}
                label="Compact"
                description="Espacements réduits, vue dense — idéal pour les écrans larges et les power users."
                onClick={() => setDensity('compact')}
              />
              <ChoiceCard
                active={density === 'normal'}
                icon={LayoutGrid}
                label="Confortable"
                description="Padding standard, listes aérées. Recommandé par défaut."
                onClick={() => setDensity('normal')}
              />
            </div>
          </AppCardBody>
        </AppCard>

        {/* Note */}
        <AppCard variant="subtle">
          <AppCardBody size="sm">
            <p className="text-[12.5px] text-muted-foreground leading-relaxed">
              Vos préférences sont enregistrées localement dans ce navigateur et
              s'appliquent immédiatement, sans rechargement. Pour modifier le
              logo, les couleurs de marque ou les mentions légales, rendez-vous
              dans <a className="text-magenta hover:underline" href="/settings/branding">Identité visuelle</a>.
            </p>
          </AppCardBody>
        </AppCard>
      </div>
    </AppShell>
  );
}
