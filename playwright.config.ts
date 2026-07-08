import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Les specs « UI » (utilisant `page`) ont besoin du serveur dev ; les specs
  // « API/RLS » (isolation, consultant, CRA→facture) tapent Supabase en direct
  // et n'en ont pas besoin. PLAYWRIGHT_NO_SERVER=1 désactive le webServer pour
  // les faire tourner en CI sans booter toute l'app.
  webServer: process.env.PLAYWRIGHT_NO_SERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
