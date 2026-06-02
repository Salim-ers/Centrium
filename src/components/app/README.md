# Centrium — primitives app interne

Composants partagés à utiliser dans **toutes les pages connectées** (`src/app/(app)/`, `src/app/dashboard/`, `src/app/consultants/`, etc.) pour garantir la cohérence visuelle avec la vitrine publique.

Source de vérité du design language : ce dossier + `src/app/globals.css` (classes `qc-*`).

## Import

```ts
import {
  PageHeader,
  SectionHeader,
  KPICard,
  AppCard,
  AppCardBody,
  StatusBadge,
  EmptyState,
  DataRow,
} from '@/components/app';
```

## Quand utiliser quoi

| Primitive | Usage |
|---|---|
| `PageHeader` | Tête de page (1 par page). Eyebrow + titre H1 + description + actions à droite. |
| `SectionHeader` | Sous-section H2. Eyebrow + titre + actions. |
| `KPICard` | KPI animé avec halo coloré. 4 par ligne sur dashboard, 2-3 sur listings. |
| `AppCard` | Carte glass générique (default / luminous / subtle). Wrap les sections. |
| `StatusBadge` | Badge statut uniformisé (8 tones). Remplace tous les badges shadcn ad-hoc. |
| `EmptyState` | Liste vide (halo violet + icône + titre éditorial + action). |
| `DataRow` | Ligne de listing (alternative mobile-friendly aux tables HTML). |

## Pattern de page type

```tsx
'use client';

import { Users, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import {
  PageHeader,
  KPICard,
  AppCard,
  AppCardBody,
  SectionHeader,
  StatusBadge,
  EmptyState,
} from '@/components/app';

export default function ConsultantsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Talents"
        title={
          <>
            Bibliothèque{' '}
            <span className="qc-italic-accent font-editorial italic">
              consultants.
            </span>
          </>
        }
        description="Tous vos consultants — actifs, en mission, intercontrat, freelance."
        actions={<Button>Importer CV</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Total" value={42} icon={Users} tone="magenta" />
        <KPICard label="En mission" value={28} icon={TrendingUp} tone="emerald" delta={+5} />
        <KPICard label="Disponibles" value={9} icon={Clock} tone="violet" />
        <KPICard label="Intercontrat" value={5} icon={AlertTriangle} tone="amber" hint="ratio 12%" />
      </div>

      <AppCard tone="magenta">
        <AppCardBody size="md">
          <SectionHeader
            eyebrow="Activité"
            title="Top consultants"
            actions={<Link href="/consultants">Voir tout →</Link>}
          />
          {/* ... contenu ... */}
        </AppCardBody>
      </AppCard>
    </>
  );
}
```

## Mapping statuts métier → StatusBadge tone

| Domaine | Statut | Tone |
|---|---|---|
| Consultants | actif / en mission | `magenta` |
| Consultants | disponible | `success` |
| Consultants | intercontrat | `warning` |
| Consultants | parti / archivé | `neutral` |
| Timesheets | validé | `success` |
| Timesheets | en attente | `warning` |
| Timesheets | refusé | `danger` |
| Timesheets | brouillon | `pending` |
| Invoices | payée | `success` |
| Invoices | envoyée | `info` |
| Invoices | en retard | `danger` (avec `pulse`) |
| Invoices | brouillon | `pending` |
| Invoices | archivée | `neutral` |
| CRM | gagné | `success` |
| CRM | perdu | `danger` |
| CRM | en discussion | `magenta` |
| CRM | proposition | `violet` |

## Règles strictes

- **N'invente jamais** un nouveau pattern visuel quand une primitive existe.
- **Ne modifie pas** les couleurs hard-codées de Tailwind (`text-emerald-400`, etc.) au profit de tones custom ad-hoc — utilise les `tone` props.
- Si tu as besoin d'un nouveau tone (ex: `indigo`, `teal`), ajoute-le dans `KPICard.tsx` ET `AppCard.tsx` ET `StatusBadge.tsx` ensemble, pas isolément.
- **N'utilise pas** `<Card>` shadcn dans l'app interne — utilise `<AppCard>` à la place.
- **Préserve** la logique métier : Supabase fetch, mutations RLS, react-hook-form + zod, server actions.

## Identité typographique

- `font-display` (Space Grotesk) : titres H1/H2 avec `tracking-[-0.03em]` et `font-light`
- `font-editorial italic` + `qc-italic-accent` : mots accentués dans les titres (gradient rose→magenta→violet animé)
- `font-sans` (Inter) : corps de texte
- `font-mono` : valeurs techniques (IDs, codes, références)

## Animations

- Hover sur card interactive : `hover:-translate-y-0.5` + shadow magenta
- KPI value : `AnimatedNumber` framer-motion (compte 0 → valeur)
- Halo radial : `opacity-30 → 80` au hover (transition 500ms)
- `prefers-reduced-motion: reduce` est respecté automatiquement par le système de classes vitrine.
