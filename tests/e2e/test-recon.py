#!/usr/bin/env python3
"""
页面侦察脚本，获取实际页面元素
"""
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')

    # 截图
    page.screenshot(path='/tmp/page_recon.png', full_page=True)

    # 获取页面标题
    print(f"页面标题: {page.title()}")

    # 获取所有可见文本
    print("\n页面可见文本:")
    print(page.text_content('body'))

    # 获取所有按钮
    print("\n所有按钮:")
    buttons = page.get_by_role("button").all()
    for btn in buttons:
        try:
            print(f"  - {btn.text_content()}")
        except:
            pass

    # 获取所有链接/导航
    print("\n所有导航链接:")
    links = page.get_by_role("link").all()
    for link in links:
        try:
            print(f"  - {link.text_content()} -> {link.get_attribute('href')}")
        except:
            pass

    # 获取页面HTML
    print("\n页面HTML前500字符:")
    print(page.content()[:500])

    browser.close()
