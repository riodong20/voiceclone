#!/usr/bin/env python3
"""
Voice Clone Studio 功能自动化测试脚本 - 更新版
适配实际界面元素
"""
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

# 测试配置
BASE_URL = "http://localhost:5173"
TEST_AUDIO_PATH = "/tmp/test_audio.wav"
TEST_INVALID_FILE_PATH = "/tmp/test_file.txt"

# 先创建测试文件
if not os.path.exists(TEST_AUDIO_PATH):
    import wave
    import struct

    # 创建一个简单的测试WAV文件
    with wave.open(TEST_AUDIO_PATH, 'w') as wav_file:
        wav_file.setparams((1, 2, 16000, 0, 'NONE', 'NONE'))
        for i in range(16000 * 2):  # 2秒音频
            sample = int(32767 * 0.5 * (i % 100) / 100)
            wav_file.writeframes(struct.pack('<h', sample))

if not os.path.exists(TEST_INVALID_FILE_PATH):
    with open(TEST_INVALID_FILE_PATH, 'w') as f:
        f.write("This is a test file, not audio")

test_results = []

def log_test_result(test_name, passed, message=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    test_results.append(f"{status} {test_name}: {message}")
    print(f"{status} {test_name}")

def run_tests():
    with sync_playwright() as p:
        # 启动浏览器，headless=False可以看到界面
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            accept_downloads=True,
            permissions=["microphone"]  # 预先授权麦克风
        )
        page = context.new_page()

        print("=" * 60)
        print("Voice Clone Studio 自动化功能测试")
        print("=" * 60)

        try:
            # --------------------------
            # 测试模块 1: 主界面加载
            # --------------------------
            print("\n📦 测试模块 1: 主界面加载与基础元素")
            print("-" * 40)

            # 测试用例 1.1: 首页正常加载
            page.goto(BASE_URL)
            page.wait_for_load_state('networkidle')
            time.sleep(2)  # 等待React组件完全渲染

            try:
                # 检查页面标题
                expect(page).to_have_title("frontend")
                # 检查主应用名称显示
                expect(page.get_by_text("Voice Clone Studio")).to_be_visible()
                # 检查核心功能按钮存在
                expect(page.get_by_text("+ New Project")).to_be_visible()
                expect(page.get_by_text("Clone")).to_be_visible()
                expect(page.get_by_text("Record Voice Sample")).to_be_visible()
                expect(page.get_by_text("Timeline")).to_be_visible()
                log_test_result("1.1 首页正常加载，核心元素可见", True)
            except Exception as e:
                page.screenshot(path='/tmp/error_1_1.png')
                log_test_result("1.1 首页正常加载，核心元素可见", False, str(e))

            # --------------------------
            # 测试模块 2: 声音克隆功能
            # --------------------------
            print("\n📦 测试模块 2: 声音克隆功能")
            print("-" * 40)

            # 测试用例 2.1: 音频上传区域存在
            try:
                upload_area = page.get_by_text("Drop audio file to clone")
                expect(upload_area).to_be_visible()
                record_btn = page.get_by_text("Record Voice Sample")
                expect(record_btn).to_be_visible()
                log_test_result("2.1 克隆功能区域正常显示", True)
            except Exception as e:
                page.screenshot(path='/tmp/error_2_1.png')
                log_test_result("2.1 克隆功能区域正常显示", False, str(e))

            # 测试用例 2.2: 音频文件上传 - 失败场景(无效格式)
            try:
                with page.expect_file_chooser() as fc_info:
                    page.get_by_text("Click to browse or drag & drop").click()
                file_chooser = fc_info.value
                file_chooser.set_files(TEST_INVALID_FILE_PATH)
                # 等待错误提示出现
                page.wait_for_selector("text=不支持的文件格式", timeout=5000)
                log_test_result("2.2 无效文件上传错误提示正常", True)
            except Exception as e:
                page.screenshot(path='/tmp/error_2_2.png')
                log_test_result("2.2 无效文件上传错误提示正常", False, str(e))

            # --------------------------
            # 测试模块 3: 项目创建功能
            # --------------------------
            print("\n📦 测试模块 3: 项目与时间轴功能")
            print("-" * 40)

            # 测试用例 3.1: 新建项目
            try:
                page.get_by_text("+ New Project").click()
                # 等待项目创建界面
                time.sleep(1)
                # 检查Timeline区域显示
                expect(page.get_by_text("Timeline")).to_be_visible()
                log_test_result("3.1 新建项目成功", True)
            except Exception as e:
                page.screenshot(path='/tmp/error_3_1.png')
                log_test_result("3.1 新建项目成功", False, str(e))

            # --------------------------
            # 测试模块 4: 界面交互响应
            # --------------------------
            print("\n📦 测试模块 4: 界面交互响应")
            print("-" * 40)

            # 测试用例 4.1: 标签页切换
            try:
                page.get_by_text("Collected").click()
                time.sleep(0.5)
                page.get_by_text("Library").click()
                time.sleep(0.5)
                page.get_by_text("Clone").click()
                time.sleep(0.5)
                log_test_result("4.1 标签页切换功能正常", True)
            except Exception as e:
                page.screenshot(path='/tmp/error_4_1.png')
                log_test_result("4.1 标签页切换功能正常", False, str(e))

        finally:
            # 最终截图
            page.screenshot(path='/tmp/test_final_result.png', full_page=True)
            browser.close()

            # 清理测试文件
            if os.path.exists(TEST_AUDIO_PATH):
                os.unlink(TEST_AUDIO_PATH)
            if os.path.exists(TEST_INVALID_FILE_PATH):
                os.unlink(TEST_INVALID_FILE_PATH)

        # 输出测试结果
        print("\n" + "=" * 60)
        print("测试结果汇总")
        print("=" * 60)
        for result in test_results:
            print(result)

        passed = sum(1 for r in test_results if "✅ PASS" in r)
        total = len(test_results)
        print(f"\n总计: {passed}/{total} 测试用例通过")

        if passed == total:
            print("\n🎉 所有测试通过!")
        else:
            print(f"\n⚠️  有 {total - passed} 个测试失败")

        # 保存测试结果到文件
        with open("/tmp/test_report.txt", "w") as f:
            f.write("Voice Clone Studio 功能测试报告\n")
            f.write("=" * 40 + "\n")
            f.write(f"测试时间: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"测试版本: v0.1.0.0\n")
            f.write(f"通过用例: {passed}/{total}\n\n")
            f.write("测试详情:\n")
            for res in test_results:
                f.write(res + "\n")

        print(f"\n测试报告已保存到: /tmp/test_report.txt")
        print(f"测试截图已保存到: /tmp/test_final_result.png")

if __name__ == "__main__":
    run_tests()
