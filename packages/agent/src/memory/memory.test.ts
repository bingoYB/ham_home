import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { IndexedDBMemory, InMemory } from "./memory";

describe("InMemory", () => {
  it("adds, limits, exports, and clears messages", async () => {
    const memory = new InMemory({ maxMessages: 2 });

    await memory.add({ role: "user", content: "one" });
    await memory.add({ role: "assistant", content: "two" });
    await memory.add({ role: "user", content: "three" });

    expect(await memory.get()).toEqual([
      { role: "assistant", content: "two", metadata: {} },
      { role: "user", content: "three", metadata: {} },
    ]);

    await memory.clear();
    expect(await memory.get()).toEqual([]);
  });

  it("keeps messages isolated by session and deletes a session", async () => {
    const memory = new InMemory();

    await memory.createSession({ id: "session-a", title: "A" });
    await memory.createSession({ id: "session-b", title: "B" });
    await memory.add({ role: "user", content: "one" }, { sessionId: "session-a" });
    await memory.add({ role: "user", content: "two" }, { sessionId: "session-b" });

    expect(await memory.get({ sessionId: "session-a" })).toEqual([
      { role: "user", content: "one", metadata: {} },
    ]);
    expect(await memory.getEntries({ sessionId: "session-b" })).toEqual([
      expect.objectContaining({
        sessionId: "session-b",
        message: { role: "user", content: "two", metadata: {} },
      }),
    ]);

    await memory.deleteSession("session-a");

    expect(await memory.get({ sessionId: "session-a" })).toEqual([]);
    expect((await memory.listSessions()).map((session) => session.id)).not.toContain("session-a");
  });

  it("clears only the selected session when sessionId is provided", async () => {
    const memory = new InMemory();

    await memory.add({ role: "user", content: "keep" }, { sessionId: "session-a" });
    await memory.add({ role: "user", content: "clear" }, { sessionId: "session-b" });

    await memory.clear({ sessionId: "session-b" });

    expect(await memory.get({ sessionId: "session-a" })).toEqual([
      { role: "user", content: "keep", metadata: {} },
    ]);
    expect(await memory.get({ sessionId: "session-b" })).toEqual([]);
    expect(await memory.getSession("session-b")).toEqual(expect.objectContaining({ id: "session-b" }));
  });
});

describe("IndexedDBMemory", () => {
  it("persists sessions and render-ready entries across memory instances", async () => {
    const dbName = uniqueDbName();
    const first = new IndexedDBMemory({ dbName });

    await first.createSession({ id: "support", title: "Support chat" });
    await first.add(
      { role: "user", content: "hello", metadata: { source: "test" } },
      { sessionId: "support" },
    );

    const second = new IndexedDBMemory({ dbName });

    expect(await second.listSessions()).toEqual([
      expect.objectContaining({ id: "support", title: "Support chat" }),
    ]);
    expect(await second.getEntries({ sessionId: "support" })).toEqual([
      expect.objectContaining({
        id: expect.any(String),
        sessionId: "support",
        createdAt: expect.any(Number),
        message: {
          role: "user",
          content: "hello",
          metadata: { source: "test" },
        },
      }),
    ]);
  });

  it("limits messages per session without affecting other sessions", async () => {
    const memory = new IndexedDBMemory({ dbName: uniqueDbName(), maxMessages: 2 });

    await memory.add({ role: "user", content: "one" }, { sessionId: "session-a" });
    await memory.add({ role: "assistant", content: "two" }, { sessionId: "session-a" });
    await memory.add({ role: "user", content: "three" }, { sessionId: "session-a" });
    await memory.add({ role: "user", content: "other" }, { sessionId: "session-b" });

    expect(await memory.get({ sessionId: "session-a" })).toEqual([
      { role: "assistant", content: "two", metadata: {} },
      { role: "user", content: "three", metadata: {} },
    ]);
    expect(await memory.get({ sessionId: "session-b" })).toEqual([
      { role: "user", content: "other", metadata: {} },
    ]);
  });

  it("clears and deletes sessions independently", async () => {
    const memory = new IndexedDBMemory({ dbName: uniqueDbName() });

    await memory.add({ role: "user", content: "keep" }, { sessionId: "session-a" });
    await memory.add({ role: "user", content: "clear" }, { sessionId: "session-b" });

    await memory.clear({ sessionId: "session-b" });

    expect(await memory.get({ sessionId: "session-a" })).toEqual([
      { role: "user", content: "keep", metadata: {} },
    ]);
    expect(await memory.get({ sessionId: "session-b" })).toEqual([]);
    expect(await memory.getSession("session-b")).toEqual(expect.objectContaining({ id: "session-b" }));

    await memory.deleteSession("session-b");

    expect(await memory.getSession("session-b")).toBeUndefined();
    expect((await memory.listSessions()).map((session) => session.id)).not.toContain("session-b");
  });
});

function uniqueDbName(): string {
  return `agent-memory-test-${crypto.randomUUID()}`;
}
