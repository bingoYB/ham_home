import type { AILanguage, AnalyzeBookmarkInput } from "../types";
import { smartTruncate } from "../utils/text";

const PROMPTS = {
  zh: {
    completeSystem:
      "你是一个专业的网页内容分析专家。你的任务是深度阅读网页内容，提取最核心的信息，一次性生成优化标题、内容摘要、推荐分类和关键标签。请保持客观、准确，严格按照所要求的格式输出。",
    titleSummarySystem:
      "你是一个专业的网页内容摘要专家。你的任务是分析网页核心内容，生成精准的标题和一句话摘要。",
    categorySystem:
      "你是一个专业的知识分类专家。你的任务是分析网页内容并从用户已有的分类树中为其匹配最合适的分类节点。",
    tagsSystem:
      "你是一个专业的信息标签提取专家。你的任务是提炼网页内容的核心关键词作为标签。",
    completeUser: (pageInfo: string, categoryContext: string, tagContext: string, existingTagsContext: string) =>
      `请仔细阅读并分析以下网页内容，生成相应的结构化元数据：\n\n网页信息：\n${pageInfo}\n${categoryContext}\n${tagContext}\n${existingTagsContext}\n\n要求：\n1. title: 基于原文标题优化，去除无关后缀（如" - XX网站"），保持简洁核心，不超过50字\n2. summary: 用一句话客观概括网页的核心内容与价值，必须使用中文，不超过150字\n3. category: 为内容推荐【一个】最合适分类\n   - 层级格式：采用 "父分类 > 子分类" 格式（如 "技术 > 前端 > React"）\n   - 【强制优先】：必须优先精确匹配用户的「已有分类」，绝不乱造新分类。\n   - 【匹配策略】：优先选择最符合深度的具体子分类。若内容宽泛，则选父分类。\n   - 【创建规则】（仅在已有分类完全不适用时）：\n     * 必须基于已有分类树扩展，不可凭空制造独立的顶级分类。\n     * 示例：已有"设计"，可新增"设计 > UI"，不可新增孤立的"UI设计"。\n4. tags: 生成3-5个核心关键词标签\n   - 格式：中文2-5字，英文1-3个单词\n   - 质量：准确反映文章核心技术、领域或概念，宁缺毋滥\n   - 【强制优先级】：预设标签 > 已有标签 > 新标签\n   - 【防重策略】：避免生成与已有标签语义重复的新标签（如：已有"前端"，绝不生成"前端开发"；已有"React"，绝不生成"ReactJS"）。`,
    titleSummaryUser: (pageInfo: string) =>
      `请仔细阅读并分析以下网页内容，生成优化的标题和摘要：\n\n网页信息：\n${pageInfo}\n\n要求：\n1. title: 基于原文优化，去除无关后缀（如" - XX网站"），保持简洁核心，不超过50字\n2. summary: 用一句话客观概括网页的核心内容与价值，不超过150字`,
    categoryUser: (pageInfo: string, categoryContext: string) =>
      `请阅读并分析以下网页内容，为其推荐【一个】最适合的分类：\n\n网页信息：\n${pageInfo}\n${categoryContext}\n\n要求：\n- 层级格式：采用 "父分类 > 子分类" 格式（如 "技术 > 前端 > React"）\n- 【强制优先】：必须优先精确匹配用户的「已有分类」，绝不乱造新分类。\n- 【匹配策略】：优先选择最符合内容深度的具体子分类。若内容宽泛，则选择父分类。\n- 【创建规则】（仅在已有分类完全不适用时）：\n  * 必须基于已有的分类树结构进行扩展，不可凭空制造独立的顶级分类。\n  * 示例：若已有"设计"，可新增"设计 > UI"，但不应新增孤立的"UI设计"分类。`,
    tagsUser: (pageInfo: string, tagContext: string, existingTagsContext: string) =>
      `请阅读并分析以下网页内容，提取核心关键标签：\n\n网页信息：\n${pageInfo}\n${tagContext}\n${existingTagsContext}\n\n要求：\n- 生成 3-5 个核心关键词作为标签\n- 格式：中文 2-5 字，英文 1-3 个单词\n- 质量：必须准确反映文章最核心的技术、领域或概念，宁缺毋滥\n- 【强制优先级】：预设标签 > 已有标签 > 新标签\n- 【防重策略】：仔细检查已有标签，避免生成语义重复的新标签（如：已有 "前端"，绝不生成 "前端开发"；已有 "React"，绝不生成 "React.js"）。确保复用现有体系。`,
  },
  en: {
    completeSystem:
      "You are a professional web content analyst. Your task is to extract core themes from web content and generate accurate structured metadata including title, summary, category, and tags.",
    titleSummarySystem:
      "You are a professional web content analyst. Your task is to extract core themes from web content and generate an accurate title and summary.",
    categorySystem:
      "You are a professional information classification expert. Your task is to analyze web content and accurately map it to the most appropriate category within a user's taxonomy.",
    tagsSystem:
      "You are a professional keyword extraction expert. Your task is to analyze web content and extract its most critical core themes as tags.",
    completeUser: (pageInfo: string, categoryContext: string, tagContext: string, existingTagsContext: string) =>
      `Please read and analyze the following web content to generate structured bookmark metadata:\n\nPage Information:\n${pageInfo}\n${categoryContext}\n${tagContext}\n${existingTagsContext}\n\nRequirements:\n1. title: Optimize original title, remove unnecessary suffixes (e.g., " - SiteName"), keep focused, max 50 characters\n2. summary: One-sentence objective summary of core content and value, max 150 characters\n3. category: Recommend exactly ONE most suitable category\n   - Format: Hierarchical "Parent > Child" string (e.g., "Tech > Frontend > React")\n   - [MANDATORY] Highest priority: Exact match from "User existing categories". Do NOT invent new categories if a suitable one exists.\n   - [Matching Strategy]: Choose the category level that matches context depth. Broad content fits parent categories; specific content fits subcategories.\n   - [Creation Rules] (ONLY when no existing category fits):\n     * Must extend from existing category tree. Do NOT create isolated top-level categories.\n     * Example: If "Design" exists, add "Design > UI" instead of isolated "UI Design".\n4. tags: Generate 3-5 core keyword tags\n   - Length: 1-3 words each\n   - Quality: Accurately reflect core technologies or concepts. Quality over quantity.\n   - [MANDATORY] Priority: Preset tags > Existing tags > New tags\n   - [De-duplication]: Never generate semantic duplicates of existing tags (e.g., if "React" exists, do not generate "ReactJS"). Reuse existing tags.`,
    titleSummaryUser: (pageInfo: string) =>
      `Please read and analyze the following web content to generate an optimized title and summary:\n\nPage Information:\n${pageInfo}\n\nRequirements:\n1. title: Optimize original title, remove unnecessary suffixes (e.g., " - SiteName"), keep focused, max 50 characters\n2. summary: One-sentence objective summary of core content and value, max 150 characters`,
    categoryUser: (pageInfo: string, categoryContext: string) =>
      `Please read and analyze the following web content to recommend exactly ONE most suitable category:\n\nPage Information:\n${pageInfo}\n${categoryContext}\n\nRequirements:\n- Format: Hierarchical "Parent > Child" string (e.g., "Tech > Frontend > React")\n- [MANDATORY] Highest priority: Exact match from "User existing categories". Do NOT invent new categories if a suitable one exists.\n- [Matching Strategy]: Choose the category level that matches context depth. Broad content fits parent categories; specific content fits subcategories.\n- [Creation Rules] (ONLY when no existing category fits):\n  * Must extend from existing category tree. Do NOT create isolated top-level categories.\n  * Example: If "Design" exists, add "Design > UI" instead of isolated "UI Design".`,
    tagsUser: (pageInfo: string, tagContext: string, existingTagsContext: string) =>
      `Please read and analyze the following web content to extract core keyword tags:\n\nPage Information:\n${pageInfo}\n${tagContext}\n${existingTagsContext}\n\nRequirements:\n- Generate 3-5 core keyword tags\n- Length: 1-3 words each\n- Quality: Accurately reflect core technologies or concepts. Quality over quantity.\n- [MANDATORY] Priority: Preset tags > Existing tags > New tags\n- [De-duplication]: Never generate semantic duplicates of existing tags (e.g., if "React" exists, do not generate "ReactJS"). Reuse existing tags strictly.`,
  },
} as const;

