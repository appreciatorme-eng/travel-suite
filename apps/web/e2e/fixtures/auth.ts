import { test as base, expect, Page } from '@playwright/test';

// Test user credentials (use test accounts in your Supabase)
const TEST_USERS = {
  client: {
    email: process.env.TEST_CLIENT_EMAIL || 'test-client@gobuddy.test',
    password: process.env.TEST_CLIENT_PASSWORD || 'testpassword123',
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'test-admin@gobuddy.test',
    password: process.env.TEST_ADMIN_PASSWORD || 'testpassword123',
  },
  driver: {
    email: process.env.TEST_DRIVER_EMAIL || 'test-driver@gobuddy.test',
    password: process.env.TEST_DRIVER_PASSWORD || 'testpassword123',
  },
};

// Extend base test with authentication fixtures
export const test = base.extend<{
  authenticatedPage: Page;
  adminPage: Page;
  clientPage: Page;
}>({
  // Generic authenticated page (client role)
  authenticatedPage: async ({ page }, runFixture) => {
    await loginAs(page, 'client');
    await runFixture(page);
  },

  // Admin authenticated page
  adminPage: async ({ page }, runFixture) => {
    await loginAs(page, 'admin');
    await runFixture(page);
  },

  // Client authenticated page
  clientPage: async ({ page }, runFixture) => {
    await loginAs(page, 'client');
    await runFixture(page);
  },
});

/**
 * Login as a specific user type
 */
async function loginAs(page: Page, userType: 'client' | 'admin' | 'driver') {
  const user = TEST_USERS[userType];

  // Go to auth page
  await page.goto('/auth');

  // Fill in credentials
  await page.fill('input[name="email"], input[type="email"]', user.email);
  await page.fill('input[name="password"], input[type="password"]', user.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for successful login (redirect away from auth page)
  await page.waitForURL((url) => !url.pathname.includes('/auth'), {
    timeout: 10000,
  });
}

/**
 * Helper to check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // Check for common logged-in indicators
  const hasUserMenu = await page.locator('[data-testid="user-menu"]').count();
  const hasLogoutButton = await page.locator('text=Logout, text=Sign out, text=Log out').count();

  return hasUserMenu > 0 || hasLogoutButton > 0;
}

/**
 * Helper to logout
 */
export async function logout(page: Page) {
  // Try common logout patterns
  const logoutButton = page.locator('text=Logout, text=Sign out, text=Log out').first();
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  }

  // Wait for redirect to auth or home
  await page.waitForURL((url) =>
    url.pathname === '/' || url.pathname.includes('/auth')
  );
}

export { expect };
