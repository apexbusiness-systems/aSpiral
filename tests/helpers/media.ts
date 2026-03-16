import { Page, expect } from '@playwright/test';

export async function startPersistentMedia(page: Page) {
  // Try to find a media element or a play button that triggers GlobalMediaDock
  const playButtonElement = page.locator('button', { hasText: /play media|start playback/i }).first();
  await expect(playButtonElement).toBeVisible({ timeout: 5000 });
  await playButtonElement.click();

  // Wait for the GlobalMediaDock component
  const globalMediaDock = page.locator('.global-media-dock, [data-testid="global-media-dock"]');
  await expect(globalMediaDock).toBeVisible({ timeout: 5000 });
}
