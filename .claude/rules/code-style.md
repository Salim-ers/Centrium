# Code Style — QuadCore Platform

## TypeScript

- **Strict mode activé** dans `tsconfig.json`
- Préférer `type` à `interface` sauf pour étendre une interface externe
- Types exportés dans `src/types/` ou co-localisés si spécifiques au composant
- `unknown` > `any` systématiquement

```ts
// ✅ Bon
type Consultant = {
  id: string;
  firstName: string;
  skills: Skill[];
};

// ❌ Mauvais
interface ConsultantI {
  id: any;
  firstName: any;
}
```

## React / Next.js

- **Server Components par défaut**. `'use client'` seulement si :
  - Hooks (useState, useEffect, …)
  - Event handlers (onClick, onChange)
  - Browser APIs (window, localStorage)

- **Pas de `index.tsx`** pour les composants nommés (préférer `Consultant.tsx`)
- **Props destructurées** en entrée de fonction avec type explicite
- **Éviter les re-renders** : `useMemo`, `useCallback` quand pertinent (pas systématique)

## Styling

- **Tailwind CSS** uniquement. Pas de CSS modules sauf cas très spécifique (print CSS).
- **Classes ordonnées** : layout → spacing → typography → color → effects
- **Variants** via `cva` (class-variance-authority) pour composants multi-états
- **Dark mode** par défaut via classe `dark` sur `<html>`

## Fichiers

- Un composant = un fichier
- Extension `.tsx` pour composants React, `.ts` pour logique pure
- Nommage de route Next.js : kebab-case (`cv-optimizer`)
- Nommage composant : PascalCase (`ConsultantCard.tsx`)

## Imports

```ts
// 1. React / Next
import { useState } from 'react';
import Link from 'next/link';

// 2. Librairies externes
import { z } from 'zod';
import { Button } from '@/components/ui/button';

// 3. Internes (alias @/)
import { consultantService } from '@/lib/services/consultant.service';
import type { Consultant } from '@/types/consultant';

// 4. Relatifs
import { ConsultantAvatar } from './ConsultantAvatar';
```

## Erreurs

- Toujours `try/catch` sur les appels async I/O
- Retourner un objet `{ data, error }` depuis les services métier
- `toast.error()` côté UI pour feedback utilisateur

## Logs

- `console.log` interdit en production — utiliser `logger.info/warn/error`
- Pas de log de données sensibles (mots de passe, tokens, PII complet)
