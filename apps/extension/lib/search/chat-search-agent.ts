/**
 * Chat Search Agent
 * 对话式搜索代理，负责检索编排和回答生成
 */
import type {
  LocalBookmark,
  LocalCategory,
  ConversationState,
  SearchRequest,
  SearchResult,
  ChatSearchResponse,
  ConversationIntent,
  QuerySubtype,
  SearchFilters,
  Suggestion,
  SuggestionActionType,
} from "@/types";
import { queryPlanner } from "./query-planner";
import { hybridRetriever } from "./hybrid-retriever";
import { bookmarkStorage, configStorage } from "@/lib/storage";
import { createExtendedAIClient, getDefaultModel } from "@hamhome/ai";
import { createLogger } from "@hamhome/utils";
import { getExtensionShortcuts } from "@/utils/browser-api";
import { z } from "zod";

const logger = createLogger({ namespace: "ChatSearchAgent" });

/**
 * 最大短期记忆轮次
 */
const MAX_SHORT_MEMORY = 6;

/**
 * 统计结果接口
 */
interface StatisticsResult {
  total: number;
  byCategory: Map<string, number>;
  byDomain: Map<string, number>;
  byDate: Map<string, number>;
  bookmarks: LocalBookmark[];
}

/**
 * Answer Response Schema
 */
const AnswerResponseSchema = z.object({
  answer: z.string().max(500).describe("简洁的回答（1-5句话）"),
  nextSuggestions: z
    .array(z.string())
    .max(4)
    .describe("建议的下一步操作（2-4个）"),
});

/**
 * 获取 Answer Writer 系统提示词
 */
function getAnswerSystemPrompt(language: "zh" | "en"): string {
  if (language === "en") {
    return `You are a bookmark search assistant. Based on the user's query and search results, generate a concise answer.

## Rules
1. Only answer based on the provided sources, do not fabricate information
2. If search results are provided, you MUST describe them (even if relevance is low), never say "no bookmarks found"
3. If relevance is low, you can say "Found some potentially related bookmarks" and briefly describe them
4. Keep answers brief (1-5 sentences)
5. When citing sources, use format [1], [2], etc.
6. Provide 2-4 actionable next step suggestions

## Intent Types
- query: User searching for bookmarks (default)
- statistics: User asking for counts/statistics
- help: User asking about plugin features

## Suggestion Categories

**Refine (adjust search scope):**
- Narrow: "Only show last 30 days", "Filter by XX category", "Only from XX domain"
- Expand: "Show more results", "Try similar keywords", "Use semantic search"

**Organize (batch actions for same topic):**
- "Batch add #Tag tag", "Move all to XX category", "Copy all links"

**Discover (find patterns):**
- "Find duplicate bookmarks", "Show similar bookmarks"`;
  }

  return `你是一个书签搜索助手。基于用户的查询和搜索结果，生成简洁的回答。

## 规则
1. 只基于提供的 sources 回答，不要编造信息
2. 如果提供了搜索结果，必须描述这些结果（即使相关性不高也要提及），不要说"未找到"
3. 如果结果相关性较低，可以说"找到了一些可能相关的书签"并简要介绍
4. 回答要简洁（1-5 句话）
5. 引用来源时使用格式 [1], [2] 等
6. 提供 2-4 个可执行的下一步建议

## 意图类型
- query：用户搜索书签（默认）
- statistics：用户询问统计信息
- help：用户询问插件功能

## 建议类别

**精炼（调整搜索范围）：**
- 缩小范围："只看最近 30 天"、"限定 XX 分类"、"只看 XX 网站"
- 扩大范围："显示更多结果"、"尝试相近关键词"、"使用语义搜索"

**整理（批量操作同主题结果）：**
- "批量添加 #标签"、"全部移动到 XX 分类"、"复制所有链接"

**发现（查找规律）：**
- "查找重复书签"、"显示相似书签"`;
}

/**
 * 构建 Answer 上下文
 */
function buildAnswerContext(
  query: string,
  bookmarks: LocalBookmark[],
  categories: Map<string, LocalCategory>,
  intent: ConversationIntent,
  state?: ConversationState,
): string {
  const parts: string[] = [];

  if (state && state.shortMemory.length > 0) {
    parts.push("当前对话历史:");
    state.shortMemory.forEach((m) => {
      parts.push(`- ${m.role === "user" ? "用户" : "助手"}: ${m.text}`);
    });
    parts.push("");
    parts.push(`当前结构化查询: "${state.refinedQuery || query}"`);
  } else {
    parts.push(`用户查询: "${query}"`);
  }

  parts.push(`当前意图: ${intent}`);
  parts.push("");
  parts.push("检索到的书签 (Sources):");

  if (bookmarks.length === 0) {
    parts.push("(无结果)");
  } else {
    bookmarks.forEach((bookmark, index) => {
      const categoryName = bookmark.categoryId
        ? categories.get(bookmark.categoryId)?.name || "未分类"
        : "未分类";

      parts.push(`[${index + 1}] ${bookmark.title}`);
      parts.push(`    URL: ${bookmark.url}`);
      parts.push(`    描述: ${bookmark.description.slice(0, 200)}`);
      parts.push(`    分类: ${categoryName}`);
      parts.push(`    标签: ${bookmark.tags.join(", ") || "无"}`);
      parts.push(
        `    保存时间: ${new Date(bookmark.createdAt).toLocaleDateString()}`,
      );
      parts.push("");
    });
  }

  return parts.join("\n");
}

