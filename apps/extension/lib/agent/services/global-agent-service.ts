import { InMemory, type AgentEvent } from "@browser-agent-sdk/agent";
import { createLogger } from "@hamhome/utils";
import type {
  AgentProcessStep,
  ChatSearchResponse,
  ChatSearchSessionSnapshot,
  ChatSearchSessionSummary,
  ConversationalSearchSession,
  ConversationalSearchTurnInput,
  LocalBookmark,
  SearchResult,
  Source,
  Suggestion,
} from "@/types";
import { bookmarkStorage } from "@/lib/storage";
import { getAgentErrorMessage } from "../errors";
import { createExtensionAgent } from "../factory";
import { createHamHomeFeatureSkill } from "../skills/hamhome-feature-skill";
import { createGlobalAgentTools } from "../tools/global-agent-tools";
import {
  getChatSearchLanguage,
  type ChatSearchSession,
  type ChatSearchTurnRequest,
} from "../tools/chat-search-tools";
import {
  AgentSessionStore,
  createInitialChatSearchState,
} from "./chat-search-session-store";

const logger = createLogger({ namespace: "GlobalAgentService" });

export interface GlobalAgentTurnResult {
  session: ChatSearchSessionSnapshot;
  displayText: string;
  response: ChatSearchResponse;
  sources: Source[];
  steps: AgentProcessStep[];
  bookmarks: LocalBookmark[];
  searchResult: SearchResult;
  newState: ConversationalSearchSession;
}

function createEmptySearchResult(): SearchResult {
  return {
    items: [],
    total: 0,
    usedSemantic: false,
    usedKeyword: false,
  };
}

function resolveDisplayText(input: ConversationalSearchTurnInput): string {
  if (input.type === "message") {
    return input.text?.trim() || "";
  }

  return input.suggestion?.label?.trim() || "";
}

