import { nanoid } from "nanoid";
import { browser } from "wxt/browser";
import { workspaceStorage } from "@/lib/storage/workspace-storage";
import type {
  CreateWorkspaceInput,
  Workspace,
  WorkspaceRestoreOptions,
  WorkspaceRestoreResult,
  WorkspaceTabPage,
} from "@/types";

export interface WorkspacePreview {
  name: string;
  pages: WorkspaceTabPage[];
  duplicateUrlCount: number;
}

const SAVEABLE_PROTOCOLS = new Set(["http:", "https:", "file:"]);

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
  const domains = Array.from(new Set(pages.map((page) => page.domain).filter(Boolean))).slice(
    0,
    3,
  );
  const suffix = domains.length ? ` · ${domains.join("、")}` : "";
  return `工作空间 ${formatDateTime(Date.now())}${suffix}`;
}

async function getCurrentWindowUrls(): Promise<Set<string>> {
  const tabs = await browser.tabs.query({ currentWindow: true });
  return new Set(tabs.map((tab) => tab.url).filter(isSaveableUrl));
}

class WorkspaceService {
  async previewCurrentWindow(): Promise<WorkspacePreview> {
    const tabs = await browser.tabs.query({ currentWindow: true });
    const pages = tabs
      .filter((tab) => isSaveableUrl(tab.url))
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map<WorkspaceTabPage>((tab) => ({
        id: nanoid(),
        title: tab.title || tab.url || "Untitled",
        url: tab.url!,
        domain: getDomain(tab.url!),
        favicon: tab.favIconUrl,
        pinned: tab.pinned,
        windowId: tab.windowId,
        index: tab.index ?? 0,
      }));

    return {
      name: buildDefaultName(pages),
      pages,
      duplicateUrlCount: dedupeUrlCount(pages),
    };
  }

  async saveCurrentWindow(
    input: Partial<CreateWorkspaceInput> = {},
  ): Promise<Workspace> {
    const preview = await this.previewCurrentWindow();
    if (preview.pages.length === 0) {
      throw new Error("当前窗口没有可保存的页面");
    }

    return workspaceStorage.createWorkspace({
      name: input.name?.trim() || preview.name,
      description: input.description ?? "",
      categoryId: input.categoryId ?? null,
      tags: input.tags ?? [],
      pages: input.pages?.length ? input.pages : preview.pages,
      analysis: input.analysis,
    });
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

    const urls = pages
      .map((page) => page.url)
      .filter((url) => !currentUrls.has(url));
    const skippedDuplicateCount = pages.length - urls.length;

    if (urls.length === 0) {
      return {
        restoredCount: 0,
        skippedDuplicateCount,
      };
    }

    if (options.mode === "newWindow") {
      await browser.windows.create({ url: urls });
    } else {
      for (const url of urls) {
        await browser.tabs.create({ url, active: false });
      }
    }

    await workspaceStorage.updateWorkspace(workspace.id, {
      isRestored: true,
      restoredAt: Date.now(),
    });

    return {
      restoredCount: urls.length,
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
}

export const workspaceService = new WorkspaceService();
