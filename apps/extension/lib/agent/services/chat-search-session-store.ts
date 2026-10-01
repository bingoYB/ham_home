import {
  IndexedDBMemory,
  type AgentMessage,
  type Memory,
  type MemoryEntry,
  type MemorySession,
} from "@hamhome/agent";
import type {
  AgentProcessStep,
  ChatMessage,
  ChatSearchSessionSnapshot,
  ChatSearchSessionSummary,
  ConversationalSearchSession,
  Source,
} from "@/types";

const AGENT_DB_NAME = "hamhome-global-agent";
const AGENT_STATE_KEY = "agentState";
const DEFAULT_SESSION_TITLE = "New conversation";
/** Marks stored tool calls and tool results, which the model sees but the chat UI hides. */
const TRANSCRIPT_KEY = "agentTranscript";
/**
 * Stored messages per session, tool transcripts included. What the model
 * receives is bounded separately by the agent's context window.
 */
const MAX_STORED_MESSAGES = 400;

/**
 * 创建对话搜索的结构化状态。
 *
 * 示例：
 * ```ts
 * const state = createInitialChatSearchState();
 * state.filters; // {}
 * ```
 */
export function createInitialChatSearchState(): ConversationalSearchSession {
  return {
    filters: {},
    seenBookmarkIds: [],
    lastSelectedBookmarkIds: [],
    history: [],
  };
}

function normalizeTitle(title?: string): string {
  return title?.trim().slice(0, 40) || DEFAULT_SESSION_TITLE;
}

function readSessionState(session?: MemorySession): ConversationalSearchSession {
  const metadataState = session?.metadata?.[AGENT_STATE_KEY];
  if (!metadataState || typeof metadataState !== "object") {
    return createInitialChatSearchState();
  }

  const state = metadataState as Partial<ConversationalSearchSession>;
  return {
    filters: state.filters || {},
    seenBookmarkIds: Array.isArray(state.seenBookmarkIds)
      ? state.seenBookmarkIds
      : [],
    lastSelectedBookmarkIds: Array.isArray(state.lastSelectedBookmarkIds)
      ? state.lastSelectedBookmarkIds
      : [],
    lastIntent: state.lastIntent,
    lastQuery: state.lastQuery,
    history: Array.isArray(state.history) ? state.history.slice(-12) : [],
    pinnedSkillIds: Array.isArray(state.pinnedSkillIds) ? state.pinnedSkillIds : [],
  };
}

