export type SearchPlannerLanguage = "zh" | "en";

export type SearchConversationIntent = "query" | "statistics" | "help";

export type SearchQuerySubtype =
  | "time"
  | "category"
  | "tag"
  | "semantic"
  | "compound";

export interface SearchPlannerFilters {
  categoryId?: string | null;
  tagsAny?: string[];
  domain?: string | null;
  timeRangeDays?: number | null;
  includeContent?: boolean;
  semantic?: boolean;
}

export interface SearchPlannerConversationMessage {
  role: "user" | "assistant";
  text: string;
}

export interface SearchPlannerConversationState {
  intent: SearchConversationIntent;
  querySubtype?: SearchQuerySubtype;
  query: string;
  refinedQuery?: string;
  filters: SearchPlannerFilters;
  seenBookmarkIds: string[];
  shortMemory: SearchPlannerConversationMessage[];
  longMemorySummary?: string;
}

export interface SearchPlannerCategory {
  id: string;
  name: string;
}

export interface SearchPlannerContext {
  categories?: SearchPlannerCategory[];
  existingTags?: string[];
  conversationState?: SearchPlannerConversationState;
}

export interface SearchPlannerRequest {
  intent: SearchConversationIntent;
  querySubtype?: SearchQuerySubtype;
  query: string;
  refinedQuery: string;
  filters: SearchPlannerFilters;
  topK: number;
}
