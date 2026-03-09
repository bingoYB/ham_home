import type {
  SearchConversationIntent,
  SearchPlannerConversationState,
  SearchPlannerFilters,
  SearchPlannerLanguage,
  SearchPlannerRequest,
  SearchQuerySubtype,
} from "./types";

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

const HELP_KEYWORDS_ZH = [
  "快捷键",
  "设置",
  "怎么用",
  "如何使用",
  "怎么设置",
  "功能",
  "帮助",
  "插件",
  "扩展",
  "怎么操作",
  "使用方法",
  "使用教程",
];

const HELP_KEYWORDS_EN = [
  "shortcut",
  "setting",
  "how to use",
  "how do i",
  "feature",
  "help",
  "plugin",
  "extension",
  "tutorial",
  "guide",
];

const STATS_KEYWORDS_ZH = ["多少", "几个", "统计", "数量", "总共", "一共"];

const STATS_KEYWORDS_EN = [
  "how many",
  "count",
  "statistics",
  "total",
  "number of",
];

export function isPureSearchFilterQuery(
  query: string,
  language: SearchPlannerLanguage,
): boolean {
  const patterns =
    language === "zh" ? PURE_FILTER_PATTERNS_ZH : PURE_FILTER_PATTERNS_EN;
  return patterns.some((pattern) => pattern.test(query.trim()));
}

export function refineSearchQuery(
  query: string,
  language: SearchPlannerLanguage,
): string {
  if (isPureSearchFilterQuery(query, language)) {
    return "";
  }

  let refined = query.trim();
  const patterns = language === "zh" ? FILLER_PATTERNS_ZH : FILLER_PATTERNS_EN;

  for (const pattern of patterns) {
    refined = refined.replace(pattern, "").trim();
  }

  return refined
    .replace(/昨天|今天|最近|近期|这周|上周|这个月|上个月|本月|今年/g, "")
    .replace(
      /yesterday|today|recent|this week|last week|this month|last month|this year/gi,
      "",
    )
    .replace(/添加的?|收藏的?|保存的?/g, "")
    .replace(/added|saved|bookmarked/gi, "")
    .trim();
}

export function isSearchHelpIntent(input: string): boolean {
  const lowerInput = input.toLowerCase();
  return (
    HELP_KEYWORDS_ZH.some((keyword) => input.includes(keyword)) ||
    HELP_KEYWORDS_EN.some((keyword) => lowerInput.includes(keyword))
  );
}

export function isSearchStatisticsIntent(input: string): boolean {
  const lowerInput = input.toLowerCase();
  return (
    STATS_KEYWORDS_ZH.some((keyword) => input.includes(keyword)) ||
    STATS_KEYWORDS_EN.some((keyword) => lowerInput.includes(keyword))
  );
}

export function detectSearchQuerySubtype(
  input: string,
  filters: SearchPlannerFilters,
): SearchQuerySubtype {
  const hasTime = Boolean(filters.timeRangeDays);
  const hasCategory = Boolean(filters.categoryId);
  const hasTags = Boolean(filters.tagsAny?.length);
  const conditionCount = [hasTime, hasCategory, hasTags].filter(Boolean).length;

  if (conditionCount >= 2) {
    return "compound";
  }
  if (hasTime) {
    return "time";
  }
  if (hasCategory) {
    return "category";
  }
  if (hasTags) {
    return "tag";
  }

  return "semantic";
}

export function parseSearchQueryWithRules(
  userInput: string,
  language: SearchPlannerLanguage = "zh",
): SearchPlannerRequest {
  const input = userInput.toLowerCase();
  let intent: SearchConversationIntent = "query";

  if (isSearchHelpIntent(userInput)) {
    return {
      intent: "help",
      query: userInput,
      refinedQuery: userInput,
      filters: {},
      topK: 5,
    };
  }

  if (isSearchStatisticsIntent(userInput)) {
    intent = "statistics";
  }

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

  let semantic: boolean | undefined;
  if (
    input.includes("只看关键词") ||
    input.includes("不用语义") ||
    input.includes("精确匹配") ||
    input.includes("keyword only") ||
    input.includes("exact match")
  ) {
    semantic = false;
  }

  let query = userInput
    .replace(/昨天|最近|近期|这周|这个月|本月|今年|这一年/g, "")
    .replace(/yesterday|recent|this week|this month|this year/gi, "")
    .replace(/多少|几个|统计|数量|总共|一共/g, "")
    .replace(/how many|count|statistics|total|number of/gi, "")
    .trim();

  if (!query) {
    query = userInput;
  }

  const filters: SearchPlannerFilters = {
    timeRangeDays,
    semantic,
  };
  const refinedQuery = refineSearchQuery(query, language);

  return {
    intent,
    querySubtype:
      intent === "query"
        ? detectSearchQuerySubtype(userInput, filters)
        : undefined,
    query,
    refinedQuery,
    filters,
    topK: intent === "statistics" ? 50 : 20,
  };
}

export function mergeSearchRequestWithState(
  request: SearchPlannerRequest,
  state: SearchPlannerConversationState,
): SearchPlannerRequest {
  const mergedFilters: SearchPlannerFilters = {
    ...state.filters,
    ...request.filters,
  };

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

  return {
    ...request,
    querySubtype:
      request.intent === "query"
        ? detectSearchQuerySubtype(request.query, mergedFilters)
        : undefined,
    refinedQuery: request.refinedQuery || state.refinedQuery || "",
    filters: mergedFilters,
  };
}
