import type { JsonSchema } from "@browser-agent-sdk/agent";
import { z } from "zod";
import type {
  TabGroupPageMetadata,
  TabGroupRule,
  TabGroupRuleColor,
  TabGroupRuleMatchResult,
} from "@/types";
import { runExtensionCommand } from "@/lib/agent/command-runner";
import { assertAgentConfigured, resolveAgentConfig } from "@/lib/agent/factory";
import { containsPrivateContent } from "@/lib/privacy/privacy-detector";
import { tabGroupRulesStorage } from "@/lib/storage/tab-group-rules-storage";

const UNSUPPORTED_URL_PROTOCOLS = ["chrome:", "edge:", "about:", "moz-extension:"];

const TAB_GROUP_COLORS = [
  "grey",
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "purple",
  "cyan",
  "orange",
] as const;

const aiTabGroupSuggestionSchema = z.object({
  groupTitle: z.string().nullable().optional(),
});

type AITabGroupSuggestion = z.infer<typeof aiTabGroupSuggestionSchema>;
type AITabGroupDecision = {
  groupTitle: string;
  color: TabGroupRuleColor;
};

const aiTabGroupSuggestionOutputSchema: JsonSchema = {
  type: "object",
  properties: {
    groupTitle: {},
  },
  additionalProperties: false,
};

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
}

function isSupportedTabUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return !UNSUPPORTED_URL_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

function normalizeAIGroupInstructions(value?: string): string {
  return value?.trim() ?? "";
}

function appendAIGroupInstructionsCacheKey(
  cacheKey: string,
  customInstructions?: string,
): string {
  const normalizedInstructions = normalizeAIGroupInstructions(customInstructions);
  return normalizedInstructions
    ? `${cacheKey}::instructions=${encodeURIComponent(normalizedInstructions)}`
    : cacheKey;
}

function getAIGroupCacheKey(url: string, customInstructions?: string): string | null {
  try {
    const domain = normalizeDomain(new URL(url).hostname);
    if (!domain) return null;
    return appendAIGroupInstructionsCacheKey(`domain:${domain}`, customInstructions);
  } catch {
    return null;
  }
}

function getLegacyAIGroupCacheKey(url: string, customInstructions?: string): string | null {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    const urlKey = parsed.toString();
    return appendAIGroupInstructionsCacheKey(urlKey, customInstructions);
  } catch {
    return null;
  }
}

function compareText(
  source: string,
  pattern: string,
  condition: NonNullable<TabGroupRule["matchCondition"]>,
  ignoreCase: boolean,
): boolean {
  const sourceValue = ignoreCase ? source.toLowerCase() : source;
  const patternValue = ignoreCase ? pattern.toLowerCase() : pattern;

  if (condition === "equals") {
    return sourceValue === patternValue;
  }

  if (condition === "startsWith") {
    return sourceValue.startsWith(patternValue);
  }

  if (condition === "endsWith") {
    return sourceValue.endsWith(patternValue);
  }

  if (condition === "regex") {
    try {
      return new RegExp(pattern, ignoreCase ? "i" : "").test(source);
    } catch {
      return false;
    }
  }

  return sourceValue.includes(patternValue);
}

function getRuleSource(rule: TabGroupRule, url: string, title?: string): string | null {
  if (rule.matchType === "title" || rule.matchType === "titleIgnoreCase") {
    return title ?? "";
  }

  if (rule.matchType === "domain") {
    try {
      return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return null;
    }
  }

  return url;
}

function matchesRule(rule: TabGroupRule, url: string, title?: string): boolean {
  const pattern = rule.pattern.trim();
  if (!pattern) return false;

  const legacyRegex = rule.matchType === "regex";
  const condition = rule.matchCondition ?? (legacyRegex ? "regex" : "contains");
  const source = getRuleSource(rule, url, title);
  if (source == null) return false;

  return compareText(
    source,
    rule.matchType === "domain" ? normalizeDomain(pattern) : pattern,
    condition,
    rule.matchType !== "title",
  );
}

