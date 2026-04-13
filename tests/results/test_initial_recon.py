from playwright.sync_api import sync_playwright
import os

# Create screenshots directory if not exists
os.makedirs('/tmp/test-screenshots', exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Navigate to homepage
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')

    # Take full page screenshot
    page.screenshot(path='/tmp/test-screenshots/homepage.png', full_page=True)
    print("✅ Homepage screenshot saved to /tmp/test-screenshots/homepage.png")

    # Extract page info
    title = page.title()
    print(f"📄 Page title: {title}")

    # Find all interactive elements
    buttons = page.locator('button').all()
    print(f"🔘 Found {len(buttons)} buttons:")
    for i, btn in enumerate(buttons[:10]):  # Show first 10
        try:
            text = btn.text_content().strip()
            if text:
                print(f"  {i+1}. Button: {text}")
        except:
            pass

    inputs = page.locator('input').all()
    print(f"⌨️  Found {len(inputs)} input fields")

    links = page.locator('a').all()
    print(f"🔗 Found {len(links)} links")

    # Check for main sections
    sections = ['voice-clone', 'timeline', 'tts', 'upload']
    for section in sections:
        if page.locator(f'[data-testid="{section}"]').count() > 0:
            print(f"✅ Found section: {section}")

    browser.close()
    print("\n✅ Initial reconnaissance complete!")
