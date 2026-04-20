# API Conventions — QuadCore Platform

## Route Handlers Next.js

Chemin : `src/app/api/**/route.ts`

### Structure standard

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const bodySchema = z.object({ /* … */ });

export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Validation
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // 3. Business logic (via service)
  const { data, error } = await consultantService.create(parsed.data, user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 4. Response
  return NextResponse.json({ data }, { status: 201 });
}
```

## Codes HTTP

- `200` OK (GET, PATCH, PUT)
- `201` Created (POST)
- `204` No Content (DELETE réussi)
- `400` Bad Request (validation échouée)
- `401` Unauthorized (pas de session)
- `403` Forbidden (session OK mais pas les droits)
- `404` Not Found
- `409` Conflict (duplicate)
- `500` Internal Server Error

## Format réponse

```json
// Succès
{ "data": { ... } }

// Erreur
{ "error": "Message lisible", "details": { ... } }
```

## Nommage routes

- REST-ish :
  - `GET  /api/consultants`              → liste
  - `POST /api/consultants`              → créer
  - `GET  /api/consultants/:id`          → détail
  - `PATCH /api/consultants/:id`         → update partiel
  - `DELETE /api/consultants/:id`        → supprimer

- Actions spécifiques :
  - `POST /api/consultants/:id/generate-cv` → action métier

## Supabase direct vs Route Handler

- **Supabase direct depuis le client** si la logique est simple et RLS protège correctement
- **Route Handler** si :
  - Logique métier complexe
  - Appel à service externe (LLM, email, PDF)
  - Opération transactionnelle multi-tables
  - Besoin du `service_role` key
