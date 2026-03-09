import type { AILanguage } from "../types";

function normalizeLanguage(language: AILanguage): "zh" | "en" {
  return language === "en" ? "en" : "zh";
}

export function buildSuggestTagsPrompt(
  language: AILanguage,
  input: {
    url: string;
    title: string;
    content: string;
    existingTags: string[];
  },
): string {
  const normalizedLanguage = normalizeLanguage(language);
  if (normalizedLanguage === "en") {
    return `Please recommend 3-5 relevant tags for the following webpage.\n\nURL: ${input.url}\nTitle: ${input.title}\nContent summary: ${input.content.slice(0, 500)}\nExisting tags: ${input.existingTags.join(", ") || "None"}\n\nRequirements:\n1. Tags should be concise, accurate, and distinctive\n2. Use English for tags, except for proper nouns`;
  }

  return `请为以下网页推荐 3-5 个相关标签。\n\nURL: ${input.url}\n标题: ${input.title}\n内容摘要: ${input.content.slice(0, 500)}\n已有标签: ${input.existingTags.join(", ") || "无"}\n\n要求:\n1. 标签应简洁、准确、有辨识度\n2. 标签应该是中文，除非是专有名词（如 React, GitHub）`;
}

export function buildSuggestCategoryPrompt(
  language: AILanguage,
  input: {
    url: string;
    title: string;
    content: string;
    userCategories: string[];
  },
): string {
  const normalizedLanguage = normalizeLanguage(language);
  if (normalizedLanguage === "en") {
    return `Please recommend the most suitable category for the following webpage.\n\nURL: ${input.url}\nTitle: ${input.title}\nContent summary: ${input.content.slice(0, 500)}\nUser's existing categories: ${input.userCategories.join(", ") || "None"}\n\nRequirements:\n1. Prioritize selecting from user's existing categories\n2. Return 1-2 most suitable categories`;
  }

  return `请为以下网页推荐最合适的分类。\n\nURL: ${input.url}\n标题: ${input.title}\n内容摘要: ${input.content.slice(0, 500)}\n用户已有分类: ${input.userCategories.join(", ") || "无"}\n\n要求:\n1. 优先从用户已有分类中选择\n2. 返回 1-2 个最合适的分类`;
}

export function buildTranslatePrompt(
  text: string,
  targetLang: "zh" | "en",
): string {
  const langName = targetLang === "zh" ? "中文" : "English";
  return `请将以下文本翻译成${langName}，只返回翻译结果，不要包含其他内容：\n\n${text}`;
}

export function buildGenerateCategoriesPrompt(
  language: AILanguage,
  description: string,
): string {
  const normalizedLanguage = normalizeLanguage(language);
  if (normalizedLanguage === "en") {
    return `You are a professional information architect skilled at designing personalized bookmark categorization systems.\n\nUser's description:\n${description}\n\nPlease generate a personalized bookmark categorization system based on the user's description.\n\nImportant: Automatically detect the language used in the user's description and use the exact same language for all category names.\n\nRequirements:\n1. Moderate number of categories (3-8 top-level categories)\n2. Support hierarchical structure (up to 3 levels)\n3. Category names should be concise (2-8 words)\n4. Categories should not overlap\n5. Cover all scenarios described by the user\n6. Please generate a single emoji icon character for each category representing its meaning\n\nReturn JSON with a top-level "categories" array.`;
  }

  return `你是一个专业的信息架构师，擅长为用户设计个性化的书签分类系统。\n\n用户需求描述：\n${description}\n\n请根据用户的描述，生成一套个性化的书签分类系统。\n\n重要：请自动检测用户描述使用的语言，并使用完全相同的语言输出所有分类名称。\n\n要求：\n1. 分类数量适中（3-8个一级分类）\n2. 支持层级结构（最多3层）\n3. 分类名称简洁明了（2-8个字）\n4. 分类之间不重叠\n5. 覆盖用户描述的所有需求场景\n6. 请为每个分类匹配1个恰当的 emoji 作为 icon 返回\n\n请务必按照 JSON 格式返回，包含 "categories" 字段。`;
}
