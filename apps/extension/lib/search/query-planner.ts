/**
 * Query Planner
 * 将用户自然语言输入解析为结构化检索请求
 */
import type {
  SearchRequest,
  SearchFilters,
  ConversationIntent,
  QuerySubtype,
  ConversationState,
  LocalCategory,
} from "@/types";
import { configStorage, bookmarkStorage } from "@/lib/storage";
import { createExtendedAIClient, getDefaultModel } from "@hamhome/ai";
import { createLogger } from "@hamhome/utils";
import { z } from "zod";

const logger = createLogger({ namespace: "QueryPlanner" });

/**
 * 查询关键词提炼规则
 * 移除填充词，提取核心语义关键词
 */
const FILLER_PATTERNS_ZH = [
  /^(我想|我要|帮我|请帮我|能不能|可以|麻烦)(找|搜|查|看|搜索|查找|查询)/,
  /(相关的?|有关的?|关于的?)$/,
  /^(找一下|查一下|搜一下|看看)/,
  /(的书签|的收藏|的网页|的网站)$/,
];

const FILLER_PATTERNS_EN = [
  /^(please |can you |could you |help me )?(find|search|look for|get)/i,
  /( related| about| regarding)$/i,
  /( bookmarks?| pages?| websites?| links?)$/i,
];

/**
 * 纯过滤词（不包含语义关键词）
 * 当查询仅包含这些词时，refinedQuery 应为空
 */
const PURE_FILTER_PATTERNS_ZH = [
  /^(昨天|今天|最近|近期|这周|上周|这个月|上个月|本月|今年)(的|添加的|收藏的|保存的)?(书签|收藏|网页|网站)?$/,
  /^(添加|收藏|保存)(的|了)?(书签|网页|网站)?$/,
  /^(.+)(分类|类别)(下|里|中)?(的)?(书签|收藏|网页|网站)?$/,
  /^(带有?|有|包含)(.+)(标签)(的)?(书签|收藏|网页|网站)?$/,
];

