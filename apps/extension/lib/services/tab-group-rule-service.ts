import type { JsonSchema } from "@browser-agent-sdk/agent";
import { z } from "zod";
import type { TabGroupRule, TabGroupRuleColor, TabGroupRuleMatchResult } from "@/types";
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
  title: z.string().nullable().optional(),
  group: z.string().nullable().optional(),
  answer: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});

type AITabGroupSuggestion = z.infer<typeof aiTabGroupSuggestionSchema>;

const aiTabGroupSuggestionOutputSchema: JsonSchema = {
  type: "object",
  properties: {
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

function buildAITabGroupPrompt(input: {
  url: string;
  title?: string;
  description?: string;
  existingGroups: Awaited<ReturnType<typeof getExistingGroups>>;
}): string {
  const existingGroupsText = input.existingGroups
    .map((group) => `- ${group.title || "(untitled)"}${group.color ? ` (${group.color})` : ""}`)
    .join("\n") || "- none";

  return [
    "Analyze the browser tab and choose the best native browser tab group.",
    "Prefer an existing group when it is a reasonable semantic fit. Create a short new group title only when none fits.",
    "Return JSON only that matches the schema.",
    "",
    "Existing tab groups:",
    existingGroupsText,
    "",
    "Tab:",
    `URL: ${input.url}`,
    `Title: ${input.title || ""}`,
    `Description: ${input.description || ""}`,
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
): { groupTitle: string; color: TabGroupRuleColor } {
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
  };
}

async function suggestAITabGroup(input: {
  url: string;
  title?: string;
  description?: string;
  existingGroups: Awaited<ReturnType<typeof getExistingGroups>>;
}): Promise<{ groupTitle: string; color: TabGroupRuleColor }> {
  const config = await resolveAgentConfig();
  assertAgentConfigured(config.rawConfig);

  const result = await runExtensionCommand<Record<string, never>, AITabGroupSuggestion>({
    config,
    temperature: 0.1,
    maxIterations: 1,
    systemPrompt:
      config.language === "zh"
        ? "你是浏览器 Tab 自动分组助手。你会根据 URL、标题、描述和现有分组，选择最合适的分组名称。优先复用已有分组，只有没有合适分组时才创建简短的新分组。"
        : "You are a browser tab grouping assistant. Choose the most suitable group title from URL, title, description, and existing groups. Prefer existing groups; create a concise new group only when needed.",
    command: {
      name: "suggestTabGroup",
      description: "Suggest a native browser tab group title and color.",
      outputSchema: aiTabGroupSuggestionOutputSchema,
      prompt: buildAITabGroupPrompt({
        url: input.url,
        title: input.title,
        description: input.description,
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
    options?: { allowAI?: boolean; description?: string },
  ): Promise<boolean> {
    const api = getChromeTabGroupsApi();
    if (!api || !url || windowId == null) return false;

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