/**
 * 动态生成快捷键帮助内容
 */
async function generateShortcutHelpContent(language: "zh" | "en"): Promise<{ content: string; suggestions: Suggestion[] }> {
  const shortcuts = await getExtensionShortcuts();
  
  if (shortcuts.length === 0) {
    return {
      content: language === "zh" 
        ? "暂时无法获取快捷键配置，请在浏览器扩展设置中查看。" 
        : "Unable to fetch shortcut settings. Please check browser extension settings.",
      suggestions: language === "zh" 
        ? [
            createSuggestion("如何设置快捷键", "text"),
            createSuggestion("其他功能介绍", "text"),
            createSuggestion("设置页面在哪", "text"),
          ]
        : [
            createSuggestion("How to set shortcuts", "text"),
            createSuggestion("Feature introduction", "text"),
            createSuggestion("Where is settings", "text"),
          ],
    };
  }

  const lines: string[] = [];
  lines.push(language === "zh" ? "快捷键说明：" : "Keyboard shortcuts:");
  
  for (const cmd of shortcuts) {
    const shortcutDisplay = cmd.shortcut || (language === "zh" ? "未设置" : "Not set");
    lines.push(`- ${shortcutDisplay}：${cmd.description}`);
  }
  
  // 添加通用快捷键说明
  lines.push(language === "zh" ? "- Esc：关闭面板" : "- Esc: Close panel");

  return {
    content: lines.join("\n"),
    suggestions: language === "zh" 
      ? [
          createSuggestion("如何更改快捷键", "text"),
          createSuggestion("其他功能介绍", "text"),
          createSuggestion("设置页面在哪", "text"),
        ]
      : [
          createSuggestion("How to change shortcuts", "text"),
          createSuggestion("Feature introduction", "text"),
          createSuggestion("Where is settings", "text"),
        ],
  };
}

/**
 * 帮助内容配置
 */
const HELP_CONTENT: Record<string, { zh: string; en: string; suggestions: { zh: Suggestion[]; en: Suggestion[] } }> = {
  settings: {
    zh: "设置页面可以在插件图标右键菜单中找到，或者点击面板右上角的设置图标。您可以配置：\n- AI 服务（用于智能分类和语义搜索）\n- 主题和语言\n- 快捷键\n- 自动保存选项",
    en: "Settings can be found in the plugin icon right-click menu, or click the settings icon at the top right of the panel. You can configure:\n- AI service (for smart categorization and semantic search)\n- Theme and language\n- Keyboard shortcuts\n- Auto-save options",
    suggestions: {
      zh: [
        { label: "如何配置 AI", action: "text" },
        { label: "如何启用语义搜索", action: "text" },
        { label: "快捷键设置", action: "text" },
      ],
      en: [
        { label: "How to configure AI", action: "text" },
        { label: "How to enable semantic search", action: "text" },
        { label: "Shortcut settings", action: "text" },
      ],
    },
  },
  features: {
    zh: "HamHome 主要功能：\n- 智能收藏：AI 自动分类和打标签\n- 语义搜索：通过含义查找书签\n- 对话式搜索：自然语言查询\n- 快照保存：保存网页离线版本\n- 批量管理：批量移动、打标签、删除",
    en: "HamHome main features:\n- Smart bookmarking: AI auto-categorization and tagging\n- Semantic search: Find bookmarks by meaning\n- Conversational search: Natural language queries\n- Snapshot saving: Save offline versions of pages\n- Batch management: Bulk move, tag, delete",
    suggestions: {
      zh: [
        { label: "如何使用语义搜索", action: "text" },
        { label: "如何批量管理", action: "text" },
        { label: "如何保存快照", action: "text" },
      ],
      en: [
        { label: "How to use semantic search", action: "text" },
        { label: "How to batch manage", action: "text" },
        { label: "How to save snapshot", action: "text" },
      ],
    },
  },
  default: {
    zh: "我可以帮助您：\n- 搜索和查找书签\n- 了解插件功能和设置\n- 统计您的收藏情况\n\n请问您想了解什么？",
    en: "I can help you:\n- Search and find bookmarks\n- Learn about plugin features and settings\n- View your bookmark statistics\n\nWhat would you like to know?",
    suggestions: {
      zh: [
        { label: "快捷键是什么", action: "text" },
        { label: "如何设置 AI", action: "text" },
        { label: "功能介绍", action: "text" },
      ],
      en: [
        { label: "What are the shortcuts", action: "text" },
        { label: "How to set up AI", action: "text" },
        { label: "Feature introduction", action: "text" },
      ],
    },
  },
};

