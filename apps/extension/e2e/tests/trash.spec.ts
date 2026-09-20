import { test, expect } from "../fixtures";
import { createBookmarkFixture } from "../helpers/factories";
import { attachStepScreenshot, openAppPage } from "../helpers/pages";
import {
  getBookmarks,
  getStorageState,
  resetExtensionData,
  seedBookmarks,
} from "../helpers/storage";

const DAY = 24 * 60 * 60 * 1000;

function createTrashFixtures(now: number) {
  return [
    createBookmarkFixture({
      id: "bm-alive",
      url: "https://example.com/alive",
      title: "Alive Page",
      createdAt: now - 10 * DAY,
      updatedAt: now - 10 * DAY,
    }),
    createBookmarkFixture({
      id: "bm-trashed",
      url: "https://example.com/trashed",
      title: "Trashed Page",
      createdAt: now - 10 * DAY,
      updatedAt: now - DAY,
      isDeleted: true,
      deletedAt: now - DAY,
    }),
    createBookmarkFixture({
      id: "bm-expiring",
      url: "https://example.com/expiring",
      title: "Expiring Page",
      createdAt: now - 40 * DAY,
      updatedAt: now - 29 * DAY,
      isDeleted: true,
      deletedAt: now - 29 * DAY,
    }),
  ];
}

test.describe("TRASH 回收站", () => {
  test.beforeEach(async ({ extensionWorker, e2eVariant }) => {
    await resetExtensionData(extensionWorker, { settings: e2eVariant.settings });
  });

  test("TRASH-001 列出待清除书签并可恢复", async ({
    context,
    extensionId,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;
    await seedBookmarks(extensionWorker, createTrashFixtures(Date.now()));

    const page = await openAppPage(context, extensionId, "trash");

    // 只列已删除的，正常书签不出现
    await expect(page.getByText("Trashed Page")).toBeVisible();
    await expect(page.getByText("Expiring Page")).toBeVisible();
    await expect(page.getByText("Alive Page")).toBeHidden();
    // 剩余天数按 30 天保留期倒数
    await expect(page.getByText(t("29 天后清除", "Purged in 29 days"))).toBeVisible();
    await expect(page.getByText(t("1 天后清除", "Purged in 1 days"))).toBeVisible();
    await attachStepScreenshot(page, testInfo, "TRASH-001-回收站列表");

    await page
      .getByRole("checkbox")
      .first()
      .click(); // 工具栏全选
    await page.getByTestId("trash-restore-selected").click();

    await expect(page.getByText(t("回收站是空的", "Trash is empty"))).toBeVisible();
    await attachStepScreenshot(page, testInfo, "TRASH-001-恢复后");

    const alive = await getBookmarks(extensionWorker);
    expect(alive.map((item) => item.id).sort()).toEqual([
      "bm-alive",
      "bm-expiring",
      "bm-trashed",
    ]);
  });

  test("TRASH-002 清空回收站留下删除墓碑", async ({
    context,
    extensionId,
    extensionWorker,
    e2eVariant,
  }) => {
    const t = e2eVariant.text;
    await seedBookmarks(extensionWorker, createTrashFixtures(Date.now()));

    const page = await openAppPage(context, extensionId, "trash");
    await expect(page.getByText("Trashed Page")).toBeVisible();

    await page.getByRole("button", { name: t("清空回收站", "Empty trash") }).click();
    await page
      .getByRole("button", { name: t("彻底删除", "Delete forever"), exact: true })
      .click();

    await expect(page.getByText(t("回收站是空的", "Trash is empty"))).toBeVisible();

    const { local } = await getStorageState(extensionWorker);
    // 本体连同正文一起清掉，只留轻量墓碑供同步传播删除
    expect((local.bookmarks as Array<{ id: string }>).map((item) => item.id)).toEqual([
      "bm-alive",
    ]);
    expect(Object.keys(local.bookmarkContents as Record<string, string>)).toEqual([
      "bm-alive",
    ]);
    const tombstones = local.bookmarkTombstones as Array<{
      id: string;
      deletedAt: number;
    }>;
    expect(tombstones.map((item) => item.id).sort()).toEqual([
      "bm-expiring",
      "bm-trashed",
    ]);
    for (const tombstone of tombstones) {
      expect(tombstone.deletedAt).toBeGreaterThan(0);
    }
  });
});
