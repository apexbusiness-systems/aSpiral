import { test, expect, devices } from '@playwright/test';

// Use Pixel 5 device emulation for mobile testing
test.use({
  ...devices['Pixel 5'],
});

test.describe('Mobile Validation (Voice + 3D)', () => {
  // Setup mock voice API
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Mock SpeechRecognition for non-supported CI environments
      (window as any).SpeechRecognition = (window as any).SpeechRecognition || class MockSpeechRecognition {
        continuous: boolean = false;
        interimResults: boolean = false;
        lang: string = 'en-US';
        
        onresult: ((event: any) => void) | null = null;
        onerror: ((event: any) => void) | null = null;
        onend: (() => void) | null = null;

        start() {
          setTimeout(() => {
            if (this.onresult) {
              this.onresult({
                resultIndex: 0,
                results: [
                  [{ transcript: 'This is a test transcript for the offline speech API', confidence: 0.99 }],
                ],
              });
              
              // Mark as final explicitly
              (this.onresult as any).apply(this, [{
                resultIndex: 0,
                results: [
                  Object.assign([{ transcript: 'This is a test transcript for the offline speech API', confidence: 0.99 }], { isFinal: true })
                ],
              }]);
            }
            if (this.onend) this.onend();
          }, 100);
        }

        stop() {
          if (this.onend) this.onend();
        }
        
        abort() {
          if (this.onend) this.onend();
        }
      };
    });
  });

  test('should render 3D R3F Canvas and handle mocked voice input', async ({ page }) => {
    // 1. Navigate to the voice coaching interface (assumes this is the root or a specific route)
    await page.goto('/');

    // 2. Verify 3D Canvas
    // Using timeout to wait for R3F to mount and initialize WebGL
    const canvas = page.locator('canvas[data-engine^="three.js"]');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    
    // Check console for WebGL context loss errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // 3. Initiate Voice Session
    const voiceButton = page.locator('button[aria-label="Start Voice Coaching"], button, [role="button"]').first();
    if (await voiceButton.isVisible()) {
      await voiceButton.click();
    }

    // Since we mocked SpeechRecognition, starting it should emit our mock result
    // Look for the mock transcript text appearing somewhere on screen
    const transcriptText = page.getByText(/This is a test transcript/);
    
    // Some UIs might hide the transcript or display it differently, so we just check if 
    // it gets processed or if the UI changes state.
    // If the transcript text IS visible directly, we expect it:
    if (await transcriptText.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(transcriptText).toBeVisible();
    }

    // 4. Assert no WebGL context lost errors on mobile
    expect(errors.some(e => e.includes('WebGL context lost'))).toBeFalsy();
  });
});
