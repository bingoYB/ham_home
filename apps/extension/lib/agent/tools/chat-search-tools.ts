import { z } from "zod";
import { createLogger } from "@hamhome/utils";
import { bookmarkStorage, configStorage } from "@/lib/storage";
import { hybridRetriever } from "@/lib/search/hybrid-retriever";
import { getExtensionShortcuts } from "@/utils/browser-api";
import type {
  ConversationIntent,
  ConversationalSearchSession,
  LocalBookmark,
  LocalCategory,
  RetrievalMode,
  SearchFilters,
  SearchResult,
  Suggestion,
} from "@/types";

const logger = createLogger({ namespace: "AgentChatSearchTools" });

type Language = "zh" | "en";

interface SearchExecutionSnapshot {
  query: string;
  filters: SearchFilters;
  bookmarkIds: string[];
  bookmarks: LocalBookmark[];
  searchResult: SearchResult;
}

interface StatisticsSnapshot {
  bookmarkIds: string[];
  searchResult: SearchResult;
}

export interface ChatSearchTurnRequest {
  source: "message" | "suggestion";
  displayText: string;
  agentInput: string;
  pendingAction?: Suggestion["action"];
}

export interface ChatSearchSession {
  turn: ChatSearchTurnRequest;
  state: ConversationalSearchSession;
  language: Language;
  workingFilters: SearchFilters;
  intent: ConversationIntent;
  observations: Array<{ tool: string; output: unknown }>;
  lastSearch?: SearchExecutionSnapshot;
  lastStatistics?: StatisticsSnapshot;
}

function resolveRetrievalMode(filters: SearchFilters): RetrievalMode {
  if (filters.retrievalMode) {
    return filters.retrievalMode;
  }

  if (filters.semantic === false) {
    return "keyword";
  }

  return "hybrid";
}

function normalizeFilters(filters: SearchFilters): SearchFilters {
  const retrievalMode = resolveRetrievalMode(filters);
  return {
    ...filters,
    retrievalMode,
    semantic: retrievalMode !== "keyword",
  };
}

function createSuggestion(
  label: string,
  action: Suggestion["action"],
  payload?: Record<string, unknown>,
): Suggestion {
  return { label, action, ...(payload ? { payload } : {}) };
}

