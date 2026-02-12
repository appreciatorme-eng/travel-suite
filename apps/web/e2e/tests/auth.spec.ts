import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/auth');

    // Check for login form elements
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth');

    // Fill in invalid credentials
    await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Invalid, text=incorrect, text=error')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    // Try to access admin page without login
    await page.goto('/admin');

    // Should redirect to login
    await expect(page).toHaveURL(/auth/);
  });

  test('should have Google OAuth option', async ({ page }) => {
    await page.goto('/auth');

    // Check for Google sign in button
    const googleButton = page.locator('text=Google, [data-provider="google"]');
    await expect(googleButton).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/auth');

    // Click register link
    const registerLink = page.locator('text=Sign up, text=Register, text=Create account').first();
    await registerLink.click();

    // Should be on register page
    await expect(page).toHaveURL(/register|signup/);
  });
});

test.describe('Registration', () => {
  test('should allow switching to sign-up mode', async ({ page }) => {
    await page.goto('/auth');

    const signUpSwitch = page.locator('button, a').filter({ hasText: /sign up|create account|register/i }).first();
    await signUpSwitch.click();

    await expect(page.locator('input[name="full_name"], input[placeholder*="name" i]')).toBeVisible();
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
  });
});