/**
 * 匹配帮助主题
 */
function matchHelpTopic(query: string): string {
  const lowerQuery = query.toLowerCase();
  if (lowerQuery.includes("快捷键") || lowerQuery.includes("shortcut") || lowerQuery.includes("hotkey")) {
    return "shortcut";
  }
  if (lowerQuery.includes("设置") || lowerQuery.includes("setting") || lowerQuery.includes("配置")) {
    return "settings";
  }
  if (lowerQuery.includes("功能") || lowerQuery.includes("feature") || lowerQuery.includes("怎么用") || lowerQuery.includes("如何使用")) {
    return "features";
  }
  return "default";
}

/**
 * 生成默认的下一步建议
 */
function getDefaultSuggestions(
  result: SearchResult,
  request: SearchRequest,
  hasMore: boolean,
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // 基于结果状态
  if (result.items.length === 0) {
    suggestions.push(createSuggestion("尝试其他关键词", "text"));
    if (request.filters.timeRangeDays) {
      suggestions.push(createSuggestion("扩大时间范围", "text"));
    }
    if (!request.filters.semantic) {
      suggestions.push(createSuggestion("使用语义搜索", "semanticOnly"));
    }
  } else {
    if (hasMore) {
      suggestions.push(createSuggestion("显示更多结果", "showMore"));
    }
    if (!request.filters.timeRangeDays) {
      suggestions.push(createSuggestion("只看最近 30 天", "timeFilter", { days: 30 }));
    }
    if (result.usedSemantic && result.usedKeyword) {
      suggestions.push(createSuggestion("只看关键词匹配", "keywordOnly"));
      suggestions.push(createSuggestion("只看语义匹配", "semanticOnly"));
    }
  }

  return suggestions.slice(0, 4);
}

/**
 * 从 URL 提取域名
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * 格式化日期为本地日期字符串
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

/**
 * 结果分析上下文
 */
interface ResultAnalysisContext {
  /** 结果数量 */
  resultCount: number;
  /** 总匹配数 */
  totalMatches: number;
  /** 分数分布 */
  scoreDistribution: { min: number; max: number; avg: number; variance: number };
  /** 热门域名 */
  topDomains: Array<{ domain: string; count: number }>;
  /** 热门分类 */
  topCategories: Array<{ categoryId: string; name: string; count: number }>;
  /** 热门标签 */
  topTags: Array<{ tag: string; count: number }>;
  /** 是否来自同一主题 */
  isSameTopic: boolean;
  /** 是否有潜在重复 */
  hasPotentialDuplicates: boolean;
  /** 使用的搜索类型 */
  usedSemantic: boolean;
  usedKeyword: boolean;
}

/**
 * 分析搜索结果
 */
function analyzeResults(
  bookmarks: LocalBookmark[],
  searchResult: SearchResult,
  categories: Map<string, LocalCategory>,
): ResultAnalysisContext {
  const resultCount = bookmarks.length;
  const totalMatches = searchResult.total;

  // 分数分布
  const scores = searchResult.items.map((item) => item.score);
  const min = scores.length > 0 ? Math.min(...scores) : 0;
  const max = scores.length > 0 ? Math.max(...scores) : 0;
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const variance = scores.length > 0
    ? scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length
    : 0;

  // 统计域名
  const domainCount = new Map<string, number>();
  for (const bookmark of bookmarks) {
    const domain = extractDomain(bookmark.url);
    domainCount.set(domain, (domainCount.get(domain) || 0) + 1);
  }
  const topDomains = Array.from(domainCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }));

  // 统计分类
  const categoryCount = new Map<string, number>();
  for (const bookmark of bookmarks) {
    if (bookmark.categoryId) {
      categoryCount.set(bookmark.categoryId, (categoryCount.get(bookmark.categoryId) || 0) + 1);
    }
  }
  const topCategories = Array.from(categoryCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([categoryId, count]) => ({
      categoryId,
      name: categories.get(categoryId)?.name || "未知",
      count,
    }));

  // 统计标签
  const tagCount = new Map<string, number>();
  for (const bookmark of bookmarks) {
    for (const tag of bookmark.tags) {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
    }
  }
  const topTags = Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  // 判断是否来自同一主题（同一域名或同一分类占比 > 60%）
  const isSameTopic =
    (topDomains.length > 0 && topDomains[0].count / resultCount > 0.6) ||
    (topCategories.length > 0 && topCategories[0].count / resultCount > 0.6);

  // 判断是否有潜在重复（分数分散度低且有高分项）
  const hasPotentialDuplicates = variance < 0.05 && max > 0.85 && resultCount > 1;

  return {
    resultCount,
    totalMatches,
    scoreDistribution: { min, max, avg, variance },
    topDomains,
    topCategories,
    topTags,
    isSameTopic,
    hasPotentialDuplicates,
    usedSemantic: searchResult.usedSemantic,
    usedKeyword: searchResult.usedKeyword,
  };
}

