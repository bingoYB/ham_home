import type {
  AnalyzeBookmarkInput,
  BookmarkAnalysisResult,
  PageMetadataInput,
} from "../types";

const STOP_WORDS = new Set([
  "的",
  "了",
  "和",
  "与",
  "或",
  "在",
  "是",
  "到",
  "the",
  "a",
  "an",
  "and",
  "or",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
]);

function extractKeywordTags(keywords?: string): string[] {
  if (!keywords) {
    return [];
  }

  return keywords
    .split(/[,，;；]/)
    .map((tag) => tag.trim())
    .filter(
      (tag) =>
        tag.length >= 1 &&
        tag.length <= 20 &&
        !STOP_WORDS.has(tag.toLowerCase()),
    )
    .slice(0, 3);
}

function extractTitleTags(title?: string, limit = 3): string[] {
  if (!title) {
    return [];
  }

  return title
    .split(/[\s\-_\,\.\。\，\|\:：]+/)
    .map((word) => word.trim())
    .filter(
      (word) =>
        word.length >= 2 &&
        word.length <= 20 &&
        !STOP_WORDS.has(word.toLowerCase()),
    )
    .slice(0, limit);
}

function extractDomainTag(url: string): string[] {
  try {
    const domain = new URL(url).hostname.replace("www.", "").split(".")[0];
    return domain && domain.length >= 2 ? [domain] : [];
  } catch {
    return [];
  }
}

export function createBookmarkAnalysisFallback(
  input: AnalyzeBookmarkInput,
): BookmarkAnalysisResult {
  const tags = [
    ...extractKeywordTags(input.metadata?.keywords),
    ...extractTitleTags(input.title, 3),
    ...extractDomainTag(input.url),
  ];

  return {
    title: input.title || "未命名书签",
    summary: input.excerpt || input.metadata?.description || "",
    category: "未分类",
    tags: [...new Set(tags)].slice(0, 5),
  };
}

export function createBookmarkAnalysisFallbackFromPageContent(input: {
  url: string;
  title: string;
  excerpt?: string;
  metadata?: PageMetadataInput;
}): BookmarkAnalysisResult {
  return createBookmarkAnalysisFallback({
    url: input.url,
    title: input.title,
    excerpt: input.excerpt,
    metadata: input.metadata,
  });
}