function toSummary(session: MemorySession): ChatSearchSessionSummary {
  return {
    id: session.id,
    title: session.title || DEFAULT_SESSION_TITLE,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function isTranscriptMessage(message: AgentMessage): boolean {
  return message.role === "tool" || message.metadata?.[TRANSCRIPT_KEY] === true;
}

function toChatMessages(entries: MemoryEntry[]): ChatMessage[] {
  return entries
    .filter(
      (entry) =>
        (entry.message.role === "user" || entry.message.role === "assistant") &&
        !isTranscriptMessage(entry.message),
    )
    .map((entry) => ({
      role: entry.message.role as "user" | "assistant",
      content: entry.message.content,
      timestamp: entry.createdAt,
      ...(Array.isArray(entry.message.metadata?.sources)
        ? { sources: entry.message.metadata.sources as Source[] }
        : {}),
      ...(Array.isArray(entry.message.metadata?.steps)
        ? { steps: entry.message.metadata.steps as AgentProcessStep[] }
        : {}),
    }));
}

/**
 * 管理全局 Agent 的持久化 session、可展示消息和结构化状态。
 */
export class ChatSearchSessionStore {
  constructor(
    private readonly memory: Memory = new IndexedDBMemory({
      dbName: AGENT_DB_NAME,
      maxMessages: MAX_STORED_MESSAGES,
    }),
  ) {}

  /**
   * 创建新会话并返回完整快照。
   */
  async createSession(title?: string): Promise<ChatSearchSessionSnapshot> {
    const session = await this.memory.createSession?.({
      title: normalizeTitle(title),
      metadata: {
        [AGENT_STATE_KEY]: createInitialChatSearchState(),
      },
    });

    return this.getSessionSnapshot(session?.id);
  }

  /**
   * 确保会话存在；未传入 ID 时会创建默认新会话。
   */
  async ensureSession(
    sessionId?: string,
    title?: string,
  ): Promise<ChatSearchSessionSnapshot> {
    if (sessionId) {
      const existing = await this.memory.getSession?.(sessionId);
      if (existing) {
        return this.getSessionSnapshot(sessionId);
      }

      await this.memory.createSession?.({
        id: sessionId,
        title: normalizeTitle(title),
        metadata: {
          [AGENT_STATE_KEY]: createInitialChatSearchState(),
        },
      });
      return this.getSessionSnapshot(sessionId);
    }

    return this.createSession(title);
  }

  /**
   * 列出所有对话 session，按更新时间倒序返回。
   */
  async listSessions(): Promise<ChatSearchSessionSummary[]> {
    const sessions = (await this.memory.listSessions?.()) || [];
    if (sessions.length > 0) {
      return sessions.map(toSummary);
    }

    const session = await this.createSession();
    return [session];
  }

  /**
   * 获取 session 的状态、消息和基础信息。
   */
  async getSessionSnapshot(
    sessionId?: string,
  ): Promise<ChatSearchSessionSnapshot> {
    const ensured = sessionId
      ? await this.memory.getSession?.(sessionId)
      : undefined;
    const session =
      ensured ||
      (await this.memory.createSession?.({
        id: sessionId,
        title: normalizeTitle(),
        metadata: {
          [AGENT_STATE_KEY]: createInitialChatSearchState(),
        },
      }));

    if (!session) {
      throw new Error("Chat search memory does not support sessions.");
    }

    const entries = ((await this.memory.getEntries?.({
      sessionId: session.id,
    })) || []) as MemoryEntry[];

    return {
      ...toSummary(session),
      state: readSessionState(session),
      messages: toChatMessages(entries),
    };
  }

  /**
   * 将用户输入、本轮工具调用记录和最终回答写入持久化记忆。
   *
   * `transcript` holds the turn's assistant tool-call steps and tool results
   * in order. They are replayed to the model in later turns but hidden from
   * the chat UI.
   */
  async appendTurn(
    sessionId: string,
    userText: string,
    assistantText: string,
    assistantMetadata: Pick<ChatMessage, "sources" | "steps"> = {},
    transcript: AgentMessage[] = [],
  ): Promise<void> {
    await this.memory.add(
      { role: "user", content: userText },
      { sessionId },
    );
    for (const message of transcript) {
      await this.memory.add(
        { ...message, metadata: { ...message.metadata, [TRANSCRIPT_KEY]: true } },
        { sessionId },
      );
    }
    await this.memory.add(
      {
        role: "assistant",
        content: assistantText,
        metadata: assistantMetadata,
      },
      { sessionId },
    );
  }

  /**
   * 保存结构化检索状态；标题为空时沿用已有标题。
   */
  async saveState(
    sessionId: string,
    state: ConversationalSearchSession,
    title?: string,
  ): Promise<ChatSearchSessionSnapshot> {
    const current = await this.memory.getSession?.(sessionId);
    await this.memory.createSession?.({
      id: sessionId,
      title: normalizeTitle(title || current?.title),
      createdAt: current?.createdAt,
      updatedAt: Date.now(),
      metadata: {
        ...(current?.metadata || {}),
        [AGENT_STATE_KEY]: state,
      },
    });

    return this.getSessionSnapshot(sessionId);
  }

  /**
   * 将持久化的完整对话（含工具调用记录）回放到本轮 Agent 的短期记忆中。
   * Returns the number of messages replayed, so the caller can tell them
   * apart from the messages the new turn adds.
   */
  async seedRuntimeMemory(sessionId: string, runtimeMemory: Memory): Promise<number> {
    await runtimeMemory.createSession?.({ id: sessionId });
    const entries = ((await this.memory.getEntries?.({ sessionId })) ||
      []) as MemoryEntry[];

    for (const entry of entries) {
      await runtimeMemory.add(entry.message, { sessionId });
    }
    return entries.length;
  }

  /**
   * 清空指定 session 的消息和检索状态。
   */
  async clearSession(sessionId: string): Promise<ChatSearchSessionSnapshot> {
    await this.memory.clear({ sessionId });
    return this.saveState(sessionId, createInitialChatSearchState());
  }

  /**
   * 删除指定 session。
   */
  async deleteSession(sessionId: string): Promise<ChatSearchSessionSummary[]> {
    await this.memory.deleteSession?.(sessionId);
    return this.listSessions();
  }
}

export const AgentSessionStore = ChatSearchSessionStore;
