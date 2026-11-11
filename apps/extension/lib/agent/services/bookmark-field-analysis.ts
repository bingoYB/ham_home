import type { Agent, AgentCommand } from "@hamhome/agent";
import type { BookmarkAnalysisPromptInput } from "../prompts";
import { parseBookmarkFieldOutput, type BookmarkField } from "../bookmark-field-output";
import { getAgentErrorMessage } from "../errors";
import { BOOKMARK_FIELD_TOKEN_LIMITS, buildBookmarkFieldPrompt, buildBookmarkFieldSystemPrompt, type BookmarkFieldPromptInput } from "../prompts/bookmark-field-prompt";

const fieldCommand: AgentCommand<BookmarkFieldPromptInput, string> = {
  name: "analyzeBookmarkField",
  description: "Analyze one bookmark field as plain text.",
  maxIterations: 1,
  tools: [],
  ignoreBaseSystemPrompt: true,
  prompt: buildBookmarkFieldPrompt,
};

const FIELD_NAMES: Record<BookmarkField, { zh: string; en: string }> = {
  title: { zh: "标题", en: "title" },
  summary: { zh: "摘要", en: "summary" },
  category: { zh: "分类", en: "category" },
  tags: { zh: "标签", en: "tags" },
};

export async function analyzeBookmarkField(
  agent: Agent,
  input: BookmarkAnalysisPromptInput,
  field: BookmarkField,
  temperature: number,
  signal?: AbortSignal,
  options: { smallModelMode?: boolean } = {},
): Promise<string | string[]> {
  const systemPrompt = buildBookmarkFieldSystemPrompt(input.language, field);
  const name = FIELD_NAMES[field][input.language];
  let lastError = "";
  let lastOutput: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    signal?.throwIfAborted();
    let output: unknown;
    try {
      ({ output } = await agent.commands.run(
        fieldCommand,
        { ...input, field, retry: attempt > 0, retryReason: lastError || undefined },
        { systemPrompt, temperature, signal, maxOutputTokens: options.smallModelMode ? BOOKMARK_FIELD_TOKEN_LIMITS[field] : undefined },
      ));
    } catch (error) {
      signal?.throwIfAborted();
      throw new Error(input.language === "zh"
        ? `${name}请求失败：${getAgentErrorMessage(error)}`
        : `Request for ${name} failed: ${getAgentErrorMessage(error, "AI request failed")}`, { cause: error });
    }
    signal?.throwIfAborted();
    const parsed = parseBookmarkFieldOutput(output, field, input.language);
    if (parsed.error === undefined) return parsed.value;
    lastError = parsed.error;
    lastOutput = output;
  }

  const preview = typeof lastOutput === "string" && lastOutput.trim()
    ? JSON.stringify(lastOutput.length > 200 ? `${lastOutput.slice(0, 200)}…` : lastOutput)
    : "";
  throw new Error(input.language === "zh"
    ? `${name}校验失败：${lastError}。${preview ? `模型返回：${preview}` : ""}`
    : `Invalid ${name}: ${lastError}.${preview ? ` Model response: ${preview}` : ""}`);
}
