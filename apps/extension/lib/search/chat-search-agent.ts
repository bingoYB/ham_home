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
  SearchFilters,
  Suggestion,
  SuggestionActionType,
} from "@/types";
import { queryPlanner } from "./query-planner";
import { hybridRetriever } from "./hybrid-retriever";
import { bookmarkStorage, configStorage } from "@/lib/storage";
import { createLogger } from "@hamhome/utils";
import { getExtensionShortcuts } from "@/utils/browser-api";


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
  byTag: Map<string, number>;
  byDate: Map<string, number>;
  bookmarks: LocalBookmark[];
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
            createSuggestion("如何设置快捷键", "navigate", { view: "settings" }),
            createSuggestion("其他功能介绍", "text"),
            createSuggestion("设置页面在哪", "navigate", { view: "settings" }),
          ]
        : [
            createSuggestion("How to set shortcuts", "navigate", { view: "settings" }),
            createSuggestion("Feature introduction", "text"),
            createSuggestion("Where is settings", "navigate", { view: "settings" }),
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
          createSuggestion("如何更改快捷键", "navigate", { view: "settings" }),
          createSuggestion("其他功能介绍", "text"),
          createSuggestion("设置页面在哪", "navigate", { view: "settings" }),
        ]
      : [
          createSuggestion("How to change shortcuts", "navigate", { view: "settings" }),
          createSuggestion("Feature introduction", "text"),
          createSuggestion("Where is settings", "navigate", { view: "settings" }),
        ],
  };
}

/**
 * 帮助内容配置
 */