function truncate(text: string | undefined, maxLength: number): string {
  return (text || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

async function getBookmarksByIds(ids: string[]): Promise<LocalBookmark[]> {
  const bookmarks = await Promise.all(
    ids.map((id) => bookmarkStorage.getBookmarkById(id)),
  );

  return bookmarks.filter((bookmark): bookmark is LocalBookmark => !!bookmark);
}

async function resolveCategoriesMap(): Promise<Map<string, LocalCategory>> {
  const categories = await bookmarkStorage.getCategories();
  return new Map(categories.map((category) => [category.id, category]));
}

async function performSearch(
  session: ChatSearchSession,
  input: {
    query?: string;
    topK?: number;
    filters?: Partial<SearchFilters>;
    excludeSeen?: boolean;
  },
): Promise<SearchExecutionSnapshot> {
  const query =
    input.query?.trim() ||
    session.lastSearch?.query ||
    session.state.lastQuery ||
    session.turn.displayText;
  const filters = normalizeFilters({
    ...session.workingFilters,
    ...(input.filters || {}),
  });
  const retrievalMode = resolveRetrievalMode(filters);
  const enableSemantic =
    retrievalMode !== "keyword" &&
    query.trim().length > 0 &&
    (await hybridRetriever.isSemanticAvailable());
  const enableKeyword = retrievalMode !== "semantic";
  const excludeIds = input.excludeSeen
    ? Array.from(
        new Set([
          ...session.state.seenBookmarkIds,
          ...(session.lastSearch?.bookmarkIds || []),
        ]),
      )
    : [];

  const searchResult = await hybridRetriever.search(query, {
    topK: input.topK || 10,
    filters,
    excludeIds,
    enableSemantic,
    enableKeyword,
  });

  const bookmarkIds = searchResult.items.map((item) => item.bookmarkId);
  const bookmarks = await getBookmarksByIds(bookmarkIds);

  session.workingFilters = filters;
  session.intent = "query";
  session.lastSearch = {
    query,
    filters,
    bookmarkIds,
    bookmarks,
    searchResult,
  };

  return session.lastSearch;
}

async function generateShortcutHelpContent(
  language: Language,
): Promise<{ content: string; suggestions: Suggestion[] }> {
  const shortcuts = await getExtensionShortcuts();

  if (shortcuts.length === 0) {
    return {
      content:
        language === "zh"
          ? "暂时无法获取快捷键配置，请在浏览器扩展设置中查看。"
          : "Unable to fetch shortcut settings. Please check browser extension settings.",
      suggestions:
        language === "zh"
          ? [
              createSuggestion("如何设置快捷键", "navigate", { view: "settings" }),
              createSuggestion("其他功能介绍", "text"),
              createSuggestion("设置页面在哪", "navigate", { view: "settings" }),
            ]
          : [
              createSuggestion("How to set shortcuts", "navigate", {
                view: "settings",
              }),
              createSuggestion("Feature introduction", "text"),
              createSuggestion("Where is settings", "navigate", {
                view: "settings",
              }),
            ],
    };
  }

  const lines = [
    language === "zh" ? "快捷键说明：" : "Keyboard shortcuts:",
    ...shortcuts.map((command) => {
      const shortcut =
        command.shortcut || (language === "zh" ? "未设置" : "Not set");
      return `- ${shortcut}：${command.description}`;
    }),
    language === "zh" ? "- Esc：关闭面板" : "- Esc: Close panel",
  ];

  return {
    content: lines.join("\n"),
    suggestions:
      language === "zh"
        ? [
            createSuggestion("如何更改快捷键", "navigate", { view: "settings" }),
            createSuggestion("其他功能介绍", "text"),
            createSuggestion("设置页面在哪", "navigate", { view: "settings" }),
          ]
        : [
            createSuggestion("How to change shortcuts", "navigate", {
              view: "settings",
            }),
            createSuggestion("Feature introduction", "text"),
            createSuggestion("Where is settings", "navigate", { view: "settings" }),
          ],
  };
}

const HELP_CONTENT: Record<
  string,
  { zh: string; en: string; suggestions: { zh: Suggestion[]; en: Suggestion[] } }
> = {
  settings: {
    zh: "设置页面可以在插件图标右键菜单中找到，或者点击面板右上角的设置图标。您可以配置：\n- AI 服务：配置模型和 Base URL（支持本地模型），用于智能分类和语义搜索。\n- 外观与语言：支持深色模式跟随系统，中英双语切换。\n- 快捷键：自定义激活面板的全局快捷键。\n- 自动保存：配置是否自动保存网页快照。",
    en: "Settings can be found in the plugin icon right-click menu, or click the settings icon at the top right of the panel. You can configure:\n- AI Service: Model and Base URL for smart categorization and semantic search.\n- Appearance & Language: Dark mode and bilingual support.\n- Shortcuts: Custom global shortcuts.\n- Auto-save: Configure snapshot auto-saving.",
    suggestions: {
      zh: [
        createSuggestion("如何配置 AI", "navigate", { view: "settings" }),
        createSuggestion("隐私设置", "navigate", { view: "privacy" }),
        createSuggestion("快捷键设置", "navigate", { view: "settings" }),
      ],
      en: [
        createSuggestion("How to configure AI", "navigate", { view: "settings" }),
        createSuggestion("Privacy settings", "navigate", { view: "privacy" }),
        createSuggestion("Shortcut settings", "navigate", { view: "settings" }),
      ],
    },
  },
  features: {
    zh: "HamHome 核心功能：\n- 智能搜索：支持自然语言和语义检索。\n- 自动分类：AI 可自动生成分类和标签。\n- 网页快照：支持保存页面快照和离线阅读。\n- 隐私保护：支持本地模型与隐私域名。\n- 高效管理：支持批量清理、移动和导出书签。",
    en: "HamHome core features:\n- Smart Search: natural language and semantic retrieval.\n- Auto Categorization: AI suggests categories and tags.\n- Snapshots: preserve pages for offline reading.\n- Privacy: supports local models and privacy domains.\n- Efficient Management: batch cleanup, move, and export.",
    suggestions: {
      zh: [
        createSuggestion("高级功能", "text"),
        createSuggestion("搜索技巧", "text"),
        createSuggestion("隐私保护", "navigate", { view: "privacy" }),
      ],
      en: [
        createSuggestion("Power features", "text"),
        createSuggestion("Search tips", "text"),
        createSuggestion("Privacy info", "navigate", { view: "privacy" }),
      ],
    },
  },
  power_features: {
    zh: "高级功能：\n- 智能导入：支持导入时 AI 重新分类和打标签。\n- 数据导出：支持标准格式导出。\n- 预设体系：一键应用预设分类方案。\n- 批量管理：适合批量整理收藏。",
    en: "Power features:\n- Smart import with AI recategorization.\n- Standard export formats.\n- Preset category systems.\n- Batch management workflows.",
    suggestions: {
      zh: [
        createSuggestion("如何导入书签", "navigate", { view: "import-export" }),
        createSuggestion("查看预设分类", "navigate", { view: "categories" }),
      ],
      en: [
        createSuggestion("How to import", "navigate", { view: "import-export" }),
        createSuggestion("View preset categories", "navigate", {
          view: "categories",
        }),
      ],
    },
  },
  privacy: {
    zh: "隐私与安全：\n- API Key 和敏感配置仅存储在本地浏览器。\n- 隐私域名可跳过 AI 分析。\n- 是否保存快照由您决定。\n- 仅在需要时发送 url、title、content 等数据。",
    en: "Privacy and security:\n- API keys and sensitive config stay local.\n- Privacy domains can skip AI analysis.\n- Snapshot saving is under your control.\n- Only required page data is sent when AI is used.",
    suggestions: {
      zh: [
        createSuggestion("如何配置 AI", "navigate", { view: "settings" }),
        createSuggestion("打开设置", "navigate", { view: "settings" }),
      ],
      en: [
        createSuggestion("Configure AI", "navigate", { view: "settings" }),
        createSuggestion("Open settings", "navigate", { view: "settings" }),
      ],
    },
  },
  search_tips: {
    zh: "搜索技巧：\n- 自然语言：找最近看的技术博客\n- 组合条件：github 上关于 AI 的项目\n- 时间过滤：上个月保存的菜谱\n- 输入 / 可查看命令",
    en: "Search tips:\n- Natural language: tech blogs I read recently\n- Combined filters: AI projects on github\n- Time filters: recipes saved last month\n- Type / to inspect commands",
    suggestions: {
      zh: [
        createSuggestion("使用语义搜索", "text"),
        createSuggestion("最近的书签", "timeFilter", { days: 7 }),
      ],
      en: [
        createSuggestion("Try semantic search", "text"),
        createSuggestion("Recent bookmarks", "timeFilter", { days: 7 }),
      ],
    },
  },
  default: {
    zh: "我是您的 AI 书签助手。我可以帮助您搜索书签、解释功能和做简单统计。您可以试试“有哪些高级功能？”或“最近收藏了多少书签？”。",
    en: "I am your AI bookmark assistant. I can help search bookmarks, explain features, and provide simple stats. Try asking 'What are the power features?' or 'How many bookmarks did I save recently?'",
    suggestions: {
      zh: [
        createSuggestion("功能介绍", "text"),
        createSuggestion("搜索技巧", "text"),
        createSuggestion("高级功能", "text"),
        createSuggestion("快捷键说明", "text"),
      ],
      en: [
        createSuggestion("Features", "text"),
        createSuggestion("Search tips", "text"),
        createSuggestion("Power features", "text"),
        createSuggestion("Shortcuts", "text"),
      ],
    },
  },
};

function matchHelpTopic(query: string): keyof typeof HELP_CONTENT | "shortcut" {
  const lowerQuery = query.toLowerCase();

  if (
    lowerQuery.includes("快捷键") ||
    lowerQuery.includes("shortcut") ||
    lowerQuery.includes("hotkey")
  ) {
    return "shortcut";
  }

  if (
    lowerQuery.includes("设置") ||
    lowerQuery.includes("setting") ||
    lowerQuery.includes("配置")
  ) {
    return "settings";
  }

  if (
    lowerQuery.includes("导入") ||
    lowerQuery.includes("import") ||
    lowerQuery.includes("导出") ||
    lowerQuery.includes("export") ||
    lowerQuery.includes("高级") ||
    lowerQuery.includes("power")
  ) {
    return "power_features";
  }

  if (
    lowerQuery.includes("隐私") ||
    lowerQuery.includes("privacy") ||
    lowerQuery.includes("安全")
  ) {
    return "privacy";
  }

  if (
    lowerQuery.includes("搜索") ||
    lowerQuery.includes("search") ||
    lowerQuery.includes("查找")
  ) {
    return "search_tips";
  }

  if (
    lowerQuery.includes("功能") ||
    lowerQuery.includes("feature") ||
    lowerQuery.includes("help") ||
    lowerQuery.includes("帮助")
  ) {
    return "features";
  }

  return "default";
}

function buildStatisticsOutput(
  bookmarks: LocalBookmark[],
  categories: Map<string, LocalCategory>,
  language: Language,
  timeRangeDays: number,
) {
  const byCategory = new Map<string, number>();
  const byDomain = new Map<string, number>();
  const byTag = new Map<string, number>();
  const byDate = new Map<string, number>();

  for (const bookmark of bookmarks) {
    const categoryName = bookmark.categoryId
      ? categories.get(bookmark.categoryId)?.name || "未分类"
      : "未分类";
    byCategory.set(categoryName, (byCategory.get(categoryName) || 0) + 1);
    byDomain.set(extractDomain(bookmark.url), (byDomain.get(extractDomain(bookmark.url)) || 0) + 1);
    byDate.set(formatDate(bookmark.createdAt), (byDate.get(formatDate(bookmark.createdAt)) || 0) + 1);

    for (const tag of bookmark.tags) {
      byTag.set(tag, (byTag.get(tag) || 0) + 1);
    }
  }

  const output = {
    summary:
      language === "zh"
        ? `最近 ${timeRangeDays} 天共找到 ${bookmarks.length} 条书签。`
        : `Found ${bookmarks.length} bookmarks in the last ${timeRangeDays} days.`,
    total: bookmarks.length,
    topCategories: Array.from(byCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
    topDomains: Array.from(byDomain.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
    topTags: Array.from(byTag.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
    byDate: Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7),
    sampleBookmarkIds: bookmarks.slice(0, 10).map((bookmark) => bookmark.id),
  };

  return output;
}

export async function createChatSearchTools(session: ChatSearchSession) {
  const categoriesMap = await resolveCategoriesMap();

  const tools = {
    search_bookmarks: {
      description:
        "Search bookmarks using keyword and semantic retrieval. Use this for most bookmark lookup questions.",
      inputSchema: z.object({
        query: z.string().trim().optional(),
        topK: z.number().int().min(1).max(20).optional(),
        filters: z
          .object({
            categoryId: z.string().nullable().optional(),
            tagsAny: z.array(z.string()).optional(),
            domain: z.string().nullable().optional(),
            timeRangeDays: z.number().int().min(1).max(3650).nullable().optional(),
            includeContent: z.boolean().optional(),
            retrievalMode: z.enum(["hybrid", "semantic", "keyword"]).optional(),
            semantic: z.boolean().optional(),
          })
          .partial()
          .optional(),
      }),
      async execute(input: {
        query?: string;
        topK?: number;
        filters?: Partial<SearchFilters>;
      }) {
        const snapshot = await performSearch(session, {
          query: input.query,
          topK: input.topK,
          filters: input.filters,
        });

        const output = {
          query: snapshot.query,
          filters: snapshot.filters,
          retrievalMode: resolveRetrievalMode(snapshot.filters),
          total: snapshot.searchResult.total,
          usedSemantic: snapshot.searchResult.usedSemantic,
          usedKeyword: snapshot.searchResult.usedKeyword,
          items: snapshot.bookmarks.map((bookmark, index) => ({
            rank: index + 1,
            bookmarkId: bookmark.id,
            title: bookmark.title,
            url: bookmark.url,
            categoryName: bookmark.categoryId
              ? categoriesMap.get(bookmark.categoryId)?.name || null
              : null,
            tags: bookmark.tags,
            description: truncate(bookmark.description, 180),
            score: snapshot.searchResult.items[index]?.score,
            matchReason: snapshot.searchResult.items[index]?.matchReason,
          })),
        };

        session.observations.push({ tool: "search_bookmarks", output });
        return output;
      },
    },
    continue_search: {
      description:
        "Continue the current search and exclude bookmarks that were already shown before.",
      inputSchema: z.object({
        topK: z.number().int().min(1).max(20).optional(),
      }),
      async execute(input: { topK?: number }) {
        const snapshot = await performSearch(session, {
          topK: input.topK || 10,
          excludeSeen: true,
        });

        const output = {
          query: snapshot.query,
          filters: snapshot.filters,
          retrievalMode: resolveRetrievalMode(snapshot.filters),
          total: snapshot.searchResult.total,
          items: snapshot.bookmarks.map((bookmark) => ({
            bookmarkId: bookmark.id,
            title: bookmark.title,
            url: bookmark.url,
          })),
        };

        session.observations.push({ tool: "continue_search", output });
        return output;
      },
    },
    apply_filter: {
      description:
        "Apply or refine structured filters such as time range, category, tags, domain, or semantic-only mode.",
      inputSchema: z.object({
        filters: z.object({
          categoryId: z.string().nullable().optional(),
          tagsAny: z.array(z.string()).optional(),
          domain: z.string().nullable().optional(),
          timeRangeDays: z.number().int().min(1).max(3650).nullable().optional(),
          includeContent: z.boolean().optional(),
          retrievalMode: z.enum(["hybrid", "semantic", "keyword"]).optional(),
          semantic: z.boolean().optional(),
        }),
        topK: z.number().int().min(1).max(20).optional(),
      }),
      async execute(input: { filters: Partial<SearchFilters>; topK?: number }) {
        const snapshot = await performSearch(session, {
          filters: input.filters,
          topK: input.topK,
        });

        const output = {
          query: snapshot.query,
          filters: snapshot.filters,
          retrievalMode: resolveRetrievalMode(snapshot.filters),
          total: snapshot.searchResult.total,
          items: snapshot.bookmarks.map((bookmark) => ({
            bookmarkId: bookmark.id,
            title: bookmark.title,
            url: bookmark.url,
          })),
        };

        session.observations.push({ tool: "apply_filter", output });
        return output;
      },
    },
    get_bookmarks_by_ids: {
      description:
        "Fetch full bookmark details for specific bookmark ids after search results are known.",
      inputSchema: z.object({
        ids: z.array(z.string()).min(1).max(20),
      }),
      async execute(input: { ids: string[] }) {
        const bookmarks = await getBookmarksByIds(input.ids);
        const output = bookmarks.map((bookmark) => ({
          bookmarkId: bookmark.id,
          title: bookmark.title,
          url: bookmark.url,
          description: truncate(bookmark.description, 240),
          content: truncate(bookmark.content, 800),
          tags: bookmark.tags,
          categoryName: bookmark.categoryId
            ? categoriesMap.get(bookmark.categoryId)?.name || null
            : null,
          createdAt: bookmark.createdAt,
        }));

        session.observations.push({ tool: "get_bookmarks_by_ids", output });
        return output;
      },
    },
    get_categories: {
      description: "List the current bookmark categories for category-aware answers.",
      inputSchema: z.object({}),
      async execute() {
        const output = Array.from(categoriesMap.values()).map((category) => ({
          id: category.id,
          name: category.name,
          parentId: category.parentId,
          icon: category.icon,
        }));
        session.observations.push({ tool: "get_categories", output });
        return output;
      },
    },
    get_existing_tags: {
      description: "List existing bookmark tags.",
      inputSchema: z.object({}),
      async execute() {
        const output = await bookmarkStorage.getAllTags();
        session.observations.push({ tool: "get_existing_tags", output });
        return output;
      },
    },
    get_search_context: {
      description:
        "Inspect the current conversation state, history summary, and active filters before planning the next tool call.",
      inputSchema: z.object({}),
      async execute() {
        const output = {
          lastQuery: session.state.lastQuery || "",
          currentTurn: session.turn,
          lastIntent: session.state.lastIntent || "",
          workingFilters: session.workingFilters,
          seenBookmarkCount: session.state.seenBookmarkIds.length,
          lastSelectedBookmarkIds: session.state.lastSelectedBookmarkIds,
          history: session.state.history.slice(-6),
        };
        session.observations.push({ tool: "get_search_context", output });
        return output;
      },
    },
    get_extension_shortcuts: {
      description: "Get extension keyboard shortcuts and related help content.",
      inputSchema: z.object({}),
      async execute() {
        const output = await getExtensionShortcuts();
        session.observations.push({ tool: "get_extension_shortcuts", output });
        return output;
      },
    },
    get_help_content: {
      description:
        "Fetch grounded help content about settings, privacy, features, shortcuts, and search tips.",
      inputSchema: z.object({
        topic: z.string().optional(),
      }),
      async execute(input: { topic?: string }) {
        const topic = matchHelpTopic(input.topic || session.turn.displayText);
        const output =
          topic === "shortcut"
            ? await generateShortcutHelpContent(session.language)
            : {
                content:
                  session.language === "zh"
                    ? HELP_CONTENT[topic].zh
                    : HELP_CONTENT[topic].en,
                suggestions:
                  session.language === "zh"
                    ? HELP_CONTENT[topic].suggestions.zh
                    : HELP_CONTENT[topic].suggestions.en,
              };

        session.intent = "help";
        session.observations.push({ tool: "get_help_content", output });
        return output;
      },
    },
    get_statistics: {
      description: "Compute simple bookmark statistics for a recent time range.",
      inputSchema: z.object({
        timeRangeDays: z.number().int().min(1).max(3650).optional(),
      }),
      async execute(input: { timeRangeDays?: number }) {
        const timeRangeDays = input.timeRangeDays || 7;
        const cutoffTime = Date.now() - timeRangeDays * 24 * 60 * 60 * 1000;
        const bookmarks = (await bookmarkStorage.getBookmarks({ isDeleted: false }))
          .filter((bookmark) => bookmark.createdAt >= cutoffTime);

        const output = buildStatisticsOutput(
          bookmarks,
          categoriesMap,
          session.language,
          timeRangeDays,
        );

        session.intent = "statistics";
        session.lastStatistics = {
          bookmarkIds: output.sampleBookmarkIds,
          searchResult: {
            items: output.sampleBookmarkIds.map((bookmarkId) => ({
              bookmarkId,
              score: 1,
            })),
            total: bookmarks.length,
            usedSemantic: false,
            usedKeyword: false,
          },
        };
        session.observations.push({ tool: "get_statistics", output });
        return output;
      },
    },
    open_view: {
      description:
        "Resolve a view name that the UI can navigate to later, such as settings, privacy, categories, import-export, or tags.",
      inputSchema: z.object({
        view: z.enum(["settings", "privacy", "categories", "import-export", "tags"]),
      }),
      async execute(input: {
        view: "settings" | "privacy" | "categories" | "import-export" | "tags";
      }) {
        const output = {
          acknowledged: true,
          view: input.view,
        };
        session.observations.push({ tool: "open_view", output });
        return output;
      },
    },
  } as const;

  logger.debug("Chat search tools created", {
    toolNames: Object.keys(tools),
    language: session.language,
  });

  return tools;
}

export async function getChatSearchLanguage(): Promise<Language> {
  const settings = await configStorage.getSettings();
  return (settings.language || "zh") as Language;
}
