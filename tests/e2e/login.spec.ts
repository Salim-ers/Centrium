import { test, expect } from '@playwright/test';

test.describe('Parcours d\'auth Centrium', () => {
  test('home publique charge avec le wordmark Centrium', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Centrium');
    // Wordmark présent quelque part dans le header (visible sur desktop) ou
    // dans la version mobile burger ; on cherche le aria-label.
    await expect(page.getByLabel(/Centrium/i).first()).toBeVisible();
  });

  test('/dashboard sans session redirige vers /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('page /login affiche le titre Bon retour et le toggle FR/EN', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Connexion · Centrium/);
    await expect(page.getByRole('heading', { name: /bon retour|welcome back/i })).toBeVisible();
    // Toggle FR/EN visible en haut à droite
    await expect(page.getByRole('group', { name: /langue|language/i })).toBeVisible();
  });

  test('login refuse les credentials vides avec un toast d\'erreur', async ({ page }) => {
    await page.goto('/login');
    // Le bouton submit fait par défaut une validation client (zod)
    const submitButton = page.getByRole('button', { name: /se connecter|sign in/i });
    await submitButton.click();
    // Soit message inline (zod), soit toast — on accepte les deux
    const visibleError = page.getByText(/invalide|requis|incorrect|invalid|required/i).first();
    await expect(visibleError).toBeVisible({ timeout: 3000 });
  });

  // Nécessite un user de test seedé : à activer en CI quand le seed sera en place
  test.skip('flow login complet → /dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@centrium-platform.com');
    await page.getByLabel(/mot de passe|password/i).fill('hunter2');
    await page.getByRole('button', { name: /se connecter|sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
