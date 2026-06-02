import { test, expect } from '@playwright/test';

/**
 * Smoke tests vitrine publique — vérifient que les pages clés rendent OK,
 * que le toggle FR/EN fonctionne, et que les fondations SEO sont servies.
 */
test.describe('Vitrine publique Centrium', () => {
  test('home / charge un H1 et le wordmark', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Centrium');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('/plateforme charge avec son metadata', async ({ page }) => {
    await page.goto('/plateforme');
    await expect(page).toHaveTitle(/La plateforme · Centrium/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('/engagements charge avec son metadata', async ({ page }) => {
    await page.goto('/engagements');
    await expect(page).toHaveTitle(/Engagements & sécurité · Centrium/);
  });

  test('/pricing charge avec son metadata + FAQ JSON-LD', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveTitle(/Tarifs sur mesure · Centrium/);
    // Vérifie que le bloc FAQPage JSON-LD est bien dans le head
    const ldFaq = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ldFaq.some((s) => s.includes('"FAQPage"'))).toBeTruthy();
  });

  test('/devis charge le formulaire avec ses champs', async ({ page }) => {
    await page.goto('/devis');
    await expect(page).toHaveTitle(/Demander un devis · Centrium/);
    await expect(page.getByLabel(/nom de la société|company name/i)).toBeVisible();
    await expect(page.getByLabel(/email pro|work email/i)).toBeVisible();
  });

  test('toggle FR → EN change le contenu visible', async ({ page }) => {
    await page.goto('/');
    // Toggle pill desktop : 2 boutons FR / EN
    const enBtn = page.getByRole('button', { name: 'EN' }).first();
    await enBtn.click();
    // Après bascule, un texte en anglais doit apparaître quelque part
    await expect(page.getByText(/Request a demo|See the platform/i).first()).toBeVisible({
      timeout: 3000,
    });
  });

  test('robots.txt référence le sitemap', async ({ page }) => {
    const res = await page.request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('Sitemap:');
    expect(body).toMatch(/centrium-platform\.com\/sitemap\.xml/);
  });

  test('sitemap.xml contient les pages publiques', async ({ page }) => {
    const res = await page.request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('/plateforme');
    expect(body).toContain('/pricing');
    expect(body).toContain('/engagements');
  });

  test('llms.txt présent et bien formé', async ({ page }) => {
    const res = await page.request.get('/llms.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('# Centrium');
    expect(body).toContain('## Pages');
  });

  test('Open Graph image est servie en 200 image/*', async ({ page }) => {
    const res = await page.request.get('/opengraph-image');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/^image\//);
  });
});
