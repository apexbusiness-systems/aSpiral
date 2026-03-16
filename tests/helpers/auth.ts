import { Page, expect } from '@playwright/test';

export async function login(page: Page) {
  await page.goto('/auth');

  // Fill in login form
  // Using semantic selectors commonly found in modern React apps
  await page.getByLabel(/email/i).fill('test@apex-business.systems');
  await page.getByLabel(/password/i).fill('Test1234!');

  // Submit
  await page.getByRole('button', { name: /login/i }).click();

  // Wait for the app dashboard to load
  // Assuming there's some container or URL change that happens upon login
  await expect(page).toHaveURL(/.*\/app|.*\/omnidash/i, { timeout: 10000 });
}
