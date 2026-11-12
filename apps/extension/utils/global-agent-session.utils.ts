import type { ChatMessage, ChatSearchSessionSummary } from "@/types";

/**
 * Whether a value from the background is a usable session summary.
 * A background that does not answer the call (for example a stale service
 * worker left over from a reinstall) resolves to `undefined` instead.
 */
export function isSessionSummary(
  value: unknown,
): value is ChatSearchSessionSummary {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as { id?: unknown }).id === "string"
  );
}

/**
 * The session list to keep in state: the well-formed summaries of the
 * response, or an empty list when the response is not an array.
 */
export function normalizeSessionSummaries(
  value: unknown,
): ChatSearchSessionSummary[] {
  return Array.isArray(value) ? value.filter(isSessionSummary) : [];
}

/**
 * The messages of a session snapshot, or an empty list when the snapshot or
 * its messages are missing.
 */
export function normalizeSessionMessages(snapshot: unknown): ChatMessage[] {
  const messages = (snapshot as { messages?: unknown } | null | undefined)
    ?.messages;
  return Array.isArray(messages) ? (messages as ChatMessage[]) : [];
}
