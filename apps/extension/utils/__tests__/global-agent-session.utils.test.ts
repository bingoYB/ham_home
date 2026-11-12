import { describe, expect, it } from "vitest";
import {
  isSessionSummary,
  normalizeSessionMessages,
  normalizeSessionSummaries,
} from "../global-agent-session.utils";

const session = {
  id: "session_1",
  title: "New conversation",
  createdAt: 1,
  updatedAt: 2,
};

describe("isSessionSummary", () => {
  it("accepts an object with a string id", () => {
    expect(isSessionSummary(session)).toBe(true);
  });

  it("rejects missing or malformed values", () => {
    expect(isSessionSummary(undefined)).toBe(false);
    expect(isSessionSummary(null)).toBe(false);
    expect(isSessionSummary({})).toBe(false);
    expect(isSessionSummary({ id: 1 })).toBe(false);
    expect(isSessionSummary("session_1")).toBe(false);
  });
});

describe("normalizeSessionSummaries", () => {
  it("falls back to an empty list when the background gave no array", () => {
    expect(normalizeSessionSummaries(undefined)).toEqual([]);
    expect(normalizeSessionSummaries(null)).toEqual([]);
    expect(normalizeSessionSummaries({ res: [session] })).toEqual([]);
  });

  it("keeps well-formed summaries and drops the rest", () => {
    expect(normalizeSessionSummaries([session, undefined, { title: "x" }])).toEqual([
      session,
    ]);
  });
});

describe("normalizeSessionMessages", () => {
  it("returns the snapshot messages", () => {
    const messages = [{ role: "user", content: "hi", timestamp: 1 }];
    expect(normalizeSessionMessages({ ...session, messages })).toBe(messages);
  });

  it("falls back to an empty list when the snapshot or its messages are missing", () => {
    expect(normalizeSessionMessages(undefined)).toEqual([]);
    expect(normalizeSessionMessages(null)).toEqual([]);
    expect(normalizeSessionMessages(session)).toEqual([]);
    expect(normalizeSessionMessages({ ...session, messages: "oops" })).toEqual([]);
  });
});
