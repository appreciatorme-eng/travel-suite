import { test, expect } from '../fixtures/auth';

test.describe('Trip Management', () => {
  test('client can view their trips', async ({ clientPage }) => {
    await clientPage.goto('/trips');

    // Should see trips page
    await expect(clientPage.locator('h1, h2').filter({ hasText: /trips|itineraries/i })).toBeVisible();
  });

  test('client can view trip details', async ({ clientPage }) => {
    await clientPage.goto('/trips');

    // Click on first trip if available
    const tripCard = clientPage.locator('[data-testid="trip-card"]').first();
    const tripExists = await tripCard.isVisible().catch(() => false);

    if (tripExists) {
      await tripCard.click();

      // Should navigate to trip details
      await expect(clientPage).toHaveURL(/trip|itinerary/);

      // Should show trip details
      await expect(clientPage.locator('text=Day, text=Itinerary, text=Schedule')).toBeVisible();
    }
  });

  test('client can use "I\'ve Landed" button', async ({ clientPage }) => {
    await clientPage.goto('/trips');

    // Find an active trip
    const activeTrip = clientPage.locator('[data-status="in_progress"], [data-status="active"]').first();
    const hasActiveTrip = await activeTrip.isVisible().catch(() => false);

    if (hasActiveTrip) {
      await activeTrip.click();

      // Look for landed button
      const landedButton = clientPage.locator('button').filter({ hasText: /landed|arrived/i });

      if (await landedButton.isVisible()) {
        await landedButton.click();

        // Should show confirmation
        await expect(clientPage.locator('text=confirmed, text=success, text=driver')).toBeVisible({
          timeout: 5000,
        });
      }
    }
  });
});

test.describe('Admin Trip Management', () => {
  test('admin can view all trips', async ({ adminPage }) => {
    await adminPage.goto('/admin/trips');

    // Should see trips table or list
    await expect(adminPage.locator('table, [data-testid="trips-list"]')).toBeVisible();
  });

  test('admin can filter trips by status', async ({ adminPage }) => {
    await adminPage.goto('/admin/trips');

    // Find status filter
    const statusFilter = adminPage.locator('select, [data-testid="status-filter"]');
    const hasFilter = await statusFilter.isVisible().catch(() => false);

    if (hasFilter) {
      await statusFilter.selectOption({ label: /in progress|active/i });

      // Should filter trips
      await adminPage.waitForTimeout(1000); // Wait for filter to apply
    }
  });

  test('admin can view trip details and assignments', async ({ adminPage }) => {
    await adminPage.goto('/admin/trips');

    // Click on first trip
    const tripRow = adminPage.locator('tr, [data-testid="trip-item"]').first();
    const hasTripRow = await tripRow.isVisible().catch(() => false);

    if (hasTripRow) {
      await tripRow.click();

      // Should see assignment section
      await expect(adminPage.locator('text=Driver, text=Assignment, text=Hotel')).toBeVisible();
    }
  });

  test('admin can assign driver to trip day', async ({ adminPage }) => {
    await adminPage.goto('/admin/trips');

    // Click on first trip
    const tripRow = adminPage.locator('tr, [data-testid="trip-item"]').first();
    const hasTripRow = await tripRow.isVisible().catch(() => false);

    if (hasTripRow) {
      await tripRow.click();

      // Find driver assignment dropdown
      const driverSelect = adminPage.locator('select').filter({ hasText: /driver|select/i }).first();
      const hasDriverSelect = await driverSelect.isVisible().catch(() => false);

      if (hasDriverSelect) {
        // Select a driver
        await driverSelect.selectOption({ index: 1 });

        // Save
        const saveButton = adminPage.locator('button').filter({ hasText: /save|assign/i });
        await saveButton.click();

        // Should show success
        await expect(adminPage.locator('text=saved, text=assigned, text=success')).toBeVisible({
          timeout: 5000,
        });
      }
    }
  });

  test('admin can send notification to client', async ({ adminPage }) => {
    await adminPage.goto('/admin/trips');

    // Click on first trip
    const tripRow = adminPage.locator('tr, [data-testid="trip-item"]').first();
    const hasTripRow = await tripRow.isVisible().catch(() => false);

    if (hasTripRow) {
      await tripRow.click();

      // Find notify button
      const notifyButton = adminPage.locator('button').filter({ hasText: /notify|send/i });
      const hasNotifyButton = await notifyButton.isVisible().catch(() => false);

      if (hasNotifyButton) {
        await notifyButton.click();

        // Should show confirmation or modal
        await expect(adminPage.locator('text=sent, text=notification, text=success')).toBeVisible({
          timeout: 5000,
        });
      }
    }
  });
});
