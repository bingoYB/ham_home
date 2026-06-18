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
  reuseExistingGroup: z.boolean().nullable().optional(),
  groupTitle: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  group: z.string().nullable().optional(),
  answer: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});

type AITabGroupSuggestion = z.infer<typeof aiTabGroupSuggestionSchema>;
type AITabGroupDecision = {
  groupTitle: string;
  color: TabGroupRuleColor;
  reuseExistingGroup: boolean;
};

const aiTabGroupSuggestionOutputSchema: JsonSchema = {
  type: "object",
  properties: {
    reuseExistingGroup: { type: "boolean" },
    groupTitle: {},
    title: {},
    group: {},
    answer: {},
    color: {},
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

function getAIGroupCacheKey(url: string): string | null {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
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

function buildPageMetadataPrompt(metadata?: TabGroupPageMetadata): string[] {
  if (!metadata) return [];

  const lines: string[] = [];
  appendPromptLine(lines, "Page Title", metadata.pageTitle);
  appendPromptLine(lines, "Meta Description", metadata.metaDescription);
  appendPromptLine(lines, "Keywords", metadata.keywords);
  appendPromptLine(lines, "Open Graph Title", metadata.openGraphTitle);
  appendPromptLine(lines, "Open Graph Description", metadata.openGraphDescription);
  appendPromptLine(lines, "Open Graph Site Name", metadata.openGraphSiteName);
  appendPromptLine(lines, "Open Graph Type", metadata.openGraphType);
  appendPromptLine(lines, "Twitter Title", metadata.twitterTitle);
  appendPromptLine(lines, "Twitter Description", metadata.twitterDescription);
  appendPromptLine(lines, "Canonical URL", metadata.canonicalUrl);
  appendPromptLine(lines, "Language", metadata.language);

  const headings = metadata.headings
    ?.map((heading) => heading.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" | ");
  appendPromptLine(lines, "Headings", headings);

  return lines.length ? ["", "Page metadata:", ...lines] : [];
}

function buildAITabGroupPrompt(input: {
  url: string;
  title?: string;
  description?: string;
  metadata?: TabGroupPageMetadata;
  existingGroups: Awaited<ReturnType<typeof getExistingGroups>>;
}): string {
  const existingGroupsText = input.existingGroups
    .map((group) => `- ${group.title || "(untitled)"}${group.color ? ` (${group.color})` : ""}`)
    .join("\n") || "- none";
  const metadataLines = buildPageMetadataPrompt(input.metadata);

  return [
    "Analyze the browser tab and choose the best native browser tab group.",
    "IMPORTANT: Reuse an existing group ONLY if it is a strong semantic match. If the tab's content is unrelated to all existing groups, you MUST create a concise new group title. Do not force unrelated tabs into existing groups.",
    "Set reuseExistingGroup to true only when groupTitle exactly names a strongly related existing group. Otherwise set reuseExistingGroup to false and use a new title that is different from every existing group title.",
    "Return JSON only that matches the schema.",
    "",
    "Existing tab groups:",
    existingGroupsText,
    "",
    "Tab:",
    `URL: ${input.url}`,
    `Title: ${input.title || ""}`,
    `Description: ${input.description || ""}`,
    ...metadataLines,
  ].join("\n");
}

function normalizeGroupTitle(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*\((grey|blue|red|yellow|green|pink|purple|cyan|orange)\)\s*$/i, "")
    .slice(0, 40);
}

function parseTabGroupColor(value?: string): TabGroupRuleColor | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return TAB_GROUP_COLORS.find((color) => color === normalized) ?? null;
}

function extractColorFromText(value?: string): TabGroupRuleColor | null {
  if (!value) return null;
  const match = value.match(/\((grey|blue|red|yellow|green|pink|purple|cyan|orange)\)\s*$/i);
  return parseTabGroupColor(match?.[1]);
}

function getRandomColor(): TabGroupRuleColor {
  return TAB_GROUP_COLORS[Math.floor(Math.random() * TAB_GROUP_COLORS.length)];
}

function normalizeAITabGroupSuggestion(
  suggestion: AITabGroupSuggestion,
): AITabGroupDecision {
  const rawTitle =
    suggestion.groupTitle ??
    suggestion.title ??
    suggestion.group ??
    suggestion.answer ??
    "";
  const groupTitle = normalizeGroupTitle(rawTitle);
  if (!groupTitle) {
    throw new Error("AI did not return a group title");
  }

  const aiColor = parseTabGroupColor(suggestion.color || undefined);
  const textColor = extractColorFromText(rawTitle);

  return {
    groupTitle,
    color: aiColor ?? textColor ?? getRandomColor(),
    reuseExistingGroup: suggestion.reuseExistingGroup === true,
  };
}

async function suggestAITabGroup(input: {
  url: string;
  title?: string;
  description?: string;
  metadata?: TabGroupPageMetadata;
  existingGroups: Awaited<ReturnType<typeof getExistingGroups>>;
}): Promise<AITabGroupDecision> {
  const config = await resolveAgentConfig();
  assertAgentConfigured(config.rawConfig);

  const result = await runExtensionCommand<Record<string, never>, AITabGroupSuggestion>({
    config,
    temperature: 0.1,
    maxIterations: 1,
    systemPrompt:
      config.language === "zh"
        ? "你是浏览器 Tab 自动分组助手。请根据 URL、标题和描述，为该网页选择或创建一个最合适的分组名称。\n重要：如果现有分组中有语义高度匹配的，请直接使用该分组名称，并把 reuseExistingGroup 设为 true；如果现有分组都与该网页内容不相关，请务必创建一个不同于现有分组的简短新分组名称，并把 reuseExistingGroup 设为 false。绝不要把不相关的网页强行分入现有分组。"
        : "You are a browser tab grouping assistant. Based on the URL, title, and description, choose or create the most suitable group title.\nIMPORTANT: If an existing group is a strong semantic match, reuse it and set reuseExistingGroup to true. If existing groups are unrelated to the tab's content, you MUST create a concise new group title that differs from existing group titles and set reuseExistingGroup to false. Do NOT force unrelated tabs into existing groups.",
    command: {
      name: "suggestTabGroup",
      description: "Suggest a native browser tab group title and color.",
      outputSchema: aiTabGroupSuggestionOutputSchema,
      prompt: buildAITabGroupPrompt({
        url: input.url,
        title: input.title,
        description: input.description,
        metadata: input.metadata,
        existingGroups: input.existingGroups,
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
      const cacheKey = getAIGroupCacheKey(url);
      const cachedSuggestion = cacheKey
        ? await tabGroupRulesStorage.getAIGroupCache(cacheKey)
        : null;
      const suggestion = cachedSuggestion ?? await suggestAITabGroup({
        url,
        title,
        description: options.description,
        metadata: options.metadata,
        existingGroups,
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
          url: cacheKey,
          groupTitle: suggestion.groupTitle,
          color: suggestion.color,
          reuseExistingGroup: Boolean(aiExistingGroup),
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