/**
 * 创建建议项的辅助函数
 */
function createSuggestion(
  label: string,
  action: SuggestionActionType,
  payload?: Record<string, unknown>,
): Suggestion {
  return { label, action, payload };
}

/**
 * 生成智能下一步建议
 */
function generateSmartSuggestions(
  context: ResultAnalysisContext,
  request: SearchRequest,
  language: "zh" | "en",
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // === Refine suggestions ===
  
  // 结果过多，建议缩小范围
  if (context.resultCount >= 20 || context.totalMatches > 20) {
    if (!request.filters.timeRangeDays) {
      suggestions.push(createSuggestion(
        language === "zh" ? "只看最近 30 天" : "Last 30 days only",
        "timeFilter",
        { days: 30 },
      ));
    }
    if (context.topDomains.length > 0 && !request.filters.domain) {
      suggestions.push(createSuggestion(
        language === "zh"
          ? `只看 ${context.topDomains[0].domain}`
          : `Only from ${context.topDomains[0].domain}`,
        "domainFilter",
        { domain: context.topDomains[0].domain },
      ));
    }
    if (context.topCategories.length > 0 && !request.filters.categoryId) {
      suggestions.push(createSuggestion(
        language === "zh"
          ? `限定 ${context.topCategories[0].name} 分类`
          : `In ${context.topCategories[0].name} category`,
        "categoryFilter",
        { categoryId: context.topCategories[0].categoryId, categoryName: context.topCategories[0].name },
      ));
    }
  }

  // 结果过少，建议扩大范围
  if (context.resultCount < 3 && context.resultCount > 0) {
    if (request.filters.timeRangeDays) {
      suggestions.push(createSuggestion(
        language === "zh" ? "扩大时间范围" : "Expand time range",
        "text",
      ));
    }
    suggestions.push(createSuggestion(
      language === "zh" ? "尝试相近关键词" : "Try similar keywords",
      "text",
    ));
  }

  // 没有结果
  if (context.resultCount === 0) {
    suggestions.push(createSuggestion(
      language === "zh" ? "尝试其他关键词" : "Try different keywords",
      "text",
    ));
    if (!context.usedSemantic) {
      suggestions.push(createSuggestion(
        language === "zh" ? "使用语义搜索" : "Use semantic search",
        "semanticOnly",
      ));
    }
  }

  // 分数分散度高，建议切换搜索模式
  if (context.scoreDistribution.variance > 0.15) {
    if (context.usedSemantic && context.usedKeyword) {
      suggestions.push(createSuggestion(
        language === "zh" ? "只看关键词匹配" : "Keyword matches only",
        "keywordOnly",
      ));
      suggestions.push(createSuggestion(
        language === "zh" ? "只看语义匹配" : "Semantic matches only",
        "semanticOnly",
      ));
    }
  }

  // === Organize suggestions ===
  
  // 来自同一主题，建议批量整理
  if (context.isSameTopic && context.resultCount >= 3) {
    suggestions.push(createSuggestion(
      language === "zh" ? "批量打标签" : "Batch add tags",
      "batchAddTags",
    ));
    suggestions.push(createSuggestion(
      language === "zh" ? "批量移动分类" : "Batch move to category",
      "batchMoveCategory",
    ));
  }

  // 如果有多个结果，提供复制链接选项
  if (context.resultCount >= 2) {
    suggestions.push(createSuggestion(
      language === "zh" ? "复制所有链接" : "Copy all links",
      "copyAllLinks",
    ));
  }

  // === Discover suggestions ===
  
  // 可能有重复
  if (context.hasPotentialDuplicates) {
    suggestions.push(createSuggestion(
      language === "zh" ? "查找重复书签" : "Find duplicate bookmarks",
      "findDuplicates",
    ));
  }

  // 更多结果
  if (context.totalMatches > context.resultCount) {
    suggestions.push(createSuggestion(
      language === "zh" ? "显示更多结果" : "Show more results",
      "showMore",
    ));
  }

  // 限制建议数量
  return suggestions.slice(0, 4);
}

/**
 * 创建初始对话状态
 */
export function createInitialState(): ConversationState {
  return {
    intent: "query",
    querySubtype: "semantic",
    query: "",
    refinedQuery: "",
    filters: {},
    seenBookmarkIds: [],
    shortMemory: [],
  };
}

/**
 * Chat Search Agent 类
 */
class ChatSearchAgent {
  private categories: Map<string, LocalCategory> = new Map();

  /**
   * 加载分类数据
   */
  private async loadCategories(): Promise<void> {
    const categoryList = await bookmarkStorage.getCategories();
    this.categories.clear();
    for (const category of categoryList) {
      this.categories.set(category.id, category);
    }
  }

