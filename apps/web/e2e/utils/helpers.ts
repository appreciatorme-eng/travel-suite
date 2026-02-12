import { Page, expect } from '@playwright/test';

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for API request to complete
 */
export async function waitForApi(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse(
    (response) =>
      (typeof urlPattern === 'string'
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url())) && response.status() === 200
  );
}

/**
 * Clear form inputs
 */
export async function clearForm(page: Page, formSelector: string) {
  const inputs = page.locator(`${formSelector} input, ${formSelector} textarea`);
  const count = await inputs.count();

  for (let i = 0; i < count; i++) {
    await inputs.nth(i).clear();
  }
}

/**
 * Fill form by field names
 */
export async function fillForm(
  page: Page,
  formData: Record<string, string>
) {
  for (const [name, value] of Object.entries(formData)) {
    const input = page.locator(`[name="${name}"]`);
    await input.fill(value);
  }
}

/**
 * Check for toast notification
 */
export async function expectToast(
  page: Page,
  type: 'success' | 'error' | 'info',
  timeout = 5000
) {
  const toastPatterns: Record<string, RegExp> = {
    success: /success|saved|created|updated|done/i,
    error: /error|failed|invalid/i,
    info: /info|note/i,
  };

  await expect(page.locator(`text=${toastPatterns[type]}`)).toBeVisible({
    timeout,
  });
}

/**
 * Navigate to admin page with auth check
 */
export async function goToAdmin(page: Page, path: string) {
  await page.goto(`/admin${path}`);

  // Check if redirected to login
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    throw new Error('Not authenticated - redirected to login');
  }
}

/**
 * Take screenshot for debugging
 */
export async function debugScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `./e2e/debug/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Mock API response
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string,
  response: object
) {
  await page.route(`**/${urlPattern}`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Generate random test data
 */
export function generateTestData() {
  const timestamp = Date.now();
  return {
    email: `test-${timestamp}@example.com`,
    name: `Test User ${timestamp}`,
    phone: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
  };
}

/**
 * Check table has expected columns
 */
export async function expectTableColumns(
  page: Page,
  tableSelector: string,
  columns: string[]
) {
  const headers = page.locator(`${tableSelector} th`);

  for (const column of columns) {
    await expect(
      headers.filter({ hasText: new RegExp(column, 'i') })
    ).toBeVisible();
  }
}

/**
 * Click action button in table row
 */
export async function clickRowAction(
  page: Page,
  rowText: string,
  actionText: string
) {
  const row = page.locator('tr').filter({ hasText: rowText });
  const action = row.locator('button, a').filter({ hasText: new RegExp(actionText, 'i') });
  await action.click();
}
