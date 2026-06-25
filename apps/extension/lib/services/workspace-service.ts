import { nanoid } from "nanoid";
import { browser } from "wxt/browser";
import { getFavicon } from "@hamhome/utils";
import { workspaceRestoreSuppressionStorage } from "@/lib/storage/workspace-restore-suppression-storage";
import { workspaceStorage } from "@/lib/storage/workspace-storage";
import type {
  CreateWorkspaceInput,
  Workspace,
  WorkspaceRestoreOptions,
  WorkspaceRestoreResult,
  WorkspaceTabGroup,
  WorkspaceTabGroupColor,
  WorkspaceTabPage,
} from "@/types";

export interface WorkspacePreview {
  name: string;
  pages: WorkspaceTabPage[];
  tabGroups?: WorkspaceTabGroup[];
  duplicateUrlCount: number;
  currentWindowId?: number;
}

const SAVEABLE_PROTOCOLS = new Set(["http:", "https:", "file:"]);
const TAB_GROUP_ID_NONE = -1;

function getDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname || parsed.protocol.replace(":", "");
  } catch {
    return "";
  }
}

function isSaveableUrl(url?: string): url is string {
  if (!url) return false;
  try {
    return SAVEABLE_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

function dedupeUrlCount(pages: WorkspaceTabPage[]): number {
  const counts = new Map<string, number>();
  for (const page of pages) {
    counts.set(page.url, (counts.get(page.url) ?? 0) + 1);
  }

  let duplicateCount = 0;
  for (const count of counts.values()) {
    if (count > 1) {
      duplicateCount += count - 1;
    }
  }
  return duplicateCount;
}

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function buildDefaultName(pages: WorkspaceTabPage[]): string {
  return `工作空间 ${formatDateTime(Date.now())}`;
}

function getChromeTabGroupsApi() {
  if (typeof chrome === "undefined" || !chrome.tabGroups?.query) {
    return null;
  }
  return chrome;
}

function getChromeTabGroupsRestoreApi() {
  if (
    typeof chrome === "undefined" ||
    !chrome.tabs?.group ||
    !chrome.tabGroups?.update
  ) {
    return null;
  }
  return chrome;
}

function getWorkspaceTabGroupKey(input: {
  windowId?: number;
  tabGroupId?: number;
  id?: number;
}): string | null {
  const groupId = input.tabGroupId ?? input.id;
  if (groupId == null) return null;
  return `${input.windowId ?? -1}:${groupId}`;
}

function normalizeTabGroupColor(color?: string): WorkspaceTabGroupColor {
  const values: WorkspaceTabGroupColor[] = [
    "grey",
    "blue",
    "red",
    "yellow",
    "green",
    "pink",
    "purple",
    "cyan",
    "orange",
  ];
  return values.includes(color as WorkspaceTabGroupColor)
    ? (color as WorkspaceTabGroupColor)
    : "grey";
}

function getTabGroupId(tab: Browser.tabs.Tab): number | undefined {
  const groupId = (tab as Browser.tabs.Tab & { groupId?: number }).groupId;
  return typeof groupId === "number" && groupId !== TAB_GROUP_ID_NONE
    ? groupId
    : undefined;
}

function filterTabGroupsForPages(
  tabGroups: WorkspaceTabGroup[] | undefined,
  pages: WorkspaceTabPage[],
): WorkspaceTabGroup[] | undefined {
  if (!tabGroups?.length) return undefined;
  const groupKeys = new Set(
    pages
      .filter((page) => page.tabGroupId != null)
      .map((page) => `${page.windowId ?? -1}:${page.tabGroupId}`),
  );
  const filtered = tabGroups.filter((group) =>
    groupKeys.has(`${group.windowId ?? -1}:${group.id}`),
  );
  return filtered.length ? filtered : undefined;
}

async function getTabGroupsForTabs(tabs: Browser.tabs.Tab[]): Promise<WorkspaceTabGroup[]> {
  const api = getChromeTabGroupsApi();
  if (!api) return [];

  const groupedWindowIds = new Set(
    tabs
      .filter((tab) => getTabGroupId(tab) != null && tab.windowId != null)
      .map((tab) => tab.windowId!),
  );

  const groupsByKey = new Map<string, WorkspaceTabGroup>();
  await Promise.all(
    Array.from(groupedWindowIds).map(async (windowId) => {
      const groups = await api.tabGroups.query({ windowId });
      for (const group of groups) {
        groupsByKey.set(`${windowId}:${group.id}`, {
          id: group.id,
          title: group.title || "Untitled Group",
          color: normalizeTabGroupColor(group.color),
          collapsed: group.collapsed,
          windowId,
        });
      }
    }),
  );

  return Array.from(groupsByKey.values());
}

async function getCurrentWindowUrls(): Promise<Set<string>> {
  const tabs = await browser.tabs.query({ currentWindow: true });
  return new Set(tabs.map((tab) => tab.url).filter(isSaveableUrl));
}

type RestoredWorkspaceTab = {
  page: WorkspaceTabPage;
  tab: Browser.tabs.Tab;
};

class WorkspaceService {
  async previewCurrentWindow(allWindows: boolean = true): Promise<WorkspacePreview> {
    const [tabs, currentWindow] = await Promise.all([
      browser.tabs.query(allWindows ? {} : { currentWindow: true }),
      browser.windows.getCurrent(),
    ]);

    const tabGroups = await getTabGroupsForTabs(tabs);
    const pages = tabs
      .filter((tab) => isSaveableUrl(tab.url))
      .sort((a, b) => {
        if (a.windowId !== b.windowId) {
          return (a.windowId ?? 0) - (b.windowId ?? 0);
        }
        return (a.index ?? 0) - (b.index ?? 0);
      })
      .map<WorkspaceTabPage>((tab) => ({
        id: nanoid(),
        title: tab.title || tab.url || "Untitled",
        url: tab.url!,
        domain: getDomain(tab.url!),
        favicon: getFavicon(tab.url!),
        pinned: tab.pinned,
        windowId: tab.windowId,
        tabId: tab.id,
        tabGroupId: getTabGroupId(tab),
        index: tab.index ?? 0,
      }));

    return {
      name: buildDefaultName(pages),
      pages,
      tabGroups: filterTabGroupsForPages(tabGroups, pages),
      duplicateUrlCount: dedupeUrlCount(pages),
      currentWindowId: currentWindow.id,
    };
  }

  createPreviewFromPages(
    pages: WorkspaceTabPage[],
    currentWindowId?: number,
    tabGroups?: WorkspaceTabGroup[],
  ): WorkspacePreview {
    return {
      name: buildDefaultName(pages),
      pages,
      tabGroups: filterTabGroupsForPages(tabGroups, pages),
      duplicateUrlCount: dedupeUrlCount(pages),
      currentWindowId,
    };
  }

  async saveCurrentWindow(
    input: Partial<CreateWorkspaceInput> = {},
  ): Promise<Workspace> {
    const preview = await this.previewCurrentWindow();
    if (preview.pages.length === 0) {
      throw new Error("当前窗口没有可保存的页面");
    }

    const pages = input.pages?.length ? input.pages : preview.pages;

    return workspaceStorage.createWorkspace({
      name: input.name?.trim() || preview.name,
      description: input.description ?? "",
      categoryId: input.categoryId ?? null,
      tags: input.tags ?? [],
      pages,
      tabGroups: input.tabGroups ?? filterTabGroupsForPages(preview.tabGroups, pages),
      analysis: input.analysis,
    });
  }

  async closeSavedPageTabs(pages: WorkspaceTabPage[]): Promise<void> {
    const tabIds = Array.from(
      new Set(
        pages
          .map((page) => page.tabId)
          .filter((tabId): tabId is number => typeof tabId === "number"),
      ),
    );

    if (tabIds.length === 0) return;

    const results = await Promise.allSettled(
      tabIds.map((tabId) => browser.tabs.remove(tabId)),
    );
    const failedCount = results.filter((result) => result.status === "rejected").length;
    if (failedCount > 0) {
      console.warn("[WorkspaceService] Failed to close some saved tabs", {
        failedCount,
        totalCount: tabIds.length,
      });
    }
  }

  async restoreWorkspace(
    workspace: Workspace,
    options: WorkspaceRestoreOptions,
  ): Promise<WorkspaceRestoreResult> {
    const selectedPageIds = options.pageIds?.length
      ? new Set(options.pageIds)
      : null;
    const pages = workspace.pages.filter((page) =>
      selectedPageIds ? selectedPageIds.has(page.id) : true,
    );
    const currentUrls =
      options.mode === "currentWindow" && options.skipDuplicateUrls !== false
        ? await getCurrentWindowUrls()
        : new Set<string>();

    const pagesToRestore = pages.filter((page) => !currentUrls.has(page.url));
    const skippedDuplicateCount = pages.length - pagesToRestore.length;

    if (pagesToRestore.length === 0) {
      return {
        restoredCount: 0,
        skippedDuplicateCount,
      };
    }

    await workspaceRestoreSuppressionStorage.suppressUrls(
      pagesToRestore.map((page) => page.url),
    );

    const restoredTabs =
      options.mode === "newWindow"
        ? await this.restorePagesToNewWindow(pagesToRestore)
        : await this.restorePagesToCurrentWindow(pagesToRestore);

    await workspaceRestoreSuppressionStorage.suppressTabIds(
      restoredTabs
        .map(({ tab }) => tab.id)
        .filter((tabId): tabId is number => typeof tabId === "number"),
    );

    await this.restoreTabGroups(workspace, restoredTabs);

    await workspaceStorage.updateWorkspace(workspace.id, {
      isRestored: true,
      restoredAt: Date.now(),
    });

    return {
      restoredCount: restoredTabs.length,
      skippedDuplicateCount,
    };
  }

  async restoreWorkspaceById(
    workspaceId: string,
    options: WorkspaceRestoreOptions,
  ): Promise<WorkspaceRestoreResult> {
    const workspace = await workspaceStorage.getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new Error("工作空间不存在");
    }
    return this.restoreWorkspace(workspace, options);
  }

  private async restorePagesToCurrentWindow(
    pages: WorkspaceTabPage[],
  ): Promise<RestoredWorkspaceTab[]> {
    const restoredTabs: RestoredWorkspaceTab[] = [];
    for (const page of pages) {
      const tab = await browser.tabs.create({
        url: page.url,
        active: false,
        pinned: page.pinned,
      });
      restoredTabs.push({ page, tab });
    }
    return restoredTabs;
  }

  private async restorePagesToNewWindow(
    pages: WorkspaceTabPage[],
  ): Promise<RestoredWorkspaceTab[]> {
    const createdWindow = await browser.windows.create({
      url: pages.map((page) => page.url),
    });
    if (!createdWindow) return [];

    const tabs =
      createdWindow.id == null
        ? createdWindow.tabs ?? []
        : await browser.tabs.query({ windowId: createdWindow.id });
    const sortedTabs = [...tabs].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    await Promise.all(
      sortedTabs.map(async (tab, index) => {
        if (tab.id == null || !pages[index]?.pinned) return;
        await browser.tabs.update(tab.id, { pinned: true });
      }),
    );

    return sortedTabs
      .slice(0, pages.length)
      .map((tab, index) => ({ page: pages[index], tab }));
  }

  private async restoreTabGroups(
    workspace: Workspace,
    restoredTabs: RestoredWorkspaceTab[],
  ): Promise<void> {
    const api = getChromeTabGroupsRestoreApi();
    if (!api || !workspace.tabGroups?.length) return;

    const groupMetaByKey = new Map(
      workspace.tabGroups
        .map((group) => [getWorkspaceTabGroupKey(group), group] as const)
        .filter((entry): entry is [string, WorkspaceTabGroup] => entry[0] != null),
    );
    const tabIdsByGroupKey = new Map<string, number[]>();

    for (const { page, tab } of restoredTabs) {
      if (page.pinned || tab.id == null) continue;
      const groupKey = getWorkspaceTabGroupKey({
        windowId: page.windowId,
        tabGroupId: page.tabGroupId,
      });
      if (!groupKey || !groupMetaByKey.has(groupKey)) continue;
      tabIdsByGroupKey.set(groupKey, [
        ...(tabIdsByGroupKey.get(groupKey) ?? []),
        tab.id,
      ]);
    }

    for (const [groupKey, tabIds] of tabIdsByGroupKey) {
      const group = groupMetaByKey.get(groupKey);
      if (!group || tabIds.length === 0) continue;

      try {
        const groupId = await api.tabs.group({ tabIds });
        await api.tabGroups.update(groupId, {
          title: group.title,
          color: group.color,
          collapsed: group.collapsed,
        });
      } catch (error) {
        console.warn("[WorkspaceService] Failed to restore tab group", {
          groupKey,
          error,
        });
      }
    }
  }
}

export const workspaceService = new WorkspaceService();