  /**
   * 执行对话式搜索（主入口）
   * 根据意图路由到不同的处理器
   */
  async search(
    userInput: string,
    state: ConversationState,
  ): Promise<{
    response: ChatSearchResponse;
    bookmarks: LocalBookmark[];
    searchResult: SearchResult;
    newState: ConversationState;
  }> {
    await this.loadCategories();

    // 获取上下文
    const existingTags = await this.getExistingTags();
    const categoryList = Array.from(this.categories.values());

    // 解析用户输入
    const request = await queryPlanner.parse(userInput, {
      categories: categoryList,
      existingTags,
      conversationState: state.query ? state : undefined,
    });

    logger.debug("Parsed request", { intent: request.intent, querySubtype: request.querySubtype });

    // 根据意图路由
    switch (request.intent) {
      case "help":
        return this.handleHelpIntent(userInput, state, request);
      case "statistics":
        return this.handleStatisticsIntent(userInput, state, request);
      case "query":
      default:
        return this.handleQueryIntent(userInput, state, request);
    }
  }

  /**
   * 处理帮助意图
   */
  private async handleHelpIntent(
    userInput: string,
    state: ConversationState,
    request: SearchRequest,
  ): Promise<{
    response: ChatSearchResponse;
    bookmarks: LocalBookmark[];
    searchResult: SearchResult;
    newState: ConversationState;
  }> {
    const settings = await configStorage.getSettings();
    const language = (settings.language || "zh") as "zh" | "en";
    
    const topic = matchHelpTopic(userInput);
    
    let answer: string;
    let suggestions: Suggestion[];
    
    // 快捷键需要动态获取
    if (topic === "shortcut") {
      const shortcutHelp = await generateShortcutHelpContent(language);
      answer = shortcutHelp.content;
      suggestions = shortcutHelp.suggestions;
    } else {
      const helpContent = HELP_CONTENT[topic];
      answer = language === "zh" ? helpContent.zh : helpContent.en;
      suggestions = language === "zh" ? helpContent.suggestions.zh : helpContent.suggestions.en;
    }
    
    const response: ChatSearchResponse = {
      answer,
      sources: [],
      nextSuggestions: suggestions,
    };

    const newState = this.updateState(state, userInput, response, request, []);

    return {
      response,
      bookmarks: [],
      searchResult: { items: [], total: 0, usedSemantic: false, usedKeyword: false },
      newState,
    };
  }

  /**
   * 处理统计意图
   */
  private async handleStatisticsIntent(
    userInput: string,
    state: ConversationState,
    request: SearchRequest,
  ): Promise<{
    response: ChatSearchResponse;
    bookmarks: LocalBookmark[];
    searchResult: SearchResult;
    newState: ConversationState;
  }> {
    const settings = await configStorage.getSettings();
    const language = settings.language || "zh";

    // 获取时间范围内的书签
    const timeRangeDays = request.filters.timeRangeDays || 7;
    const cutoffTime = Date.now() - timeRangeDays * 24 * 60 * 60 * 1000;
    
    const allBookmarks = await bookmarkStorage.getBookmarks({ isDeleted: false });
    const filteredBookmarks = allBookmarks.filter((b) => b.createdAt >= cutoffTime);

    // 统计数据
    const stats = this.calculateStatistics(filteredBookmarks);

    // 生成统计回答
    const response = this.generateStatisticsAnswer(stats, timeRangeDays, language);

    // 转换为搜索结果格式
    const searchResult: SearchResult = {
      items: filteredBookmarks.slice(0, 20).map((b) => ({
        bookmarkId: b.id,
        score: 1,
      })),
      total: filteredBookmarks.length,
      usedSemantic: false,
      usedKeyword: false,
    };

    const newState = this.updateState(
      state,
      userInput,
      response,
      request,
      filteredBookmarks.slice(0, 20).map((b) => b.id),
    );

    return {
      response,
      bookmarks: filteredBookmarks.slice(0, 20),
      searchResult,
      newState,
    };
  }

  /**
   * 计算统计数据
   */
  private calculateStatistics(bookmarks: LocalBookmark[]): StatisticsResult {
    const byCategory = new Map<string, number>();
    const byDomain = new Map<string, number>();
    const byDate = new Map<string, number>();

    for (const bookmark of bookmarks) {
      // 按分类统计
      const categoryName = bookmark.categoryId
        ? this.categories.get(bookmark.categoryId)?.name || "未分类"
        : "未分类";
      byCategory.set(categoryName, (byCategory.get(categoryName) || 0) + 1);

      // 按域名统计
      const domain = extractDomain(bookmark.url);
      byDomain.set(domain, (byDomain.get(domain) || 0) + 1);

      // 按日期统计
      const date = formatDate(bookmark.createdAt);
      byDate.set(date, (byDate.get(date) || 0) + 1);
    }

    return {
      total: bookmarks.length,
      byCategory,
      byDomain,
      byDate,
      bookmarks,
    };
  }

