import type { AgentMessage, ContextBuildInput, ContextBuilder, ContextWindowOptions } from "../core/types";
import { estimateMessageTokens, estimateTextTokens, truncateTextToTokens } from "../utils/tokens";

const SUMMARY_SYSTEM_PROMPT = [
  "You compress conversation history for an assistant that will continue the conversation.",
  "Summarize the transcript: the user's goals, decisions, facts and tool results that may matter later, and open questions.",
  "Keep names, ids, numbers and URLs exactly. Do not add anything that is not in the transcript.",
  "Write in the language the user wrote in, in at most 200 words.",
].join(" ");

/** Tokens kept free for the summary when summarization is on. */
const SUMMARY_TOKEN_RESERVE = 400;
/** Size of each tool result or message shown to the summarizer. */
const SUMMARY_TOOL_RESULT_TOKENS = 200;
const SUMMARY_MESSAGE_TOKENS = 1000;
/** Number of trailing message hashes that identify where a cached summary ends. */
const ANCHOR_SIZE = 3;

interface CachedSummary {
  anchor: string;
  summary: string;
}

/**
 * Default `ContextBuilder`: fits the session history into a token budget.
 *
 * Over budget, it first removes image attachments from earlier turns, then
 * drops whole turns from the oldest. A turn starts at a user message and keeps
 * its tool calls and tool results together, so the request stays valid; the
 * newest turn is always kept. With `summarize`, dropped turns are summarized
 * with the agent's model and the summary is sent ahead of the kept turns.
 * Summaries are cached per session and extended incrementally, so reuse one
 * builder across agents (`AgentConfig.contextBuilder`) to keep the cache.
 *
 * Example:
 * ```ts
 * const contextBuilder = new TokenBudgetContextBuilder({ maxTokens: 16000, summarize: true });
 * createAgent({ ..., contextBuilder });
 * ```
 */
export class TokenBudgetContextBuilder implements ContextBuilder {
  private readonly summaries = new Map<string, CachedSummary>();
  private readonly reportedAnchors = new Map<string, string>();

  constructor(private readonly options: ContextWindowOptions) {}

  async build(input: ContextBuildInput): Promise<AgentMessage[]> {
    const estimate = this.options.estimateTokens ?? estimateMessageTokens;
    const maxTokens = input.maxTokens ?? this.options.maxTokens;

    let messages = capToolResults(input.messages, this.options.maxToolResultTokens);
    if (sumTokens(messages, estimate) <= maxTokens) {
      return messages;
    }

    messages = stripEarlierImages(messages);
    if (sumTokens(messages, estimate) <= maxTokens) {
      return messages;
    }

    const summarize = this.options.summarize === true && input.generateText !== undefined;
    const budget = summarize ? Math.max(0, maxTokens - SUMMARY_TOKEN_RESERVE) : maxTokens;
    const turns = splitTurns(messages);
    let firstKept = turns.length - 1;
    let keptTokens = sumTokens(turns[firstKept], estimate);
    for (let index = turns.length - 2; index >= 0; index -= 1) {
      const cost = sumTokens(turns[index], estimate);
      if (keptTokens + cost > budget) {
        break;
      }
      keptTokens += cost;
      firstKept = index;
    }

    const dropped = turns.slice(0, firstKept).flat();
    const kept = turns.slice(firstKept).flat();
    if (dropped.length === 0) {
      // The newest turn alone exceeds the budget; it is never cut.
      return kept;
    }

    const hashes = dropped.map(hashMessage);
    const summary = summarize ? await this.summarize(input, dropped, hashes, maxTokens) : undefined;
    this.report(input, hashes, summary !== undefined);
    return summary ? prependSummary(kept, summary) : kept;
  }

  /**
   * Summarizes `dropped`, reusing the cached summary of this session when it
   * covers a prefix of `dropped`, so each call only summarizes new messages.
   */
  private async summarize(
    input: ContextBuildInput,
    dropped: AgentMessage[],
    hashes: string[],
    maxTokens: number,
  ): Promise<string | undefined> {
    const cached = this.summaries.get(input.sessionId);
    let start = 0;
    let previous: string | undefined;
    if (cached) {
      const end = findAnchorEnd(hashes, cached.anchor);
      if (end >= 0) {
        start = end;
        previous = cached.summary;
      }
    }
    if (start >= dropped.length) {
      return previous;
    }

    try {
      const summary = (
        await input.generateText!({
          systemPrompt: SUMMARY_SYSTEM_PROMPT,
          prompt: formatTranscript(dropped.slice(start), previous, maxTokens),
          signal: input.signal,
        })
      ).trim();
      if (!summary) {
        return previous;
      }
      this.summaries.set(input.sessionId, { anchor: anchorAt(hashes, hashes.length), summary });
      return summary;
    } catch (error) {
      if (input.signal?.aborted) {
        throw error;
      }
      // A failed summary must not fail the run: fall back to the older
      // summary, or to dropping the turns.
      return previous;
    }
  }

