import { ToolRegistry, generateStructuredObject } from "@hamhome/agent";
import { z } from "zod";
import { createLogger } from "@hamhome/utils";
import type {
  ChatSearchResponse,
  ConversationalSearchSession,
  ConversationalSearchTurnInput,
  LocalBookmark,
  SearchFilters,
  SearchResult,
  Suggestion,
  SuggestionActionType,
} from "@/types";
import { bookmarkStorage } from "@/lib/storage";
import { getAgentErrorMessage } from "../errors";
import { createExtensionAgent } from "../factory";
import {
  createChatSearchTools,
  getChatSearchLanguage,
  type ChatSearchSession,
  type ChatSearchTurnRequest,
} from "../tools/chat-search-tools";

const logger = createLogger({ namespace: "AgentChatSearchService" });

const suggestionActionEnum = z.enum([
  "text",
  "copyAllLinks",
  "batchAddTags",
  "batchMoveCategory",
  "showMore",
  "timeFilter",
  "domainFilter",
  "categoryFilter",
  "semanticOnly",
  "keywordOnly",
  "findDuplicates",
  "navigate",
] satisfies [SuggestionActionType, ...SuggestionActionType[]]);

const chatSearchResponseSchema = z.object({
  answer: z.string().trim().min(1),
  sources: z.array(z.string()).max(10).default([]),
  nextSuggestions: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(40),
        action: suggestionActionEnum,
        payload: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .max(4)
    .default([]),
});

type ChatSearchResponseOutput = z.infer<typeof chatSearchResponseSchema>;

export interface ChatSearchTurnResult {
  displayText: string;
  response: ChatSearchResponse;
  bookmarks: LocalBookmark[];
  searchResult: SearchResult;
  newState: ConversationalSearchSession;
}

interface ResolvedTurn {
  displayText: string;
  turnRequest: ChatSearchTurnRequest;
  preAppliedFilters?: Partial<SearchFilters>;
}

