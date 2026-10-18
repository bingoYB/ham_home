import { test, expect } from "../fixtures";
import { createBookmarkFixture, createCategoryFixture, createEmbeddingFixture } from "../helpers/factories";
import { attachStepScreenshot, openAppPage } from "../helpers/pages";
import {
  getStorageState,
  resetExtensionData,
  seedBookmarks,
  seedCategories,
  seedEmbedding,
  seedSettings,
} from "../helpers/storage";

test.describe("SETTINGS 与 PRIVACY", () => {
  test.beforeEach(async ({ extensionWorker, e2eVariant }) => {
    await resetExtensionData(extensionWorker, { settings: e2eVariant.settings });
  });

  test("SETTINGS-001 主题、语言、快照设置持久化", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    const page = await openAppPage(context, extensionId, "settings");

    await page.evaluate(async () => {
      await chrome.storage.sync.set({
        settings: {
          autoSaveSnapshot: false,
          enableOmniboxSearch: true,
          defaultCategory: null,
          theme: "dark",
          language: "en",
          shortcut: "Ctrl+Shift+E",
          panelPosition: "left",
          panelShortcut: "Ctrl+Shift+B",
          updatedAt: Date.now(),
        },
      });
    });
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await attachStepScreenshot(page, testInfo, "SETTINGS-001-深色主题持久化");

    const state = await getStorageState(extensionWorker);
    expect(state.sync.settings).toMatchObject({
      autoSaveSnapshot: false,
      theme: "dark",
      language: "en",
    });
  });

  test("SETTINGS-002 清理数据", async ({
    context,
    extensionId,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;
    await seedCategories(extensionWorker, [
      createCategoryFixture({ id: "cat-clean", name: "待清理分类" }),
    ]);
    await seedBookmarks(extensionWorker, [
      createBookmarkFixture({ id: "bm-clean", title: "待清理书签" }),
    ]);
    await seedEmbedding(extensionWorker, createEmbeddingFixture("bm-clean"));

    const page = await openAppPage(context, extensionId, "settings?tab=storage");
    await page.evaluate(async () => {
      await chrome.storage.local.set({ bookmarks: [], bookmarkContents: {} });
      await chrome.storage.sync.set({ categories: [] });
      await indexedDB.deleteDatabase("HamHomeVectors");
    });

    await page.goto(page.url().replace(/#.*/, "#all"));
    await page.reload();
    await expect(page.getByText(t("暂无书签", "No bookmarks yet"))).toBeVisible();
    await attachStepScreenshot(page, testInfo, "SETTINGS-002-清理后空态");
    const state = await getStorageState(extensionWorker);
    expect(state.local.bookmarks).toEqual([]);
    expect(state.sync.categories).toEqual([]);
  });

  test("PRIVACY-001 隐私域名增删", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    const page = await openAppPage(context, extensionId, "privacy");

    await page.getByPlaceholder(/example|域名/).fill("Example.COM");
    await page.getByRole("button", { name: /添加|Add/ }).click();
    await expect(page.getByText("example.com")).toBeVisible();
    await attachStepScreenshot(page, testInfo, "PRIVACY-001-域名已添加");

    await page.getByPlaceholder(/example|域名/).fill("example.com");
    await page.getByRole("button", { name: /添加|Add/ }).click();
    let state = await getStorageState(extensionWorker);
    expect((state.sync.aiConfig as any).privacyDomains).toEqual(["example.com"]);

    await page.getByLabel(/移除|删除|Remove|Delete/).click();
    await expect(page.getByText("example.com")).toBeHidden();
    await attachStepScreenshot(page, testInfo, "PRIVACY-001-域名已删除");
    state = await getStorageState(extensionWorker);
    expect((state.sync.aiConfig as any).privacyDomains).toEqual([]);
  });

  test("SETTINGS-003 存储管理概览卡片内容不溢出", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    await seedCategories(extensionWorker, [
      createCategoryFixture({ id: "cat-a", name: "分类 A" }),
    ]);
    await seedBookmarks(extensionWorker, [
      createBookmarkFixture({ id: "bm-a", title: "书签 A", categoryId: "cat-a" }),
    ]);

    const page = await openAppPage(context, extensionId, "settings?tab=storage");
    const cards = page.getByTestId("storage-stat-card");
    await expect(cards).toHaveCount(5);

    // 卡片列数随宽度变化；任何宽度下按钮内容都必须落在按钮自身的内边距之内
    // （旧布局里本地化长文案把图标和文字挤到按钮边框上），文字也不能越出卡片
    for (const width of [1440, 1180, 900]) {
      await page.setViewportSize({ width, height: 900 });
      const overflowing = await cards.evaluateAll((nodes) =>
        nodes.flatMap((card) => {
          const cardRect = card.getBoundingClientRect();
          const problems: string[] = [];
          for (const button of card.querySelectorAll("button")) {
            const style = getComputedStyle(button);
            const rect = button.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(button);
            const content = range.getBoundingClientRect();
            const innerLeft =
              rect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
            const innerRight =
              rect.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
            if (content.left < innerLeft - 0.5 || content.right > innerRight + 0.5) {
              problems.push(`button: ${button.textContent?.trim()}`);
            }
          }
          for (const element of card.querySelectorAll("button, p")) {
            const rect = element.getBoundingClientRect();
            if (rect.right > cardRect.right + 0.5 || rect.left < cardRect.left - 0.5) {
              problems.push(`outside card: ${element.textContent?.trim()}`);
            }
          }
          return problems;
        }),
      );
      expect(overflowing, `视口 ${width}px 下存在溢出内容`).toEqual([]);
    }
    await attachStepScreenshot(page, testInfo, "SETTINGS-003-存储概览卡片");
  });
});
