import type {
  SearchPlannerContext,
  SearchPlannerLanguage,
} from "../search/types";

export function getSearchQueryPlannerSystemPrompt(
  language: SearchPlannerLanguage,
): string {
  if (language === "en") {
    return `You are a search query parser for a bookmark management plugin. Your task is to convert natural language queries into structured search requests.

## Multi-turn Conversation Handling (IMPORTANT)

You should refer to the current conversation state to parse the user's latest intent:

1. Continue/Filter: if the user says "only show recent ones", "add XX tag", "only education related", treat it as adding filters to the previous query.
2. Correction/Switch Topic: if the user says "search Vue instead", generate a new refinedQuery and reset irrelevant filters.
3. Follow-up/Clarification: if the user says "also include basic tutorials", merge new keywords into the previous ones.

## Intent Recognition

Identify the user's intent:
1. query
2. statistics
3. help

If unclear, default to query + semantic subtype.

## Query Refinement

Extract ONLY the core semantic keywords for search. Remove filler words and filter conditions.
If the query is a pure filter query with no semantic keywords, refinedQuery must be an empty string "".

## Filter Extraction Rules

Only set filters when user explicitly mentions them:
- categoryId
- tagsAny
- domain
- timeRangeDays
- semantic

## Query Subtype

- time
- category
- tag
- semantic
- compound

Output JSON only.`;
  }

  return `你是书签管理插件的查询解析器。将自然语言查询转换为结构化搜索请求。

## 多轮对话处理

你需要参考当前对话状态来解析用户的最新意图：

1. 延续/筛选：如果用户说“只看最近的”“再加上 XX 标签”“只要教育类的”，通常是在上一次查询的基础上增加过滤条件。
2. 修正/切换主题：如果用户说“换成搜 Vue”“不找 React 了，搜 Vue”，应该生成新的 refinedQuery 并重置不相关过滤条件。
3. 追问/进一步描述：如果用户说“还要包含基础教程的”，应该把新关键词合并到之前的查询中。

## 意图识别

识别用户意图：
1. query
2. statistics
3. help

如果意图不明确，默认为 query + semantic 子类型。

## 查询关键词提炼

从用户输入中提取核心语义关键词，移除填充词和过滤条件。
如果是纯过滤查询且没有语义关键词，refinedQuery 必须返回空字符串 ""。

## 过滤条件提取规则

仅在用户明确提及下列条件时才设置：
- categoryId
- tagsAny
- domain
- timeRangeDays
- semantic

## 查询子类型

- time
- category
- tag
- semantic
- compound

只输出 JSON。`;
}

export function buildSearchQueryPlannerPrompt(
  userInput: string,
  context: SearchPlannerContext,
): string {
  const parts = [`用户输入: "${userInput}"`];

  if (context.categories?.length) {
    parts.push(
      `可用分类（仅当用户输入中明确包含这些分类名称时才设置 categoryId，否则必须返回 null）: ${context.categories
        .map((category) => `${category.id}: ${category.name}`)
        .join(", ")}`,
    );
  }

  if (context.existingTags?.length) {
    parts.push(
      `已有标签（仅当用户输入中明确包含这些标签名称时才设置 tagsAny，否则必须返回空数组）: ${context.existingTags
        .slice(0, 20)
        .join(", ")}`,
    );
  }

  if (context.conversationState) {
    parts.push("当前对话历史:");
    context.conversationState.shortMemory.forEach((message) => {
      parts.push(`- ${message.role === "user" ? "用户" : "助手"}: ${message.text}`);
    });
    parts.push("当前结构化状态:");
    parts.push(
      `- 已有查询词: ${
        context.conversationState.refinedQuery ||
        context.conversationState.query
      }`,
    );
    parts.push(
      `- 已有过滤条件: ${JSON.stringify(context.conversationState.filters)}`,
    );
    parts.push(
      `- 已展示结果数: ${context.conversationState.seenBookmarkIds.length}`,
    );
  }

  return parts.join("\n");
}