const PURE_FILTER_PATTERNS_EN = [
  /^(yesterday|today|recent|this week|last week|this month|last month|this year)('s)? ?(bookmarks?|saved|added)?$/i,
  /^(added|saved|bookmarked)( bookmarks?)?$/i,
  /^(in|from|under) (.+) (category|folder)$/i,
  /^(with|has|having) (.+) tag$/i,
];

/**
 * 检测是否为纯过滤查询（无语义关键词）
 */
function isPureFilterQuery(query: string, language: "zh" | "en"): boolean {
  const patterns = language === "zh" ? PURE_FILTER_PATTERNS_ZH : PURE_FILTER_PATTERNS_EN;
  return patterns.some((pattern) => pattern.test(query.trim()));
}

/**
 * 提炼查询关键词
 * 如果是纯过滤查询，返回空字符串
 */
function refineQuery(query: string, language: "zh" | "en"): string {
  // 纯过滤查询不需要语义关键词
  if (isPureFilterQuery(query, language)) {
    return "";
  }

  let refined = query.trim();
  const patterns = language === "zh" ? FILLER_PATTERNS_ZH : FILLER_PATTERNS_EN;

  for (const pattern of patterns) {
    refined = refined.replace(pattern, "").trim();
  }

  // 移除时间相关词汇
  refined = refined
    .replace(/昨天|今天|最近|近期|这周|上周|这个月|上个月|本月|今年/g, "")
    .replace(/yesterday|today|recent|this week|last week|this month|last month|this year/gi, "")
    .replace(/添加的?|收藏的?|保存的?/g, "")
    .replace(/added|saved|bookmarked/gi, "")
    .trim();

  // 如果提炼后为空或只剩下填充词，返回空字符串
  return refined;
}

/**
 * Search Request Schema（用于 AI 结构化输出）
 */
const SearchRequestSchema = z.object({
  intent: z.enum(["query", "statistics", "help"]).describe("用户意图：query=查询书签，statistics=统计查询，help=帮助查询"),
  querySubtype: z.enum(["time", "category", "tag", "semantic", "compound"]).optional().describe("查询子类型（仅 query 意图时有效）"),
  query: z.string().describe("原始查询文本"),
  refinedQuery: z.string().describe("提炼后的语义查询关键词（移除填充词，保留核心关键词）"),
  filters: z
    .object({
      categoryId: z.string().nullable().optional().describe("分类 ID（仅当用户明确提及分类时设置）"),
      tagsAny: z.array(z.string()).optional().describe("标签过滤（仅当用户明确提及标签时设置）"),
      domain: z.string().nullable().optional().describe("域名过滤（仅当用户明确提及网站/域名时设置）"),
      timeRangeDays: z
        .number()
        .nullable()
        .optional()
        .describe("时间范围（天数，仅当用户明确提及时间时设置）"),
      semantic: z.boolean().optional().describe("是否使用语义搜索（默认 true）"),
    })
    .describe("过滤条件"),
  topK: z.number().min(1).max(50).describe("返回结果数量"),
});

/**
 * Query Planner 系统提示词
 */
function getSystemPrompt(language: "zh" | "en"): string {
  if (language === "en") {
    return `You are a search query parser for a bookmark management plugin. Your task is to convert natural language queries into structured search requests.

## Intent Recognition

Identify the user's intent:
1. **query**: User wants to search/find bookmarks (default)
   - Subtypes: time (by date), category (by folder), tag (by tag), semantic (by meaning), compound (multiple conditions)
2. **statistics**: User wants statistics/counts (e.g., "how many bookmarks did I save yesterday")
3. **help**: User asks about plugin features, shortcuts, or settings

If the intent is unclear, default to "query" with "semantic" subtype.

## Query Refinement (CRITICAL)

Extract ONLY the core semantic keywords for search. Remove filler words and filter conditions.

**IMPORTANT**: If the query is a pure filter query with NO semantic keywords, set refinedQuery to EMPTY STRING "".

Examples:
- "配眼镜相关的" -> refinedQuery: "配眼镜" (has semantic keyword)
- "React 教程" -> refinedQuery: "React 教程" (has semantic keyword)
- "昨天添加的书签" -> refinedQuery: "" (EMPTY - pure time filter, no semantic keyword)
- "yesterday's bookmarks" -> refinedQuery: "" (EMPTY - pure time filter)
- "游戏分类下的" -> refinedQuery: "" (EMPTY - pure category filter)
- "最近收藏的 React 教程" -> refinedQuery: "React 教程" (has semantic keyword + time filter)

## Filter Extraction Rules

ONLY set filters when user EXPLICITLY mentions them:
- categoryId: ONLY when user mentions a category name from the provided list
- tagsAny: ONLY when user mentions specific tag names
- domain: ONLY when user mentions a website/domain
- timeRangeDays: ONLY when user mentions time (yesterday=1, this week=7, this month=30)
- semantic: Default true. Set false only for "exact match" or "keyword only"

## Query Subtype Detection

- time: User mentions time constraints (yesterday, last week, etc.)
- category: User mentions a category name
- tag: User mentions tags
- semantic: Pure semantic/meaning-based search (default)
- compound: Multiple conditions combined

Time keywords: yesterday=1, recent/this week=7, this month=30, this year=365

Output JSON only.`;
  }

  return `你是书签管理插件的查询解析器。将自然语言查询转换为结构化搜索请求。

## 意图识别

识别用户意图：
1. **query**：用户想搜索/查找书签（默认）
   - 子类型：time（按时间）、category（按分类）、tag（按标签）、semantic（语义化）、compound（复合条件）
2. **statistics**：用户想要统计（如"昨天收藏了多少"、"本周收藏了哪些网站"）
3. **help**：用户询问插件功能、快捷键或设置

如果意图不明确，默认为 query + semantic 子类型。

## 查询关键词提炼（重要）

从用户输入中提取**核心语义关键词**，移除填充词和过滤条件。

**重要**：如果是纯过滤查询（没有语义关键词），refinedQuery 必须为**空字符串** ""。

示例：
- "配眼镜相关的" -> refinedQuery: "配眼镜"（有语义关键词）
- "React 教程" -> refinedQuery: "React 教程"（有语义关键词）
- "昨天添加的书签" -> refinedQuery: ""（空 - 纯时间过滤，无语义关键词）
- "最近收藏的" -> refinedQuery: ""（空 - 纯时间过滤）
- "游戏分类下的" -> refinedQuery: ""（空 - 纯分类过滤）
- "最近收藏的 React 教程" -> refinedQuery: "React 教程"（有语义关键词 + 时间过滤）

## 过滤条件提取规则

仅在用户**明确提及**时设置过滤条件：
- categoryId：仅当用户明确提到分类名称时设置
- tagsAny：仅当用户明确提到标签名称时设置
- domain：仅当用户明确提到网站/域名时设置
- timeRangeDays：仅当用户明确提到时间时设置（昨天=1，这周=7，这个月=30）
- semantic：默认 true，仅"精确匹配"或"只看关键词"时设为 false

## 查询子类型判断

- time：用户提到时间约束（昨天、上周等）
- category：用户提到分类名称
- tag：用户提到标签
- semantic：纯语义/含义搜索（默认）
- compound：多个条件组合

时间关键词：昨天=1，最近/这周=7，这个月=30，今年=365

只输出 JSON。`;
}

/**
 * 构建用户提示词
 */
function buildUserPrompt(
  userInput: string,
  context: {
    categories?: LocalCategory[];
    existingTags?: string[];
    conversationState?: ConversationState;
  },
): string {
  const parts: string[] = [];

  parts.push(`用户输入: "${userInput}"`);

  if (context.categories && context.categories.length > 0) {
    const categoryList = context.categories
      .map((c) => `${c.id}: ${c.name}`)
      .join(", ");
    parts.push(
      `可用分类（仅当用户输入中明确包含这些分类名称时才设置 categoryId，否则必须返回 null）: ${categoryList}`,
    );
  }

  if (context.existingTags && context.existingTags.length > 0) {
    parts.push(
      `已有标签（仅当用户输入中明确包含这些标签名称时才设置 tagsAny，否则必须返回空数组）: ${context.existingTags.slice(0, 20).join(", ")}`,
    );
  }

  if (context.conversationState) {
    parts.push(`当前对话状态:`);
    parts.push(`- 已有查询: ${context.conversationState.query}`);
    parts.push(
      `- 已有过滤: ${JSON.stringify(context.conversationState.filters)}`,
    );
    parts.push(
      `- 已展示结果数: ${context.conversationState.seenBookmarkIds.length}`,
    );
  }

  return parts.join("\n");
}

/**
 * 帮助意图关键词
 */
const HELP_KEYWORDS_ZH = [
  "快捷键", "设置", "怎么用", "如何使用", "怎么设置", "功能", "帮助",
  "插件", "扩展", "怎么操作", "使用方法", "使用教程",
];

const HELP_KEYWORDS_EN = [
  "shortcut", "setting", "how to use", "how do i", "feature", "help",
  "plugin", "extension", "tutorial", "guide",
];

/**
 * 统计意图关键词
 */
const STATS_KEYWORDS_ZH = [
  "多少", "几个", "统计", "数量", "总共", "一共",
];

const STATS_KEYWORDS_EN = [
  "how many", "count", "statistics", "total", "number of",
];

/**
 * 检测是否为帮助意图
 */
function isHelpIntent(input: string): boolean {
  const lowerInput = input.toLowerCase();
  return (
    HELP_KEYWORDS_ZH.some((kw) => input.includes(kw)) ||
    HELP_KEYWORDS_EN.some((kw) => lowerInput.includes(kw))
  );
}

/**
 * 检测是否为统计意图
 */
function isStatisticsIntent(input: string): boolean {
  const lowerInput = input.toLowerCase();
  return (
    STATS_KEYWORDS_ZH.some((kw) => input.includes(kw)) ||
    STATS_KEYWORDS_EN.some((kw) => lowerInput.includes(kw))
  );
}

/**
 * 检测查询子类型
 */
function detectQuerySubtype(input: string, filters: SearchFilters): QuerySubtype {
  const hasTime = !!filters.timeRangeDays;
  const hasCategory = !!filters.categoryId;
  const hasTags = filters.tagsAny && filters.tagsAny.length > 0;

  const conditionCount = [hasTime, hasCategory, hasTags].filter(Boolean).length;

  if (conditionCount >= 2) return "compound";
  if (hasTime) return "time";
  if (hasCategory) return "category";
  if (hasTags) return "tag";
  return "semantic";
}

/**
 * 基于规则的简单解析（备用方案）
 */
function parseWithRules(userInput: string, language: "zh" | "en" = "zh"): SearchRequest {
  const input = userInput.toLowerCase();

  // 意图检测
  let intent: ConversationIntent = "query";
  
  if (isHelpIntent(userInput)) {
    intent = "help";
    return {
      intent,
      query: userInput,
      refinedQuery: userInput,
      filters: {},
      topK: 5,
    };
  }

  if (isStatisticsIntent(userInput)) {
    intent = "statistics";
  }

  // 时间范围检测
  let timeRangeDays: number | null = null;
  if (input.includes("昨天") || input.includes("yesterday")) {
    timeRangeDays = 1;
  } else if (
    input.includes("最近") ||
    input.includes("近期") ||
    input.includes("这周") ||
    input.includes("recent") ||
    input.includes("this week")
  ) {
    timeRangeDays = 7;
  } else if (
    input.includes("这个月") ||
    input.includes("本月") ||
    input.includes("this month")
  ) {
    timeRangeDays = 30;
  } else if (
    input.includes("今年") ||
    input.includes("这一年") ||
    input.includes("this year")
  ) {
    timeRangeDays = 365;
  }

  // 语义搜索判断：默认启用，仅当明确要求禁用时才关闭
  let semantic: boolean | undefined = undefined;

  if (
    input.includes("只看关键词") ||
    input.includes("不用语义") ||
    input.includes("精确匹配") ||
    input.includes("keyword only") ||
    input.includes("exact match")
  ) {
    semantic = false;
  }

  // 清理查询文本
  let query = userInput
    .replace(/昨天|最近|近期|这周|这个月|本月|今年|这一年/g, "")
    .replace(/yesterday|recent|this week|this month|this year/gi, "")
    .replace(/多少|几个|统计|数量|总共|一共/g, "")
    .replace(/how many|count|statistics|total|number of/gi, "")
    .trim();

  if (!query) {
    query = userInput;
  }

  // 提炼查询关键词
  const refinedQuery = refineQuery(query, language);

  const filters: SearchFilters = {
    timeRangeDays,
    semantic,
  };

  // 检测查询子类型
  const querySubtype = intent === "query" ? detectQuerySubtype(userInput, filters) : undefined;

  // 设置 topK
  const topK = intent === "statistics" ? 50 : 20;

  return {
    intent,
    querySubtype,
    query,
    refinedQuery,
    filters,
    topK,
  };
}

/**
 * Query Planner 类
 */
class QueryPlanner {
  /**
   * 解析用户输入为结构化搜索请求
   */
  async parse(
    userInput: string,
    context: {
      categories?: LocalCategory[];
      existingTags?: string[];
      conversationState?: ConversationState;
    } = {},
  ): Promise<SearchRequest> {
    // 尝试使用 AI 解析
    try {
      const aiConfig = await configStorage.getAIConfig();
      const settings = await configStorage.getSettings();
      const language = settings.language || "zh";

      // 检查 AI 是否可用
      if (!aiConfig.apiKey && aiConfig.provider !== "ollama") {
        logger.debug("AI not configured, using rule-based parsing");
        return parseWithRules(userInput, language);
      }

      const client = createExtendedAIClient({
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        baseUrl: aiConfig.baseUrl,
        model: aiConfig.model || getDefaultModel(aiConfig.provider),
        temperature: 0.1, // 低温度保证一致性
        maxTokens: 500,
        language: settings.language,
      });

      const systemPrompt = getSystemPrompt(language);
      const userPrompt = buildUserPrompt(userInput, context);

      logger.debug("Parsing with AI", { userInput: userInput.slice(0, 100) });

      const result = await client.generateObject({
        schema: SearchRequestSchema,
        system: systemPrompt,
        prompt: userPrompt,
      });

      logger.debug("AI parsing result", { result });

      // 确定查询子类型
      const filters: SearchFilters = {
        categoryId: result.filters.categoryId ?? undefined,
        tagsAny: result.filters.tagsAny,
        domain: result.filters.domain ?? undefined,
        timeRangeDays: result.filters.timeRangeDays ?? undefined,
        semantic: result.filters.semantic,
      };

      const querySubtype = result.intent === "query"
        ? (result.querySubtype || detectQuerySubtype(userInput, filters))
        : undefined;

      return {
        intent: result.intent,
        querySubtype,
        query: result.query,
        refinedQuery: result.refinedQuery || refineQuery(result.query, language),
        filters,
        topK: result.topK,
      };
    } catch (error) {
      logger.warn("AI parsing failed, falling back to rules", error);
      const settings = await configStorage.getSettings();
      return parseWithRules(userInput, settings.language || "zh");
    }
  }

  /**
   * 基于对话状态更新搜索请求
   */
  mergeWithState(
    request: SearchRequest,
    state: ConversationState,
  ): SearchRequest {
    // 合并过滤条件（新条件优先）
    const mergedFilters: SearchFilters = {
      ...state.filters,
      ...request.filters,
    };

    // 如果新请求没有指定某个过滤条件，保留旧状态的
    if (request.filters.categoryId === undefined && state.filters.categoryId) {
      mergedFilters.categoryId = state.filters.categoryId;
    }
    if (!request.filters.tagsAny?.length && state.filters.tagsAny?.length) {
      mergedFilters.tagsAny = state.filters.tagsAny;
    }
    if (request.filters.domain === undefined && state.filters.domain) {
      mergedFilters.domain = state.filters.domain;
    }
    if (
      request.filters.timeRangeDays === undefined &&
      state.filters.timeRangeDays
    ) {
      mergedFilters.timeRangeDays = state.filters.timeRangeDays;
    }

    // 检测合并后的查询子类型
    const querySubtype = request.intent === "query"
      ? detectQuerySubtype(request.query, mergedFilters)
      : undefined;

    return {
      ...request,
      querySubtype,
      filters: mergedFilters,
    };
  }

  /**
   * 快速规则解析（不调用 AI）
   */
  parseQuick(userInput: string, language: "zh" | "en" = "zh"): SearchRequest {
    return parseWithRules(userInput, language);
  }

  /**
   * 检测是否为帮助意图
   */
  isHelpIntent(userInput: string): boolean {
    return isHelpIntent(userInput);
  }

  /**
   * 检测是否为统计意图
   */
  isStatisticsIntent(userInput: string): boolean {
    return isStatisticsIntent(userInput);
  }

  /**
   * 提炼查询关键词
   */
  refineQuery(query: string, language: "zh" | "en" = "zh"): string {
    return refineQuery(query, language);
  }
}

// 导出单例
export const queryPlanner = new QueryPlanner();

// 导出工具函数
export { parseWithRules, refineQuery, isPureFilterQuery, isHelpIntent, isStatisticsIntent, detectQuerySubtype };
