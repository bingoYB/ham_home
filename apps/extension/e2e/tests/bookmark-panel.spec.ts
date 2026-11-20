import { expect, test } from "../fixtures";
import { createBookmarkFixture, createPinnedItemFixture } from "../helpers/factories";
import { resetExtensionData, seedBookmarks } from "../helpers/storage";

test("页内书签面板打开后才按需请求 favicon", async ({
  context,
  extensionWorker,
  e2eVariant,
}) => {
  const pageUrl = "https://panel-icons.e2e.test/";
  const faviconEndpoint = "https://cn.cravatar.com/favicon/api/index.php?url=";
  const bookmarks = Array.from({ length: 120 }, (_, index) => {
    const domain = `bookmark-${index}.e2e.test`;
    return createBookmarkFixture({
      id: `bm-favicon-${index}`,
      title: `Bookmark ${index}`,
      url: `https://${domain}/article`,
      favicon: index === 0 ? `${faviconEndpoint}${domain}` : "",
      createdAt: Date.UTC(2025, 0, 1) - index * 1_000,
    });
  });
  const first = bookmarks[0];
  const last = bookmarks[bookmarks.length - 1];
  const pinned = createPinnedItemFixture({ targetId: bookmarks[1].id });

  await resetExtensionData(extensionWorker, { settings: e2eVariant.settings });
  await seedBookmarks(extensionWorker, bookmarks);
  await extensionWorker.evaluate(async (item) => {
    await chrome.storage.sync.set({ pinnedItems: [item] });
  }, pinned);

  const page = await context.newPage();
  await page.setViewportSize({ width: 1000, height: 600 });
  const requestedDomains = new Set<string | null>();
  await page.route("https://cn.cravatar.com/**", async (route) => {
    requestedDomains.add(new URL(route.request().url()).searchParams.get("url"));
    await route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"/>',
    });
  });
  await page.route(pageUrl, (route) =>
    route.fulfill({ contentType: "text/html", body: "<h1>Favicon test</h1>" }),
  );
  await page.goto(pageUrl);

  const panel = page.locator("hamhome-bookmark-panel");
  const firstLink = panel.locator(`a[href="${first.url}"]`);
  const lastLink = panel.locator(`a[href="${last.url}"]`);
  const faviconImages = panel.locator(`img[src^="${faviconEndpoint}"]`);

  await expect(firstLink).toBeAttached();
  expect(requestedDomains.size).toBe(0);
  await expect(faviconImages).toHaveCount(0);

  await page.bringToFront();
  await page.mouse.move(2, 300);
  await page.getByTitle(e2eVariant.text("打开书签面板", "Bookmark panel")).click();

  await expect(firstLink).toBeInViewport();
  const firstDomain = new URL(first.url).hostname;
  const lastDomain = new URL(last.url).hostname;
  await expect.poll(() => requestedDomains.has(firstDomain)).toBe(true);
  expect(requestedDomains.has(lastDomain)).toBe(false);

  await lastLink.scrollIntoViewIfNeeded();
  await expect.poll(() => requestedDomains.has(lastDomain)).toBe(true);

  await page.keyboard.press("Escape");
  await expect(faviconImages).toHaveCount(0);
});
