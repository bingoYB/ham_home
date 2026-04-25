import { configStorage } from "@/lib/storage/config-storage";
import { workspaceStorage } from "@/lib/storage/workspace-storage";
import type {
  Workspace,
  WorkspaceAnalysis,
  WorkspaceDuplicateGroup,
  WorkspaceTabPage,
} from "@/types";

const CATEGORY_RULES = [
  { category: "技术文档", pattern: /docs|documentation|api|developer|reference|文档|接口/i },
  { category: "代码仓库", pattern: /github|gitlab|bitbucket|repo|pull|commit/i },
  { category: "搜索结果", pattern: /google|bing|baidu|search|搜索/i },
  { category: "管理平台", pattern: /admin|dashboard|console|manage|后台|管理/i },
  { category: "设计素材", pattern: /figma|design|ui|ux|sketch|dribbble/i },
  { category: "沟通协作", pattern: /slack|discord|teams|notion|docs\.google|飞书|语雀/i },
  { category: "待阅读", pattern: /blog|article|news|post|medium|substack|阅读/i },
];

const EXCLUDED_BOOKMARK_PATTERN = /google|bing|baidu|search|login|signin|auth|登录/i;

class WorkspaceAnalysisService {
  async analyzeWorkspace(workspace: Workspace): Promise<Workspace> {
    const aiConfig = await configStorage.getAIConfig();
    const aiEnabled = Boolean(aiConfig.enableSmartCategory);
    const duplicateGroups = this.findDuplicateGroups(workspace.pages);
    const duplicatePageIds = new Set(
      duplicateGroups.flatMap((group) =>
        group.pageIds.filter((pageId) => pageId !== group.preferredPageId),
      ),
    );
    const pages = workspace.pages.map((page) =>
      this.analyzePage(page, duplicatePageIds, aiEnabled),
    );
    const analysis = this.buildAnalysis(pages, duplicateGroups, aiEnabled);

    return workspaceStorage.updateWorkspace(workspace.id, {
      name: workspace.name || analysis.recommendedName,
      tags: workspace.tags.length ? workspace.tags : analysis.recommendedTags,
      pages,
      analysis,
    });
  }

  async analyzeWorkspaceById(workspaceId: string): Promise<Workspace> {
    const workspace = await workspaceStorage.getWorkspaceById(workspaceId);
    if (!workspace) throw new Error("工作空间不存在");
    return this.analyzeWorkspace(workspace);
  }

  getUniquePages(pages: WorkspaceTabPage[]): WorkspaceTabPage[] {
    const seen = new Set<string>();
    return pages.filter((page) => {
      if (seen.has(page.url)) return false;
      seen.add(page.url);
      return true;
    });
  }

  private analyzePage(
    page: WorkspaceTabPage,
    duplicatePageIds: Set<string>,
    aiEnabled: boolean,
  ): WorkspaceTabPage {
    const haystack = `${page.title} ${page.url} ${page.domain}`;
    const category =
      this.matchCategory(haystack, aiEnabled) ??
      page.aiCategory ??
      "未分类";
    const excluded = duplicatePageIds.has(page.id) || EXCLUDED_BOOKMARK_PATTERN.test(haystack);

    return {
      ...page,
      aiCategory: category,
      purpose: this.describePurpose(category),
      isDuplicate: duplicatePageIds.has(page.id),
      duplicateGroupId: duplicatePageIds.has(page.id)
        ? this.buildDuplicateGroupId(page.url)
        : page.duplicateGroupId,
      bookmarkRecommendation: excluded ? "excluded" : "recommended",
      bookmarkRecommendationReason: excluded
        ? "重复页面、搜索结果或登录页不建议长期保存"
        : "页面内容适合作为长期书签沉淀",
    };
  }

  private buildAnalysis(
    pages: WorkspaceTabPage[],
    duplicateGroups: WorkspaceDuplicateGroup[],
    aiEnabled: boolean,
  ): WorkspaceAnalysis {
    const categoryDistribution = Array.from(
      pages.reduce((map, page) => {
        const category = page.aiCategory ?? "未分类";
        map.set(category, (map.get(category) ?? 0) + 1);
        return map;
      }, new Map<string, number>()),
    ).map(([category, count]) => ({ category, count }));
    const recommendedTags = categoryDistribution
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item) => item.category);

    return {
      analyzedAt: Date.now(),
      recommendedName: this.buildRecommendedName(categoryDistribution),
      recommendedTags,
      categoryDistribution,
      totalPageCount: pages.length,
      dedupedPageCount: pages.length - duplicateGroups.reduce((sum, group) => sum + group.pageIds.length - 1, 0),
      duplicateGroups,
      bookmarkRecommendedPageIds: pages
        .filter((page) => page.bookmarkRecommendation === "recommended")
        .map((page) => page.id),
      excludedPageIds: pages
        .filter((page) => page.bookmarkRecommendation === "excluded")
        .map((page) => page.id),
      aiEnabled,
    };
  }

  private findDuplicateGroups(pages: WorkspaceTabPage[]): WorkspaceDuplicateGroup[] {
    const pageIdsByUrl = new Map<string, string[]>();
    for (const page of pages) {
      pageIdsByUrl.set(page.url, [...(pageIdsByUrl.get(page.url) ?? []), page.id]);
    }
    return Array.from(pageIdsByUrl.entries())
      .filter(([, pageIds]) => pageIds.length > 1)
      .map(([url, pageIds]) => ({
        id: this.buildDuplicateGroupId(url),
        url,
        pageIds,
        preferredPageId: pageIds[0],
      }));
  }

  private matchCategory(haystack: string, aiEnabled: boolean) {
    if (!aiEnabled) return null;
    return CATEGORY_RULES.find((rule) => rule.pattern.test(haystack))?.category ?? null;
  }

  private describePurpose(category: string) {
    if (category === "未分类") return "未匹配到明确用途";
    return `用于${category}相关工作`;
  }

  private buildRecommendedName(
    distribution: { category: string; count: number }[],
  ) {
    const main = [...distribution].sort((a, b) => b.count - a.count)[0];
    return main ? `${main.category}工作空间` : "工作空间";
  }

  private buildDuplicateGroupId(url: string) {
    return `dup:${url}`;
  }
}

export const workspaceAnalysisService = new WorkspaceAnalysisService();
