import os
import time
from playwright.sync_api import sync_playwright, expect


def test_voice_system():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)

        try:
            context = browser.new_context(permissions=["microphone"])
            page = context.new_page()

            # Inject Mocks
            mock_js_path = os.path.join(
                os.path.dirname(__file__), "mocks", "voice_mocks.js"
            )
            with open(mock_js_path, "r") as f:
                mock_js = f.read()
            page.add_init_script(mock_js)

            # Navigate to Public Voice Route
            target_url = "http://localhost:5173/#/steps/voice"
            print(f"Navigating to {target_url}...")
            page.goto(target_url)
            page.wait_for_load_state("domcontentloaded")

            # Click "Get Started" if present
            get_started = page.get_by_text("Get Started")
            if get_started.count() > 0:
                print("Clicking 'Get Started'...")
                get_started.click()
                time.sleep(1)  # Wait for state change

            # Check for Mic button again
            print("Looking for Mic button...")
            mic_btn = page.locator(
                'button:has(svg.lucide-mic), button[aria-label*="record"], button[aria-label*="mic"], button[data-testid="mic-button"]'
            )

            if mic_btn.count() > 0:
                print("Found Mic button!")
                if not mic_btn.first.is_disabled():
                    mic_btn.first.click()
                    print("Clicked Mic button")

                # Simulate Speech
                print("Simulating speech...")
                page.evaluate("""() => {
                    if (window.lastRecognition) window.lastRecognition.emitResult("Hello E2E", true);
                }""")

                # Verify Transcript ("Hello E2E")
                expect(page.get_by_text("Hello E2E")).to_be_visible(timeout=5000)
                print("Transcript verified!")

            else:
                print("Mic button still not found.")
                # Verify if 'Listening' text appeared (maybe auto-started)
                if page.get_by_text("Listening").count() > 0:
                    print("Found 'Listening' state! Simulating speech...")
                    page.evaluate("""() => {
                        if (window.lastRecognition) window.lastRecognition.emitResult("Hello E2E", true);
                     }""")
                    expect(page.get_by_text("Hello E2E")).to_be_visible(timeout=5000)
                    print("Transcript verified (Auto-start)!")
                else:
                    # Debug dump
                    buttons = page.locator("button").all()
                    for i, btn in enumerate(buttons):
                        try:
                            print(f"B{i}: {btn.text_content()}")
                        except:
                            pass
                    raise Exception("Voice UI state verification failed")

        except Exception as e:
            print(f"Test Error: {e}")
            raise e
        finally:
            browser.close()


if __name__ == "__main__":
    test_voice_system()
