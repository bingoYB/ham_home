import type { AgentMessage } from "../core/types";

/** Rough cost of one image attachment; real costs vary by provider and size. */
export const IMAGE_TOKEN_ESTIMATE = 1000;

/** Per-message framing tokens (role markers, separators). */
const MESSAGE_OVERHEAD_TOKENS = 4;

/** CJK ideographs, kana and hangul usually cost about one token each. */
const WIDE_CHAR = /[぀-ヿ㐀-䶿一-鿿가-힯豈-﫿]/;
const WIDE_CHARS = new RegExp(WIDE_CHAR.source, "g");

/**
 * Estimates the token count of a text without a tokenizer: about one token
 * per CJK character and four characters per token for everything else. It is
 * meant for budgeting, not billing.
 *
 * Example:
 * ```ts
 * estimateTextTokens("hello world"); // 3
 * estimateTextTokens("你好"); // 2
 * ```
 */
export function estimateTextTokens(text: string | undefined): number {
  if (!text) {
    return 0;
  }
  const wide = text.match(WIDE_CHARS)?.length ?? 0;
  return wide + Math.ceil((text.length - wide) / 4);
}

/**
 * Estimates what a stored message costs when sent to the model: its text,
 * attachments and the tool calls recorded on assistant messages.
 *
 * Example:
 * ```ts
 * estimateMessageTokens({ role: "user", content: "hi", attachments: [{ type: "image", image: url }] });
 * ```
 */
export function estimateMessageTokens(message: AgentMessage): number {
  let tokens = MESSAGE_OVERHEAD_TOKENS + estimateTextTokens(message.content);

  for (const attachment of message.attachments ?? []) {
    tokens += attachment.type === "image" ? IMAGE_TOKEN_ESTIMATE : estimateTextTokens(attachment.text);
  }

  const toolCalls = message.metadata?.toolCalls;
  if (Array.isArray(toolCalls)) {
    for (const call of toolCalls as Array<{ toolName?: string; input?: unknown }>) {
      tokens += estimateTextTokens(`${call.toolName ?? ""}${JSON.stringify(call.input ?? {})}`);
    }
  }

  return tokens;
}

/**
 * Cuts `text` so that it fits in `maxTokens` by the same estimate, appending
 * `marker` when something was removed.
 *
 * Example:
 * ```ts
 * truncateTextToTokens("a".repeat(100), 10); // 28 "a" characters, then "…[truncated]"
 * ```
 */
export function truncateTextToTokens(text: string, maxTokens: number, marker = "…[truncated]"): string {
  if (estimateTextTokens(text) <= maxTokens) {
    return text;
  }

  const budget = Math.max(0, maxTokens - estimateTextTokens(marker));
  let cost = 0;
  let end = 0;
  for (const char of text) {
    cost += WIDE_CHAR.test(char) ? 1 : 0.25;
    if (cost > budget) {
      break;
    }
    end += char.length;
  }
  return text.slice(0, end) + marker;
}
