import type { Agent, AgentCommand } from "@hamhome/agent";
import {
  buildBookmarkAnalysisContext,
  type BookmarkAnalysisOutput,
  type BookmarkAnalysisPromptInput,
} from "../prompts";

type BookmarkField = keyof BookmarkAnalysisOutput;

interface FieldPromptInput extends BookmarkAnalysisPromptInput {
  field: BookmarkField;
  retry: boolean;
}

const FIELD_INSTRUCTIONS: Record<BookmarkField, { zh: string; en: string }> = {
  title: {
    zh: "只输出一个适合保存的页面标题，单独一行。",
    en: "Return only a suitable bookmark title on one line.",
  },
  summary: {
    zh: "只输出这个页面的摘要，用一至三句话。",
    en: "Return only a summary of the page in one to three sentences.",
  },
  category: {
    zh: "只输出一个最合适的分类名称，优先使用已有分类。层级分类用“ > ”分隔，单独一行。",
    en: "Return only the best category name on one line, preferring an existing category. Separate nested categories with ' > '.",
  },
  tags: {
    zh: "只输出一至五个简短且不重复的标签，每行一个。优先使用合适的已有或预设标签。",
    en: "Return only one to five short, distinct tags, one per line. Prefer suitable existing or preset tags.",
  },
};

const fieldCommand: AgentCommand<FieldPromptInput, string> = {
  name: "analyzeBookmarkField",
  description: "Analyze one bookmark field as plain text.",
  maxIterations: 1,
  tools: [],
  ignoreBaseSystemPrompt: true,
  prompt: (input) => [
    buildBookmarkAnalysisContext(input),
    FIELD_INSTRUCTIONS[input.field][input.language],
    input.retry
      ? input.language === "zh"
        ? "上次输出的格式无效。请严格按本字段要求回答。"
        : "The previous response had an invalid format. Follow the field instructions exactly."
      : "",
  ].filter(Boolean).join("\n\n"),
};

const FIELD_NAMES: Record<BookmarkField, { zh: string; en: string }> = {
  title: { zh: "标题", en: "title" },
  summary: { zh: "摘要", en: "summary" },
  category: { zh: "分类", en: "category" },
  tags: { zh: "标签", en: "tags" },
};

function cleanValue(value: string, field: BookmarkField): string {
  const prefixes: Record<BookmarkField, RegExp> = {
    title: /^(?:标题|title)\s*[:：]\s*/i,
    summary: /^(?:摘要|summary)\s*[:：]\s*/i,
    category: /^(?:分类|category)\s*[:：]\s*/i,
    tags: /^(?:标签|tags?)\s*[:：]\s*/i,
  };
  return value.trim().replace(prefixes[field], "").trim();
}

function unwrapQuotes(value: string): string {
  const pairs: Record<string, string> = { '"': '"', "'": "'", "“": "”", "‘": "’" };
  return value.length > 1 && pairs[value[0]] === value[value.length - 1]
    ? value.slice(1, -1).trim()
    : value;
}

function isUnusableText(value: string): boolean {
  return !value || /```|<\/?think>|^[{[]/.test(value) ||
    /^(?:无|没有|未知|无法判断|不确定|none|null|unknown|n\/?a)$/i.test(value);
}

function parseTextField(raw: string, field: Exclude<BookmarkField, "tags">): string | undefined {
  const value = unwrapQuotes(cleanValue(raw, field));
  if (isUnusableText(value)) return undefined;

  if (field === "summary") {
    return value.length <= 1200 ? value : undefined;
  }
  if (/[\r\n]/.test(value)) return undefined;
  if (field === "title") return value.length <= 240 ? value : undefined;

  const category = value.replace(/\s*>\s*/g, " > ");
  const parts = category.split(" > ");
  if (
    category.length > 100 || parts.length > 4 ||
    parts.some((part) => !part.trim() || part.trim().length > 30) ||
    /[:：。！？!?{}\[\]`]/.test(category)
  ) return undefined;
  return category;
}

function parseTags(raw: string): string[] | undefined {
  const text = cleanValue(raw, "tags");
  if (!text || /```|<\/?think>/.test(text)) return undefined;

  let entries: unknown[];
  if (text.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (!Array.isArray(parsed)) return undefined;
      entries = parsed;
    } catch {
      return undefined;
    }
  } else {
    entries = text.split(/\r?\n/).flatMap((line) =>
      line.replace(/^\s*(?:[-*•·]|\d+[.)、])\s*/, "").split(/[,，、;；]+/),
    );
  }

  const tags: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (typeof entry !== "string") return undefined;
    const tag = unwrapQuotes(entry.trim().replace(/^(?:[-*•·]|\d+[.)、])\s*/, "").replace(/^#/, ""));
    if (!tag) continue;
    if (isUnusableText(tag) || tag.length > 30 || /[:：。！？!?{}\[\]`]/.test(tag)) return undefined;
    const key = tag.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags.length > 0 && tags.length <= 10 ? tags : undefined;
}

export async function analyzeBookmarkField(
  agent: Agent,
  input: BookmarkAnalysisPromptInput,
  field: BookmarkField,
  temperature: number,
  signal?: AbortSignal,
): Promise<string | string[]> {
  const systemPrompt = input.language === "zh"
    ? "你是书签分析助手。只根据页面内容回答当前问题，不要编造，不要输出 JSON、Markdown、字段名或解释。"
    : "You analyze bookmarks. Answer only the current question using the page context. Do not invent facts or output JSON, Markdown, field names, or explanations.";

  for (let attempt = 0; attempt < 2; attempt++) {
    signal?.throwIfAborted();
    const { output } = await agent.commands.run(
      fieldCommand,
      { ...input, field, retry: attempt > 0 },
      { systemPrompt, temperature, signal },
    );
    signal?.throwIfAborted();
    const parsed = typeof output === "string"
      ? field === "tags" ? parseTags(output) : parseTextField(output, field)
      : undefined;
    if (parsed !== undefined) return parsed;
  }

  const name = FIELD_NAMES[field][input.language];
  throw new Error(input.language === "zh"
    ? `${name}生成失败，请重试或更换模型。`
    : `Failed to generate ${name}. Retry or choose another model.`);
}
