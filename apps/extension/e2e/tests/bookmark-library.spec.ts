import type { Locator, Page } from "@playwright/test";
import { test, expect } from "../fixtures";
import {
  createBookmarkFixture,
  createCategoryFixture,
  createLibraryFixtures,
} from "../helpers/factories";
import { attachStepScreenshot, openAppPage } from "../helpers/pages";
import {
  getBookmarks,
  resetExtensionData,
  seedBookmarks,
  seedCategories,
  seedSnapshot,
} from "../helpers/storage";

/** 日历格子上的 data-date 是本地时间，用 toISOString 会跨时区差一天 */
function toLocalISODate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** 打开日期选择器的日历下拉，翻到目标月份后点中那一天 */
async function pickCalendarDate(page: Page, trigger: Locator, timestamp: number) {
  await trigger.click();
  const calendar = page.locator('[data-slot="calendar"]');
  await expect(calendar).toBeVisible();

  const day = calendar.locator(`[data-date="${toLocalISODate(timestamp)}"]`);
  // 目标日期可能落在上个月，往回翻到它出现为止
  for (let i = 0; i < 3 && (await day.count()) === 0; i++) {
    await calendar.locator(".rdp-button_previous").click();
  }
  await day.first().click();
  await expect(calendar).toBeHidden();
}

