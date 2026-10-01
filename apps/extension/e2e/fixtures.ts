import {
  test as base,
  chromium,
  type BrowserContext,
  type Worker,
} from "@playwright/test";
import path from "path";
import { injectE2EExtensionConfig } from "./helpers/extension-config";
import { seedSettings } from "./helpers/storage";
import {
  resolveE2EVariant,
  type E2EVariant,
} from "./helpers/variants";

/** Chrome MV3 构建产物目录（由 wxt build 生成） */
const CHROME_MV3_DIR = path.resolve(__dirname, "../.output/chrome-mv3");

/**
 * 扩展测试 fixtures。
 *
 * 浏览器扩展无法在普通 BrowserContext 中加载，必须：
 *   1. 使用 launchPersistentContext（扩展依赖持久化用户目录）；
 *   2. 通过 --load-extension / --disable-extensions-except 指定产物目录；
 *   3. 使用支持扩展的 Chromium 新版无头模式（channel: "chromium"）。
 *
 * 默认无头运行（适合 CI）；设置环境变量 HEADED=1 可看到真实浏览器窗口，便于调试。
 */
type ExtensionFixtures = {
  /** 已加载扩展的持久化浏览器上下文 */
  context: BrowserContext;
  /** 扩展 MV3 Service Worker，可用于预置 storage */
  extensionWorker: Worker;
  /** 扩展 ID（chrome-extension://<id>），用于拼接页面 URL */
  extensionId: string;
  /** 当前 Playwright project 对应的语言/主题变体 */
  e2eVariant: E2EVariant;
};

export type ExtensionOptions = {
  /**
   * 浏览器区域设置（影响 toLocaleString 等日期格式）。
   * 默认不设置，沿用系统区域；截图项目按界面语言单独指定。
   */
  browserLocale: string | undefined;
};

export const test = base.extend<ExtensionFixtures & ExtensionOptions>({
  browserLocale: [undefined, { option: true }],

  e2eVariant: async ({}, use, testInfo) => {
    await use(resolveE2EVariant(testInfo.project.name));
  },

  context: async ({ e2eVariant, browserLocale }, use) => {
    const headed = process.env.HEADED === "1";
    const context = await chromium.launchPersistentContext("", {
      // 新版无头 Chromium 支持加载扩展；HEADED=1 时显示窗口
      channel: "chromium",
      headless: !headed,
      locale: browserLocale,
      args: [
        `--disable-extensions-except=${CHROME_MV3_DIR}`,
        `--load-extension=${CHROME_MV3_DIR}`,
        "--no-first-run",
      ],
    });

    const worker = await waitForExtensionWorker(context);
    await injectE2EExtensionConfig(worker);
    await seedSettings(worker, e2eVariant.settings);

    await use(context);
    await context.close();
  },

  extensionWorker: async ({ context }, use) => {
    await use(await waitForExtensionWorker(context));
  },

  extensionId: async ({ extensionWorker }, use) => {
    // MV3 扩展后台为 Service Worker，从其 URL 解析扩展 ID
    const extensionId = extractExtensionId(extensionWorker);
    await use(extensionId);
  },
});

async function waitForExtensionWorker(context: BrowserContext): Promise<Worker> {
  let [worker] = context.serviceWorkers();
  if (!worker) {
    worker = await context.waitForEvent("serviceworker", {
      timeout: 15_000,
    });
  }
  return worker;
}

function extractExtensionId(worker: Worker): string {
  // worker.url() 形如 chrome-extension://<id>/background.js
  const url = new URL(worker.url());
  return url.hostname;
}

export const expect = test.expect;

/** 拼接扩展内页面 URL，例如 extPageUrl(id, "app.html") */
export function extPageUrl(extensionId: string, page: string): string {
  return `chrome-extension://${extensionId}/${page}`;
}
