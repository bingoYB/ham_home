import { InMemory } from "@browser-agent-sdk/agent";
import { describe, expect, it } from "vitest";
import {
  ChatSearchSessionStore,
  createInitialChatSearchState,
} from "../chat-search-session-store";

describe("ChatSearchSessionStore", () => {
  it("persists multi-turn messages and structured search state", async () => {
    const store = new ChatSearchSessionStore(new InMemory({ maxMessages: 20 }));
    const session = await store.createSession("AI bookmarks");
    const nextState = {
      ...createInitialChatSearchState(),
      filters: { timeRangeDays: 7 },
      seenBookmarkIds: ["b1"],
      lastSelectedBookmarkIds: ["b1"],
      lastQuery: "AI",
      history: [
        { role: "user" as const, text: "AI" },
        { role: "assistant" as const, text: "找到 1 条书签" },
      ],
    };

    await store.appendTurn(session.id, "AI", "找到 1 条书签");
    const saved = await store.saveState(session.id, nextState, "AI");

    expect(saved.title).toBe("AI");
    expect(saved.messages).toHaveLength(2);
    expect(saved.state.filters.timeRangeDays).toBe(7);
    expect(saved.state.seenBookmarkIds).toEqual(["b1"]);
  });

  it("supports switching sessions and seeding runtime memory", async () => {
    const store = new ChatSearchSessionStore(new InMemory({ maxMessages: 20 }));
    const first = await store.createSession("First");
    const second = await store.createSession("Second");

    await store.appendTurn(first.id, "first question", "first answer");
    await store.appendTurn(second.id, "second question", "second answer");

    const firstSnapshot = await store.getSessionSnapshot(first.id);
    const secondSnapshot = await store.getSessionSnapshot(second.id);
    expect(firstSnapshot.messages.map((message) => message.content)).toEqual([
      "first question",
      "first answer",
    ]);
    expect(secondSnapshot.messages.map((message) => message.content)).toEqual([
      "second question",
      "second answer",
    ]);

    const runtimeMemory = new InMemory({ maxMessages: 20 });
    await store.seedRuntimeMemory(first.id, runtimeMemory);
    const runtimeMessages = await runtimeMemory.get({ sessionId: first.id });
    expect(runtimeMessages.map((message) => message.content)).toEqual([
      "first question",
      "first answer",
    ]);
  });

  it("persists render-ready agent steps and sources with assistant messages", async () => {
    const store = new ChatSearchSessionStore(new InMemory({ maxMessages: 20 }));
    const session = await store.createSession("Global agent");

    await store.appendTurn(session.id, "打开 AI 设置", "已打开 AI 设置页", {
      steps: [
        {
          id: "step_1",
          type: "tool",
          title: "open_extension_view",
          status: "completed",
          toolName: "open_extension_view",
          timestamp: 1,
        },
      ],
      sources: [
        {
          index: 1,
          bookmarkId: "b1",
          title: "Example",
          url: "https://example.com",
        },
      ],
    });

    const saved = await store.getSessionSnapshot(session.id);
    expect(saved.messages[1].steps?.[0]?.toolName).toBe("open_extension_view");
    expect(saved.messages[1].sources?.[0]?.url).toBe("https://example.com");
  });
});
