import { test, expect } from "../fixtures";
import { createBookmarkFixture } from "../helpers/factories";
import { attachStepScreenshot, openAppPage } from "../helpers/pages";
import { resetExtensionData, seedBookmarks } from "../helpers/storage";
import type { Page } from "@playwright/test";

/** 书签条数：要远多于一屏，滚动后必须换一批行 */
const BOOKMARK_COUNT = 60;

/** 判定「行落在视口内」时允许的像素误差 */
const VIEWPORT_TOLERANCE = 1;

function createListBookmarks(count: number) {
  return Array.from({ length: count }, (_, index) =>
    createBookmarkFixture({
      id: `bm-vlist-${index}`,
      url: `https://example.com/vlist/${index}`,
      title: `List Item ${String(index).padStart(2, "0")}`,
      description: `列表视图虚拟滚动测试数据 ${index}`,
      content: `列表视图虚拟滚动测试数据 ${index}`,
      tags: [`tag-${index % 4}`],
      createdAt: 1_735_689_600_000 - index * 60_000,
      updatedAt: 1_735_689_600_000 - index * 60_000,
    }),
  );
}

interface ListScrollReport {
  /** DOM 中实际渲染出来的虚拟行数 */
  renderedCount: number;
  /** 其中真正与滚动容器视口相交的行数：滚动后为 0 说明虚拟窗口没跟着动 */
  inViewportCount: number;
  /** 已渲染行的最小 / 最大 data-index，用来判断虚拟窗口有没有前移 */
  firstIndex: number;
  lastIndex: number;
  /** 滚动容器自身的滚动状态，避免「滚轮没生效」被误判成通过 */
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

/**
 * 读取列表视图的虚拟滚动状态。
 *
 * 虚拟行是 `position: absolute` 铺在一个撑满总高度的容器里的，
 * 所以「渲染了多少行」不等于「用户能看到多少行」——虚拟化一旦读错滚动容器，
 * 行会继续渲染在列表顶部，滚动后整屏空白。这里同时采集两个数字来区分这两种情况。
 */
async function collectListScroll(page: Page): Promise<ListScrollReport> {
  return page.evaluate((tolerance) => {
    const empty: ListScrollReport = {
      renderedCount: 0,
      inViewportCount: 0,
      firstIndex: -1,
      lastIndex: -1,
      scrollTop: 0,
      scrollHeight: 0,
      clientHeight: 0,
    };

    const rows = Array.from(
      document.querySelectorAll<HTMLElement>("[data-testid='bookmark-virtual-list'] [data-index]"),
    );
    if (rows.length === 0) return empty;

    let scroller: HTMLElement | null = rows[0].parentElement;
    while (
      scroller &&
      !/(auto|scroll|overlay)/.test(getComputedStyle(scroller).overflowY)
    ) {
      scroller = scroller.parentElement;
    }
    if (!scroller) return empty;

    const viewport = scroller.getBoundingClientRect();
    const indexes = rows.map((row) => Number(row.dataset.index));

    const inViewportCount = rows.filter((row) => {
      const rect = row.getBoundingClientRect();
      return (
        Math.min(rect.right, viewport.right) -
          Math.max(rect.left, viewport.left) >
          tolerance &&
        Math.min(rect.bottom, viewport.bottom) -
          Math.max(rect.top, viewport.top) >
          tolerance
      );
    }).length;

    return {
      renderedCount: rows.length,
      inViewportCount,
      firstIndex: Math.min(...indexes),
      lastIndex: Math.max(...indexes),
      scrollTop: Math.round(scroller.scrollTop),
      scrollHeight: Math.round(scroller.scrollHeight),
      clientHeight: Math.round(scroller.clientHeight),
    };
  }, VIEWPORT_TOLERANCE) as Promise<ListScrollReport>;
}

/** 在列表区域滚动指定距离，并等待虚拟列表重算 */
async function scrollList(page: Page, deltaY: number): Promise<void> {
  await page.mouse.move(600, 400);
  await page.mouse.wheel(0, deltaY);
  await page.waitForTimeout(500);
}

test.describe("LIB 列表视图虚拟滚动", () => {
  test.beforeEach(async ({ extensionWorker, e2eVariant }) => {
    await resetExtensionData(extensionWorker, { settings: e2eVariant.settings });
  });

  test("LIB-008 列表视图滚动后继续渲染新行", async ({
    context,
    extensionId,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;
    await seedBookmarks(extensionWorker, createListBookmarks(BOOKMARK_COUNT));

    const page = await openAppPage(context, extensionId, "all");
    await expect(page.getByText("List Item 00")).toBeVisible();

    await page.getByTitle(t("列表视图", "List View")).click();
    await expect
      .poll(async () => (await collectListScroll(page)).inViewportCount, {
        timeout: 15_000,
      })
      .toBeGreaterThan(2);

    const initial = await collectListScroll(page);
    await attachStepScreenshot(page, testInfo, "LIB-008-列表首屏");
    expect(initial.firstIndex).toBe(0);
    // 虚拟化必须真的生效：不能把 60 条全渲染出来
    expect(initial.renderedCount).toBeLessThan(BOOKMARK_COUNT);
    // 列表容器本身必须是可滚动的，否则后面的滚动断言没有意义
    expect(initial.scrollHeight).toBeGreaterThan(initial.clientHeight + 1000);

    // 滚动一屏以上：虚拟窗口必须前移，并且视口里仍然有行
    await scrollList(page, 2000);

    const afterScroll = await collectListScroll(page);
    await attachStepScreenshot(page, testInfo, "LIB-008-滚动后");
    expect(afterScroll.scrollTop).toBeGreaterThan(500);
    expect(afterScroll.firstIndex).toBeGreaterThan(0);
    expect(afterScroll.inViewportCount).toBeGreaterThan(2);

    // 继续滚到底部：必须渲染到最后一条，而不是停在第一屏
    await scrollList(page, 6000);

    const afterBottom = await collectListScroll(page);
    await attachStepScreenshot(page, testInfo, "LIB-008-滚动到底部");
    expect(afterBottom.scrollTop).toBeGreaterThan(afterScroll.scrollTop);
    expect(afterBottom.lastIndex).toBe(BOOKMARK_COUNT - 1);
    expect(afterBottom.inViewportCount).toBeGreaterThan(2);
    await expect(
      page.getByText(`List Item ${BOOKMARK_COUNT - 1}`),
    ).toBeVisible();

    // 回到顶部：虚拟窗口必须跟着回退
    await scrollList(page, -9000);

    const afterTop = await collectListScroll(page);
    await attachStepScreenshot(page, testInfo, "LIB-008-回到顶部");
    expect(afterTop.scrollTop).toBe(0);
    expect(afterTop.firstIndex).toBe(0);
    expect(afterTop.inViewportCount).toBeGreaterThan(2);
  });
});
