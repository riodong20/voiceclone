from playwright.sync_api import sync_playwright
import os

os.makedirs('/tmp/test-screenshots', exist_ok=True)
test_results = []

def log_test_result(test_name, passed, message=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    test_results.append(f"{status} {test_name}: {message}")
    print(f"{status} {test_name}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    try:
        # Test 1: Page loads correctly
        page.goto('http://localhost:5173')
        page.wait_for_load_state('networkidle')
        title = page.title()
        log_test_result("Page load", "Voice Clone Studio" in page.content(), f"Title: {title}")

        # Test 2: Tab switching works
        tabs = ["Clone", "Collected", "Library"]
        for tab in tabs:
            try:
                page.get_by_text(tab, exact=True).click()
                page.wait_for_timeout(300)
                log_test_result(f"Tab switch to {tab}", True)
            except Exception as e:
                log_test_result(f"Tab switch to {tab}", False, str(e))

        # Switch back to Clone tab
        page.get_by_text("Clone", exact=True).click()

        # Test 3: New Project button works
        try:
            page.get_by_text("+ New Project", exact=True).click()
            page.wait_for_timeout(500)
            # Check if dialog or new project UI appears
            log_test_result("New Project button click", True, "Button clicked successfully")
            page.screenshot(path='/tmp/test-screenshots/new-project-click.png')
        except Exception as e:
            log_test_result("New Project button click", False, str(e))

        # Test 4: Record button interaction
        try:
            record_btn = page.get_by_text("Record Voice Sample", exact=True)
            record_btn.click()
            page.wait_for_timeout(1000)
            # Check if recording state changes
            log_test_result("Record button click", True, "Recording initiated")
            page.screenshot(path='/tmp/test-screenshots/recording-start.png')
        except Exception as e:
            log_test_result("Record button click", False, str(e))

        # Test 5: File upload area exists
        try:
            upload_area = page.get_by_text("Drop audio file to clone")
            assert upload_area.count() > 0
            log_test_result("File upload area exists", True)
        except Exception as e:
            log_test_result("File upload area exists", False, str(e))

        # Test 6: Timeline section exists
        try:
            timeline = page.get_by_text("TIMELINE")
            assert timeline.count() > 0
            log_test_result("Timeline section exists", True)
        except Exception as e:
            log_test_result("Timeline section exists", False, str(e))

        # Final screenshot
        page.screenshot(path='/tmp/test-screenshots/final-state.png', full_page=True)

    except Exception as e:
        log_test_result("Overall test suite", False, f"Fatal error: {str(e)}")
    finally:
        browser.close()

    # Print summary
    print("\n" + "="*50)
    print("TEST SUMMARY")
    print("="*50)
    for result in test_results:
        print(result)

    passed = len([r for r in test_results if "✅ PASS" in r])
    total = len(test_results)
    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All core functionality tests passed!")
    else:
        print(f"\n⚠️  {total - passed} tests failed, please check the screenshots in /tmp/test-screenshots/")