const HELP_CONTENT: Record<string, { zh: string; en: string; suggestions: { zh: Suggestion[]; en: Suggestion[] } }> = {
  settings: {
    zh: "设置页面可以在插件图标右键菜单中找到，或者点击面板右上角的设置图标。您可以配置：\n- AI 服务：配置模型和 Base URL（支持本地模型），用于智能分类和语义搜索。\n- 外观与语言：支持深色模式跟随系统，中英双语切换。\n- 快捷键：自定义激活面板的全局快捷键。\n- 自动保存：配置是否自动保存网页快照。",
    en: "Settings can be found in the plugin icon right-click menu, or click the settings icon at the top right of the panel. You can configure:\n- AI Service: Model and Base URL (local models supported) for smart categorization and semantic search.\n- Appearance & Language: Dark mode and bilingual support.\n- Shortcuts: Custom global shortcuts.\n- Auto-save: Configure snapshot auto-saving.",
    suggestions: {
      zh: [
        { label: "如何配置 AI", action: "navigate", payload: { view: "settings" } },
        { label: "隐私设置", action: "navigate", payload: { view: "privacy" } },
        { label: "快捷键设置", action: "navigate", payload: { view: "settings" } },
      ],
      en: [
        { label: "How to configure AI", action: "navigate", payload: { view: "settings" } },
        { label: "Privacy settings", action: "navigate", payload: { view: "privacy" } },
        { label: "Shortcut settings", action: "navigate", payload: { view: "settings" } },
      ],
    },
  },
  features: {
    zh: "HamHome 核心功能：\n" +
        "- 🔍 智能搜索：支持语义理解，可用自然语言查找书签（如“上周关于 React 的文章”）。\n" +
        "- 🏷️ 自动分类：AI 自动为书签分类和打标签，保持井井有条。\n" +
        "- 📸 网页快照：自动保存网页快照，防止链接失效，支持离线阅读。\n" +
        "- 🛡️ 隐私保护：支持本地 AI 模型，数据掌握在自己手中。\n" +
        "- ⚡ 高效管理：支持批量清理、移动和导出书签。",
    en: "HamHome Core Features:\n" +
        "- 🔍 Smart Search: Semantic understanding for natural language queries (e.g., \"React articles from last week\").\n" +
        "- 🏷️ Auto-Categorization: AI automatically categorizes and tags bookmarks.\n" +
        "- 📸 Snapshots: Automatically saves page snapshots for offline reading and permalinks.\n" +
        "- 🛡️ Privacy: Supports local AI models, keeping your data secure.\n" +
        "- ⚡ Efficient Management: specific batch operations for cleaning, moving, and exporting.",
    suggestions: {
      zh: [
        { label: "高级功能", action: "text" },
        { label: "搜索技巧", action: "text" },
        { label: "隐私保护", action: "navigate", payload: { view: "privacy" } },
      ],
      en: [
        { label: "Power features", action: "text" },
        { label: "Search tips", action: "text" },
        { label: "Privacy info", action: "navigate", payload: { view: "privacy" } },
      ],
    },
  },
  power_features: {
    zh: "⚡ 高级功能：\n" +
        "- 📥 智能导入：支持 Chrome 书签 (HTML) 和 JSON 备份导入。独家功能：导入时可让 AI 自动重新分类和打标签！\n" +
        "- 📤 数据导出：随时导出标准格式，数据自由迁移。\n" +
        "- 🏗️ 预设体系：一键应用“通用型”或“专业创作型”分类体系，搭建分类系统。\n" +
        "- 🧹 批量管理：自动检测失效链接、合并重复书签（即将推出）。",
    en: "⚡ Power Features:\n" +
        "- 📥 Smart Import: Support HTML/JSON. Exclusive: Optional AI auto-categorization during import!\n" +
        "- 📤 Export: Standard formats for data portability.\n" +
        "- 🏗️ Preset Systems: One-click setup for 'General' or 'Professional' category structures.\n" +
        "- 🧹 Batch Manage: Identify dead links and duplicates.",
    suggestions: {
      zh: [ 
        { label: "如何导入书签", action: "navigate", payload: { view: "import-export" } }, 
        { label: "查看预设分类", action: "navigate", payload: { view: "categories" } } 
      ],
      en: [ 
        { label: "How to import", action: "navigate", payload: { view: "import-export" } }, 
        { label: "View preset categories", action: "navigate", payload: { view: "categories" } } 
      ]
    },
  },
  privacy: {
    zh: "🛡️ 隐私与安全：\n" +
        "- 本地优先：API Key 和敏感配置仅存储在本地浏览器中。\n" +
        "- 隐私域名：可配置特定域名（如公司内网）跳过 AI 分析，防止数据泄露。\n" +
        "- 快照控制：自主决定是否自动保存网页快照。\n" +
        "- 透明度：清楚知道哪些数据被发送给 AI（仅 url/title/content）。",
    en: "🛡️ Privacy & Security:\n" +
        "- Local First: Keys and configs stay in your browser.\n" +
        "- Privacy Domains: Blacklist domains to skip AI analysis.\n" +
        "- Snapshot Control: You decide what gets saved locally.\n" +
        "- Transparency: Full control over data sent to AI.",
    suggestions: {
      zh: [
        { label: "如何配置 AI", action: "navigate", payload: { view: "settings" } },
        { label: "打开设置", action: "navigate", payload: { view: "settings" } },
      ],
      en: [
        { label: "Configure AI", action: "navigate", payload: { view: "settings" } },
        { label: "Open settings", action: "navigate", payload: { view: "settings" } },
      ],
    }
  },
  search_tips: {
     zh: "🔍 搜索技巧：\n" +
         "- 自然语言：“找一下最近看的技术博客”\n" +
         "- 组合条件：“github 上关于 AI 的项目”\n" +
         "- 时间筛选：“上个月保存的菜谱”\n" +
         "- 命令支持：输入 / 可查看可用命令",
     en: "🔍 Search Tips:\n" +
         "- Natural Language: \"Find tech blogs I read recently\"\n" +
         "- Combinations: \"AI projects on github\"\n" +
         "- Time Filter: \"Recipes saved last month\"\n" +
         "- Commands: Type / to see available commands",
     suggestions: {
      zh: [
        { label: "使用语义搜索", action: "text" },
        { label: "最近的书签", action: "timeFilter", payload: { days: 7 } },
      ],
      en: [
        { label: "Try semantic search", action: "text" },
        { label: "Recent bookmarks", action: "timeFilter", payload: { days: 7 } },
      ],
     }
  },
  default: {
    zh: "我是您的 AI 书签助手。我可以帮助您：\n- 搜索：用自然语言查找书签\n- 解答：介绍功能和使用技巧\n- 统计：分析您的收藏习惯\n\n试试问我：“有哪些高级功能？” 或 “如何保护隐私？”",
    en: "I am your AI Bookmark Assistant. I can help you:\n- Search: Find bookmarks with natural language\n- Guide: Explain features and tips\n- Stats: Analyze your bookmarking habits\n\nTry asking: \"What are the power features?\" or \"How do you protect privacy?\"",
    suggestions: {
      zh: [
        { label: "功能介绍", action: "text" },
        { label: "搜索技巧", action: "text" },
        { label: "高级功能", action: "text" },
        { label: "快捷键说明", action: "text" },
      ],
      en: [
        { label: "Features", action: "text" },
        { label: "Search tips", action: "text" },
        { label: "Power features", action: "text" },
        { label: "Shortcuts", action: "text" },
      ],
    },
  },
};

/**
 * 匹配帮助主题
 */
