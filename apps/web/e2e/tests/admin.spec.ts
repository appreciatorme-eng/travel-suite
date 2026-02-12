import { test, expect } from '../fixtures/auth';

test.describe('Admin Dashboard', () => {
  test('admin can access dashboard', async ({ adminPage }) => {
    await adminPage.goto('/admin');

    // Should see dashboard elements
    await expect(adminPage.locator('h1, h2').filter({ hasText: /dashboard|admin/i })).toBeVisible();
  });

  test('admin dashboard shows stats', async ({ adminPage }) => {
    await adminPage.goto('/admin');

    // Should show key metrics
    const statsSection = adminPage.locator('[data-testid="stats"], .stats, .metrics');
    const hasStats = await statsSection.isVisible().catch(() => false);

    if (hasStats) {
      // Check for common stat labels
      await expect(adminPage.locator('text=Trips, text=Clients, text=Drivers')).toBeVisible();
    }
  });

  test('admin navigation works', async ({ adminPage }) => {
    await adminPage.goto('/admin');

    // Test navigation links
    const navLinks = [
      { text: /trips/i, url: /trips/ },
      { text: /drivers/i, url: /drivers/ },
      { text: /clients/i, url: /clients/ },
    ];

    for (const link of navLinks) {
      const navItem = adminPage.locator('nav a, aside a').filter({ hasText: link.text }).first();
      const isVisible = await navItem.isVisible().catch(() => false);

      if (isVisible) {
        await navItem.click();
        await expect(adminPage).toHaveURL(link.url);
        await adminPage.goto('/admin'); // Go back
      }
    }
  });
});

test.describe('Driver Management', () => {
  test('admin can view drivers list', async ({ adminPage }) => {
    await adminPage.goto('/admin/drivers');

    // Should see drivers page
    await expect(adminPage.locator('h1, h2').filter({ hasText: /drivers/i })).toBeVisible();
  });

  test('admin can add new driver', async ({ adminPage }) => {
    await adminPage.goto('/admin/drivers');

    // Click add button
    const addButton = adminPage.locator('button, a').filter({ hasText: /add|new|create/i }).first();
    await addButton.click();

    // Should see form
    await expect(adminPage.locator('form, [data-testid="driver-form"]')).toBeVisible();

    // Fill in driver details
    await adminPage.fill('input[name="full_name"], input[name="name"]', 'Test Driver');
    await adminPage.fill('input[name="phone"]', '+1234567890');

    // Select vehicle type if available
    const vehicleSelect = adminPage.locator('select[name="vehicle_type"]');
    if (await vehicleSelect.isVisible()) {
      await vehicleSelect.selectOption('sedan');
    }

    // Submit
    await adminPage.click('button[type="submit"]');

    // Should show success or redirect to list
    await expect(adminPage.locator('text=success, text=created, text=added').or(
      adminPage.locator('text=Test Driver')
    )).toBeVisible({ timeout: 5000 });
  });

  test('admin can edit driver', async ({ adminPage }) => {
    await adminPage.goto('/admin/drivers');

    // Click edit on first driver
    const editButton = adminPage.locator('button, a').filter({ hasText: /edit/i }).first();
    const hasDriver = await editButton.isVisible().catch(() => false);

    if (hasDriver) {
      await editButton.click();

      // Should see edit form
      await expect(adminPage.locator('form, [data-testid="driver-form"]')).toBeVisible();
    }
  });

  test('admin can toggle driver active status', async ({ adminPage }) => {
    await adminPage.goto('/admin/drivers');

    // Find active toggle
    const toggle = adminPage.locator('input[type="checkbox"], [role="switch"]').first();
    const hasToggle = await toggle.isVisible().catch(() => false);

    if (hasToggle) {
      await toggle.click();

      // Should show status change
      await expect(adminPage.locator('text=updated, text=active, text=inactive')).toBeVisible({
        timeout: 3000,
      });
    }
  });
});

test.describe('Client Management', () => {
  test('admin can view clients list', async ({ adminPage }) => {
    await adminPage.goto('/admin/clients');

    // Should see clients page
    await expect(adminPage.locator('h1, h2').filter({ hasText: /clients/i })).toBeVisible();
  });

  test('admin can search clients', async ({ adminPage }) => {
    await adminPage.goto('/admin/clients');

    // Find search input
    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="search" i]');
    const hasSearch = await searchInput.isVisible().catch(() => false);

    if (hasSearch) {
      await searchInput.fill('test');
      await adminPage.waitForTimeout(500); // Debounce

      // Results should filter
      await expect(adminPage.locator('table, [data-testid="clients-list"]')).toBeVisible();
    }
  });

  test('admin can view client details', async ({ adminPage }) => {
    await adminPage.goto('/admin/clients');

    // Click on first client
    const clientRow = adminPage.locator('tr, [data-testid="client-item"]').first();
    const hasClient = await clientRow.isVisible().catch(() => false);

    if (hasClient) {
      await clientRow.click();

      // Should show client details
      await expect(adminPage.locator('text=email, text=phone, text=trips')).toBeVisible();
    }
  });
});

test.describe('Admin Settings', () => {
  test('admin can access settings', async ({ adminPage }) => {
    await adminPage.goto('/admin/settings');

    // Should see settings page
    await expect(adminPage.locator('h1, h2').filter({ hasText: /settings/i })).toBeVisible();
  });

  test('admin can update organization settings', async ({ adminPage }) => {
    await adminPage.goto('/admin/settings');

    // Find organization name input
    const nameInput = adminPage.locator('input[name="name"], input[name="organization_name"]');
    const hasOrgSettings = await nameInput.isVisible().catch(() => false);

    if (hasOrgSettings) {
      // Update name
      await nameInput.clear();
      await nameInput.fill('Test Organization');

      // Save
      const saveButton = adminPage.locator('button[type="submit"], button').filter({ hasText: /save/i });
      await saveButton.click();

      // Should show success
      await expect(adminPage.locator('text=saved, text=updated, text=success')).toBeVisible({
        timeout: 5000,
      });
    }
  });
});
