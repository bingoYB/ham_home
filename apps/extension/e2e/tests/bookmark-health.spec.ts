import { test, expect } from "../fixtures";
import { createBookmarkFixture } from "../helpers/factories";
import { attachStepScreenshot, openAppPage } from "../helpers/pages";
import {
  getBookmarks,
  getStorageState,
  resetExtensionData,
  seedBookmarks,
} from "../helpers/storage";

/** 同一网址在多台设备上各存了一份，正是 WebDAV 同步留下的重复形态 */
function createDuplicateFixtures() {
  return [
    createBookmarkFixture({
      id: "bm-keep",
      url: "https://example.com/duplicated",
      title: "Duplicated Page",
      createdAt: 1_000,
      updatedAt: 1_000,
    }),
    createBookmarkFixture({
      id: "bm-dup-1",
      url: "https://example.com/duplicated?utm_source=news",
      title: "Duplicated Page Copy 1",
      createdAt: 2_000,
      updatedAt: 2_000,
    }),
    createBookmarkFixture({
      id: "bm-dup-2",
      url: "https://example.com/duplicated",
      title: "Duplicated Page Copy 2",
      createdAt: 3_000,
      updatedAt: 3_000,
    }),
    createBookmarkFixture({
      id: "bm-unique",
      url: "https://example.com/unique",
      title: "Unique Page",
      createdAt: 4_000,
      updatedAt: 4_000,
    }),
  ];
}

test.describe("HEALTH 书签体检中心", () => {
  test.beforeEach(async ({ extensionWorker, e2eVariant }) => {
    await resetExtensionData(extensionWorker, { settings: e2eVariant.settings });
  });

  test("HEALTH-001 未体检也能筛出重复项并一键清理", async ({
    context,
    extensionId,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;
    await seedBookmarks(extensionWorker, createDuplicateFixtures());

    const page = await openAppPage(context, extensionId, "health");
    await expect(page.getByText("Unique Page")).toBeVisible();

    // 重复筛选不依赖体检结果
    await page.getByRole("button", { name: t("重复书签", "Duplicates") }).click();
    await expect(page.getByText("Duplicated Page", { exact: true })).toBeVisible();
    await expect(page.getByText("Duplicated Page Copy 1")).toBeVisible();
    await expect(page.getByText("Unique Page")).toBeHidden();
    await attachStepScreenshot(page, testInfo, "HEALTH-001-重复项筛选");

    await page
      .getByRole("button", { name: t("清理重复项", "Clean duplicates") })
      .click();
    await page
      .getByRole("button", { name: t("删除", "Delete"), exact: true })
      .click();

    // 每组只保留收藏时间最早的一条
    await expect(page.getByText("Duplicated Page Copy 1")).toBeHidden();
    await expect(page.getByText("Duplicated Page Copy 2")).toBeHidden();
    await attachStepScreenshot(page, testInfo, "HEALTH-001-清理后");

    const alive = await getBookmarks(extensionWorker);
    expect(alive.map((item) => item.id).sort()).toEqual(["bm-keep", "bm-unique"]);

    // 软删除并刷新 updatedAt，删除才能通过 WebDAV 传播到其他设备
    const { local } = await getStorageState(extensionWorker);
    const deleted = (local.bookmarks as Array<{ id: string; isDeleted?: boolean; updatedAt: number }>)
      .filter((item) => item.isDeleted);
    expect(deleted.map((item) => item.id).sort()).toEqual(["bm-dup-1", "bm-dup-2"]);
    for (const item of deleted) expect(item.updatedAt).toBeGreaterThan(3_000);
  });

  test("HEALTH-002 勾选后批量删除书签", async ({
    context,
    extensionId,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;
    await seedBookmarks(extensionWorker, createDuplicateFixtures());

    const page = await openAppPage(context, extensionId, "health");
    await expect(page.getByText("Unique Page")).toBeVisible();

    const checkboxes = page.getByRole("checkbox");
    await checkboxes.first().click(); // 工具栏的全选
    await expect(
      page.getByText(t("已选择 4 项", "4 selected")),
    ).toBeVisible();
    await attachStepScreenshot(page, testInfo, "HEALTH-002-全选");

    await page
      .getByRole("button", { name: t("批量删除", "Delete Selected") })
      .click();
    await page
      .getByRole("button", { name: t("删除", "Delete"), exact: true })
      .click();

    await expect(page.getByText("Unique Page")).toBeHidden();
    const remaining = await getBookmarks(extensionWorker);
    expect(remaining.filter((item) => !item.isDeleted)).toHaveLength(0);
  });
});