function normalizeText(text: string | undefined, maxLength = 800): string {
  return (text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

function createEmptySearchResult(): SearchResult {
  return {
    items: [],
    total: 0,
    usedSemantic: false,
    usedKeyword: false,
  };
}

async function getBookmarksByIds(ids: string[]): Promise<LocalBookmark[]> {
  const bookmarks = await Promise.all(
    ids.map((id) => bookmarkStorage.getBookmarkById(id)),
  );
  return bookmarks.filter((bookmark): bookmark is LocalBookmark => !!bookmark);
}

function buildAgentInputMessages(
  state: ConversationalSearchSession,
  turnRequest: ChatSearchTurnRequest,
) {
  const historyMessages = state.history.slice(-10).map((message) => ({
    role: message.role,
    content: message.text,
  }));

  return [
    ...historyMessages,
    {
      role: "user" as const,
      content: turnRequest.agentInput,
    },
  ];
}

function createDisplayTextFromInput(input: ConversationalSearchTurnInput): string {
  if (input.type === "message") {
    return input.text?.trim() || "";
  }

  return input.suggestion?.label?.trim() || "";
}

function resolveSuggestionTurn(
  input: ConversationalSearchTurnInput,
  language: "zh" | "en",
): ResolvedTurn {
  const suggestion = input.suggestion;
  const displayText = suggestion?.label?.trim() || "";
  const payload = suggestion?.payload || {};

  switch (suggestion?.action) {
    case "showMore":
      return {
        displayText,
        turnRequest: {
          source: "suggestion",
          displayText,
          pendingAction: suggestion.action,
          agentInput:
            language === "zh"
              ? "请基于当前对话上下文继续搜索，并展示更多之前未展示过的相关书签。"
              : "Continue the current search and show more relevant bookmarks that have not been shown before.",
        },
      };
    case "timeFilter": {
      const days = typeof payload.days === "number" ? payload.days : 7;
      return {
        displayText,
        preAppliedFilters: { timeRangeDays: days },
        turnRequest: {
          source: "suggestion",
          displayText,
          pendingAction: suggestion.action,
          agentInput:
            language === "zh"
              ? `请在当前对话上下文基础上，将结果限制为最近 ${days} 天内保存的书签，并返回最相关的结果。`
              : `Within the current conversation context, limit results to bookmarks saved in the last ${days} days and return the most relevant ones.`,
        },
      };
    }
    case "domainFilter": {
      const domain =
        typeof payload.domain === "string" ? payload.domain.trim() : undefined;
      return {
        displayText,
        preAppliedFilters: domain ? { domain } : undefined,
        turnRequest: {
          source: "suggestion",
          displayText,
          pendingAction: suggestion.action,
          agentInput:
            language === "zh"
              ? domain
                ? `请在当前对话上下文基础上，只保留域名包含 ${domain} 的书签，并返回最相关结果。`
                : `请在当前对话上下文基础上，根据建议文案收窄域名筛选并返回最相关结果。`
              : domain
                ? `Within the current conversation context, keep only bookmarks whose domain contains ${domain} and return the most relevant results.`
                : "Within the current conversation context, narrow the domain filter according to the suggestion and return the most relevant results.",
        },
      };
    }
    case "categoryFilter": {
      const categoryId =
        typeof payload.categoryId === "string"
          ? payload.categoryId.trim()
          : undefined;
      return {
        displayText,
        preAppliedFilters: categoryId ? { categoryId } : undefined,
        turnRequest: {
          source: "suggestion",
          displayText,
          pendingAction: suggestion.action,
          agentInput:
            language === "zh"
              ? "请在当前对话上下文基础上，按建议分类收窄结果并返回最相关的书签。"
              : "Within the current conversation context, narrow the results to the suggested category and return the most relevant bookmarks.",
        },
      };
    }
    case "semanticOnly":
      return {
        displayText,
        preAppliedFilters: { retrievalMode: "semantic", semantic: true },
        turnRequest: {
          source: "suggestion",
          displayText,
          pendingAction: suggestion.action,
          agentInput:
            language === "zh"
              ? "请在当前对话上下文基础上，仅使用语义检索重新筛选结果，并给出最相关的书签。"
              : "Within the current conversation context, re-rank the results using semantic retrieval only and return the most relevant bookmarks.",
        },
      };
    case "keywordOnly":
      return {
        displayText,
        preAppliedFilters: { retrievalMode: "keyword", semantic: false },
        turnRequest: {
          source: "suggestion",
          displayText,
          pendingAction: suggestion.action,
          agentInput:
            language === "zh"
              ? "请在当前对话上下文基础上，仅使用关键词检索重新筛选结果，并给出最相关的书签。"
              : "Within the current conversation context, re-rank the results using keyword retrieval only and return the most relevant bookmarks.",
        },
      };
    case "findDuplicates":
      return {
        displayText,
        turnRequest: {
          source: "suggestion",
          displayText,
          pendingAction: suggestion.action,
          agentInput:
            language === "zh"
              ? "请帮我查找可能重复、标题或链接高度相似的书签，并说明最值得处理的项。"
              : "Find bookmarks that are likely duplicates or highly similar by title or URL, and explain which ones are most worth cleaning up.",
        },
      };
    case "text":
    default:
      return {
        displayText,
        turnRequest: {
          source: "suggestion",
          displayText,
          pendingAction: suggestion?.action,
          agentInput: displayText,
        },
      };
  }
}

function resolveTurnInput(
  input: ConversationalSearchTurnInput,
  language: "zh" | "en",
): ResolvedTurn {
  if (input.type === "suggestion") {
    return resolveSuggestionTurn(input, language);
  }

  const displayText = createDisplayTextFromInput(input);
  return {
    displayText,
    turnRequest: {
      source: "message",
      displayText,
      agentInput: displayText,
    },
  };
}

function sanitizeSuggestions(input: Suggestion[] | undefined): Suggestion[] {
  if (!input?.length) {
    return [];
  }

  return input
    .filter(
      (suggestion) =>
        typeof suggestion.label === "string" && suggestion.label.trim().length > 0,
    )
    .slice(0, 4)
    .map((suggestion) => ({
      label: suggestion.label.trim().slice(0, 40),
      action: suggestion.action,
      ...(suggestion.payload ? { payload: suggestion.payload } : {}),
    }));
}

function findLatestObservation<T>(
  session: ChatSearchSession,
  toolName: string,
): T | undefined {
  for (let index = session.observations.length - 1; index >= 0; index -= 1) {
    const observation = session.observations[index];
    if (observation.tool === toolName) {
      return observation.output as T;
    }
  }

  return undefined;
}

function buildFallbackSuggestions(session: ChatSearchSession): Suggestion[] {
  const helpContent = findLatestObservation<{
    suggestions?: Suggestion[];
  }>(session, "get_help_content");
  const helpSuggestions = sanitizeSuggestions(helpContent?.suggestions);
  if (helpSuggestions.length > 0) {
    return helpSuggestions;
  }

  if (session.intent === "statistics") {
    return sanitizeSuggestions(
      session.language === "zh"
        ? [
            { label: "最近 30 天书签统计", action: "text" },
            { label: "最近的书签", action: "timeFilter", payload: { days: 7 } },
            { label: "功能介绍", action: "text" },
          ]
        : [
            { label: "Bookmarks from last 30 days", action: "text" },
            { label: "Recent bookmarks", action: "timeFilter", payload: { days: 7 } },
            { label: "Feature introduction", action: "text" },
          ],
    );
  }

  if (session.lastSearch?.bookmarkIds.length) {
    return sanitizeSuggestions(
      session.language === "zh"
        ? [
            { label: "显示更多结果", action: "showMore" },
            { label: "复制所有链接", action: "copyAllLinks" },
            { label: "只看语义匹配", action: "semanticOnly" },
            { label: "最近的书签", action: "timeFilter", payload: { days: 7 } },
          ]
        : [
            { label: "Show more results", action: "showMore" },
            { label: "Copy all links", action: "copyAllLinks" },
            { label: "Semantic matches only", action: "semanticOnly" },
            { label: "Recent bookmarks", action: "timeFilter", payload: { days: 7 } },
          ],
    );
  }

  return sanitizeSuggestions(
    session.language === "zh"
      ? [
          { label: "换个关键词试试", action: "text" },
          { label: "功能介绍", action: "text" },
          { label: "搜索技巧", action: "text" },
        ]
      : [
          { label: "Try another query", action: "text" },
          { label: "Feature introduction", action: "text" },
          { label: "Search tips", action: "text" },
        ],
  );
}

function buildSearchFallbackAnswer(session: ChatSearchSession): string {
  const snapshot = session.lastSearch;
  if (!snapshot) {
    return session.language === "zh"
      ? "我已经完成这轮检索，但结果整理失败了。你可以再试一次，或换个更具体的关键词。"
      : "The search finished, but result formatting failed. Please try again or use a more specific query.";
  }

  if (snapshot.bookmarks.length === 0) {
    return session.language === "zh"
      ? `没有找到和“${snapshot.query}”相关的书签。可以换个关键词，或减少一些筛选条件后再试。`
      : `No bookmarks matched "${snapshot.query}". Try another query or remove some filters.`;
  }

  const topItems = snapshot.bookmarks
    .slice(0, 3)
    .map((bookmark, index) => `${index + 1}. ${bookmark.title}`)
    .join("\n");
  const retrievalMode =
    snapshot.searchResult.usedSemantic && snapshot.searchResult.usedKeyword
      ? session.language === "zh"
        ? "本次结果结合了关键词和语义匹配。"
        : "These results combine keyword and semantic matching."
      : snapshot.searchResult.usedSemantic
        ? session.language === "zh"
          ? "本次结果主要使用语义匹配。"
          : "These results mainly use semantic matching."
        : session.language === "zh"
          ? "本次结果主要使用关键词匹配。"
          : "These results mainly use keyword matching.";

  return session.language === "zh"
    ? `找到 ${snapshot.searchResult.total} 条相关书签，当前展示前 ${Math.min(snapshot.bookmarks.length, 3)} 条。\n${retrievalMode}\n${topItems}`
    : `Found ${snapshot.searchResult.total} related bookmarks. Showing the top ${Math.min(snapshot.bookmarks.length, 3)}.\n${retrievalMode}\n${topItems}`;
}

function buildStatisticsFallbackAnswer(session: ChatSearchSession): string {
  const stats = findLatestObservation<{
    summary?: string;
    topCategories?: Array<[string, number]>;
    topDomains?: Array<[string, number]>;
  }>(session, "get_statistics");

  if (!stats) {
    return session.language === "zh"
      ? "统计已完成，但结果整理失败了。你可以再问我一个更具体的统计问题。"
      : "Statistics completed, but result formatting failed. Try asking a more specific statistics question.";
  }

  const parts = [normalizeText(stats.summary, 200)];

  if (stats.topCategories?.length) {
    const categories = stats.topCategories
      .slice(0, 3)
      .map(([name, count]) => `${name} (${count})`)
      .join("、");
    parts.push(
      session.language === "zh"
        ? `分类最多的是：${categories}。`
        : `Top categories: ${categories}.`,
    );
  }

  if (stats.topDomains?.length) {
    const domains = stats.topDomains
      .slice(0, 3)
      .map(([name, count]) => `${name} (${count})`)
      .join("、");
    parts.push(
      session.language === "zh"
        ? `常见域名有：${domains}。`
        : `Common domains: ${domains}.`,
    );
  }

  return parts.filter(Boolean).join("\n");
}

function buildFallbackAnswer(session: ChatSearchSession): string {
  const helpContent = findLatestObservation<{
    content?: string;
  }>(session, "get_help_content");

  if (helpContent?.content) {
    return normalizeText(helpContent.content, 1200);
  }

  if (session.intent === "statistics") {
    return buildStatisticsFallbackAnswer(session);
  }

  if (session.intent === "query") {
    return buildSearchFallbackAnswer(session);
  }

  return session.language === "zh"
    ? "本轮搜索已完成，但结果整理失败了。请再试一次。"
    : "This search completed, but result formatting failed. Please try again.";
}

function buildFallbackChatSearchResponse(
  session: ChatSearchSession,
): ChatSearchResponse {
  const sourceIds = (
    session.lastSearch?.bookmarkIds ||
    session.lastStatistics?.bookmarkIds ||
    []
  ).slice(0, 10);

  const fallbackResponse = {
    answer: buildFallbackAnswer(session),
    sources: sourceIds,
    nextSuggestions: buildFallbackSuggestions(session),
  };

  const parsed = chatSearchResponseSchema.safeParse(fallbackResponse);
  if (parsed.success) {
    return parsed.data as ChatSearchResponse;
  }

  return {
    answer:
      session.language === "zh"
        ? "搜索已完成，但结果整理失败了。"
        : "Search completed, but result formatting failed.",
    sources: sourceIds,
    nextSuggestions: [],
  };
}

function buildFormatterPrompt(session: ChatSearchSession): string {
  return [
    `language: ${session.language}`,
    `turn: ${JSON.stringify(session.turn)}`,
    `intent: ${session.intent}`,
    `workingFilters: ${JSON.stringify(session.workingFilters)}`,
    `history: ${JSON.stringify(session.state.history.slice(-8))}`,
    `observations: ${JSON.stringify(session.observations)}`,
    session.language === "zh"
      ? "请只基于 observations 生成最终 JSON。answer 要简洁、直接、可展示；sources 只填写真正相关的 bookmarkId；nextSuggestions 最多 4 个，并尽量给出可直接执行的下一步。"
      : "Generate the final JSON strictly from observations. Keep answer concise and display-ready; sources must be truly relevant bookmark ids; keep nextSuggestions at 4 or fewer and make them directly actionable.",
  ].join("\n\n");
}

function buildNextState(
  state: ConversationalSearchSession,
  session: ChatSearchSession,
  displayText: string,
  response: ChatSearchResponse,
  sourceIds: string[],
): ConversationalSearchSession {
  return {
    filters: session.workingFilters,
    seenBookmarkIds: [...new Set([...state.seenBookmarkIds, ...sourceIds])],
    lastSelectedBookmarkIds: sourceIds,
    lastIntent: session.intent,
    lastQuery: session.lastSearch?.query || state.lastQuery || displayText,
    history: [
      ...state.history,
      { role: "user" as const, text: displayText },
      { role: "assistant" as const, text: response.answer },
    ].slice(-12),
  };
}

export function createInitialState(): ConversationalSearchSession {
  return {
    filters: {},
    seenBookmarkIds: [],
    lastSelectedBookmarkIds: [],
    history: [],
  };
}

export const createInitialSession = createInitialState;

class ChatSearchService {
  async runTurn(
    input: ConversationalSearchTurnInput,
    state: ConversationalSearchSession,
  ): Promise<ChatSearchTurnResult> {
    const language = await getChatSearchLanguage();
    const resolvedTurn = resolveTurnInput(input, language);

    if (!resolvedTurn.displayText) {
      throw new Error(
        language === "zh" ? "请输入搜索内容" : "Please enter a search query",
      );
    }

    const session: ChatSearchSession = {
      turn: resolvedTurn.turnRequest,
      state,
      language,
      workingFilters: {
        ...state.filters,
        ...(resolvedTurn.preAppliedFilters || {}),
      },
      intent: state.lastIntent || "query",
      observations: [],
    };

    const toolRegistry = new ToolRegistry();
    toolRegistry.registerTools((await createChatSearchTools(session)) as any);

    try {
      const { agent, config } = await createExtensionAgent({
        name: "bookmark-chat-search",
        systemPrompt:
          language === "zh"
            ? "你是 HamHome 的书签对话编排 Agent。你的职责是识别用户意图、调用合适的工具收集信息，并在信息充分后结束 tool loop。不要凭空回答；需要更多信息时继续调用工具。"
            : "You are HamHome's bookmark conversation orchestration agent. Your job is to identify user intent, call the right tools, and stop only after enough grounded information has been gathered. Never answer from unstated assumptions.",
        tools: toolRegistry,
      });

      await agent.run(buildAgentInputMessages(state, resolvedTurn.turnRequest), {
        maxIterations: 8,
        temperature: 0.2,
        maxTokens: config.maxTokens ?? 1200,
      });

      let response: ChatSearchResponse;
      try {
        const formatted = await generateStructuredObject({
          provider: config.provider,
          model: config.model,
          apiKey: config.apiKey,
          baseURL: config.baseURL,
          temperature: 0.1,
          maxTokens: 900,
          schema: chatSearchResponseSchema,
          system:
            language === "zh"
              ? "你是 HamHome 的搜索结果整理器。你会接收工具执行结果，并把它们整理成可直接展示给用户的最终 JSON。不要添加任何未被工具证实的信息。"
              : "You are HamHome's search result formatter. You will receive grounded tool outputs and convert them into final display-ready JSON. Do not add unsupported claims.",
          prompt: buildFormatterPrompt(session),
        });

        response = formatted.object as ChatSearchResponseOutput;
      } catch (formatError) {
        logger.warn("Structured formatter failed, using fallback response", {
          error: getAgentErrorMessage(formatError, "formatter failed"),
          intent: session.intent,
          observationCount: session.observations.length,
        });
        response = buildFallbackChatSearchResponse(session);
      }

      const sourceIds =
        response.sources.length > 0
          ? response.sources
          : session.lastSearch?.bookmarkIds ||
            session.lastStatistics?.bookmarkIds ||
            [];
      const bookmarks = await getBookmarksByIds(sourceIds);
      const searchResult =
        session.lastSearch?.searchResult ||
        session.lastStatistics?.searchResult ||
        createEmptySearchResult();

      const newState = buildNextState(
        state,
        session,
        resolvedTurn.displayText,
        response,
        sourceIds,
      );

      logger.debug("Chat search turn completed", {
        intent: session.intent,
        sourceCount: sourceIds.length,
        observationCount: session.observations.length,
        turnSource: session.turn.source,
      });

      return {
        displayText: resolvedTurn.displayText,
        response,
        bookmarks,
        searchResult,
        newState,
      };
    } catch (error) {
      throw new Error(getAgentErrorMessage(error, "AI 搜索失败"));
    }
  }

  async search(
    userInput: string,
    state: ConversationalSearchSession,
  ): Promise<ChatSearchTurnResult> {
    return this.runTurn(
      {
        type: "message",
        text: userInput,
      },
      state,
    );
  }
}

export const chatSearchService = new ChatSearchService();
