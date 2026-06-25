import { describe, expect, it, vi } from "vitest";
import { createChatSearchTools, type ChatSearchSession } from "../chat-search-tools";

vi.mock("@/lib/storage", () => ({
  bookmarkStorage: {
    getCategories: vi.fn().mockResolvedValue([]),
  },
  configStorage: {},
}));

vi.mock("@/lib/search/hybrid-retriever", () => ({
  hybridRetriever: {
    isSemanticAvailable: vi.fn(),
    search: vi.fn(),
  },
}));

function createSession(): ChatSearchSession {
  return {
    turn: {
      source: "message",
      displayText: "功能介绍",
      agentInput: "功能介绍",
    },
    state: {
      filters: {},
      history: [],
      lastQuery: "",
      seenBookmarkIds: [],
      lastSelectedBookmarkIds: [],
      lastIntent: "help",
    },
    language: "zh",
    workingFilters: {},
    intent: "help",
    observations: [],
  };
}

describe("createChatSearchTools", () => {
  it("does not register the legacy help content tool", async () => {
    const tools = await createChatSearchTools(createSession());
    const toolNames = tools.map((tool) => tool.name);

    expect(toolNames).not.toContain("get_help_content");
    expect(toolNames).toContain("get_extension_shortcuts");
  });
});