function getChromeTabGroupsApi() {
  if (typeof chrome === "undefined") return null;
  if (!chrome.tabs?.group || !chrome.tabGroups?.update || !chrome.tabGroups?.query) {
    return null;
  }
  return chrome;
}

async function findExistingGroup(windowId: number, title: string) {
  const api = getChromeTabGroupsApi();
  if (!api) return null;
  const groups = await api.tabGroups.query({ windowId });
  return groups.find((group) => group.title === title) ?? null;
}

async function getExistingGroups(windowId: number) {
  const api = getChromeTabGroupsApi();
  if (!api) return [];
  return api.tabGroups.query({ windowId });
}

function appendPromptLine(lines: string[], label: string, value?: string): void {
  const normalized = value?.trim();
  if (normalized) {
    lines.push(`${label}: ${normalized}`);
  }
}

function buildPageMetadataPrompt(
  metadata: TabGroupPageMetadata | undefined,
  language: "zh" | "en",
): string[] {
  if (!metadata) return [];
  const labels = language === "zh"
    ? {
        section: "页面元数据",
        pageTitle: "页面标题",
        metaDescription: "Meta 描述",
        keywords: "关键词",
        openGraphTitle: "Open Graph 标题",
        openGraphDescription: "Open Graph 描述",
        openGraphSiteName: "Open Graph 站点名",
        openGraphType: "Open Graph 类型",
        canonicalUrl: "规范 URL",
        headings: "标题层级",
      }
    : {
        section: "Page metadata",
        pageTitle: "Page Title",
        metaDescription: "Meta Description",
        keywords: "Keywords",
        openGraphTitle: "Open Graph Title",
        openGraphDescription: "Open Graph Description",
        openGraphSiteName: "Open Graph Site Name",
        openGraphType: "Open Graph Type",
        canonicalUrl: "Canonical URL",
        headings: "Headings",
      };

  const lines: string[] = [];
  appendPromptLine(lines, labels.pageTitle, metadata.pageTitle);
  appendPromptLine(lines, labels.metaDescription, metadata.metaDescription);
  appendPromptLine(lines, labels.keywords, metadata.keywords);
  appendPromptLine(lines, labels.openGraphTitle, metadata.openGraphTitle);
  appendPromptLine(lines, labels.openGraphDescription, metadata.openGraphDescription);
  appendPromptLine(lines, labels.openGraphSiteName, metadata.openGraphSiteName);
  appendPromptLine(lines, labels.openGraphType, metadata.openGraphType);
  appendPromptLine(lines, labels.canonicalUrl, metadata.canonicalUrl);

  const headings = metadata.headings
    ?.map((heading) => heading.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" | ");
  appendPromptLine(lines, labels.headings, headings);

  return lines.length ? ["", `${labels.section}:`, ...lines] : [];
}

function buildAITabGroupPrompt(input: {
  url: string;
  title?: string;
  description?: string;
  metadata?: TabGroupPageMetadata;
  existingGroupTitles: string[];
  customInstructions?: string;
  language: "zh" | "en";
}): string {
  const existingGroupsText = input.existingGroupTitles
    .map((groupTitle) => `- ${groupTitle || (input.language === "zh" ? "（未命名）" : "(untitled)")}`)
    .join("\n") || (input.language === "zh" ? "- 无" : "- none");
  const metadataLines = buildPageMetadataPrompt(input.metadata, input.language);
  const customInstructions = normalizeAIGroupInstructions(input.customInstructions);
  const labels = input.language === "zh"
    ? {
        customInstructions: "自定义分类要求",
        existingGroups: "现有标签组",
        currentTab: "当前标签页信息",
        title: "标题",
        description: "描述",
      }
    : {
        customInstructions: "Custom grouping requirements",
        existingGroups: "Existing tab groups",
        currentTab: "Current Tab Info",
        title: "Title",
        description: "Description",
      };

  return [
    // "Analyze the browser tab and choose the best native browser tab group.",
    // "IMPORTANT: Reuse an existing group ONLY if it is a strong semantic match. If the tab's content is unrelated to all existing groups, you MUST create a concise new group title. Do not force unrelated tabs into existing groups.",
    // "If you choose an existing group, set groupTitle to exactly match that existing group title. Otherwise use a new title that is different from every existing group title.",
    // "Return JSON only that matches the schema.",
    // "",
    ...(customInstructions
      ? [`${labels.customInstructions}:`, customInstructions, ""]
      : []),
    `${labels.existingGroups}:`,
    existingGroupsText,
    "",
    `${labels.currentTab}:`,
    `URL: ${input.url}`,
    `${labels.title}: ${input.title || ""}`,
    `${labels.description}: ${input.description || ""}`,
    ...metadataLines,
  ].join("\n");
}