function matchHelpTopic(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  // Shortcuts
  if (lowerQuery.includes("快捷键") || lowerQuery.includes("shortcut") || lowerQuery.includes("hotkey") || lowerQuery.includes("key")) {
    return "shortcut";
  }
  
  // Settings
  if (lowerQuery.includes("设置") || lowerQuery.includes("setting") || lowerQuery.includes("配置") || lowerQuery.includes("config")) {
    return "settings";
  }
  
  // Power Features (Import/Export/Backup/Preset)
  if (lowerQuery.includes("导入") || lowerQuery.includes("import") || 
      lowerQuery.includes("导出") || lowerQuery.includes("export") ||
      lowerQuery.includes("备份") || lowerQuery.includes("backup") ||
      lowerQuery.includes("整理") || lowerQuery.includes("manage") ||
      lowerQuery.includes("高级") || lowerQuery.includes("power") ||
      lowerQuery.includes("预设") || lowerQuery.includes("preset")) {
    return "power_features";
  }

  // Privacy
  if (lowerQuery.includes("隐私") || lowerQuery.includes("privacy") || 
      lowerQuery.includes("安全") || lowerQuery.includes("security") ||
      lowerQuery.includes("数据") || lowerQuery.includes("data")) {
    return "privacy";
  }

  // Search Tips
  if (lowerQuery.includes("搜索") || lowerQuery.includes("search") || 
      lowerQuery.includes("技巧") || lowerQuery.includes("tip") ||
      lowerQuery.includes("怎么查") || lowerQuery.includes("how to find")) {
    return "search_tips";
  }

  // General Features
  if (lowerQuery.includes("功能") || lowerQuery.includes("feature") || 
      lowerQuery.includes("怎么用") || lowerQuery.includes("如何使用") || 
      lowerQuery.includes("what can you do") || lowerQuery.includes("help") || lowerQuery.includes("帮助")) {
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
    if (request.filters.timeRangeDays) {
      suggestions.push(createSuggestion("扩大时间范围", "text"));
    }
    if (!request.filters.semantic) {
      suggestions.push(createSuggestion("使用语义搜索", "semanticOnly"));
    }
  } else {
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
  }

  // 没有结果
  if (context.resultCount === 0) {
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
    const byTag = new Map<string, number>();
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

      // 按标签统计
      for (const tag of bookmark.tags) {
        byTag.set(tag, (byTag.get(tag) || 0) + 1);
      }

      // 按日期统计
      const date = formatDate(bookmark.createdAt);
      byDate.set(date, (byDate.get(date) || 0) + 1);
    }

    return {
      total: bookmarks.length,
      byCategory,
      byDomain,
      byTag,
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

      // 获取 Top 标签
      const topTags = Array.from(stats.byTag.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      if (language === "zh") {
        answer = `${timeDesc}共收藏了 ${stats.total} 个书签。\n\n`;
        answer += `**按分类：**\n${topCategories.map(([name, count]) => `- ${name}: ${count} 个`).join("\n")}\n\n`;
        if (topTags.length > 0) {
          answer += `**热门标签：**\n${topTags.map(([tag, count]) => `- ${tag}: ${count} 个`).join("\n")}\n\n`;
        }
        answer += `**热门网站：**\n${topDomains.map(([domain, count]) => `- ${domain}: ${count} 个`).join("\n")}`;
      } else {
        answer = `You saved ${stats.total} bookmarks ${timeDesc}.\n\n`;
        answer += `**By Category:**\n${topCategories.map(([name, count]) => `- ${name}: ${count}`).join("\n")}\n\n`;
        if (topTags.length > 0) {
          answer += `**Top Tags:**\n${topTags.map(([tag, count]) => `- ${tag}: ${count}`).join("\n")}\n\n`;
        }
        answer += `**Top Sites:**\n${topDomains.map(([domain, count]) => `- ${domain}: ${count}`).join("\n")}`;
      }

      suggestions.push(
        createSuggestion(language === "zh" ? "查看详细列表" : "View detailed list", "showMore"),
        createSuggestion(language === "zh" ? "管理标签" : "Manage tags", "navigate", { view: "tags" }),
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

    // 准备来源列表
    const sources = sortedBookmarks.map((b) => b.id);

    // 生成回答（直接使用规则生成）
    const response = sortedBookmarks.length === 0
      ? {
          answer: language === "zh"
            ? "未找到相关书签。您可以扩大搜索范围。"
            : "No relevant bookmarks found. Try expanding your search.",
          sources: [],
          nextSuggestions: smartSuggestions.length > 0 ? smartSuggestions : [
            createSuggestion(language === "zh" ? "使用语义搜索" : "Use semantic search", "semanticOnly"),
          ],
        }
      : this.generateRuleBasedAnswerWithSuggestions(sortedBookmarks, sources, smartSuggestions, language);

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
   * 基于规则生成回答（带智能建议）
   */
  private generateRuleBasedAnswerWithSuggestions(
    bookmarks: LocalBookmark[],
    sources: string[],
    smartSuggestions: Suggestion[],
    language: "zh" | "en",
  ): ChatSearchResponse {
    const count = bookmarks.length;
    let answer: string;

    if (language === "zh") {
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
    } else {
      if (count === 1) {
        answer = `Found 1 relevant bookmark: ${bookmarks[0].title}`;
      } else if (count <= 5) {
        answer = `Found ${count} relevant bookmarks: ${bookmarks.map((b) => b.title).join(", ")}`;
      } else {
        answer = `Found ${count} relevant bookmarks. Most relevant: ${bookmarks
          .slice(0, 3)
          .map((b) => b.title)
          .join(", ")}, etc.`;
      }
    }

    return {
      answer,
      sources,
      nextSuggestions: smartSuggestions,
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
