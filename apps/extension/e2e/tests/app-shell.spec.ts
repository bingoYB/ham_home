import { test, expect } from "../fixtures";
import { createLibraryFixtures } from "../helpers/factories";
import { attachStepScreenshot, openAppPage, expectHash } from "../helpers/pages";
import {
  resetExtensionData,
  seedBookmarks,
  seedCategories,
} from "../helpers/storage";

test.describe("APP 核心壳层与导航", () => {
  test.beforeEach(async ({ extensionWorker, e2eVariant }) => {
    await resetExtensionData(extensionWorker, { settings: e2eVariant.settings });
  });

  test("APP-002 空数据首页引导", async ({
    context,
    extensionId,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;
    const page = await openAppPage(context, extensionId, "all");

    await expect(page.getByText(t("暂无书签", "No bookmarks yet"))).toBeVisible();
    await expect(page.getByText(t("你有 0 个书签", "You have 0 bookmark")).first()).toBeVisible();
    await attachStepScreenshot(page, testInfo, "APP-002-空数据首页");

    await page.getByRole("button", { name: /导入\/导出|导入数据|Import\/Export|Import Data/ }).click();
    await expectHash(page, "import-export");
    await expect(page.getByText(t("导出数据", "Export Data"))).toBeVisible();
    await attachStepScreenshot(page, testInfo, "APP-002-导入导出入口");

    await page.goto(page.url().replace(/#.*/, "#all"));
    await page.getByRole("button", { name: /WebDAV 同步|WebDAV Sync/ }).click();
    await expectHash(page, "settings?tab=storage");
    await page.getByRole("tab", { name: /存储管理|Storage/ }).click();
    await expect(page.getByRole("tab", { name: /存储管理|Storage/ })).toHaveAttribute(
      "data-state",
      "active",
    );
    await attachStepScreenshot(page, testInfo, "APP-002-WebDAV存储入口");
  });

  test("APP-003 侧边栏导航和直接路由", async ({
    context,
    extensionId,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;
    const { bookmarks, categories } = createLibraryFixtures();
    await seedCategories(extensionWorker, categories);
    await seedBookmarks(extensionWorker, bookmarks.slice(0, 2));

    const page = await openAppPage(context, extensionId, "all");

    const routes = [
      { text: t("工作空间", "Workspaces"), hash: "workspaces", marker: t("暂无工作空间", "No workspaces yet") },
      { text: t("Tab 分组", "Tab Groups"), hash: "tab-groups", marker: t("浏览器 Tab 分组", "Browser Tab Groups") },
      { text: t("分类", "Categories"), hash: "categories", marker: t("分类", "Category") },
      { text: t("标签", "Tags"), hash: "tags", marker: t("标签统计", "Tag Statistics") },
      { text: t("隐私", "Privacy"), hash: "privacy", marker: t("数据存储", "Data Storage") },
      { text: t("导入/导出", "Import/Export"), hash: "import-export", marker: t("导出数据", "Export Data") },
      { text: t("设置", "Settings"), hash: "settings", marker: t("AI 配置", "AI Config") },
      { text: t("关于", "About"), hash: "about", marker: "HamHome" },
      { text: t("我的收藏", "My Collection"), hash: "all", marker: "React Docs" },
    ];

    for (const route of routes) {
      await page.getByText(route.text, { exact: true }).first().click();
      await expectHash(page, route.hash);
      await expect(page.getByText(route.marker).first()).toBeVisible();
    }
    await attachStepScreenshot(page, testInfo, "APP-003-侧边栏路由完成");

    await page.goto(page.url().replace(/#.*/, "#settings?tab=storage"));
    await page.reload();
    await expectHash(page, "settings?tab=storage");
    await page.getByRole("tab", { name: /存储管理|Storage/ }).click();
    await expect(page.getByRole("tab", { name: /存储管理|Storage/ })).toHaveAttribute(
      "data-state",
      "active",
    );
    await attachStepScreenshot(page, testInfo, "APP-003-直接路由存储Tab");
  });
});
