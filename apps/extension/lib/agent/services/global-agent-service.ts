import {
  InMemory,
  TokenBudgetContextBuilder,
  type AgentMessage,
  type AgentRunResult,
} from "@hamhome/agent";
import { createLogger, generateId } from "@hamhome/utils";
import type {
  AgentProcessStep,
  AgentTurnProgress,
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
import { createTurnProgressTracker } from "./turn-progress";
import {
  ToolApprovalBroker,
  createToolApprovalPolicy,
} from "./tool-approval-service";

const logger = createLogger({ namespace: "GlobalAgentService" });

/**
 * History budget per model call. Earlier turns beyond it are summarized; it
 * leaves room for the system prompt and tool definitions in a 32k context.
 */
const GLOBAL_AGENT_CONTEXT_WINDOW = {
  maxTokens: 16_000,
  maxToolResultTokens: 4_000,
  summarize: true,
};

interface ActiveTurn {
  progress: ReturnType<typeof createTurnProgressTracker>;
  controller: AbortController;
}

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

/**
 * Tool-call steps and tool results of a turn: everything between its user
 * message and its final answer.
 */
function getTurnTranscript(turnMessages: AgentMessage[]): AgentMessage[] {
  const steps = turnMessages.slice(1);
  return steps.at(-1)?.role === "assistant" ? steps.slice(0, -1) : steps;
}

function buildNextState(
  state: ConversationalSearchSession,
  session: ChatSearchSession,
  displayText: string,
  answer: string,
  sourceIds: string[],
  pinnedSkillIds: string[],
): ConversationalSearchSession {
  return {
    pinnedSkillIds,
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
      "确认规则：删除书签、分类、自定义筛选器或分组规则时，界面会请求用户确认；如果被拒绝或超时，不要重试，直接告诉用户操作已取消。",
      "回答要求：简洁、直接、基于工具结果；已经执行的配置或打开页面要明确告知；如果信息不足，说明下一步。",
    ].join("\n");
  }

  return [
    "You are HamHome's global browser extension management agent.",
    "Responsibilities: explain extension features, read feature details when needed, search and summarize bookmarks, inspect local data, open extension pages, and update allowlisted safe settings.",
    "Workflow: identify the user's goal, call tools for grounded facts, use skill_view or get_hamhome_feature_detail for feature questions, use search/stat tools for bookmark questions, and read safe settings before using update_safe_plugin_settings for configuration requests.",
    "Safety: never fill, reveal, or update API keys, base URLs, privacy domains, sync credentials, or browser shortcuts. When encountering requests for these sensitive settings, explain why you cannot change them and use open_extension_view to open the settings page so the user can configure them manually.",
    "Confirmation: deleting bookmarks, categories, custom filters, or tab group rules asks the user to confirm in the UI. If it is rejected or times out, do not retry; tell the user the action was cancelled.",
    "Answer concisely from tool results. State what was changed or opened. Ask for the next step only when required.",
  ].join("\n");
}

/**
 * 全局插件 Agent 服务，负责多轮会话、skill/tool 编排和过程步骤记录。
 */
export class GlobalAgentService {
  private readonly activeTurns = new Map<string, ActiveTurn>();

  constructor(
    private readonly sessionStore = new AgentSessionStore(),
    private readonly approvals = new ToolApprovalBroker(),
    // Shared by every turn, so summaries of earlier history are reused while
    // the service worker is alive instead of being recomputed each turn.
    private readonly contextBuilder = new TokenBudgetContextBuilder(GLOBAL_AGENT_CONTEXT_WINDOW),
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

  /**
   * Live steps, streamed answer text and pending approval of a running turn;
   * the UI polls this. Null once the turn has finished.
   */
  getTurnProgress(turnId: string): AgentTurnProgress | null {
    const turn = this.activeTurns.get(turnId);
    if (!turn) {
      return null;
    }
    return { ...turn.progress.snapshot(), pendingApproval: this.approvals.getPending(turnId) };
  }

  /**
   * Stops a running turn: the model call and remaining tool calls are aborted
   * and nothing is saved. Returns false when the turn is not running.
   */
  cancelTurn(turnId: string): boolean {
    const turn = this.activeTurns.get(turnId);
    if (!turn) {
      return false;
    }
    const pending = this.approvals.getPending(turnId);
    if (pending) {
      this.approvals.resolve(pending.id, false);
    }
    turn.controller.abort();
    return true;
  }

  /**
   * Approve or reject a pending tool call; returns false if it already expired.
   */
  resolveApproval(approvalId: string, approved: boolean): boolean {
    return this.approvals.resolve(approvalId, approved);
  }

  async runTurn(
    input: ConversationalSearchTurnInput,
    sessionId?: string,
    turnId?: string,
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

    const turnKey = turnId ?? generateId();
    const progress = createTurnProgressTracker(language);
    const controller = new AbortController();
    this.activeTurns.set(turnKey, { progress, controller });

    try {
      // No message cap: the context window decides what the model receives.
      const runtimeMemory = new InMemory();
      const seededCount = await this.sessionStore.seedRuntimeMemory(persistedSession.id, runtimeMemory);
      const tools = await createGlobalAgentTools(orchestrationSession);
      const securityPolicy = createToolApprovalPolicy({
        tools,
        language,
        // Without a turn id the UI cannot show the request, so the call is rejected.
        requestApproval: (request) =>
          turnId ? this.approvals.waitForDecision(turnId, request) : Promise.resolve(false),
      });
      const { agent } = await createExtensionAgent({
        agentId: "hamhome-global-agent",
        sessionId: persistedSession.id,
        memory: runtimeMemory,
        systemPrompt: buildSystemPrompt(language),
        tools,
        skills: [createHamHomeFeatureSkill()],
        dynamicCapabilities: { enabled: true },
        maxIterations: 10,
        securityPolicy,
        contextBuilder: this.contextBuilder,
      });

      // Streaming lets getTurnProgress() show steps and answer text live.
      let result: AgentRunResult | undefined;
      for await (const event of agent.runStream(agentInput, {
        runId: turnKey,
        signal: controller.signal,
        temperature: 0.2,
        skillContext: {
          pinnedSkillIds: state.pinnedSkillIds ?? [],
          pageId: "extension-app",
          moduleId: "global-assistant",
          userInput: agentInput,
          tags: ["hamhome", "extension", "assistant"],
        },
      })) {
        progress.record(event);
        if (event.type === "agent.completed") {
          result = event.result;
        }
      }
      if (!result) {
        throw new Error("The agent stream ended without a result.");
      }

      const steps = progress.finish();
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
        result.pinnedSkillIds,
      );
      // Store the turn's tool calls and results too, so the next turn's model
      // sees what was looked up, not only the final answer text.
      const turnMessages = (await runtimeMemory.get({ sessionId: persistedSession.id })).slice(seededCount);

      await this.sessionStore.appendTurn(
        persistedSession.id,
        displayText,
        response.answer,
        {
          sources,
          steps,
        },
        getTurnTranscript(turnMessages),
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
      if (controller.signal.aborted) {
        throw new Error(language === "zh" ? "已停止生成" : "Stopped");
      }
      throw new Error(getAgentErrorMessage(error, "AI 助手执行失败"));
    } finally {
      this.activeTurns.delete(turnKey);
    }
  }
}

export const globalAgentService = new GlobalAgentService();
