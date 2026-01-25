import os
import time
from playwright.sync_api import sync_playwright, expect


# Helper exception
class VoiceTestError(Exception):
    pass


def inject_mocks(page):
    """Injects voice API mocks into the page."""
    mock_js_path = os.path.join(os.path.dirname(__file__), "mocks", "voice_mocks.js")
    with open(mock_js_path, "r") as f:
        mock_js = f.read()
    page.add_init_script(mock_js)


def navigate_and_start(page, url):
    """Navigates to the app and handles the 'Get Started' interaction."""
    print(f"Navigating to {url}...")
    page.goto(url)
    page.wait_for_load_state("domcontentloaded")

    # Click "Get Started" if present
    get_started = page.get_by_text("Get Started")
    if get_started.count() > 0:
        print("Clicking 'Get Started'...")
        get_started.click()
        time.sleep(1)  # Wait for state change


def verify_voice_mic(page):
    """Attempts to find and click the mic button."""
    print("Looking for Mic button...")
    mic_btn = page.locator(
        'button:has(svg.lucide-mic), button[aria-label*="record"], button[aria-label*="mic"], button[data-testid="mic-button"]'
    )

    if mic_btn.count() > 0:
        print("Found Mic button!")
        if not mic_btn.first.is_disabled():
            mic_btn.first.click()
            print("Clicked Mic button")
        return True
    return False


def verify_transcript(page):
    """Simulates speech and checks for transcript."""
    print("Simulating speech...")
    page.evaluate("""() => {
        if (globalThis.lastRecognition) globalThis.lastRecognition.emitResult("Hello E2E", true);
    }""")
    expect(page.get_by_text("Hello E2E")).to_be_visible(timeout=5000)
    print("Transcript verified!")


def run_test_logic(browser):
    """Core test wrapper."""
    context = browser.new_context(permissions=["microphone"])
    page = context.new_page()

    inject_mocks(page)
    navigate_and_start(page, "http://localhost:5173/#/steps/voice")

    if verify_voice_mic(page):
        verify_transcript(page)
        return

    print("Mic button still not found.")
    # Check if 'Listening' state auto-started
    if page.get_by_text("Listening").count() > 0:
        print("Found 'Listening' state! Simulating speech...")
        verify_transcript(page)
        return

    # Debug dump
    buttons = page.locator("button").all()
    for i, btn in enumerate(buttons):
        try:
            print(f"B{i}: {btn.text_content()}")
        except Exception:
            pass
    raise VoiceTestError("Voice UI state verification failed: Mic button not found")


def test_voice_system():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            run_test_logic(browser)
        except Exception as e:
            print(f"Test Error: {e}")
            raise  # Reraise implicitly
        finally:
            browser.close()


if __name__ == "__main__":
    test_voice_system()
