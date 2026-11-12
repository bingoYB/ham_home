import type { Download } from "@playwright/test";
import { test, expect } from "../fixtures";
import { resolveBookmarkTreeNodes } from "../../utils/browser-bookmark-tree";
import {
  createLibraryFixtures,
  createTabGroupRuleFixture,
  createWorkspaceCategoryFixture,
  createWorkspaceFixture,
} from "../helpers/factories";
import {
  attachStepScreenshot,
  openAppPage,
  setHiddenFileInput,
} from "../helpers/pages";
import {
  getBookmarks,
  getStorageState,
  resetExtensionData,
  seedBookmarks,
  seedCategories,
  seedTabGroupRules,
  seedWorkspaces,
} from "../helpers/storage";

test.describe("IMPORT 导入导出", () => {
  test.beforeEach(async ({ extensionWorker, e2eVariant }) => {
    await resetExtensionData(extensionWorker, { settings: e2eVariant.settings });
  });

  test('IMPORT-CONCURRENT 两个页面同时导入保留全部书签和正文', async ({ context, extensionId, extensionWorker }) => {
    const first = await openAppPage(context, extensionId, 'import-export');
    const second = await openAppPage(context, extensionId, 'import-export');
    await Promise.all([first, second].map((page, device) => setHiddenFileInput(page, 'input[type="file"]', {
      name: `batch-${device}.json`, mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({
        version: '1.0.0', categories: [],
        bookmarks: Array.from({ length: 20 }, (_, index) => ({
          url: `https://concurrent-${device}.test/${index}`, title: `${device}-${index}`,
          content: `body-${device}-${index}`, tags: [],
        })),
      })),
    })));
    await expect.poll(async () => (await getBookmarks(extensionWorker)).length).toBe(40);
    await expect.poll(async () => {
      const state = await getStorageState(extensionWorker);
      return Object.keys((state.local.bookmarkContents ?? {}) as object).length;
    }).toBe(40);
  });

  test("IMPORT-001 JSON 导入", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    const importData = {
      version: "1.0.0",
      exportedAt: Date.now(),
      categories: [
        { id: "imp-cat", name: "导入分类", parentId: null, order: 0, createdAt: 1 },
      ],
      bookmarks: [
        {
          id: "legacy-bm",
          url: "https://import.example.com",
          title: "Imported Bookmark",
          description: "from json",
          content: "# Imported article\n\n完整正文",
          categoryId: "imp-cat",
          tags: ["imported"],
          favicon: "",
          hasSnapshot: false,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      workspaceCategories: [
        createWorkspaceCategoryFixture({ id: "imp-wcat", name: "导入工作区分类" }),
      ],
      workspaces: [
        createWorkspaceFixture({
          id: "imp-ws",
          name: "Imported Workspace",
          categoryId: "imp-wcat",
        }),
      ],
      tabGroupRules: [
        createTabGroupRuleFixture({
          id: "imp-rule",
          name: "Imported Rule",
          groupTitle: "导入分组",
        }),
      ],
      tabGroupAutoGroupSettings: {
        aiAutoGroupEnabled: false,
        aiAutoGroupInstructions: "",
        domainAutoGroupEnabled: false,
        updatedAt: 1,
      },
    };

    const page = await openAppPage(context, extensionId, "import-export");
    await setHiddenFileInput(page, 'input[type="file"]', {
      name: "hamhome-import.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(importData), "utf-8"),
    });

    await expect(page.getByText(/导入成功|成功|Import completed/).first()).toBeVisible();
    await attachStepScreenshot(page, testInfo, "IMPORT-001-JSON导入成功");

    const state = await getStorageState(extensionWorker);
    expect(state.local.categories).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "导入分类" })]),
    );
    expect(state.local.workspaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Imported Workspace" }),
      ]),
    );
    expect(state.sync.tabGroupRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ groupTitle: "导入分组" }),
      ]),
    );
    const bookmarks = await getBookmarks(extensionWorker);
    expect((state.local.bookmarkContents as Record<string, string>)[bookmarks[0].id]).toBe("# Imported article\n\n完整正文");
    expect(bookmarks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Imported Bookmark" }),
      ]),
    );
  });

  test("IMPORT-002 导出 JSON 和 HTML", async ({
    context,
    extensionId,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;
    const { bookmarks, categories } = createLibraryFixtures();
    await seedCategories(extensionWorker, categories);
    await seedBookmarks(extensionWorker, bookmarks.slice(0, 2));
    await extensionWorker.evaluate(async (id) => {
      await chrome.storage.local.set({ bookmarkContents: { [id]: "# Exported article\n\n完整正文" } });
    }, bookmarks[0].id);
    await seedWorkspaces(extensionWorker, [createWorkspaceFixture()]);
    await seedTabGroupRules(extensionWorker, [createTabGroupRuleFixture()]);

    const page = await openAppPage(context, extensionId, "import-export");
    await attachStepScreenshot(page, testInfo, "IMPORT-002-导出入口");

    const [jsonDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: new RegExp(`^${t("JSON 格式", "JSON Format")}`) }).click(),
    ]);
    const jsonText = await readDownloadText(jsonDownload);
    const json = JSON.parse(jsonText);
    expect(json.bookmarks).toHaveLength(2);
    expect(json.bookmarks.find((bookmark: { id: string }) => bookmark.id === bookmarks[0].id).content).toBe("# Exported article\n\n完整正文");
    expect(json.categories).toHaveLength(2);
    expect(json.workspaces).toHaveLength(1);
    expect(json.tabGroupRules).toHaveLength(1);

    const [htmlDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: new RegExp(`^${t("HTML 格式", "HTML Format")}`) }).click(),
    ]);
    const html = await readDownloadText(htmlDownload);
    expect(html).toMatch(/HamHome (书签导出|Bookmark Export)/);
    expect(html).toContain("React Docs");
    expect(html).toContain("https://react.dev/reference/react");
    await attachStepScreenshot(page, testInfo, "IMPORT-002-导出完成");
  });

  test("HTMLIMPORT-001 HTML 导入保留目录", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
      <DL><p>
        <DT><H3>资料夹</H3>
        <DL><p>
          <DT><A HREF="https://html-import.example.com/one">HTML One</A>
          <DT><A HREF="https://html-import.example.com/one">HTML One Duplicate</A>
        </DL><p>
      </DL><p>`;

    const page = await openAppPage(context, extensionId, "import-export");
    await setHiddenFileInput(page, 'input[type="file"]', {
      name: "bookmarks.html",
      mimeType: "text/html",
      buffer: Buffer.from(html, "utf-8"),
    });

    await expect(page.getByText(/导入成功|成功|Import completed/).first()).toBeVisible();
    await attachStepScreenshot(page, testInfo, "HTMLIMPORT-001-HTML导入成功");
    const state = await getStorageState(extensionWorker);
    expect(state.local.categories).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "资料夹" })]),
    );
    const bookmarks = await getBookmarks(extensionWorker);
    expect(bookmarks.filter((item) => item.url.includes("html-import"))).toHaveLength(1);
  });

  test("BROWSERIMPORT-001 保留无标题书签、内部链接和带引号的书签脚本", async ({
    context, extensionId, extensionWorker, e2eVariant,
  }) => {
    const t = e2eVariant.text;
    const tree = await extensionWorker.evaluate(() => chrome.bookmarks.getTree());
    const { bookmarkBarNode } = resolveBookmarkTreeNodes(tree);
    const source = await extensionWorker.evaluate(async (parentId) => {
      const folder = await chrome.bookmarks.create({ parentId, title: 'Tools & scripts' });
      const bookmarks = [
        { title: '', url: 'http://blog.bahraniapps.com/gifcam/#download' },
        { title: '新标签页', url: 'chrome://newtab/' },
        { title: '导入设置', url: 'chrome://settings/importData' },
        { title: '源码', url: 'view-source:https://browser-import.example.com/source' },
        { title: 'Script <tool>', url: 'javascript:globalThis.__bookmarkImportExecuted=true;void("a&b<test>")//' },
      ];
      return Promise.all(bookmarks.map((bookmark) => chrome.bookmarks.create({ ...bookmark, parentId: folder.id })));
    }, bookmarkBarNode.id);

    const page = await openAppPage(context, extensionId, 'import-export');
    await page.getByRole('button', { name: new RegExp(t('从浏览器导入', 'Import from Browser')) }).click();
    await expect(page.getByText(t('导入完成', 'Import completed'), { exact: true })).toBeVisible();
    const imported = await getBookmarks(extensionWorker);
    for (const bookmark of source) {
      expect(imported).toContainEqual(expect.objectContaining({
        url: bookmark.url, title: bookmark.title || bookmark.url,
      }));
    }
    await expect(page.getByRole('button', { name: /查看失败清单|View failure list/ })).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__bookmarkImportExecuted)).toBeUndefined();
  });

  test("HTMLIMPORT-SPECIAL 特殊链接在 AI 导入模式中原样保存且不触发 AI", async ({
    context, extensionId, extensionWorker, e2eVariant,
  }) => {
    const t = e2eVariant.text;
    await extensionWorker.evaluate(async () => {
      const { aiConfig = {} } = await chrome.storage.sync.get('aiConfig');
      await chrome.storage.sync.set({ aiConfig: { ...aiConfig, apiKey: '' } });
    });
    const page = await openAppPage(context, extensionId, 'import-export');
    await page.getByRole('checkbox', { name: t('使用 AI 自动分类打标', 'Use AI for auto categorization') }).check();
    await setHiddenFileInput(page, 'input[type="file"]', {
      name: 'special-bookmarks.html', mimeType: 'text/html',
      buffer: Buffer.from(`<DL>
        <DT><A HREF="chrome://newtab/"></A>
        <DT><A HREF="chrome://kill/">内部页面</A>
        <DT><A HREF="view-source:https://html-special.example.com/source">源码</A>
        <DT><A HREF="javascript:globalThis.__bookmarkImportExecuted=true;void(&quot;a&amp;b&lt;test&gt;&quot;)//">脚本</A>
        <DT><A HREF="about:blank">空白页</A>
      </DL>`),
    });
    await expect(page.getByText(t('导入完成', 'Import completed'), { exact: true })).toBeVisible();
    const imported = await getBookmarks(extensionWorker);
    expect(imported).toHaveLength(5);
    expect(imported).toContainEqual(expect.objectContaining({ title: 'chrome://newtab/', url: 'chrome://newtab/' }));
    expect(imported).toContainEqual(expect.objectContaining({
      url: 'javascript:globalThis.__bookmarkImportExecuted=true;void("a&b<test>")//',
    }));
    await expect(page.getByRole('button', { name: /查看失败清单|View failure list/ })).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__bookmarkImportExecuted)).toBeUndefined();
  });

  test("HTMLIMPORT-002 HTML 导入取消和恢复", async ({
    context,
    extensionId,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;
    await extensionWorker.evaluate(async () => {
      await chrome.storage.local.set({
        htmlImportTaskPayload: {
          id: "cancelled-task",
          source: "file",
          options: {
            preserveFolders: true,
            enableAIAnalysis: false,
            fetchPageContent: false,
          },
          bookmarksToImport: [],
          total: 0,
          createdAt: Date.now(),
        },
        htmlImportTaskProgress: {
          taskId: "cancelled-task",
          status: "cancelled",
          currentIndex: 0,
          imported: 0,
          skipped: 0,
          duplicateSkipped: 0,
          categoriesCreated: 0,
          aiProcessed: 0,
          importedBookmarkIds: [],
          updatedAt: Date.now(),
        },
      });
    });

    const page = await openAppPage(context, extensionId, "import-export");
    await expect(page.getByText(t("导出数据", "Export Data"))).toBeVisible();
    await attachStepScreenshot(page, testInfo, "HTMLIMPORT-002-取消任务恢复后");

    const state = await getStorageState(extensionWorker);
    expect(state.local.htmlImportTaskPayload ?? null).toBeNull();
    expect(state.local.htmlImportTaskProgress ?? null).toBeNull();
  });
});

async function readDownloadText(download: Download) {
  const stream = await download.createReadStream();
  if (!stream) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf-8");
}