function normalizeLanguage(language: AILanguage): "zh" | "en" {
  return language === "en" ? "en" : "zh";
}

function buildBasePageInfo(
  input: AnalyzeBookmarkInput,
  contentLimit: number,
): string {
  const cleanUrl = input.url
    .replace(/\?.+$/, "")
    .replace(/[#&].*$/, "")
    .replace(/\/+$/, "");

  const lines = [`title: ${input.title}`, `url: ${cleanUrl}`];

  if (input.excerpt) {
    lines.push(`excerpt: ${smartTruncate(input.excerpt, 300)}`);
  }

  if (input.metadata?.keywords) {
    lines.push(`keywords: ${input.metadata.keywords.slice(0, 300)}`);
  }

  if (input.content && input.isReaderable !== false) {
    lines.push(`content: ${smartTruncate(input.content, contentLimit)}`);
  }

  if (input.metadata?.siteName) {
    lines.push(`site: ${input.metadata.siteName}`);
  }

  return lines.join("\n");
}

function buildCategoryContext(
  language: "zh" | "en",
  categories?: string[],
): string {
  if (!categories?.length) {
    return "";
  }

  return language === "en"
    ? `\nUser existing categories: ${categories.join(", ")}`
    : `\n用户已有分类: ${categories.join(", ")}`;
}

function buildPresetTagContext(language: "zh" | "en", presetTags?: string[]): string {
  if (!presetTags?.length) {
    return "";
  }

  const limitedTags = presetTags.slice(0, 20).join(", ");
  return language === "en"
    ? `\nPreset tags: ${limitedTags}`
    : `\n预设标签: ${limitedTags}`;
}

function buildExistingTagsContext(
  language: "zh" | "en",
  existingTags?: string[],
): string {
  if (!existingTags?.length) {
    return "";
  }

  const limitedTags = existingTags.slice(0, 50).join(", ");
  return language === "en"
    ? `\nUser existing tags: ${limitedTags}`
    : `\n用户已有标签: ${limitedTags}`;
}

export function getBookmarkAnalysisSystemPrompt(language: AILanguage): string {
  return PROMPTS[normalizeLanguage(language)].completeSystem;
}

export function buildBookmarkAnalysisPrompt(
  input: AnalyzeBookmarkInput,
  language: AILanguage,
): string {
  const normalizedLanguage = normalizeLanguage(language);
  const prompts = PROMPTS[normalizedLanguage];
  return prompts.completeUser(
    buildBasePageInfo(input, 500),
    buildCategoryContext(normalizedLanguage, input.existingCategories),
    buildPresetTagContext(normalizedLanguage, input.presetTags),
    buildExistingTagsContext(normalizedLanguage, input.existingTags),
  );
}

export function getTitleSummarySystemPrompt(language: AILanguage): string {
  return PROMPTS[normalizeLanguage(language)].titleSummarySystem;
}

export function buildTitleSummaryPrompt(
  input: AnalyzeBookmarkInput,
  language: AILanguage,
): string {
  const normalizedLanguage = normalizeLanguage(language);
  return PROMPTS[normalizedLanguage].titleSummaryUser(
    buildBasePageInfo(input, 500),
  );
}

export function getCategorySystemPrompt(language: AILanguage): string {
  return PROMPTS[normalizeLanguage(language)].categorySystem;
}

export function buildCategoryPrompt(
  input: AnalyzeBookmarkInput,
  language: AILanguage,
): string {
  const normalizedLanguage = normalizeLanguage(language);
  return PROMPTS[normalizedLanguage].categoryUser(
    buildBasePageInfo(input, 300),
    buildCategoryContext(normalizedLanguage, input.existingCategories),
  );
}

export function getTagsSystemPrompt(language: AILanguage): string {
  return PROMPTS[normalizeLanguage(language)].tagsSystem;
}

export function buildTagsPrompt(
  input: AnalyzeBookmarkInput,
  language: AILanguage,
): string {
  const normalizedLanguage = normalizeLanguage(language);
  return PROMPTS[normalizedLanguage].tagsUser(
    buildBasePageInfo(input, 300),
    buildPresetTagContext(normalizedLanguage, input.presetTags),
    buildExistingTagsContext(normalizedLanguage, input.existingTags),
  );
}
