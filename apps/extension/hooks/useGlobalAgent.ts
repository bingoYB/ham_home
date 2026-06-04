import { useCallback, useEffect, useState } from "react";
import type {
  AgentProcessStep,
  AISearchStatus,
  ChatMessage,
  ChatSearchSessionSummary,
  ConversationalSearchTurnInput,
  Source,
  Suggestion,
} from "@/types";
import { getBackgroundService } from "@/lib/services";

export interface UseGlobalAgentReturn {
  query: string;
  setQuery: (query: string) => void;
  messages: ChatMessage[];
  currentAnswer: string;
  currentSteps: AgentProcessStep[];
  status: AISearchStatus;
  error: string | null;
  sources: Source[];
  suggestions: Suggestion[];
  sessions: ChatSearchSessionSummary[];
  currentSessionId: string | null;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  submit: (textOverride?: string, sessionIdOverride?: string) => Promise<void>;
  sendSuggestion: (suggestion: Suggestion) => Promise<void>;
  clearConversation: () => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
  createSession: () => Promise<string>;
  deleteSession: (sessionId: string) => Promise<void>;
}

async function simulateStreamingOutput(
  text: string,
  setAnswer: (answer: string) => void,
): Promise<void> {
  const charsPerFrame = 4;
  let index = 0;

  return new Promise((resolve) => {
    function tick() {
      const end = Math.min(index + charsPerFrame, text.length);
      setAnswer(text.slice(0, end));
      index = end;

      if (index < text.length) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(tick);
  });
}

function getDisplayText(input: ConversationalSearchTurnInput): string {
  if (input.type === "message") {
    return input.text?.trim() || "";
  }

  return input.suggestion?.label?.trim() || "";
}

/**
 * 管理全局插件 Agent 的 UI 状态与 background service 调用。
 */
export function useGlobalAgent(): UseGlobalAgentReturn {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [currentSteps, setCurrentSteps] = useState<AgentProcessStep[]>([]);
  const [status, setStatus] = useState<AISearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [sessions, setSessions] = useState<ChatSearchSessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const loadSession = useCallback(async (sessionId?: string) => {
    const backgroundService = getBackgroundService();
    const snapshot = await backgroundService.globalAgentGetSession(sessionId);
    setCurrentSessionId(snapshot.id);
    setMessages(snapshot.messages);
    setSources([]);
    setSuggestions([]);
    setCurrentSteps([]);
    return snapshot;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      try {
        const backgroundService = getBackgroundService();
        const loadedSessions = await backgroundService.globalAgentListSessions();
        if (cancelled) return;
        setSessions(loadedSessions);
        await loadSession(loadedSessions[0]?.id);
      } catch (err) {
        if (!cancelled) {
          console.error("[useGlobalAgent] Failed to load sessions:", err);
        }
      }
    }

    loadSessions();
    return () => {
      cancelled = true;
    };
  }, [loadSession]);

  const applyTurn = useCallback(
    async (input: ConversationalSearchTurnInput, overrideSessionId?: string) => {
      const displayText = getDisplayText(input);
      if (!displayText) {
        return;
      }

      const userMessage: ChatMessage = {
        role: "user",
        content: displayText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsOpen(true);
      setStatus("thinking");
      setError(null);
      setSources([]);
      setCurrentSteps([]);
      setCurrentAnswer("");

      try {
        setStatus("searching");
        const backgroundService = getBackgroundService();
        const targetSessionId = overrideSessionId !== undefined ? overrideSessionId : currentSessionId;
        const result = await backgroundService.globalAgentRunTurn(
          input,
          targetSessionId || undefined,
        );

        setCurrentSessionId(result.session.id);
        setSessions((prev) => {
          const next = [
            result.session,
            ...prev.filter((item) => item.id !== result.session.id),
          ];
          return next.sort((left, right) => right.updatedAt - left.updatedAt);
        });
        setSources(result.sources);
        setSuggestions(result.response.nextSuggestions);
        setCurrentSteps(result.steps);

        setStatus("writing");
        await simulateStreamingOutput(result.response.answer, setCurrentAnswer);

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: result.response.answer,
          timestamp: Date.now(),
          sources: result.sources,
          steps: result.steps,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setCurrentAnswer("");
        setCurrentSteps([]);
        setQuery("");
        setStatus("done");
      } catch (err) {
        console.error("[useGlobalAgent] Turn failed:", err);
        setError(err instanceof Error ? err.message : "Agent failed");
        setStatus("error");
      }
    },
    [currentSessionId],
  );

  const submit = useCallback(async (textOverride?: string, sessionIdOverride?: string) => {
    const textToSubmit = textOverride ?? query;
    if (!textToSubmit.trim()) {
      return;
    }

    await applyTurn({ type: "message", text: textToSubmit }, sessionIdOverride);
  }, [applyTurn, query]);

  const sendSuggestion = useCallback(
    async (suggestion: Suggestion) => {
      await applyTurn({
        type: "suggestion",
        suggestion: {
          label: suggestion.label,
          action: suggestion.action,
          payload: suggestion.payload,
        },
      });
    },
    [applyTurn],
  );

  const clearConversation = useCallback(async () => {
    if (currentSessionId) {
      try {
        const backgroundService = getBackgroundService();
        const snapshot = await backgroundService.globalAgentClearSession(currentSessionId);
        setSessions((prev) =>
          prev.map((item) => (item.id === snapshot.id ? snapshot : item)),
        );
      } catch (err) {
        console.error("[useGlobalAgent] Failed to clear session:", err);
      }
    }

    setMessages([]);
    setCurrentAnswer("");
    setCurrentSteps([]);
    setSources([]);
    setSuggestions([]);
    setStatus("idle");
    setError(null);
    setQuery("");
  }, [currentSessionId]);

  const switchSession = useCallback(
    async (sessionId: string) => {
      setStatus("idle");
      setError(null);
      setCurrentAnswer("");
      await loadSession(sessionId);
      setIsOpen(true);
    },
    [loadSession],
  );

  const createSession = useCallback(async () => {
    const backgroundService = getBackgroundService();
    const snapshot = await backgroundService.globalAgentCreateSession();
    setSessions((prev) => [snapshot, ...prev]);
    setCurrentSessionId(snapshot.id);
    setMessages([]);
    setCurrentAnswer("");
    setCurrentSteps([]);
    setSources([]);
    setSuggestions([]);
    setQuery("");
    setStatus("idle");
    setError(null);
    setIsOpen(true);
    return snapshot.id;
  }, []);

  const deleteSession = useCallback(
    async (sessionId: string) => {
      const backgroundService = getBackgroundService();
      const updatedSessions = await backgroundService.globalAgentDeleteSession(sessionId);
      setSessions(updatedSessions);
      if (currentSessionId === sessionId) {
        await loadSession(updatedSessions[0]?.id);
      }
    },
    [currentSessionId, loadSession],
  );

  return {
    query,
    setQuery,
    messages,
    currentAnswer,
    currentSteps,
    status,
    error,
    sources,
    suggestions,
    sessions,
    currentSessionId,
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    submit,
    sendSuggestion,
    clearConversation,
    switchSession,
    createSession,
    deleteSession,
  };
}
