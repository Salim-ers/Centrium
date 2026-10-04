import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }));

const { assertSafeWebhookUrl, generateWebhookSecret, signPayload } = await import('@/lib/integrations/webhook');

describe('webhooks sortants', () => {
  it('signe le corps avec HMAC-SHA256 sur « timestamp.corps »', () => {
    const body = '{"type":"ping"}';
    const expected = createHmac('sha256', 'whsec_test').update(`1700000000.${body}`).digest('hex');
    expect(signPayload('whsec_test', 1700000000, body)).toBe(expected);
  });

  it('génère des secrets uniques et préfixés', () => {
    const a = generateWebhookSecret();
    const b = generateWebhookSecret();
    expect(a).toMatch(/^whsec_[A-Za-z0-9_-]{32}$/);
    expect(a).not.toBe(b);
  });

  it('refuse HTTP, les identifiants et les adresses privées', async () => {
    await expect(assertSafeWebhookUrl('http://example.com/hook')).rejects.toThrow(/HTTPS/);
    await expect(assertSafeWebhookUrl('https://user:pass@example.com/hook')).rejects.toThrow(/Identifiants/);
    await expect(assertSafeWebhookUrl('https://localhost/hook')).rejects.toThrow(/locale/);
    await expect(assertSafeWebhookUrl('https://127.0.0.1/hook')).rejects.toThrow(/privée/);
    await expect(assertSafeWebhookUrl('https://10.1.2.3/hook')).rejects.toThrow(/privée/);
    await expect(assertSafeWebhookUrl('https://169.254.169.254/latest')).rejects.toThrow(/privée/);
    await expect(assertSafeWebhookUrl('https://[::1]/hook')).rejects.toThrow(/privée/);
    await expect(assertSafeWebhookUrl('pas une url')).rejects.toThrow(/invalide/);
  });

  it('accepte une adresse IP publique en HTTPS', async () => {
    await expect(assertSafeWebhookUrl('https://1.1.1.1/hook')).resolves.toBeInstanceOf(URL);
  });
});
