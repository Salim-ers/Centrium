# Testing Rules — QuadCore Platform

## Pyramide de tests

- **Unitaires (Vitest)** — `tests/unit/` — logique pure, validators, services mockés
- **Intégration (Vitest + Supabase local)** — `tests/integration/` — services avec vraie DB locale
- **E2E (Playwright)** — `tests/e2e/` — parcours utilisateurs critiques

## Règles

- Chaque service métier (`src/lib/services/*`) doit avoir des tests unitaires
- Chaque validator zod doit avoir au moins 1 cas valide + 1 cas invalide
- Les parcours critiques suivants doivent avoir un test E2E :
  - Login / Logout
  - Création consultant
  - Génération CV QuadCore
  - Création opportunité dans le CRM
  - Création CRA + facture

## Convention de nommage

```
consultant.service.ts
consultant.service.test.ts    ← même dossier ou tests/unit/services/
```

## Pattern AAA

```ts
it('should create a consultant with valid data', async () => {
  // Arrange
  const input = { firstName: 'Jean', lastName: 'Dupont', email: 'j@d.com' };
  
  // Act
  const { data, error } = await consultantService.create(input);
  
  // Assert
  expect(error).toBeNull();
  expect(data?.firstName).toBe('Jean');
});
```

## Mocks

- Mocker Supabase via `vi.mock('@/lib/supabase/client')`
- Ne jamais appeler la vraie DB en tests unitaires
- Tests d'intégration utilisent Supabase local via `npx supabase start`

## Couverture cible

- Services métier : **>80%**
- Validators : **100%**
- Composants UI : **nice to have** (focus sur E2E)
