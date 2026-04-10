#!/usr/bin/env python3
"""
Voice Clone Studio 功能自动化测试脚本
基于 functional_test_steps.md 实现
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
            # 测试模块 1: 主界面加载与导航
            # --------------------------
            print("\n📦 测试模块 1: 主界面加载与导航")
            print("-" * 40)

            # 测试用例 1.1: 首页正常加载
            page.goto(BASE_URL)
            page.wait_for_load_state('networkidle')

            try:
                expect(page).to_have_title("Voice Clone Studio")
                expect(page.get_by_role("navigation")).to_be_visible()
                expect(page.get_by_text("克隆声音")).to_be_visible()
                expect(page.get_by_text("语音合成")).to_be_visible()
                expect(page.get_by_text("时间轴")).to_be_visible()
                log_test_result("1.1 首页正常加载", True)
            except Exception as e:
                log_test_result("1.1 首页正常加载", False, str(e))

            # 测试用例 1.2: 导航功能正常
            try:
                # 测试克隆声音页面
                page.get_by_text("克隆声音").click()
                page.wait_for_load_state('networkidle')
                expect(page).to_have_url(f"{BASE_URL}/clone")

                # 测试语音合成页面
                page.get_by_text("语音合成").click()
                page.wait_for_load_state('networkidle')
                expect(page).to_have_url(f"{BASE_URL}/tts")

                # 测试时间轴页面
                page.get_by_text("时间轴").click()
                page.wait_for_load_state('networkidle')
                expect(page).to_have_url(f"{BASE_URL}/timeline")

                log_test_result("1.2 导航功能正常", True)
            except Exception as e:
                log_test_result("1.2 导航功能正常", False, str(e))

            # --------------------------
            # 测试模块 2: 声音克隆功能
            # --------------------------
            print("\n📦 测试模块 2: 声音克隆功能")
            print("-" * 40)

            # 先导航到克隆页面
            page.get_by_text("克隆声音").click()
            page.wait_for_load_state('networkidle')

            # 测试用例 2.2: 音频文件上传 - 失败场景(无效格式)
            try:
                with page.expect_file_chooser() as fc_info:
                    page.get_by_text("上传音频文件").click()
                file_chooser = fc_info.value
                file_chooser.set_files(TEST_INVALID_FILE_PATH)

                # 输入名称
                page.get_by_placeholder("请输入声音名称").fill("测试无效文件")
                page.get_by_text("开始克隆").click()

                # 等待错误提示
                error_msg = page.get_by_text("不支持的文件格式")
                expect(error_msg).to_be_visible(timeout=5000)
                log_test_result("2.2 无效文件上传错误提示", True)
            except Exception as e:
                log_test_result("2.2 无效文件上传错误提示", False, str(e))

            # --------------------------
            # 测试模块 3: TTS 语音合成功能
            # --------------------------
            print("\n📦 测试模块 3: TTS 语音合成功能")
            print("-" * 40)

            page.get_by_text("语音合成").click()
            page.wait_for_load_state('networkidle')

            # 测试用例 4.1: 标准声音合成 - 成功场景
            try:
                # 输入文本
                page.get_by_placeholder("请输入要合成的文本").fill("你好，这是语音合成测试")

                # 选择声音
                page.get_by_label("选择声音").select_option("xiaoyun")

                # 点击合成
                page.get_by_text("开始合成").click()

                # 等待合成完成
                page.wait_for_selector("text=合成完成", timeout=10000)
                expect(page.get_by_text("合成完成")).to_be_visible()

                # 检查播放按钮出现
                expect(page.get_by_role("button", name="播放")).to_be_visible()
                log_test_result("4.1 标准声音合成成功", True)
            except Exception as e:
                log_test_result("4.1 标准声音合成成功", False, str(e))

            # 测试用例 4.3: TTS 合成 - 边界场景(空文本)
            try:
                # 清空文本
                page.get_by_placeholder("请输入要合成的文本").fill("")
                page.get_by_text("开始合成").click()

                # 等待错误提示
                error_msg = page.get_by_text("文本不能为空")
                expect(error_msg).to_be_visible(timeout=3000)
                log_test_result("4.3 空文本合成错误提示", True)
            except Exception as e:
                log_test_result("4.3 空文本合成错误提示", False, str(e))

            # --------------------------
            # 测试模块 4: 时间轴功能
            # --------------------------
            print("\n📦 测试模块 4: 时间轴功能")
            print("-" * 40)

            page.get_by_text("时间轴").click()
            page.wait_for_load_state('networkidle')

            # 测试用例 5.1: 时间轴基础操作
            try:
                # 新建项目
                page.get_by_text("新建项目").click()
                page.get_by_placeholder("请输入项目名称").fill("测试项目")
                page.get_by_text("确认创建").click()

                # 等待项目创建
                expect(page.get_by_text("测试项目")).to_be_visible(timeout=5000)

                # 添加片段
                page.get_by_text("添加片段").click()
                page.get_by_placeholder("片段文本").fill("片段1")
                page.get_by_placeholder("开始时间").fill("0")
                page.get_by_placeholder("结束时间").fill("2")
                page.get_by_text("确认添加").click()

                # 检查片段是否添加成功
                expect(page.get_by_text("片段1")).to_be_visible(timeout=3000)
                log_test_result("5.1 时间轴创建项目和添加片段", True)
            except Exception as e:
                log_test_result("5.1 时间轴创建项目和添加片段", False, str(e))

        finally:
            # 截图
            page.screenshot(path="/tmp/test_final_screenshot.png", full_page=True)
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

if __name__ == "__main__":
    run_tests()
