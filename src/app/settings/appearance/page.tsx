'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun, Sparkles, Sparkle, CircleOff, LayoutGrid, Rows } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, SectionHeader, AppCard, AppCardBody } from '@/components/app';
import { useAppearance } from '@/hooks/useAppearance';
import { useTheme } from '@/hooks/useTheme';
import { useLocale } from '@/lib/i18n/LocaleProvider';
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
  const { locale } = useLocale();
  const isEn = locale === 'en';
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
        backLabel={isEn ? 'Back to settings' : 'Retour aux paramètres'}
        eyebrow={isEn ? 'Organization' : 'Organisation'}
        title={
          <>
            {isEn ? 'Appearance &' : 'Apparence &'}{' '}
            <span className="qc-italic-accent font-editorial italic">design.</span>
          </>
        }
        description={
          isEn
            ? 'Customize the visual atmosphere of Centrium — theme, animated background intensity and interface density.'
            : "Personnalisez l'ambiance visuelle de Centrium — thème, intensité du fond animé et densité de l'interface."
        }
      />

      <div className="space-y-6">
        {/* Theme */}
        <AppCard>
          <AppCardBody>
            <SectionHeader
              eyebrow={isEn ? 'Mode' : 'Mode'}
              title={isEn ? 'Theme' : 'Thème'}
              description={
                isEn
                  ? 'Dark for the cosmos atmosphere (same elements as the public site), light for a more restful terracotta cream background.'
                  : "Sombre pour l'ambiance cosmos (mêmes éléments que la vitrine), clair pour un fond crème terracotta plus reposant."
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChoiceCard
                active={mounted && theme === 'dark'}
                icon={Moon}
                label={isEn ? 'Dark' : 'Sombre'}
                description={
                  isEn
                    ? 'Deep black background, warp Starfield, pink and violet accents — identical to the public site.'
                    : 'Fond noir profond, Starfield warp, accents rose et violet — identique à la vitrine.'
                }
                onClick={() => setTheme('dark')}
              />
              <ChoiceCard
                active={mounted && theme === 'light'}
                icon={Sun}
                label={isEn ? 'Light' : 'Clair'}
                description={
                  isEn
                    ? 'Cream white, terracotta accents, no colored aura. Ideal in daylight.'
                    : 'Blanc crème, accents terracotta, aucune aura colorée. Idéal en plein jour.'
                }
                onClick={() => setTheme('light')}
              />
            </div>
          </AppCardBody>
        </AppCard>

        {/* Starfield intensity */}
        <AppCard>
          <AppCardBody>
            <SectionHeader
              eyebrow={isEn ? 'Animated background' : 'Fond animé'}
              title={isEn ? 'Starfield intensity' : 'Intensité du Starfield'}
              description={
                isEn
                  ? 'The warp starfield background is only visible in dark mode. If GPU performance is limited or you prefer a uniform background, lower the intensity.'
                  : "Le fond étoilé warp n'est visible qu'en mode sombre. Si la perf GPU est limitée ou que vous préférez un fond uniforme, baissez l'intensité."
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ChoiceCard
                active={starfield === 'off'}
                icon={CircleOff}
                label={isEn ? 'Off' : 'Désactivé'}
                description={
                  isEn
                    ? 'No canvas, uniform black background. Best for battery life and performance.'
                    : 'Aucun canvas, fond noir uniforme. Meilleur pour la batterie et la perf.'
                }
                onClick={() => setStarfield('off')}
              />
              <ChoiceCard
                active={starfield === 'subtle'}
                icon={Sparkle}
                label={isEn ? 'Subtle' : 'Subtil'}
                description={
                  isEn
                    ? '120 stars on desktop / 70 on mobile, reduced speed. A discreet presence.'
                    : '120 étoiles desktop / 70 mobile, vitesse réduite. Présence discrète.'
                }
                onClick={() => setStarfield('subtle')}
              />
              <ChoiceCard
                active={starfield === 'normal'}
                icon={Sparkles}
                label={isEn ? 'Public site' : 'Vitrine'}
                description={
                  isEn
                    ? '420 stars on desktop / 180 on mobile, standard speed. Identical to the public site.'
                    : '420 étoiles desktop / 180 mobile, vitesse standard. Identique à la vitrine.'
                }
                onClick={() => setStarfield('normal')}
              />
            </div>
          </AppCardBody>
        </AppCard>

        {/* Density */}
        <AppCard>
          <AppCardBody>
            <SectionHeader
              eyebrow={isEn ? 'Comfort' : 'Confort'}
              title={isEn ? 'Interface density' : "Densité de l'interface"}
              description={
                isEn
                  ? 'Compact: more information on screen. Comfortable: standard padding, easier to read.'
                  : "Compact : plus d'informations à l'écran. Confortable : padding standard, plus lisible."
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChoiceCard
                active={density === 'compact'}
                icon={Rows}
                label={isEn ? 'Compact' : 'Compact'}
                description={
                  isEn
                    ? 'Reduced spacing, dense view — ideal for wide screens and power users.'
                    : 'Espacements réduits, vue dense — idéal pour les écrans larges et les power users.'
                }
                onClick={() => setDensity('compact')}
              />
              <ChoiceCard
                active={density === 'normal'}
                icon={LayoutGrid}
                label={isEn ? 'Comfortable' : 'Confortable'}
                description={
                  isEn
                    ? 'Standard padding, airy lists. Recommended by default.'
                    : 'Padding standard, listes aérées. Recommandé par défaut.'
                }
                onClick={() => setDensity('normal')}
              />
            </div>
          </AppCardBody>
        </AppCard>

        {/* Note */}
        <AppCard variant="subtle">
          <AppCardBody size="sm">
            <p className="text-[12.5px] text-muted-foreground leading-relaxed">
              {isEn
                ? 'Your preferences are saved locally in this browser and apply immediately, without reloading. To change the logo, brand colors or legal notices, head to '
                : "Vos préférences sont enregistrées localement dans ce navigateur et s'appliquent immédiatement, sans rechargement. Pour modifier le logo, les couleurs de marque ou les mentions légales, rendez-vous dans "}
              <a className="text-magenta hover:underline" href="/settings/branding">{isEn ? 'Visual identity' : 'Identité visuelle'}</a>.
            </p>
          </AppCardBody>
        </AppCard>
      </div>
    </AppShell>
  );
}
