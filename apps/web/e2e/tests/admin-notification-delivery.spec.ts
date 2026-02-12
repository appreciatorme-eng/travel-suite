import { test, expect } from '../fixtures/auth';
import { test as base } from '@playwright/test';

base.describe('Admin Delivery API Auth', () => {
  base('rejects unauthenticated access to delivery listing', async ({ request }) => {
    const response = await request.get('/api/admin/notifications/delivery?limit=5');
    expect(response.status()).toBe(401);
  });

  base('rejects unauthenticated access to delivery retry', async ({ request }) => {
    const response = await request.post('/api/admin/notifications/delivery/retry', {
      data: { queue_id: '00000000-0000-0000-0000-000000000000' },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe('Admin Delivery API', () => {
  test('admin can read delivery tracking endpoint', async ({ adminPage }) => {
    const response = await adminPage.request.get('/api/admin/notifications/delivery?limit=10&failed_only=true');

    expect(response.status()).toBe(200);
    const payload = await response.json();

    expect(payload).toHaveProperty('rows');
    expect(payload).toHaveProperty('pagination');
    expect(payload).toHaveProperty('summary');
    expect(Array.isArray(payload.rows)).toBeTruthy();
  });

  test('non-admin user is forbidden from delivery tracking endpoint', async ({ clientPage }) => {
    const response = await clientPage.request.get('/api/admin/notifications/delivery?limit=10');
    expect(response.status()).toBe(403);
  });

  test('admin receives validation error for invalid retry request', async ({ adminPage }) => {
    const response = await adminPage.request.post('/api/admin/notifications/delivery/retry', {
      data: { queue_id: '' },
    });

    expect(response.status()).toBe(400);
    const payload = await response.json();
    expect(payload.error).toContain('queue_id');
  });

  test('non-admin user cannot retry queue item', async ({ clientPage }) => {
    const response = await clientPage.request.post('/api/admin/notifications/delivery/retry', {
      data: { queue_id: '00000000-0000-0000-0000-000000000000' },
    });

    expect(response.status()).toBe(403);
  });
});