test.describe("LIB 书签库核心流程", () => {
  test.beforeEach(async ({ extensionWorker, e2eVariant }) => {
    await resetExtensionData(extensionWorker, { settings: e2eVariant.settings });
  });

  test("LIB-001 书签列表渲染和视图切换", async ({
    context,
    extensionId,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;
    const { bookmarks, categories } = createLibraryFixtures();
    await seedCategories(extensionWorker, categories);
    await seedBookmarks(extensionWorker, bookmarks);
    await seedSnapshot(extensionWorker, "bm-mdn", "<html>MDN Snapshot</html>");

    const page = await openAppPage(context, extensionId, "all");
    await expect(page.getByText("React Docs")).toBeVisible();
    await expect(page.getByText("MDN Web APIs")).toBeVisible();
    await expect(page.getByText("OpenAI Docs")).toBeVisible();
    await attachStepScreenshot(page, testInfo, "LIB-001-书签卡片渲染");

    await page.getByTitle(t("列表视图", "List View")).click();
    await expect(page.getByText("Figma Design")).toBeVisible();
    await attachStepScreenshot(page, testInfo, "LIB-001-列表视图");
    await page.getByTitle(t("卡片视图", "Grid View")).click();
    await expect(page.getByText("HamHome Repo")).toBeVisible();
  });

  test("LIB-002 关键词、标签、分类、时间筛选", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    const { bookmarks, categories } = createLibraryFixtures();
    await seedCategories(extensionWorker, categories);
    await seedBookmarks(extensionWorker, bookmarks);

    const page = await openAppPage(context, extensionId, "all");

    await page.getByPlaceholder(/关键词|搜索|Search/).fill("OpenAI");
    await expect(page.getByText("OpenAI Docs")).toBeVisible();
    await expect(page.getByText("React Docs")).toBeHidden();
    await attachStepScreenshot(page, testInfo, "LIB-002-关键词筛选");

    await page.locator("#main-content").getByRole("button", { name: /清除筛选|Clear Filters/ }).click();
    await page.getByRole("button", { name: /标签筛选|Filter by Tags/ }).click();
    await page.getByText("design", { exact: true }).last().click();
    await expect(page.getByText("Figma Design")).toBeVisible();
    await expect(page.getByText("React Docs")).toBeHidden();
    await attachStepScreenshot(page, testInfo, "LIB-002-标签筛选");

    await page.keyboard.press("Escape");
    await page.locator("#main-content").getByRole("button", { name: /清除筛选|Clear Filters/ }).click();
    await page.getByText(/全部分类|All Categories/).click();
    await page.getByText("开发工具", { exact: true }).last().click();
    await expect(page.getByText("React Docs")).toBeVisible();
    await expect(page.getByText("Figma Design")).toBeHidden();
    await attachStepScreenshot(page, testInfo, "LIB-002-分类筛选");
  });

  test("LIB-003 编辑单个书签", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    const categories = [
      createCategoryFixture({ id: "cat-a", name: "A 类" }),
      createCategoryFixture({ id: "cat-b", name: "B 类", order: 1 }),
    ];
    const bookmark = createBookmarkFixture({
      id: "bm-edit",
      title: "旧标题",
      categoryId: "cat-a",
      tags: ["old"],
    });
    await seedCategories(extensionWorker, categories);
    await seedBookmarks(extensionWorker, [bookmark]);

    const page = await openAppPage(context, extensionId, "all");
    await page.evaluate(async () => {
      const { bookmarks } = await chrome.storage.local.get("bookmarks");
      await chrome.storage.local.set({
        bookmarks: bookmarks.map((item: any) =>
          item.id === "bm-edit"
            ? {
                ...item,
                title: "新标题",
                description: "新的描述",
                categoryId: "cat-b",
                tags: ["new", "edited"],
                updatedAt: Date.now(),
              }
            : item,
        ),
      });
    });
    await page.reload();

    await expect(page.getByText("新标题")).toBeVisible();
    await attachStepScreenshot(page, testInfo, "LIB-003-编辑后列表");
    const stored = await getBookmarks(extensionWorker);
    expect(stored.find((item) => item.id === "bm-edit")).toMatchObject({
      title: "新标题",
      description: "新的描述",
      categoryId: "cat-b",
      tags: ["new", "edited"],
    });
  });

  test("LIB-004 删除单个书签", async ({
    context,
    extensionId,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;
    await seedBookmarks(extensionWorker, [
      createBookmarkFixture({ id: "bm-delete", title: "待删除书签" }),
      createBookmarkFixture({ id: "bm-keep", title: "保留书签" }),
    ]);

    const page = await openAppPage(context, extensionId, "all");
    await page.evaluate(async () => {
      const { bookmarks } = await chrome.storage.local.get("bookmarks");
      await chrome.storage.local.set({
        bookmarks: bookmarks.map((item: any) =>
          item.id === "bm-delete"
            ? { ...item, isDeleted: true, updatedAt: Date.now() }
            : item,
        ),
      });
    });
    await page.reload();

    await expect(page.getByText("待删除书签")).toBeHidden();
    await expect(page.getByText("保留书签")).toBeVisible();
    await expect(page.getByText(t("你有 1 个书签", "You have 1 bookmark")).first()).toBeVisible();
    await attachStepScreenshot(page, testInfo, "LIB-004-删除后列表");
  });

  test("LIB-005 批量打标签、移动分类、删除", async ({
    context,
    extensionId,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;
    const categories = [
      createCategoryFixture({ id: "cat-source", name: "源分类" }),
      createCategoryFixture({ id: "cat-target", name: "目标分类", order: 1 }),
    ];
    const bookmarks = [
      createBookmarkFixture({ id: "bm-batch-1", title: "批量 1" }),
      createBookmarkFixture({ id: "bm-batch-2", title: "批量 2" }),
      createBookmarkFixture({ id: "bm-batch-3", title: "批量 3" }),
    ];
    await seedCategories(extensionWorker, categories);
    await seedBookmarks(extensionWorker, bookmarks);

    const page = await openAppPage(context, extensionId, "all");
    await page.evaluate(async () => {
      const { bookmarks } = await chrome.storage.local.get("bookmarks");
      await chrome.storage.local.set({
        bookmarks: bookmarks.map((item: any) => ({
          ...item,
          categoryId: "cat-target",
          tags: Array.from(new Set([...(item.tags ?? []), "batch"])),
          isDeleted: true,
          updatedAt: Date.now(),
        })),
      });
    });
    await page.reload();

    await expect(page.getByText(t("暂无书签", "No bookmarks yet"))).toBeVisible();
    await attachStepScreenshot(page, testInfo, "LIB-005-批量删除后空态");
    const stored = await getBookmarks(extensionWorker);
    expect(stored).toHaveLength(0);
  });

  test("LIB-006 新建自定义筛选器后列表中不应出现重复项", async ({
    context,
    extensionId,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;
    const { bookmarks, categories } = createLibraryFixtures();
    await seedCategories(extensionWorker, categories);
    await seedBookmarks(extensionWorker, bookmarks);

    const page = await openAppPage(context, extensionId, "all");

    await page.getByTitle(t("筛选器", "Filter")).click();
    await page.getByText(t("添加自定义筛选器", "Add Custom Filter")).click();

    await page
      .getByPlaceholder(t("给这个筛选器起个名字", "Give this filter a name"))
      .fill("测试筛选器");
    await page
      .getByPlaceholder(t("输入条件值", "Enter condition value"))
      .fill("test");
    await page.getByRole("button", { name: t("保存", "Save") }).click();

    await page.getByTitle(t("筛选器", "Filter")).click();
    await attachStepScreenshot(page, testInfo, "LIB-006-创建后筛选器下拉");
    await expect(page.getByText("测试筛选器")).toHaveCount(1);
  });

  test("LIB-007 自定义时间范围筛选", async ({
    context,
    extensionId,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;
    const DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();

    await seedBookmarks(extensionWorker, [
      createBookmarkFixture({
        id: "bm-in-range",
        title: "范围内书签",
        createdAt: now - 10 * DAY,
      }),
      createBookmarkFixture({
        id: "bm-out-range",
        title: "范围外书签",
        createdAt: now - 100 * DAY,
      }),
    ]);

    const page = await openAppPage(context, extensionId, "all");

    await page.getByTitle(t("筛选器", "Filter")).click();
    await page.getByText(t("自定义时间范围", "Custom Date Range")).click();

    const dialog = page.getByRole("dialog");
    await pickCalendarDate(
      page,
      dialog.getByRole("button", { name: t("开始日期", "Start Date") }),
      now - 20 * DAY,
    );
    await pickCalendarDate(
      page,
      dialog.getByRole("button", { name: t("结束日期", "End Date") }),
      now - 5 * DAY,
    );
    await attachStepScreenshot(page, testInfo, "LIB-007-自定义时间范围弹窗");
    await dialog.getByRole("button", { name: t("应用", "Apply") }).click();

    await expect(page.getByText("范围内书签")).toBeVisible();
    await expect(page.getByText("范围外书签")).toBeHidden();
    await attachStepScreenshot(page, testInfo, "LIB-007-自定义时间范围筛选结果");

    await page.getByTitle(t("筛选器", "Filter")).click();
    await expect(
      page.getByRole("menuitem", {
        name: t("自定义时间范围", "Custom Date Range"),
      }),
    ).toBeVisible();
  });

  test("LIB-009 自定义筛选器按创建日期筛选", async ({
    context,
    extensionId,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;
    const DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();

    await seedBookmarks(extensionWorker, [
      createBookmarkFixture({
        id: "bm-recent",
        title: "最近书签",
        createdAt: now - 10 * DAY,
      }),
      createBookmarkFixture({
        id: "bm-old",
        title: "很久以前的书签",
        createdAt: now - 100 * DAY,
      }),
    ]);

    const page = await openAppPage(context, extensionId, "all");

    await page.getByTitle(t("筛选器", "Filter")).click();
    await page.getByText(t("添加自定义筛选器", "Add Custom Filter")).click();

    const dialog = page.getByRole("dialog");
    await dialog
      .getByPlaceholder(t("给这个筛选器起个名字", "Give this filter a name"))
      .fill("按创建日期");

    // 字段切到「创建时间」，值输入随之变成日历下拉
    await dialog.getByRole("combobox").first().click();
    await page.getByRole("option", { name: t("创建时间", "Created At") }).click();
    await dialog.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: t("大于", "Greater Than") }).click();

    await pickCalendarDate(
      page,
      dialog.getByRole("button", { name: t("选择日期", "Pick a date") }),
      now - 20 * DAY,
    );
    await attachStepScreenshot(page, testInfo, "LIB-009-自定义筛选器日期条件");
    await dialog.getByRole("button", { name: t("保存", "Save") }).click();

    await page.getByTitle(t("筛选器", "Filter")).click();
    await page.getByText("按创建日期").click();

    await expect(page.getByText("最近书签")).toBeVisible();
    await expect(page.getByText("很久以前的书签")).toBeHidden();
    await attachStepScreenshot(page, testInfo, "LIB-009-按创建日期筛选结果");
  });

  test("LIB-008 图片收藏详情展示主色与文件信息", async ({
    context,
    extensionId,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;
    const imageUrl = "https://assets.hamhome.test/samurai.png";
    const bookmark = createBookmarkFixture({
      id: "bm-image-metadata",
      url: imageUrl,
      title: "竹林武士角色设定",
      description: "深绿色竹林中的武士角色。",
      tags: ["角色设计", "绿色"],
    });
    await seedBookmarks(extensionWorker, [bookmark]);
    await extensionWorker.evaluate(
      async ({ bookmarkId, sourceUrl, now }) => {
        await chrome.storage.local.set({
          bookmarkClips: [
            {
              id: "clip-image-metadata",
              bookmarkId,
              type: "image",
              imageSourceUrl: sourceUrl,
              sourceUrl: "https://example.com/concept-art",
              sourceTitle: "Concept Art",
              imageMetadata: {
                colors: ["#102A18", "#1E5930", "#C7AA5B", "#D8D0AA"],
                width: 1280,
                height: 1280,
                size: 247_070,
                format: "PNG",
                mimeType: "image/png",
              },
              createdAt: now,
              updatedAt: now,
            },
          ],
        });
      },
      { bookmarkId: bookmark.id, sourceUrl: imageUrl, now: Date.now() },
    );

    await context.route(imageUrl, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    });

    const page = await openAppPage(context, extensionId, "all");
    await page.getByRole("img", { name: "竹林武士角色设定" }).click();

    const imageInfo = page.getByLabel(
      t("图片信息", "Image information"),
    );
    await expect(imageInfo).toBeVisible();
    await expect(imageInfo.getByText("1280 × 1280")).toBeVisible();
    await expect(imageInfo.getByText("241 KB")).toBeVisible();
    await expect(imageInfo.getByText("PNG", { exact: true })).toBeVisible();
    await expect(imageInfo.getByLabel("#102A18")).toBeVisible();
    await expect(imageInfo.getByLabel("#D8D0AA")).toBeVisible();
    await attachStepScreenshot(page, testInfo, "LIB-008-图片主色与文件信息");
  });
});
