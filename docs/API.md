# API Centrium

> Centrium expose des routes HTTP côté Next.js (`src/app/api/**/route.ts`).
> Cette doc liste les routes publiques utiles et résume les patterns
> internes. Pour intégrer Centrium dans votre SI, contactez-nous : une
> API publique avec authentification par clé API arrive en V1.

## Authentification

| Type d'endpoint | Méthode auth |
|---|---|
| Routes internes UI | Cookie session Supabase (httpOnly) |
| Routes admin (`/api/admin/**`) | Cookie + rôle `super_admin` vérifié |
| Routes publiques (`/api/quote-requests`, `/api/cv/extract`) | Aucune (rate-limited par IP) |
| Webhook Stripe (`/api/billing/webhook`) | Signature Stripe |

## Pattern standard

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrg } from '@/lib/auth/guards';

const schema = z.object({ /* … */ });

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();                                  // auth
  const parsed = schema.safeParse(await req.json());               // validation
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  // ... logique métier ...
  return NextResponse.json({ data }, { status: 200 });
}
```

## Codes HTTP

| Code | Quand |
|---|---|
| 200 | OK (GET, PATCH) |
| 201 | Created (POST) |
| 202 | Accepted (action différée — ex: demande suppression RGPD) |
| 204 | No content (DELETE) |
| 400 | Validation échouée |
| 401 | Pas de session |
| 403 | Session OK, rôle insuffisant |
| 404 | Not found |
| 409 | Conflit (duplicate, état invalide) |
| 429 | Trop de requêtes (rate limit) — voir `Retry-After` |
| 500 | Erreur interne |

## Routes publiques

### POST `/api/quote-requests`

Soumettre une demande de devis depuis le formulaire `/devis`.

**Auth** : aucune
**Rate limit** : 5 requêtes / IP / minute

```jsonc
{
  "company_name": "ACME Consulting",                  // requis
  "contact_name": "Jane Doe",                         // requis
  "contact_email": "jane@acme.com",                   // requis
  "industry": "ESN",
  "team_size": "6-15",
  "consultants_count": "10-30",
  "contact_phone": "+33 1 23 45 67 89",
  "contact_role": "Dirigeante",
  "message": "On cherche à structurer notre staffing…",
  "wanted_help": ["cv_template", "brand_colors"],
  "logo_url": "https://…"
}
```

Réponse : `{ "data": { "id": "uuid" } }` (201)

### POST `/api/cv/extract`

Extraction texte d'un CV PDF ou DOCX (multipart/form-data, champ `file`).

**Auth** : aucune (peut être appelé pendant /signup ou /devis)
**Rate limit** : à venir

## Routes utilisateur (auth requise)

### POST `/api/me/export`

Export des données personnelles de l'utilisateur authentifié (RGPD art. 20).

**Auth** : cookie session
Réponse : `application/json` en download (`Content-Disposition: attachment`).

### POST `/api/me/delete-request`

Demande de suppression de compte (RGPD art. 17).

```jsonc
{ "confirm_email": "user@example.com", "reason": "..." }
```

L'email doit correspondre exactement à celui du compte. Action différée
30 jours, journalisée dans `activities`.

## Routes admin

### POST `/api/admin/organizations`

Provisionner une nouvelle organisation cliente (super_admin only).

```jsonc
{
  "name": "ACME Consulting",
  "slug": "acme",
  "admin_email": "jane@acme.com",
  "branding": { "primary_color": "#ec4899", "logo_url": "https://…" },
  "legal": { "siren": "...", "address": "..." },
  "quote_request_id": "uuid-from-quote-requests"
}
```

## Routes webhook

### POST `/api/billing/webhook`

Webhook Stripe (`checkout.session.completed`, `customer.subscription.*`).

**Auth** : signature Stripe (`STRIPE_WEBHOOK_SECRET`)

## Pagination & filtres

Pas encore standardisée — les services utilisent Supabase REST côté client.
À unifier en V1.

## Audit & rate limiting

- Toutes les actions sensibles passent par `logAudit()` → table `activities`.
- Le rate limiting est in-memory aujourd'hui (`src/lib/ratelimit/in-memory.ts`)
  — à migrer vers Upstash Ratelimit en multi-instance prod.
