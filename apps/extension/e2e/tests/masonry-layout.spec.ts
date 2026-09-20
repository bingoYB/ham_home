import { test, expect } from "../fixtures";
import { createBookmarkFixture } from "../helpers/factories";
import { attachStepScreenshot, openAppPage } from "../helpers/pages";
import { resetExtensionData, seedBookmarks } from "../helpers/storage";
import type { Page } from "@playwright/test";

/** 允许的重叠像素数，用于吸收子像素误差 */
const OVERLAP_TOLERANCE = 1;

const LOREM = [
  "短描述。",
  "中等长度的描述，用来让卡片高度产生差异，从而暴露瀑布流定位问题。",
  "较长的描述文本。瀑布流的核心是每张卡片高度都不一样，因此需要构造长度差异明显的内容，" +
    "让每一列的累计高度互不相同，这样任何一次错误的重排都会立刻表现为卡片互相压盖。",
];

function createVariedBookmarks(count: number) {
  return Array.from({ length: count }, (_, index) =>
    createBookmarkFixture({
      id: `bm-masonry-${index}`,
      url: `https://example.com/masonry/${index}`,
      title: `Masonry Item ${index}`,
      description: LOREM[index % LOREM.length],
      content: LOREM[index % LOREM.length],
      tags: Array.from({ length: (index % 5) + 1 }, (_, i) => `tag-${i}`),
      createdAt: 1_735_689_600_000 - index * 60_000,
      updatedAt: 1_735_689_600_000 - index * 60_000,
    }),
  );
}

interface LayoutReport {
  visibleCount: number;
  /** 实际落在滚动视口内的卡片数，用于发现「滚动后一片空白」 */
  inViewportCount: number;
  overlaps: Array<{ a: string; b: string; x: number; y: number }>;
}

/**
 * 读取瀑布流中所有可见卡片的位置，两两求交集。
 *
 * 只检查可见卡片：masonic 会先把未测量的卡片以 `visibility: hidden`
 * 渲染在静态位置上测高度，这些卡片天然是叠在一起的。
 */
async function collectLayout(page: Page): Promise<LayoutReport> {
  return page.evaluate((tolerance) => {
    const empty = { visibleCount: 0, inViewportCount: 0, overlaps: [] };
    const container = document.querySelector(".masonry");
    if (!container) return empty;

    let scroller = container.parentElement;
    while (scroller && !/(auto|scroll|overlay)/.test(getComputedStyle(scroller).overflowY)) {
      scroller = scroller.parentElement;
    }
    if (!scroller) return empty;
    const viewport = scroller.getBoundingClientRect();

    const cells = Array.from(container.children)
      .filter(
        (el): el is HTMLElement =>
          el instanceof HTMLElement &&
          getComputedStyle(el).visibility !== "hidden",
      )
      .map((el, index) => ({
        label: el.textContent?.trim().slice(0, 40) || `cell-${index}`,
        rect: el.getBoundingClientRect(),
      }));

    const intersects = (a: DOMRect, b: DOMRect) =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > tolerance &&
      Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > tolerance;

    const overlaps: Array<{ a: string; b: string; x: number; y: number }> = [];

    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i].rect;
        const b = cells[j].rect;

        if (intersects(a, b)) {
          overlaps.push({
            a: cells[i].label,
            b: cells[j].label,
            x: Math.round(Math.min(a.right, b.right) - Math.max(a.left, b.left)),
            y: Math.round(Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)),
          });
        }
      }
    }

    return {
      visibleCount: cells.length,
      inViewportCount: cells.filter((cell) => intersects(cell.rect, viewport))
        .length,
      overlaps,
    };
  }, OVERLAP_TOLERANCE);
}

test.describe("LIB 瀑布流布局", () => {
  test.beforeEach(async ({ extensionWorker, e2eVariant }) => {
    await resetExtensionData(extensionWorker, { settings: e2eVariant.settings });
  });

  test("LIB-007 瀑布流卡片不重叠", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    await seedBookmarks(extensionWorker, createVariedBookmarks(60));

    const page = await openAppPage(context, extensionId, "all");
    await expect(page.getByText("Masonry Item 0")).toBeVisible();

    // 等待首屏卡片完成测量与重排
    await expect
      .poll(async () => (await collectLayout(page)).inViewportCount, {
        timeout: 15_000,
      })
      .toBeGreaterThan(3);
    await page.waitForTimeout(500);

    const initial = await collectLayout(page);
    await attachStepScreenshot(page, testInfo, "LIB-007-瀑布流首屏");
    expect(initial.overlaps).toEqual([]);

    // 滚动后必须继续渲染新进入视口的卡片，且不重叠
    await page.mouse.move(600, 400);
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(800);

    const afterScroll = await collectLayout(page);
    await attachStepScreenshot(page, testInfo, "LIB-007-滚动后");
    expect(afterScroll.inViewportCount).toBeGreaterThan(3);
    expect(afterScroll.overlaps).toEqual([]);

    // 窗口变窄会改变列数，重排后依然不能重叠
    await page.setViewportSize({ width: 900, height: 720 });
    await page.waitForTimeout(1000);

    const afterResize = await collectLayout(page);
    await attachStepScreenshot(page, testInfo, "LIB-007-缩窄窗口后");
    expect(afterResize.inViewportCount).toBeGreaterThan(1);
    expect(afterResize.overlaps).toEqual([]);

    // 筛选会让同一个索引换成另一条数据，按索引缓存的高度必须一起作废
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByPlaceholder(/关键词|搜索|Search/).fill("Masonry Item 1");
    await expect(page.getByText("Masonry Item 1", { exact: true })).toBeVisible();
    await page.waitForTimeout(800);

    const filtered = await collectLayout(page);
    await attachStepScreenshot(page, testInfo, "LIB-007-筛选后");
    expect(filtered.inViewportCount).toBeGreaterThan(1);
    expect(filtered.overlaps).toEqual([]);

    // 清空筛选后回到完整列表，同样不能沿用筛选期间的高度
    await page.getByPlaceholder(/关键词|搜索|Search/).fill("");
    await expect(page.getByText("Masonry Item 0", { exact: true })).toBeVisible();
    await page.waitForTimeout(800);

    const cleared = await collectLayout(page);
    await attachStepScreenshot(page, testInfo, "LIB-007-清除筛选后");
    expect(cleared.inViewportCount).toBeGreaterThan(3);
    expect(cleared.overlaps).toEqual([]);
  });
});
