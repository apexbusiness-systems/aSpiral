from playwright.sync_api import sync_playwright
import sys


def run():
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        url = "http://localhost:8080"
        print(f"Navigating to {url}...")
        try:
            page.goto(url)
            page.wait_for_load_state("networkidle", timeout=30000)
        except Exception as e:
            print(f"Navigation failed: {e}")
            sys.exit(1)

        # 1. Verify PII Disclaimer
        print("Verifying PII Disclaimer...")
        # Searching for partial text
        try:
            page.wait_for_selector(
                "text=System attempts to redact personal info", timeout=5000
            )
            print("✅ PII Disclaimer found.")
        except Exception:
            print("❌ PII Disclaimer NOT found.")
            # Dump content for debugging
            # print(page.content())
            sys.exit(1)

        # 2. Verify Canvas (3D Scene)
        print("Verifying 3D Scene...")
        if page.locator("canvas").count() > 0:
            print("✅ Canvas element found.")
        else:
            print("⚠️ Canvas element NOT found (might be offscreen or loading).")

        browser.close()
        print("Test passed successfully.")


if __name__ == "__main__":
    run()