function normalizeGroupTitle(title: string): string {
  const normalized = title
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*\((grey|blue|red|yellow|green|pink|purple|cyan|orange)\)\s*$/i, "");

  if (/[\u3400-\u9FFF\uF900-\uFAFF]/.test(normalized)) {
    return [...normalized].slice(0, 5).join("");
  }

  return normalized.split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
}

function getRandomColor(): TabGroupRuleColor {
  return TAB_GROUP_COLORS[Math.floor(Math.random() * TAB_GROUP_COLORS.length)];
}

function normalizeAITabGroupSuggestion(
  suggestion: AITabGroupSuggestion,
): AITabGroupDecision {
  const rawTitle = suggestion.groupTitle ?? "";
  const groupTitle = normalizeGroupTitle(rawTitle);
  if (!groupTitle) {
    throw new Error("AI did not return a group title");
  }

  return {
    groupTitle,
    color: getRandomColor(),
  };
}

async function suggestAITabGroup(input: {
  url: string;
  title?: string;
  description?: string;
  metadata?: TabGroupPageMetadata;
  existingGroupTitles: string[];
  customInstructions?: string;
}): Promise<AITabGroupDecision> {
  const config = await resolveAgentConfig();
  assertAgentConfigured(config.rawConfig);

  const result = await runExtensionCommand<Record<string, never>, AITabGroupSuggestion>({
    config,
    temperature: 0.1,
    maxIterations: 1,
    systemPrompt:
      config.language === "zh"
        ? "你是浏览器 Tab 自动分组助手。请根据 URL、标题和描述，为该网页选择或创建一个最合适的分组名称。\n重要：如果现有分组中有语义高度匹配的，请直接使用完全相同的分组名称；如果现有分组都与该网页内容不相关，请务必创建一个不同于现有分组的简短新分组名称。绝不要把不相关的网页强行分入现有分组。\n如果提供了自定义分类要求，请优先按这些要求判断分组归属，但仍需遵守输出格式和长度限制。\n长度要求：groupTitle 中文不超过 5 个字，英文不超过 2 个单词。"
        : "You are a browser tab grouping assistant. Based on the URL, title, and description, choose or create the most suitable group title.\nIMPORTANT: If an existing group is a strong semantic match, use the exact same group title. If existing groups are unrelated to the tab's content, you MUST create a concise new group title that differs from existing group titles. Do NOT force unrelated tabs into existing groups.\nIf custom grouping requirements are provided, prioritize them when deciding the grouping logic while still following the output format and length limits.\nLength requirement: groupTitle must be no more than 5 Chinese characters or 2 English words.",
    command: {
      name: "suggestTabGroup",
      description: "Suggest a native browser tab group title.",
      outputSchema: aiTabGroupSuggestionOutputSchema,
      prompt: buildAITabGroupPrompt({
        url: input.url,
        title: input.title,
        description: input.description,
        metadata: input.metadata,
        existingGroupTitles: input.existingGroupTitles,
        customInstructions: input.customInstructions,
        language: config.language === "zh" ? "zh" : "en",
      }),
    },
    input: {},
  });

  return normalizeAITabGroupSuggestion(aiTabGroupSuggestionSchema.parse(result.output));
}

