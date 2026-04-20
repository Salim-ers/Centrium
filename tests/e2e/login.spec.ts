import { test, expect } from '@playwright/test';

test.describe('Parcours critique QuadCore', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { level: 2 })).toContainText('QuadCore');
  });

  test('login page shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page.getByText(/invalide/i).first()).toBeVisible();
  });

  // Nécessite un user de test créé dans Supabase : admin@quadcore.fr / hunter2
  test.skip('full login flow reaches dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@quadcore.fr');
    await page.getByLabel('Mot de passe').fill('hunter2');
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
