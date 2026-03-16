import { Page, expect } from '@playwright/test';

export async function converseWithAgent(page: Page, message: string) {
  // Try to locate agent interface or prompt input
  const promptInput = page.getByRole('textbox', { name: /prompt|message|agent/i });
  await expect(promptInput).toBeVisible({ timeout: 5000 });

  await promptInput.fill(message);
  await promptInput.press('Enter');

  // Wait for response to appear
  const responseContainer = page.locator('.agent-response, [data-testid="agent-response"]');
  await expect(responseContainer.first()).toBeVisible({ timeout: 15000 });
}
