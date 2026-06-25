import type { AgentTool, JsonSchema } from "@browser-agent-sdk/agent";
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

const emptyParameters: JsonSchema = {
  type: "object",
  properties: {},
};

const filterParameters: JsonSchema = {
  type: "object",
  properties: {
    categoryId: {},
    tagsAny: { type: "array", items: { type: "string" } },
    domain: {},
    timeRangeDays: {},
    includeContent: { type: "boolean" },
    retrievalMode: { type: "string", enum: ["hybrid", "semantic", "keyword"] },
    semantic: { type: "boolean" },
  },
};

/**
 * 创建对话搜索工具集合，供 Browser Agent SDK 在单个搜索回合内调用。
 */
export async function createChatSearchTools(
  session: ChatSearchSession,
): Promise<AgentTool[]> {
  const categoriesMap = await resolveCategoriesMap();

  const tools: AgentTool[] = [
    {
      name: "search_bookmarks",
      description:
        "Search bookmarks using keyword and semantic retrieval. Use this for most bookmark lookup questions.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          topK: { type: "number" },
          filters: filterParameters,
        },
      },
      async execute(input: {
        query?: string;
        topK?: number;
        filters?: Partial<SearchFilters>;
        [key: string]: any;
      }) {
        const filters = input.filters || {};
        // Rescue parameters that the LLM mistakenly put at the root
        if (input.retrievalMode) filters.retrievalMode = input.retrievalMode;
        if (typeof input.semantic === "boolean") filters.semantic = input.semantic;
        if (input.timeRangeDays) filters.timeRangeDays = input.timeRangeDays;

        const snapshot = await performSearch(session, {
          query: input.query,
          topK: input.topK,
          filters,
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
    {
      name: "continue_search",
      description:
        "Continue the current search and exclude bookmarks that were already shown before.",
      parameters: {
        type: "object",
        properties: {
          topK: { type: "number" },
        },
      },
      async execute(input: { topK?: number; [key: string]: any }) {
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
    {
      name: "apply_filter",
      description:
        "Apply or refine structured filters such as time range, category, tags, domain, or semantic-only mode.",
      parameters: {
        type: "object",
        properties: {
          filters: filterParameters,
          topK: { type: "number" },
        },
        required: ["filters"],
      },
      async execute(input: { filters: Partial<SearchFilters>; topK?: number; [key: string]: any }) {
        const filters = input.filters || {};
        if (input.retrievalMode) filters.retrievalMode = input.retrievalMode;
        if (typeof input.semantic === "boolean") filters.semantic = input.semantic;
        if (input.timeRangeDays) filters.timeRangeDays = input.timeRangeDays;

        const snapshot = await performSearch(session, {
          filters,
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
    {
      name: "get_bookmarks_by_ids",
      description:
        "Fetch full bookmark details for specific bookmark ids after search results are known.",
      parameters: {
        type: "object",
        properties: {
          ids: { type: "array", items: { type: "string" } },
        },
        required: ["ids"],
        additionalProperties: false,
      },
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
    {
      name: "get_categories",
      description: "List the current bookmark categories for category-aware answers.",
      parameters: emptyParameters,
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
    {
      name: "get_existing_tags",
      description: "List existing bookmark tags.",
      parameters: emptyParameters,
      async execute() {
        const output = await bookmarkStorage.getAllTags();
        session.observations.push({ tool: "get_existing_tags", output });
        return output;
      },
    },
    {
      name: "get_search_context",
      description:
        "Inspect the current conversation state, history summary, and active filters before planning the next tool call.",
      parameters: emptyParameters,
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
    {
      name: "get_extension_shortcuts",
      description: "Get extension keyboard shortcuts.",
      parameters: emptyParameters,
      async execute() {
        const output = await getExtensionShortcuts();
        session.observations.push({ tool: "get_extension_shortcuts", output });
        return output;
      },
    },
    {
      name: "get_statistics",
      description: "Compute simple bookmark statistics for a recent time range.",
      parameters: {
        type: "object",
        properties: {
          timeRangeDays: { type: "number" },
        },
        additionalProperties: false,
      },
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

  ];

  logger.debug("Chat search tools created", {
    toolNames: tools.map((tool) => tool.name),
    language: session.language,
  });

  return tools;
}

export async function getChatSearchLanguage(): Promise<Language> {
  const settings = await configStorage.getSettings();
  return (settings.language || "zh") as Language;
}
