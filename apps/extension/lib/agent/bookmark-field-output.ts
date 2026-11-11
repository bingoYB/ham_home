import type { BookmarkAnalysisOutput } from "./prompts";

export type BookmarkField = keyof BookmarkAnalysisOutput;
type Language = "zh" | "en";
type ParseResult = { value: string | string[]; error?: never } | { value?: never; error: string };

const PREFIXES: Record<BookmarkField, RegExp> = {
  title: /^(?:标题|title)\s*[:：]\s*/i,
  summary: /^(?:摘要|summary)\s*[:：]\s*/i,
  category: /^(?:分类|category)\s*[:：]\s*/i,
  tags: /^(?:标签|tags?)\s*[:：]\s*/i,
};
const UNSUPPORTED_CHARACTER = /[:：。！？!?{}\[\]`]/;

function unwrapQuotes(value: string): string {
  const pairs: Record<string, string> = { '"': '"', "'": "'", "“": "”", "‘": "’" };
  return value.length > 1 && pairs[value[0]] === value[value.length - 1]
    ? value.slice(1, -1).trim()
    : value;
}

function textError(value: string, language: Language): string | undefined {
  if (!value) return language === "zh" ? "模型未返回内容" : "The model returned no content";
  if (/```/.test(value)) return language === "zh" ? "包含 Markdown 代码块，预期为纯文本" : "Contains a Markdown code block; expected plain text";
  if (/<\/?think>/.test(value)) return language === "zh" ? "包含 <think> 推理标记，预期为最终结果" : "Contains <think> reasoning markers; expected the final result";
  if (/^[{[]/.test(value)) return language === "zh" ? "返回了 JSON 对象或数组，预期为纯文本" : "Returned a JSON object or array; expected plain text";
  if (/^(?:无|没有|未知|无法判断|不确定|none|null|unknown|n\/?a)$/i.test(value)) {
    return language === "zh" ? "模型返回了未知或空值占位内容" : "The model returned an unknown or empty-value placeholder";
  }
}

function lengthError(length: number, limit: number, language: Language): string {
  return language === "zh"
    ? `长度为 ${length} 字符，超过 ${limit} 字符上限`
    : `Length is ${length} characters; the limit is ${limit}`;
}

function characterError(value: string, language: Language): string | undefined {
  const character = value.match(UNSUPPORTED_CHARACTER)?.[0];
  if (character) return language === "zh" ? `包含不支持的字符“${character}”` : `Contains the unsupported character “${character}”`;
}

/** Parse the existing field formats while retaining the exact rejection reason. */
export function parseBookmarkFieldOutput(raw: unknown, field: BookmarkField, language: Language): ParseResult {
  if (typeof raw !== "string") {
    const type = raw === null ? "null" : Array.isArray(raw) ? "array" : typeof raw;
    return { error: language === "zh" ? `模型返回了非文本结果（${type}），预期为文本` : `The model returned ${type}; expected text` };
  }
  const text = raw.trim().replace(PREFIXES[field], "").trim();
  if (field === "tags") return parseTags(text, language);

  const value = unwrapQuotes(text);
  const error = textError(value, language);
  if (error) return { error };
  if (field === "summary") return value.length <= 1200 ? { value } : { error: lengthError(value.length, 1200, language) };
  if (/[\r\n]/.test(value)) return { error: language === "zh" ? "必须为单行文本，实际返回多行" : "Expected one line, but the model returned multiple lines" };
  if (field === "title") return value.length <= 240 ? { value } : { error: lengthError(value.length, 240, language) };

  const category = value.replace(/\s*>\s*/g, " > ");
  const parts = category.split(" > ");
  if (category.length > 100) return { error: lengthError(category.length, 100, language) };
  if (parts.length > 4) return { error: language === "zh" ? `分类有 ${parts.length} 层，最多支持 4 层` : `The category has ${parts.length} levels; the limit is 4` };
  for (const [index, part] of parts.entries()) {
    if (!part.trim()) return { error: language === "zh" ? `第 ${index + 1} 层分类名称为空` : `Category level ${index + 1} is empty` };
    if (part.trim().length > 30) {
      return { error: language === "zh"
        ? `第 ${index + 1} 层分类名称${lengthError(part.trim().length, 30, language)}`
        : `Category level ${index + 1}: ${lengthError(part.trim().length, 30, language)}` };
    }
  }
  const invalidCharacter = characterError(category, language);
  return invalidCharacter ? { error: invalidCharacter } : { value: category };
}

function parseTags(text: string, language: Language): ParseResult {
  // JSON arrays are supported for tags; other non-text formats remain invalid.
  if (!text || /```|<\/?think>/.test(text)) return { error: textError(text, language)! };
  let entries: unknown[];
  if (text.startsWith("[")) {
    try {
      entries = JSON.parse(text);
      if (!Array.isArray(entries)) return { error: language === "zh" ? "标签 JSON 必须为数组" : "Tags JSON must be an array" };
    } catch {
      return { error: language === "zh" ? "标签 JSON 数组格式无效，无法解析" : "The tags JSON array is malformed and cannot be parsed" };
    }
  } else {
    entries = text.split(/\r?\n/).flatMap((line) =>
      line.replace(/^\s*(?:[-*•·]|\d+[.)、])\s*/, "").split(/[,，、;；]+/),
    );
  }

  const tags: string[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of entries.entries()) {
    const prefix = language === "zh" ? `第 ${index + 1} 个标签` : `Tag ${index + 1}: `;
    if (typeof entry !== "string") return { error: `${prefix}${language === "zh" ? "不是文本" : "is not text"}` };
    const tag = unwrapQuotes(entry.trim().replace(/^(?:[-*•·]|\d+[.)、])\s*/, "").replace(/^#/, ""));
    if (!tag) continue;
    const error = textError(tag, language) || (tag.length > 30 ? lengthError(tag.length, 30, language) : characterError(tag, language));
    if (error) return { error: `${prefix}${error}` };
    const key = tag.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  if (!tags.length) return { error: language === "zh" ? "模型未返回任何非空标签" : "The model returned no non-empty tags" };
  if (tags.length > 10) return { error: language === "zh" ? `去重后有 ${tags.length} 个标签，最多支持 10 个` : `There are ${tags.length} distinct tags; the limit is 10` };
  return { value: tags };
}
