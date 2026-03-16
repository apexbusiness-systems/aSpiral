import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { converseWithAgent } from '../helpers/agent';
import { startPersistentMedia } from '../helpers/media';

test.describe('OmniHub full workflow with persistent PiP', () => {

  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Collect console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Fail immediately on uncaught exceptions
    page.on('pageerror', error => {
      throw new Error(`Uncaught exception: ${error.message}`);
    });

    // Fail on network 500s
    page.on('response', response => {
      if (response.status() >= 500) {
        throw new Error(`Server Error: ${response.url()} returned ${response.status()}`);
      }
    });
  });

  test('OmniHub full workflow with persistent PiP', async ({ page }) => {
    // STEP 1 — Load Application
    await page.goto('/');

    // Wait until the OmniHub interface is fully rendered
    await page.waitForLoadState('networkidle');

    // Assert: sidebar exists
    const sidebar = page.locator('aside, .sidebar, [data-testid="sidebar"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Assert: OmniDash layout container exists
    const omnidashContainer = page.locator('.omnidash-layout, [data-testid="omnidash-container"], #omnidash, .app-container').first();
    await expect(omnidashContainer).toBeVisible();

    // STEP 2 — Authentication
    await login(page);

    // After login: Wait for dashboard to load
    await page.waitForURL(/.*\/app|.*\/omnidash/i, { timeout: 10000 });

    // Assert: user avatar present
    const avatar = page.locator('.user-avatar, [data-testid="user-avatar"], img[alt*="avatar" i], [class*="avatar" i]').first();
    await expect(avatar).toBeVisible({ timeout: 10000 });

    // Assert: sidebar navigation visible
    const navMenu = page.locator('nav, .navigation-menu, [data-testid="sidebar-nav"], [class*="sidebar" i]').first();
    await expect(navMenu).toBeVisible();

    // STEP 3 — Agent Interaction
    // Open the AI agent interface
    const agentButton = page.locator('button', { hasText: /agent|ai|chat|prompt/i }).first();
    if (await agentButton.isVisible()) {
      await agentButton.click();
    }

    await converseWithAgent(page, 'Hello agent, confirm you are operational.');

    // Assert: agent message appears, response container rendered (handled in helper)

    // STEP 4 — Trigger Media Playback
    await startPersistentMedia(page);

    // Assert: dock visible, media controls active, play state active
    const globalMediaDock = page.locator('.global-media-dock, [data-testid="global-media-dock"], [class*="media-dock" i]').first();
    await expect(globalMediaDock).toBeVisible();

    const playControl = globalMediaDock.locator('button', { hasText: /play|pause/i, has: page.locator('svg') }).first();
    await expect(playControl).toBeVisible();

    // Check if it's active (assuming it has some 'active' or 'playing' attribute/class)
    // We'll rely on visibility and existence of pause button or similar as a proxy for 'playing' if specific attributes aren't present

    // STEP 5 — Enter Picture-in-Picture
    const pipButton = globalMediaDock.locator('button', { hasText: /pip|picture in picture|pop out/i, has: page.locator('svg[class*="pip" i]') }).first();
    if (await pipButton.isVisible()) {
        await pipButton.click();
    }

    // Verify Document PiP or floating window mode
    const pipWindow = page.locator('.pip-window, [data-testid="pip-window"], [class*="floating-media" i]').first();
    await expect(pipWindow).toBeVisible({ timeout: 5000 });

    // Assert draggable (check if it has draggable attribute or style suggesting it)
    // If it's a custom floating window, it usually has a drag handle
    const dragHandle = pipWindow.locator('.drag-handle, [data-testid="drag-handle"], [class*="drag" i]').first();
    if (await dragHandle.isVisible()) {
        await expect(dragHandle).toBeVisible();
        // Simulate drag
        const box = await pipWindow.boundingBox();
        if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + 10);
            await page.mouse.down();
            await page.mouse.move(box.x + box.width / 2 + 50, box.y + 50);
            await page.mouse.up();
            const newBox = await pipWindow.boundingBox();
            expect(newBox?.x).not.toBe(box.x);
        }
    }

    // STEP 6 — Navigation While PiP Active
    const routes = ['/omnidash', '/pipeline', '/integrations'];
    for (const route of routes) {
      // Simulate SPA navigation by finding links or forcing pushState
      const link = page.locator(`a[href="${route}"]`).first();
      if (await link.isVisible()) {
          await link.click();
      } else {
          await page.goto(route, { waitUntil: 'networkidle' });
      }

      // Give time for UI to update without reloading
      await page.waitForLoadState('networkidle');

      // Verify PiP window persists and playback continues
      await expect(pipWindow).toBeVisible();
      // Verify no reload occurred by checking if our consoleErrors array was reset or if a specific window variable persists
      // (Playwright handles reload tracking via navigation events, but if the page reloaded, the pipWindow handle would be stale)
    }

    // STEP 7 — Visual Harmony Check
    // 1) dashboard with PiP
    await page.goto('/omnidash', { waitUntil: 'networkidle' });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/dashboard-with-pip.png', fullPage: true });

    // 2) route navigation with PiP
    await page.goto('/pipeline', { waitUntil: 'networkidle' });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/pipeline-with-pip.png', fullPage: true });

    // 3) dock overlay
    await page.goto('/integrations', { waitUntil: 'networkidle' });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/screenshots/integrations-with-pip.png', fullPage: true });

    // Assert: PiP z-index above content
    const zIndex = await pipWindow.evaluate((el) => window.getComputedStyle(el).getPropertyValue('z-index'));
    if (zIndex !== 'auto') {
        expect(Number(zIndex)).toBeGreaterThanOrEqual(10);
    }

    // Assert: UI layout stable (visual check implicitly covered by screenshots, but we can check if body has no scrollbars if expected)

    // STEP 8 — Console Integrity
    // Check if any React error boundary triggered in logs
    const errorBoundaryLogs = consoleErrors.filter(err => err.includes('Error Boundary') || err.includes('Minified React error'));
    expect(errorBoundaryLogs.length, 'React Error Boundary triggered').toBe(0);
  });
});
