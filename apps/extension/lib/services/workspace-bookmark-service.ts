import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import { workspaceStorage } from "@/lib/storage/workspace-storage";
import type {
  LocalBookmark,
  Workspace,
  WorkspaceBookmarkConversionOptions,
  WorkspaceBookmarkConversionResult,
  WorkspaceBookmarkRecommendation,
  WorkspacePageBookmarkStatus,
  WorkspaceTabPage,
} from "@/types";

export type WorkspacePageBookmarkStatusMap = Record<
  string,
  WorkspacePageBookmarkStatus
>;

const KEYWORD_TAGS = [
  "docs",
  "api",
  "github",
  "design",
  "admin",
  "dashboard",
  "reference",
];

class WorkspaceBookmarkService {
  async getPageBookmarkStatuses(
    workspace: Workspace,
  ): Promise<WorkspacePageBookmarkStatusMap> {
    const bookmarks = await bookmarkStorage.getBookmarks({ isDeleted: false });
    const existingUrls = this.buildBookmarkUrlMap(bookmarks);

    return workspace.pages.reduce<WorkspacePageBookmarkStatusMap>(
      (statusMap, page) => {
        if (page.bookmarkConversionStatus === "converted") {
          statusMap[page.id] = "converted";
        } else if (existingUrls.has(this.normalizeUrl(page.url))) {
          statusMap[page.id] = "existing";
        } else if (page.bookmarkConversionStatus === "failed") {
          statusMap[page.id] = "failed";
        } else {
          statusMap[page.id] = "not_bookmarked";
        }
        return statusMap;
      },
      {},
    );
  }

  async convertPagesToBookmarks(
    options: WorkspaceBookmarkConversionOptions,
  ): Promise<WorkspaceBookmarkConversionResult> {
    const workspace = await workspaceStorage.getWorkspaceById(
      options.workspaceId,
    );
    if (!workspace) throw new Error("工作空间不存在");

    const pageIdSet = new Set(options.pageIds);
    const pages = workspace.pages.filter((page) => pageIdSet.has(page.id));
    const bookmarks = await bookmarkStorage.getBookmarks({ isDeleted: false });
    const existingByUrl = this.buildBookmarkUrlMap(bookmarks);
    const now = Date.now();
    const result: WorkspaceBookmarkConversionResult = {
      total: pages.length,
      created: 0,
      skippedExisting: 0,
      failed: 0,
    };
    const pageUpdates = new Map<string, Partial<WorkspaceTabPage>>();

    for (const page of pages) {
      const normalizedUrl = this.normalizeUrl(page.url);
      const existingBookmark = existingByUrl.get(normalizedUrl);
      if (existingBookmark) {
        result.skippedExisting += 1;
        pageUpdates.set(page.id, {
          bookmarkId: existingBookmark.id,
          convertedToBookmarkAt: now,
          bookmarkConversionStatus: "existing",
          bookmarkConversionError: undefined,
        });
        continue;
      }

      try {
        const bookmark = await bookmarkStorage.createBookmark({
          url: page.url,
          title: page.title,
          description: workspace.description || page.domain,
          categoryId: options.categoryId,
          tags: Array.from(new Set(options.tags)),
          favicon: page.favicon,
          hasSnapshot: false,
        });
        existingByUrl.set(normalizedUrl, bookmark);
        result.created += 1;
        pageUpdates.set(page.id, {
          bookmarkId: bookmark.id,
          convertedToBookmarkAt: now,
          bookmarkConversionStatus: "converted",
          bookmarkConversionError: undefined,
        });
      } catch (error) {
        result.failed += 1;
        pageUpdates.set(page.id, {
          bookmarkConversionStatus: "failed",
          bookmarkConversionError:
            error instanceof Error ? error.message : "转书签失败",
        });
      }
    }

    const updatedPages = workspace.pages.map((page) => ({
      ...page,
      ...pageUpdates.get(page.id),
    }));
    await workspaceStorage.updateWorkspace(workspace.id, {
      pages: updatedPages,
      convertedToBookmarks: updatedPages.every((page) =>
        ["converted", "existing"].includes(
          page.bookmarkConversionStatus ?? "not_bookmarked",
        ),
      ),
    });

    return result;
  }

  recommendPagesForBookmarkConversion(
    workspace: Workspace,
    command: string,
    categories: { id: string; name: string }[],
  ): WorkspaceBookmarkRecommendation {
    const query = command.trim().toLowerCase();
    const tokens = Array.from(new Set(query.split(/[\s,，。;；]+/))).filter(
      (token) => token.length >= 2,
    );
    const excludedReasons: Record<string, string> = {};
    const reasons: Record<string, string> = {};
    const scores = new Map<string, number>();

    for (const page of workspace.pages) {
      let score = 0;
      const haystack = `${page.title} ${page.url} ${page.domain}`.toLowerCase();

      for (const token of tokens) {
        if (haystack.includes(token)) score += 2;
      }
      score += this.scoreBuiltInIntent(query, haystack);

      if (this.shouldExcludeByCommand(query, haystack)) {
        excludedReasons[page.id] = "命令中要求排除此类页面";
        continue;
      }
      if (score > 0) {
        scores.set(page.id, score);
        reasons[page.id] = "匹配命令关键词或页面特征";
      }
    }

    const pageIds = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([pageId]) => pageId);
    const fallbackIds =
      pageIds.length > 0
        ? pageIds
        : workspace.pages
            .filter((page) => !excludedReasons[page.id])
            .map((page) => page.id);

    return {
      pageIds: fallbackIds,
      recommendedCategoryId: this.matchCategoryId(query, categories),
      recommendedTags: this.extractRecommendedTags(query),
      reasons,
      excludedReasons,
    };
  }

  private buildBookmarkUrlMap(bookmarks: LocalBookmark[]) {
    return new Map(
      bookmarks.map((bookmark) => [this.normalizeUrl(bookmark.url), bookmark]),
    );
  }

  private normalizeUrl(url: string) {
    return bookmarkStorage.normalizeUrlPublic(url);
  }

  private scoreBuiltInIntent(query: string, haystack: string) {
    let score = 0;
    if (/技术|文档|docs|api|reference/.test(query)) {
      if (/docs|documentation|api|reference|github|developer/.test(haystack)) {
        score += 3;
      }
    }
    if (/后台|管理|admin|dashboard/.test(query)) {
      if (/admin|dashboard|console|manage|settings/.test(haystack)) score += 3;
    }
    if (/设计|ui|ux|figma/.test(query)) {
      if (/design|figma|ui|ux/.test(haystack)) score += 3;
    }
    return score;
  }

  private shouldExcludeByCommand(query: string, haystack: string) {
    const wantsExcludeSearch = /不要搜索|排除搜索|不要.*搜索/.test(query);
    const wantsExcludeLogin = /不要登录|排除登录|不要.*登录/.test(query);
    return (
      (wantsExcludeSearch && /search|google|bing|baidu/.test(haystack)) ||
      (wantsExcludeLogin && /login|signin|auth|登录/.test(haystack))
    );
  }

  private matchCategoryId(
    query: string,
    categories: { id: string; name: string }[],
  ) {
    return (
      categories.find((category) =>
        query.includes(category.name.toLowerCase()),
      )?.id ?? null
    );
  }

  private extractRecommendedTags(query: string) {
    return KEYWORD_TAGS.filter((tag) => query.includes(tag)).slice(0, 5);
  }
}

export const workspaceBookmarkService = new WorkspaceBookmarkService();
