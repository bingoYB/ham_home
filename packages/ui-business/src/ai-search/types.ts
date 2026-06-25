export type AISearchStatus =
  | "idle"
  | "thinking"
  | "searching"
  | "writing"
  | "done"
  | "error";

export type SuggestionActionType =
  | "text"
  | "copyAllLinks"
  | "batchAddTags"
  | "batchMoveCategory"
  | "showMore"
  | "timeFilter"
  | "domainFilter"
  | "categoryFilter"
  | "semanticOnly"
  | "keywordOnly"
  | "findDuplicates"
  | "navigate";

export interface Suggestion {
  label: string;
  action: SuggestionActionType;
  payload?: Record<string, unknown>;
}

export interface Source {
  index: number;
  bookmarkId: string;
  title: string;
  url: string;
  score?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  sources?: Source[];
}

export interface AIChatSession {
  id: string;
  title: string;
  updatedAt?: number;
}

export interface AIChatLabels {
  aiAnswer: string;
  close: string;
  newSession: string;
  deleteSession: string;
  sessionSelect: string;
  aiPlaceholder: string;
  sources: string;
  retry: string;
  dismissQuickActions: string;
  status: Record<"thinking" | "searching" | "writing" | "error", string>;
  quickActions: { title: string; query: string }[];
}
