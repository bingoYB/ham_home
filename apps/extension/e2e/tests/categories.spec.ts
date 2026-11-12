import { test, expect } from "../fixtures";
import { createBookmarkFixture, createCategoryFixture } from "../helpers/factories";
import { attachStepScreenshot, openAppPage } from "../helpers/pages";
import {
  getStorageState,
  resetExtensionData,
  seedBookmarks,
  seedCategories,
} from "../helpers/storage";

test.describe("CATE 分类管理", () => {
  test.beforeEach(async ({ extensionWorker, e2eVariant }) => {
    await resetExtensionData(extensionWorker, { settings: e2eVariant.settings });
  });

  test("CATE-001 分类创建、编辑、删除", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    const root = createCategoryFixture({ id: "cat-root", name: "根分类" });
    await seedCategories(extensionWorker, [root]);
    await seedBookmarks(extensionWorker, [
      createBookmarkFixture({ id: "bm-cate", title: "分类统计书签", categoryId: root.id }),
    ]);

    const page = await openAppPage(context, extensionId, "categories");
    await expect(page.getByText("根分类")).toBeVisible();
    await attachStepScreenshot(page, testInfo, "CATE-001-初始分类");

    await page.evaluate(async () => {
      await chrome.storage.local.set({
        categories: [
          {
            id: "cat-root",
            name: "根分类已编辑",
            parentId: null,
            order: 0,
            createdAt: Date.now(),
            icon: "📁",
          },
          {
            id: "cat-child",
            name: "子分类",
            parentId: "cat-root",
            order: 1,
            createdAt: Date.now(),
          },
        ],
      });
    });
    await page.reload();
    await expect(page.getByText("根分类已编辑")).toBeVisible();
    await attachStepScreenshot(page, testInfo, "CATE-001-编辑后分类");
    let state = await getStorageState(extensionWorker);
    expect(state.local.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "cat-child",
          name: "子分类",
          parentId: "cat-root",
        }),
      ]),
    );

    await page.evaluate(async () => {
      await chrome.storage.local.set({ categories: [] });
      const { bookmarks } = await chrome.storage.local.get("bookmarks");
      await chrome.storage.local.set({
        bookmarks: bookmarks.map((item: any) => ({ ...item, categoryId: null })),
      });
    });
    await page.reload();
    await expect(page.getByText("根分类已编辑")).toBeHidden();
    await attachStepScreenshot(page, testInfo, "CATE-001-删除后分类");
    state = await getStorageState(extensionWorker);
    expect(state.local.categories).toEqual([]);
    expect((state.local.bookmarks as any[])[0].categoryId).toBeNull();
  });

  test("CATE-002 预设分类导入", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    const page = await openAppPage(context, extensionId, "categories");
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        categories: [
          { id: "preset-work", name: "工作", parentId: null, order: 0, createdAt: Date.now() },
          { id: "preset-tech", name: "技术", parentId: "preset-work", order: 1, createdAt: Date.now() },
        ],
      });
    });
    await page.reload();

    await expect(page.getByText("工作", { exact: true }).last()).toBeVisible();
    await attachStepScreenshot(page, testInfo, "CATE-002-预设分类导入后");
    const state = await getStorageState(extensionWorker);
    expect(state.local.categories).toHaveLength(2);
    expect(state.local.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "preset-tech",
          name: "技术",
          parentId: "preset-work",
        }),
      ]),
    );
  });
});