  /**
   * 生成统计回答
   */
  private generateStatisticsAnswer(
    stats: StatisticsResult,
    timeRangeDays: number,
    language: "zh" | "en",
  ): ChatSearchResponse {
    const timeDesc = language === "zh"
      ? timeRangeDays === 1 ? "昨天" : timeRangeDays <= 7 ? "最近一周" : `最近 ${timeRangeDays} 天`
      : timeRangeDays === 1 ? "yesterday" : timeRangeDays <= 7 ? "this week" : `last ${timeRangeDays} days`;

    let answer: string;
    const suggestions: Suggestion[] = [];

    if (stats.total === 0) {
      answer = language === "zh"
        ? `${timeDesc}没有收藏任何书签。`
        : `No bookmarks saved ${timeDesc}.`;
      suggestions.push(createSuggestion(
        language === "zh" ? "扩大时间范围" : "Expand time range",
        "text",
      ));
    } else {
      // 获取 Top 分类
      const topCategories = Array.from(stats.byCategory.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      // 获取 Top 域名
      const topDomains = Array.from(stats.byDomain.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      if (language === "zh") {
        answer = `${timeDesc}共收藏了 ${stats.total} 个书签。\n\n`;
        answer += `**按分类：**\n${topCategories.map(([name, count]) => `- ${name}: ${count} 个`).join("\n")}\n\n`;
        answer += `**热门网站：**\n${topDomains.map(([domain, count]) => `- ${domain}: ${count} 个`).join("\n")}`;
      } else {
        answer = `You saved ${stats.total} bookmarks ${timeDesc}.\n\n`;
        answer += `**By Category:**\n${topCategories.map(([name, count]) => `- ${name}: ${count}`).join("\n")}\n\n`;
        answer += `**Top Sites:**\n${topDomains.map(([domain, count]) => `- ${domain}: ${count}`).join("\n")}`;
      }

      suggestions.push(
        createSuggestion(language === "zh" ? "查看详细列表" : "View detailed list", "showMore"),
        createSuggestion(language === "zh" ? "按分类筛选" : "Filter by category", "text"),
        createSuggestion(language === "zh" ? "查看本月统计" : "View monthly stats", "timeFilter", { days: 30 }),
      );
    }

    return {
      answer,
      sources: stats.bookmarks.slice(0, 10).map((b) => b.id),
      nextSuggestions: suggestions,
    };
  }

  /**
   * 处理查询意图（原有的搜索逻辑）
   */
  private async handleQueryIntent(
    userInput: string,
    state: ConversationState,
    request: SearchRequest,
  ): Promise<{
    response: ChatSearchResponse;
    bookmarks: LocalBookmark[];
    searchResult: SearchResult;
    newState: ConversationState;
  }> {
    // 与现有状态合并
    const mergedRequest = state.query
      ? queryPlanner.mergeWithState(request, state)
      : request;

    logger.debug("Search request", { mergedRequest });

    // 使用提炼后的查询进行搜索
    const searchQuery = mergedRequest.refinedQuery || mergedRequest.query;
    
    // 确定是否启用语义搜索
    // 当 refinedQuery 为空时（纯过滤查询），不进行语义搜索
    const semanticAvailable = await hybridRetriever.isSemanticAvailable();
    const hasSemanticKeywords = mergedRequest.refinedQuery.trim().length > 0;
    const enableSemantic =
      hasSemanticKeywords &&
      mergedRequest.filters.semantic !== false &&
      semanticAvailable;

    logger.info("Semantic search decision", {
      requestedSemantic: mergedRequest.filters.semantic,
      semanticAvailable,
      hasSemanticKeywords,
      enableSemantic,
      refinedQuery: mergedRequest.refinedQuery.slice(0, 50),
    });

    // 执行混合搜索
    const searchResult = await hybridRetriever.search(searchQuery, {
      topK: mergedRequest.topK,
      filters: mergedRequest.filters,
      excludeIds: state.seenBookmarkIds,
      enableSemantic,
      enableKeyword: true,
    });

    // 获取书签详情
    const bookmarkIds = searchResult.items.map((item) => item.bookmarkId);
    const bookmarks = await this.getBookmarksByIds(bookmarkIds);

    // 按搜索结果顺序排序
    const sortedBookmarks = bookmarkIds
      .map((id) => bookmarks.find((b) => b.id === id))
      .filter((b): b is LocalBookmark => b !== undefined);

    // 获取语言设置
    const settings = await configStorage.getSettings();
    const language = settings.language || "zh";

    // 分析结果
    const analysisContext = analyzeResults(sortedBookmarks, searchResult, this.categories);

    // 生成智能建议
    const smartSuggestions = generateSmartSuggestions(analysisContext, mergedRequest, language);

    // 生成回答
    const response = await this.generateAnswerWithContext(
      mergedRequest.query,
      sortedBookmarks,
      mergedRequest.intent,
      searchResult,
      smartSuggestions,
      state,
    );

    // 更新状态
    const newState = this.updateState(
      state,
      userInput,
      response,
      mergedRequest,
      bookmarkIds,
    );

    return {
      response,
      bookmarks: sortedBookmarks,
      searchResult,
      newState,
    };
  }

  /**
   * 生成回答（带智能建议）
   */
  private async generateAnswerWithContext(
    query: string,
    bookmarks: LocalBookmark[],
    intent: ConversationIntent,
    searchResult: SearchResult,
    smartSuggestions: Suggestion[],
    state: ConversationState,
  ): Promise<ChatSearchResponse> {
    // 准备来源列表
    const sources = bookmarks.map((b) => b.id);

    // 如果没有结果，返回默认回答
    if (bookmarks.length === 0) {
      return {
        answer: "未找到相关书签。您可以尝试其他关键词，或者扩大搜索范围。",
        sources: [],
        nextSuggestions: smartSuggestions.length > 0 ? smartSuggestions : [
          createSuggestion("尝试其他关键词", "text"),
          createSuggestion("使用语义搜索", "semanticOnly"),
        ],
      };
    }

    try {
      const aiConfig = await configStorage.getAIConfig();
      const settings = await configStorage.getSettings();

      // 检查 AI 是否可用
      if (!aiConfig.apiKey && aiConfig.provider !== "ollama") {
        return this.generateRuleBasedAnswerWithSuggestions(bookmarks, sources, smartSuggestions);
      }

      const client = createExtendedAIClient({
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        baseUrl: aiConfig.baseUrl,
        model: aiConfig.model || getDefaultModel(aiConfig.provider),
        temperature: 0.3,
        maxTokens: 600,
        language: settings.language,
      });

      const systemPrompt = getAnswerSystemPrompt(settings.language);
      const userPrompt = buildAnswerContext(
        query,
        bookmarks,
        this.categories,
        intent,
        state,
      );

      logger.debug("Generating answer with AI");

      const result = await client.generateObject({
        schema: AnswerResponseSchema,
        system: systemPrompt,
        prompt: userPrompt,
      });

      // 优先使用智能建议，其次使用 AI 生成的建议（转换为 text 类型）
      const nextSuggestions = smartSuggestions.length > 0
        ? smartSuggestions
        : result.nextSuggestions.length > 0
          ? result.nextSuggestions.map((s) => createSuggestion(s, "text"))
          : [createSuggestion("显示更多结果", "showMore")];

      return {
        answer: result.answer,
        sources,
        nextSuggestions,
      };
    } catch (error) {
      logger.warn("AI answer generation failed, using rule-based", error);
      return this.generateRuleBasedAnswerWithSuggestions(bookmarks, sources, smartSuggestions);
    }
  }

  /**
   * 生成回答（旧版本，保持向后兼容）
   */
  private async generateAnswer(
    query: string,
    bookmarks: LocalBookmark[],
    intent: ConversationIntent,
    searchResult: SearchResult,
    state?: ConversationState,
  ): Promise<ChatSearchResponse> {
    // 准备来源列表
    const sources = bookmarks.map((b) => b.id);

    // 如果没有结果，返回默认回答
    if (bookmarks.length === 0) {
      return {
        answer: "未找到相关书签。您可以尝试其他关键词，或者扩大搜索范围。",
        sources: [],
        nextSuggestions: getDefaultSuggestions(
          searchResult,
          { intent, query, refinedQuery: query, filters: {}, topK: 20 },
          false,
        ),
      };
    }

    try {
      const aiConfig = await configStorage.getAIConfig();
      const settings = await configStorage.getSettings();

      // 检查 AI 是否可用
      if (!aiConfig.apiKey && aiConfig.provider !== "ollama") {
        return this.generateRuleBasedAnswer(bookmarks, sources, searchResult);
      }

      const client = createExtendedAIClient({
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        baseUrl: aiConfig.baseUrl,
        model: aiConfig.model || getDefaultModel(aiConfig.provider),
        temperature: 0.3,
        maxTokens: 600,
        language: settings.language,
      });

      const systemPrompt = getAnswerSystemPrompt(settings.language);
      const userPrompt = buildAnswerContext(
        query,
        bookmarks,
        this.categories,
        intent,
        state,
      );

      logger.debug("Generating answer with AI");

      const result = await client.generateObject({
        schema: AnswerResponseSchema,
        system: systemPrompt,
        prompt: userPrompt,
      });

      return {
        answer: result.answer,
        sources,
        nextSuggestions:
          result.nextSuggestions.length > 0
            ? result.nextSuggestions.map((s) => createSuggestion(s, "text"))
            : getDefaultSuggestions(
                searchResult,
                { intent, query, refinedQuery: query, filters: {}, topK: 20 },
                bookmarks.length >= 20,
              ),
      };
    } catch (error) {
      logger.warn("AI answer generation failed, using rule-based", error);
      return this.generateRuleBasedAnswer(bookmarks, sources, searchResult);
    }
  }

  /**
   * 基于规则生成回答（带智能建议）
   */
  private generateRuleBasedAnswerWithSuggestions(
    bookmarks: LocalBookmark[],
    sources: string[],
    smartSuggestions: Suggestion[],
  ): ChatSearchResponse {
    const count = bookmarks.length;
    let answer: string;

    if (count === 1) {
      answer = `找到 1 条相关书签：${bookmarks[0].title}`;
    } else if (count <= 5) {
      answer = `找到 ${count} 条相关书签：${bookmarks.map((b) => b.title).join("、")}`;
    } else {
      answer = `找到 ${count} 条相关书签。最相关的是：${bookmarks
        .slice(0, 3)
        .map((b) => b.title)
        .join("、")} 等。`;
    }

    return {
      answer,
      sources,
      nextSuggestions: smartSuggestions.length > 0 ? smartSuggestions : [createSuggestion("显示更多结果", "showMore")],
    };
  }

  /**
   * 基于规则生成回答（备用方案）
   */
  private generateRuleBasedAnswer(
    bookmarks: LocalBookmark[],
    sources: string[],
    searchResult: SearchResult,
  ): ChatSearchResponse {
    const count = bookmarks.length;
    let answer: string;

    if (count === 1) {
      answer = `找到 1 条相关书签：${bookmarks[0].title}`;
    } else if (count <= 5) {
      answer = `找到 ${count} 条相关书签：${bookmarks.map((b) => b.title).join("、")}`;
    } else {
      answer = `找到 ${count} 条相关书签。最相关的是：${bookmarks
        .slice(0, 3)
        .map((b) => b.title)
        .join("、")} 等。`;
    }

    return {
      answer,
      sources,
      nextSuggestions: getDefaultSuggestions(
        searchResult,
        { intent: "query", query: "", refinedQuery: "", filters: {}, topK: 20 },
        count >= 20,
      ),
    };
  }

  /**
   * 更新对话状态
   */
  private updateState(
    oldState: ConversationState,
    userInput: string,
    response: ChatSearchResponse,
    request: SearchRequest,
    newBookmarkIds: string[],
  ): ConversationState {
    // 更新短期记忆
    const shortMemory = [
      ...oldState.shortMemory,
      { role: "user" as const, text: userInput },
      { role: "assistant" as const, text: response.answer },
    ];

    // 保持最大轮次
    while (shortMemory.length > MAX_SHORT_MEMORY * 2) {
      shortMemory.shift();
    }

    // 更新已展示的书签 ID
    const seenBookmarkIds = [
      ...new Set([...oldState.seenBookmarkIds, ...newBookmarkIds]),
    ];

    return {
      intent: request.intent,
      querySubtype: request.querySubtype,
      query: request.query,
      refinedQuery: request.refinedQuery,
      filters: request.filters,
      seenBookmarkIds,
      shortMemory,
      longMemorySummary: oldState.longMemorySummary,
    };
  }

  /**
   * 获取已有标签列表
   */
  private async getExistingTags(): Promise<string[]> {
    const bookmarks = await bookmarkStorage.getBookmarks({ isDeleted: false });
    const tagSet = new Set<string>();
    for (const bookmark of bookmarks) {
      for (const tag of bookmark.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet);
  }

  /**
   * 根据 ID 列表获取书签
   */
  private async getBookmarksByIds(ids: string[]): Promise<LocalBookmark[]> {
    const bookmarks = await bookmarkStorage.getBookmarks({ isDeleted: false });
    const idSet = new Set(ids);
    return bookmarks.filter((b) => idSet.has(b.id));
  }

  /**
   * 执行"继续查找"操作
   */
  async continueSearch(state: ConversationState): Promise<{
    response: ChatSearchResponse;
    bookmarks: LocalBookmark[];
    searchResult: SearchResult;
    newState: ConversationState;
  }> {
    return this.search("继续查找更多", state);
  }

  /**
   * 应用建议的过滤条件
   */
  async applyFilter(
    filterUpdate: Partial<SearchFilters>,
    state: ConversationState,
  ): Promise<{
    response: ChatSearchResponse;
    bookmarks: LocalBookmark[];
    searchResult: SearchResult;
    newState: ConversationState;
  }> {
    // 更新过滤条件
    const updatedState: ConversationState = {
      ...state,
      filters: { ...state.filters, ...filterUpdate },
      seenBookmarkIds: [], // 重置已展示列表
    };

    // 构建描述性查询
    let filterDesc = "";
    if (filterUpdate.timeRangeDays) {
      filterDesc = `最近 ${filterUpdate.timeRangeDays} 天的`;
    }
    if (filterUpdate.categoryId) {
      filterDesc += `该分类下的`;
    }

    const newQuery = `${filterDesc}${state.query}`;

    return this.search(newQuery, updatedState);
  }
}

// 导出单例
export const chatSearchAgent = new ChatSearchAgent();