function resolveAgentInput(input: ConversationalSearchTurnInput): string {
  if (input.type === "suggestion") {
    const suggestion = input.suggestion;
    return [
      suggestion?.label || "",
      suggestion?.payload
        ? `payload: ${JSON.stringify(suggestion.payload)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return input.text?.trim() || "";
}

async function getBookmarksByIds(ids: string[]): Promise<LocalBookmark[]> {
  const bookmarks = await Promise.all(
    ids.map((id) => bookmarkStorage.getBookmarkById(id)),
  );
  return bookmarks.filter((bookmark): bookmark is LocalBookmark => !!bookmark);
}

function buildSourceList(
  bookmarks: LocalBookmark[],
  searchResult: SearchResult,
): Source[] {
  const scoreMap = new Map(
    searchResult.items.map((item) => [
      item.bookmarkId,
      {
        score: item.score,
        keywordScore: item.keywordScore,
        semanticScore: item.semanticScore,
        matchReason: item.matchReason,
      },
    ]),
  );

  return bookmarks.map((bookmark, index) => {
    const scoreInfo = scoreMap.get(bookmark.id);
    return {
      index: index + 1,
      bookmarkId: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      score: scoreInfo?.score,
      keywordScore: scoreInfo?.keywordScore,
      semanticScore: scoreInfo?.semanticScore,
      matchReason: scoreInfo?.matchReason,
    };
  });
}

function safeJsonSummary(value: unknown, maxLength = 600): string {
  const seen = new WeakSet<object>();
  try {
    const redacted = JSON.stringify(
      value,
      (key, rawValue) => {
        if (
          ["apiKey", "baseUrl", "password", "username", "privacyDomains"].includes(
            key,
          )
        ) {
          return "[redacted]";
        }
        if (typeof rawValue === "object" && rawValue !== null) {
          if (seen.has(rawValue)) {
            return "[circular]";
          }
          seen.add(rawValue);
        }
        return rawValue;
      },
      2,
    );

    return (redacted || String(value)).slice(0, maxLength);
  } catch {
    return String(value).slice(0, maxLength);
  }
}

function getFriendlyIterationName(iteration: number, language: "zh" | "en") {
  return language === "zh" ? `思考与分析 (第 ${iteration} 轮)` : `Thinking & Planning (Round ${iteration})`;
}

function getFriendlyToolName(toolName: string, language: "zh" | "en") {
  const map: Record<string, Record<"zh" | "en", string>> = {
    "update_safe_plugin_settings": { zh: "更新插件配置", en: "Update plugin settings" },
    "get_safe_plugin_settings": { zh: "读取插件配置", en: "Read plugin settings" },
    "search_bookmarks": { zh: "检索书签数据", en: "Search bookmarks" },
    "get_hamhome_feature_detail": { zh: "查阅功能文档", en: "Read feature docs" },
    "skill_view": { zh: "调用功能助手", en: "Call feature assistant" },
    "open_extension_view": { zh: "打开功能页面", en: "Open extension page" },
    "get_system_stats": { zh: "读取系统状态", en: "Read system stats" },
  };
  return map[toolName]?.[language] || toolName;
}

function createProcessStepRecorder(language: "zh" | "en") {
  const steps: AgentProcessStep[] = [];
  const runningToolIds = new Map<string, string[]>();

  const addStep = (
    step: Omit<AgentProcessStep, "id" | "timestamp">,
  ): AgentProcessStep => {
    const nextStep: AgentProcessStep = {
      ...step,
      id: `step_${steps.length + 1}`,
      timestamp: Date.now(),
    };
    steps.push(nextStep);
    return nextStep;
  };

  const completeToolStep = (
    toolName: string,
    update: Partial<AgentProcessStep>,
  ) => {
    const ids = runningToolIds.get(toolName) || [];
    const stepId = ids.shift();
    if (!stepId) {
      addStep({
        type: "tool",
        title: getFriendlyToolName(toolName, language),
        toolName,
        status: update.status || "completed",
        ...update,
      });
      return;
    }

    const step = steps.find((item) => item.id === stepId);
    if (step) {
      Object.assign(step, update);
    }
    runningToolIds.set(toolName, ids);
  };

  const record = (event: AgentEvent) => {
    if (event.type === "agent.iteration.started") {
      addStep({
        type: "iteration",
        title: getFriendlyIterationName(event.iteration, language),
        status: "completed",
      });
      return;
    }

    if (event.type === "skill.mounted") {
      addStep({
        type: "skill",
        title: event.skillId,
        content: event.reason,
        status: "completed",
      });
      return;
    }

    if (event.type === "tool.call.started") {
      const step = addStep({
        type: "tool",
        title: getFriendlyToolName(event.toolName, language),
        toolName: event.toolName,
        input: safeJsonSummary(event.input, 280),
        status: "running",
      });
      runningToolIds.set(event.toolName, [
        ...(runningToolIds.get(event.toolName) || []),
        step.id,
      ]);
      return;
    }

    if (event.type === "tool.call.completed") {
      completeToolStep(event.toolName, {
        status: "completed",
        output: safeJsonSummary(event.output),
      });
      return;
    }

    if (event.type === "tool.call.failed") {
      completeToolStep(event.toolName, {
        status: "failed",
        error: event.error.message,
      });
    }
  };

  const finish = () => {
    for (const step of steps) {
      if (step.status === "running") {
        step.status = "completed";
      }
    }
    return steps;
  };

  return { record, finish };
}

function buildDefaultSuggestions(language: "zh" | "en"): Suggestion[] {
  return language === "zh"
    ? [
        { label: "列出插件功能", action: "text" },
        { label: "打开 AI 设置", action: "navigate", payload: { view: "settings" } },
        { label: "搜索最近保存的书签", action: "text" },
      ]
    : [
        { label: "List extension features", action: "text" },
        { label: "Open AI settings", action: "navigate", payload: { view: "settings" } },
        { label: "Search recent bookmarks", action: "text" },
      ];
}

function buildNextState(
  state: ConversationalSearchSession,
  session: ChatSearchSession,
  displayText: string,
  answer: string,
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
      { role: "assistant" as const, text: answer },
    ].slice(-12),
  };
}

function buildSystemPrompt(language: "zh" | "en"): string {
  if (language === "zh") {
    return [
      "你是 HamHome 浏览器插件的全局智能管理 Agent。",
      "职责：回答插件功能问题、按需读取功能详情、搜索和总结书签、查询本地数据、打开插件页面，并在安全白名单内修改配置。",
      "工作方式：先判断用户目标，必要时调用工具收集事实；涉及插件功能时优先使用 skill_view 或 get_hamhome_feature_detail；涉及书签问题时调用搜索/统计工具；涉及配置时先读取当前安全配置，再调用 update_safe_plugin_settings。",
      "安全规则：绝不代填或输出 API Key、同步凭据等敏感信息；遇到这些请求时解释原因，并可调用 open_extension_view 打开设置页引导用户手动处理。",
      "回答要求：简洁、直接、基于工具结果；已经执行的配置或打开页面要明确告知；如果信息不足，说明下一步。",
    ].join("\n");
  }

  return [
    "You are HamHome's global browser extension management agent.",
    "Responsibilities: explain extension features, read feature details when needed, search and summarize bookmarks, inspect local data, open extension pages, and update allowlisted safe settings.",
    "Workflow: identify the user's goal, call tools for grounded facts, use skill_view or get_hamhome_feature_detail for feature questions, use search/stat tools for bookmark questions, and read safe settings before using update_safe_plugin_settings for configuration requests.",
    "Safety: never fill, reveal, or update API keys, base URLs, privacy domains, sync credentials, or browser shortcuts. When encountering requests for these sensitive settings, explain why you cannot change them and use open_extension_view to open the settings page so the user can configure them manually.",
    "Answer concisely from tool results. State what was changed or opened. Ask for the next step only when required.",
  ].join("\n");
}

/**
 * 全局插件 Agent 服务，负责多轮会话、skill/tool 编排和过程步骤记录。
 */
export class GlobalAgentService {
  constructor(
    private readonly sessionStore = new AgentSessionStore(),
  ) {}

  async listSessions(): Promise<ChatSearchSessionSummary[]> {
    return this.sessionStore.listSessions();
  }

  async createSession(title?: string): Promise<ChatSearchSessionSnapshot> {
    return this.sessionStore.createSession(title);
  }

  async getSession(sessionId?: string): Promise<ChatSearchSessionSnapshot> {
    return this.sessionStore.getSessionSnapshot(sessionId);
  }

  async clearSession(sessionId: string): Promise<ChatSearchSessionSnapshot> {
    return this.sessionStore.clearSession(sessionId);
  }

  async deleteSession(sessionId: string): Promise<ChatSearchSessionSummary[]> {
    return this.sessionStore.deleteSession(sessionId);
  }

  async runTurn(
    input: ConversationalSearchTurnInput,
    sessionId?: string,
  ): Promise<GlobalAgentTurnResult> {
    const language = await getChatSearchLanguage();
    const displayText = resolveDisplayText(input);
    const agentInput = resolveAgentInput(input);

    if (!displayText) {
      throw new Error(language === "zh" ? "请输入内容" : "Please enter a message");
    }

    const persistedSession = await this.sessionStore.ensureSession(
      sessionId,
      displayText,
    );
    const state = persistedSession.state;
    const turn: ChatSearchTurnRequest = {
      source: input.type === "suggestion" ? "suggestion" : "message",
      displayText,
      agentInput,
      pendingAction: input.type === "suggestion" ? input.suggestion?.action : undefined,
    };
    const orchestrationSession: ChatSearchSession = {
      turn,
      state,
      language,
      workingFilters: { ...state.filters },
      intent: state.lastIntent || "help",
      observations: [],
    };

    try {
      const runtimeMemory = new InMemory({ maxMessages: 100 });
      await this.sessionStore.seedRuntimeMemory(persistedSession.id, runtimeMemory);
      const tools = await createGlobalAgentTools(orchestrationSession);
      const recorder = createProcessStepRecorder(language);
      const { agent, config } = await createExtensionAgent({
        name: "hamhome-global-agent",
        sessionId: persistedSession.id,
        memory: runtimeMemory,
        systemPrompt: buildSystemPrompt(language),
        tools,
        skills: [createHamHomeFeatureSkill()],
        dynamicCapabilities: { enabled: true },
        maxIterations: 10,
      });
      const off = agent.on(recorder.record);
      const result = await agent
        .run(agentInput, {
          maxIterations: 10,
          temperature: 0.2,
          invocationMode: config.invocationMode,
          skillContext: {
            pageId: "extension-app",
            moduleId: "global-assistant",
            userInput: agentInput,
            tags: ["hamhome", "extension", "assistant"],
          },
        })
        .finally(off);

      const steps = recorder.finish();
      const sourceIds =
        orchestrationSession.lastSearch?.bookmarkIds ||
        orchestrationSession.lastStatistics?.bookmarkIds ||
        [];
      const bookmarks = await getBookmarksByIds(sourceIds);
      const searchResult =
        orchestrationSession.lastSearch?.searchResult ||
        orchestrationSession.lastStatistics?.searchResult ||
        createEmptySearchResult();
      const sources = buildSourceList(bookmarks, searchResult);
      const answer = result.text.trim();
      const response: ChatSearchResponse = {
        answer:
          answer ||
          (language === "zh"
            ? "我已完成处理，但没有生成可展示的回答。"
            : "The request completed, but no displayable answer was generated."),
        sources: sourceIds,
        nextSuggestions: buildDefaultSuggestions(language),
      };
      const newState = buildNextState(
        state,
        orchestrationSession,
        displayText,
        response.answer,
        sourceIds,
      );

      await this.sessionStore.appendTurn(
        persistedSession.id,
        displayText,
        response.answer,
        {
          sources,
          steps,
        },
      );
      const savedSession = await this.sessionStore.saveState(
        persistedSession.id,
        newState,
        persistedSession.messages.length === 0
          ? displayText
          : persistedSession.title,
      );

      logger.debug("Global agent turn completed", {
        sessionId: persistedSession.id,
        sourceCount: sourceIds.length,
        stepCount: steps.length,
      });

      return {
        session: savedSession,
        displayText,
        response,
        sources,
        steps,
        bookmarks,
        searchResult,
        newState,
      };
    } catch (error) {
      throw new Error(getAgentErrorMessage(error, "AI 助手执行失败"));
    }
  }
}

export const globalAgentService = new GlobalAgentService();
