import { createHmac } from 'node:crypto';
import { test, expect } from '@playwright/test';

test.describe('WhatsApp Webhook Security', () => {
  test('rejects unsigned webhook payload in strict mode', async ({ request }) => {
    test.skip(process.env.WHATSAPP_ALLOW_UNSIGNED_WEBHOOK === 'true', 'Unsigned mode explicitly enabled');

    const res = await request.fetch('/api/whatsapp/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({ entry: [] }),
    });

    expect(res.status()).toBe(401);
  });

  test('accepts correctly signed webhook payload when app secret is configured', async ({ request }) => {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    test.skip(!appSecret, 'WHATSAPP_APP_SECRET is not configured in test environment');

    const body = JSON.stringify({ entry: [] });
    const signature = createHmac('sha256', appSecret!).update(body).digest('hex');

    const res = await request.fetch('/api/whatsapp/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': `sha256=${signature}`,
      },
      data: body,
    });

    expect(res.status()).toBe(200);
  });
});
