import { test, expect } from '@playwright/test';
import { test as authTest } from '../fixtures/auth';

test.describe('Admin API Auth - Unauthenticated', () => {
  test('blocks admin clients endpoint', async ({ request }) => {
    const res = await request.get('/api/admin/clients');
    expect(res.status()).toBe(401);
  });

  test('blocks admin trips endpoint', async ({ request }) => {
    const res = await request.get('/api/admin/trips');
    expect(res.status()).toBe(401);
  });

  test('blocks admin workflow events endpoint', async ({ request }) => {
    const res = await request.get('/api/admin/workflow/events?limit=10');
    expect(res.status()).toBe(401);
  });

  test('blocks admin contacts endpoint', async ({ request }) => {
    const res = await request.get('/api/admin/contacts');
    expect(res.status()).toBe(401);
  });
});

authTest.describe('Admin API AuthZ - Non-admin users', () => {
  authTest('forbids non-admin access to admin clients endpoint', async ({ clientPage }) => {
    const res = await clientPage.request.get('/api/admin/clients');
    expect(res.status()).toBe(403);
  });

  authTest('forbids non-admin trip creation with cross-org style payload', async ({ clientPage }) => {
    const res = await clientPage.request.post('/api/admin/trips', {
      data: {
        clientId: '00000000-0000-0000-0000-000000000000',
        startDate: '2026-03-01',
        endDate: '2026-03-03',
        itinerary: {
          trip_title: 'Unauthorized test',
          destination: 'N/A',
          duration_days: 2,
          raw_data: { days: [] },
        },
      },
    });

    expect([401, 403]).toContain(res.status());
  });
});