class TabGroupRuleService {
  isTabGroupsSupported(): boolean {
    return getChromeTabGroupsApi() != null;
  }

  findMatchingRule(
    rules: TabGroupRule[],
    url: string,
    title?: string,
  ): TabGroupRuleMatchResult | null {
    if (!isSupportedTabUrl(url)) return null;
    const rule = rules
      .filter((item) => item.enabled)
      .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
      .find((item) => matchesRule(item, url, title));
    return rule ? { rule, normalizedUrl: url } : null;
  }

  async autoGroupTab(
    tabId: number,
    url?: string,
    windowId?: number,
    title?: string,
    options?: {
      allowAI?: boolean;
      description?: string;
      metadata?: TabGroupPageMetadata;
      isDomainChanged?: boolean;
      isNewTab?: boolean;
    },
  ): Promise<boolean> {
    const api = getChromeTabGroupsApi();
    if (!api || !url || windowId == null) return false;

    try {
      const currentTab = await api.tabs.get(tabId);
      const isGrouped = currentTab.groupId != null && currentTab.groupId !== api.tabGroups.TAB_GROUP_ID_NONE;
      if (isGrouped && !options?.isDomainChanged && !options?.isNewTab) {
        return false;
      }
    } catch {
      // ignore
    }

    const rules = await tabGroupRulesStorage.getRules();
    const result = this.findMatchingRule(rules, url, title);
    if (!result) {
      const settings = await tabGroupRulesStorage.getAutoGroupSettings();
      if (!options?.allowAI || !settings.aiAutoGroupEnabled || !isSupportedTabUrl(url)) {
        return false;
      }
      const privacyCheck = await containsPrivateContent(url);
      if (privacyCheck.isPrivate) {
        return false;
      }

      const existingGroups = await getExistingGroups(windowId);
      const customInstructions = settings.aiAutoGroupInstructions;
      const cacheKey = getAIGroupCacheKey(url, customInstructions);
      const legacyCacheKey = getLegacyAIGroupCacheKey(url, customInstructions);
      const cachedSuggestion = cacheKey
        ? await tabGroupRulesStorage.getAIGroupCache(cacheKey)
        : null;
      const legacyCachedSuggestion =
        !cachedSuggestion && legacyCacheKey && legacyCacheKey !== cacheKey
          ? await tabGroupRulesStorage.getAIGroupCache(legacyCacheKey)
          : null;
      const suggestion =
        cachedSuggestion ??
        legacyCachedSuggestion ??
        await suggestAITabGroup({
          url,
          title,
          description: options.description,
          metadata: options.metadata,
          existingGroupTitles: existingGroups.map((group) => group.title || ""),
          customInstructions,
        });
      const aiExistingGroup =
        existingGroups.find((group) => group.title === suggestion.groupTitle) ??
        (await findExistingGroup(windowId, suggestion.groupTitle));
      const aiGroupId = aiExistingGroup
        ? await api.tabs.group({ tabIds: tabId, groupId: aiExistingGroup.id })
        : await api.tabs.group({ tabIds: tabId });

      await api.tabGroups.update(aiGroupId, {
        title: suggestion.groupTitle,
        color: aiExistingGroup?.color ?? suggestion.color,
        collapsed: false,
      });
      if (!cachedSuggestion && cacheKey) {
        await tabGroupRulesStorage.setAIGroupCache(cacheKey, {
          url,
          groupTitle: suggestion.groupTitle,
          color: suggestion.color,
        });
      }

      return true;
    }

    const existingGroup = await findExistingGroup(windowId, result.rule.groupTitle);
    const groupId = existingGroup
      ? await api.tabs.group({ tabIds: tabId, groupId: existingGroup.id })
      : await api.tabs.group({ tabIds: tabId });

    await api.tabGroups.update(groupId, {
      title: result.rule.groupTitle,
      color: result.rule.color,
      collapsed: result.rule.collapsed,
    });

    return true;
  }
}

export const tabGroupRuleService = new TabGroupRuleService();
