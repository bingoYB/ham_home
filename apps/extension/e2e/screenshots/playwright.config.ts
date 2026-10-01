import { defineConfig, devices } from "@playwright/test";
import path from "path";
import type { ExtensionOptions } from "../fixtures";
import { E2E_PROJECTS } from "../helpers/variants";

const SCREENSHOT_DIR = path.resolve(__dirname, "../../output/screenshots");
const TEST_RESULTS_DIR = path.resolve(
  __dirname,
  "../../output/screenshots-test-results",
);

export default defineConfig<ExtensionOptions>({
  testDir: ".",
  testMatch: "marketing-screenshots.spec.ts",
  globalSetup: "../global-setup.ts",
  // 截图用例串行执行 13 张图（含页内保存、图片剪藏和素材渲染），给足超时时间
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: TEST_RESULTS_DIR,
  use: {
    screenshot: "off",
    trace: "off",
    video: "off",
  },
  metadata: {
    screenshotDir: SCREENSHOT_DIR,
  },
  // 浏览器区域与界面语言保持一致，截图里的日期格式才自然
  projects: [
    {
      name: E2E_PROJECTS.default,
      use: {
        ...devices["Desktop Chrome"],
        browserLocale: "zh-CN",
      },
    },
    {
      name: E2E_PROJECTS.dark,
      use: {
        ...devices["Desktop Chrome"],
        browserLocale: "zh-CN",
      },
    },
    {
      name: E2E_PROJECTS.english,
      use: {
        ...devices["Desktop Chrome"],
        browserLocale: "en-US",
      },
    },
    {
      name: E2E_PROJECTS.englishDark,
      use: {
        ...devices["Desktop Chrome"],
        browserLocale: "en-US",
      },
    },
  ],
});