  /** Reports only when more turns fall out of the window, not on every step. */
  private report(input: ContextBuildInput, hashes: string[], summarized: boolean): void {
    const anchor = anchorAt(hashes, hashes.length);
    if (this.reportedAnchors.get(input.sessionId) === anchor) {
      return;
    }
    this.reportedAnchors.set(input.sessionId, anchor);
    input.onCompacted?.({ droppedMessages: hashes.length, summarized });
  }
}

function sumTokens(messages: AgentMessage[], estimate: (message: AgentMessage) => number): number {
  return messages.reduce((total, message) => total + estimate(message), 0);
}

function capToolResults(messages: AgentMessage[], maxTokens: number | undefined): AgentMessage[] {
  if (!maxTokens) {
    return messages;
  }
  return messages.map((message) =>
    message.role === "tool" && estimateTextTokens(message.content) > maxTokens
      ? { ...message, content: truncateTextToTokens(message.content, maxTokens, "…[tool result truncated]") }
      : message,
  );
}

/** Removes image attachments from every user message except the newest one. */
function stripEarlierImages(messages: AgentMessage[]): AgentMessage[] {
  const lastUserIndex = messages.map((message) => message.role).lastIndexOf("user");
  return messages.map((message, index) => {
    const images = message.attachments?.filter((attachment) => attachment.type === "image").length ?? 0;
    if (index >= lastUserIndex || images === 0) {
      return message;
    }
    const rest = message.attachments?.filter((attachment) => attachment.type !== "image");
    return {
      ...message,
      content: `${message.content}\n[${images} image(s) removed from the history to save context]`,
      attachments: rest?.length ? rest : undefined,
    };
  });
}

/** Groups messages into turns that each start at a user message. */
function splitTurns(messages: AgentMessage[]): AgentMessage[][] {
  const turns: AgentMessage[][] = [];
  for (const message of messages) {
    if (message.role === "user" || turns.length === 0) {
      turns.push([message]);
    } else {
      turns[turns.length - 1].push(message);
    }
  }
  return turns;
}

function prependSummary(kept: AgentMessage[], summary: string): AgentMessage[] {
  const block = `[Summary of the earlier conversation]\n${summary}\n[End of summary]`;
  const [first, ...rest] = kept;
  // Merging into the first user message avoids two user messages in a row,
  // which some providers reject.
  if (first?.role === "user") {
    return [{ ...first, content: `${block}\n\n${first.content}` }, ...rest];
  }
  return [{ role: "user", content: block }, ...kept];
}

/** Renders messages as plain text, newest kept when it exceeds `maxTokens`. */
function formatTranscript(messages: AgentMessage[], previousSummary: string | undefined, maxTokens: number): string {
  const lines: string[] = [];
  for (const message of messages) {
    if (message.role === "tool") {
      const result = truncateTextToTokens(message.content, SUMMARY_TOOL_RESULT_TOKENS);
      lines.push(`Tool ${String(message.metadata?.toolName ?? "tool")} returned: ${result}`);
      continue;
    }
    if (message.content) {
      const role = message.role === "user" ? "User" : "Assistant";
      lines.push(`${role}: ${truncateTextToTokens(message.content, SUMMARY_MESSAGE_TOKENS)}`);
    }
    const toolCalls = message.metadata?.toolCalls;
    if (Array.isArray(toolCalls)) {
      for (const call of toolCalls as Array<{ toolName?: string; input?: unknown }>) {
        lines.push(`Assistant called tool ${call.toolName ?? "tool"} with ${JSON.stringify(call.input ?? {})}`);
      }
    }
  }

  const kept: string[] = [];
  let tokens = 0;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    tokens += estimateTextTokens(lines[index]);
    if (tokens > maxTokens && kept.length > 0) {
      kept.unshift("[...earlier messages omitted]");
      break;
    }
    kept.unshift(lines[index]);
  }

  const sections = previousSummary ? [`Summary so far:\n${previousSummary}`, "New messages:"] : ["Transcript:"];
  return [...sections, kept.join("\n")].join("\n\n");
}

/** FNV-1a hash of what identifies a message in the history. */
function hashMessage(message: AgentMessage): string {
  const text = `${message.role}\u0001${message.content}\u0001${String(message.metadata?.toolCallId ?? "")}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function anchorAt(hashes: string[], end: number): string {
  return hashes.slice(Math.max(0, end - ANCHOR_SIZE), end).join(",");
}

/** Index right after the last position whose trailing hashes equal `anchor`, or -1. */
function findAnchorEnd(hashes: string[], anchor: string): number {
  for (let end = hashes.length; end > 0; end -= 1) {
    if (anchorAt(hashes, end) === anchor) {
      return end;
    }
  }
  return -1;
}
