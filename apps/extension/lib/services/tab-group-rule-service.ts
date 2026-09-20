import type { JsonSchema } from "@hamhome/agent";
import { z } from "zod";
import type {
  TabGroupAICacheEntry,
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

const COMMON_SECOND_LEVEL_DOMAIN_LABELS = new Set(["ac", "co", "com", "edu", "gov", "net", "org"]);

const aiTabGroupSuggestionSchema = z.object({
  groupTitle: z.string(),
});

type AITabGroupSuggestion = z.infer<typeof aiTabGroupSuggestionSchema>;
type AITabGroupDecision = {
  groupTitle: string;
  color: TabGroupRuleColor;
};

const aiTabGroupSuggestionOutputSchema: JsonSchema = {
  type: "object",
  properties: {
    groupTitle: { type: "string" },
  },
  required: ["groupTitle"],
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

/**
 * 提取路径的第一段作为「栏目特征」，用于判断两个页面是否来自站内同一区域。
 * 例如 /issues/123 与 /issues/456 视为同一栏目，/issues/1 与 /sponsors/x 视为不同栏目。
 */
function getPathSignature(url: string): string {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    return segments[0]?.toLowerCase() ?? "";
  } catch {
    return "";
  }
}

/**
 * 判断一条域名级缓存能否直接用于当前页面。
 *
 * pending 表示该结论只有单个页面样本支撑，此时仅在同栏目页面上复用；
 * 跨栏目页面必须重新征询 AI，由 reconcile 决定升级为 confirmed 还是判定为多用途域名。
 */
function canUseCachedSuggestion(
  entry: TabGroupAICacheEntry,
  url: string,
): boolean {
  if (entry.status === "multiPurpose") return false;
  if (entry.status !== "pending") return true;
  return getPathSignature(url) === (entry.samplePath ?? "");
}

/**
 * 合并新的 AI 结论与已有缓存，产出下一份缓存状态。
 *
 * - 无历史：写入 pending，等待第二个样本佐证
 * - 结论一致且换了栏目：升级为 confirmed
 * - 结论冲突：标记 multiPurpose，此后该域名不再走域名级缓存
 */
function reconcileAIGroupCache(
  previous: TabGroupAICacheEntry | null,
  next: { url: string; groupTitle: string; color: TabGroupRuleColor },
): Omit<TabGroupAICacheEntry, "updatedAt"> {
  const samplePath = getPathSignature(next.url);

  if (!previous) {
    return {
      url: next.url,
      groupTitle: next.groupTitle,
      color: next.color,
      status: "pending",
      samplePath,
      agreeCount: 1,
    };
  }

  if (previous.status === "multiPurpose") {
    return {
      url: previous.url,
      groupTitle: previous.groupTitle,
      color: previous.color,
      status: "multiPurpose",
      samplePath: previous.samplePath,
      agreeCount: previous.agreeCount ?? 1,
    };
  }

  if (previous.groupTitle !== next.groupTitle) {
    // 同一域名给出互相矛盾的结论，说明它承载多种用途，停用域名级缓存
    return {
      url: previous.url,
      groupTitle: previous.groupTitle,
      color: previous.color,
      status: "multiPurpose",
      samplePath: previous.samplePath,
      agreeCount: previous.agreeCount ?? 1,
    };
  }

  const isNewSection = samplePath !== (previous.samplePath ?? "");
  const agreeCount = (previous.agreeCount ?? 1) + (isNewSection ? 1 : 0);

  return {
    url: previous.url,
    groupTitle: previous.groupTitle,
    color: previous.color,
    // 跨栏目仍得出同一结论，才认为该域名用途稳定
    status: agreeCount >= 2 ? "confirmed" : "pending",
    samplePath: previous.samplePath,
    agreeCount,
  };
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

/** 单个已存在分组的成员摘要，用于让 AI 理解每个分组的实际语义而非仅看组名 */
interface ExistingGroupContext {
  title: string;
  /** 该分组内的代表性标签页标题 */
  sampleTitles: string[];
  /** 该分组内出现的域名 */
  domains: string[];
  memberCount: number;
}

interface WindowGroupingContext {
  groups: ExistingGroupContext[];
  /** 当前窗口内尚未分组的标签页标题，用于提示 AI 潜在的同伴 tab */
  ungroupedTitles: string[];
}

const MAX_GROUP_SAMPLE_TITLES = 4;
const MAX_GROUP_SAMPLE_DOMAINS = 4;
const MAX_UNGROUPED_SAMPLES = 12;

function safeHostname(url?: string): string {
  if (!url) return "";
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return "";
  }
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

/**
 * 采集当前窗口的分组全景：每个已有分组的成员标题/域名，以及未分组标签页。
 *
 * 这是修复「断章取义」的核心输入 —— 只给 AI 一串组名时，它无法判断
 * 「开发」这个组里到底装的是 GitHub 还是设计稿；给出成员摘要后，
 * 复用已有分组的判断才有依据。
 */
async function collectWindowGroupingContext(
  windowId: number,
  currentTabId: number,
  existingGroups: Array<{ id: number; title?: string }>,
): Promise<WindowGroupingContext> {
  const api = getChromeTabGroupsApi();
  if (!api?.tabs?.query) {
    return {
      groups: existingGroups.map((group) => ({
        title: group.title || "",
        sampleTitles: [],
        domains: [],
        memberCount: 0,
      })),
      ungroupedTitles: [],
    };
  }

  let tabs: Array<{
    id?: number;
    title?: string;
    url?: string;
    groupId?: number;
    pinned?: boolean;
  }> = [];

  try {
    tabs = await api.tabs.query({ windowId });
  } catch {
    tabs = [];
  }

  const noneGroupId = api.tabGroups.TAB_GROUP_ID_NONE;
  const groups = existingGroups.map((group) => {
    const members = tabs.filter((tab) => tab.groupId === group.id);
    return {
      title: group.title || "",
      sampleTitles: dedupe(
        members.map((tab) => tab.title?.trim() || "").map((title) => title.slice(0, 60)),
      ).slice(0, MAX_GROUP_SAMPLE_TITLES),
      domains: dedupe(members.map((tab) => safeHostname(tab.url))).slice(
        0,
        MAX_GROUP_SAMPLE_DOMAINS,
      ),
      memberCount: members.length,
    };
  });

  const ungroupedTitles = dedupe(
    tabs
      .filter(
        (tab) =>
          tab.id !== currentTabId &&
          !tab.pinned &&
          (tab.groupId == null || tab.groupId === noneGroupId) &&
          isSupportedTabUrl(tab.url ?? ""),
      )
      .map((tab) => {
        const host = safeHostname(tab.url);
        const title = tab.title?.trim().slice(0, 60) || "";
        if (!title) return host;
        return host ? `${title} (${host})` : title;
      }),
  ).slice(0, MAX_UNGROUPED_SAMPLES);

  return { groups, ungroupedTitles };
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

function buildExistingGroupsSection(
  groups: ExistingGroupContext[],
  language: "zh" | "en",
): string {
  if (!groups.length) return language === "zh" ? "- 无" : "- none";

  const labels = language === "zh"
    ? { untitled: "（未命名）", members: "包含", domains: "域名", count: "个标签页" }
    : { untitled: "(untitled)", members: "contains", domains: "domains", count: "tabs" };

  return groups
    .map((group) => {
      const head = `- ${group.title || labels.untitled}`;
      const details: string[] = [];
      if (group.memberCount > 0) {
        details.push(`${group.memberCount} ${labels.count}`);
      }
      if (group.domains.length) {
        details.push(`${labels.domains}: ${group.domains.join(", ")}`);
      }
      if (group.sampleTitles.length) {
        details.push(`${labels.members}: ${group.sampleTitles.join(" / ")}`);
      }
      return details.length ? `${head} — ${details.join("；")}` : head;
    })
    .join("\n");
}

function buildAITabGroupPrompt(input: {
  url: string;
  title?: string;
  description?: string;
  metadata?: TabGroupPageMetadata;
  windowContext: WindowGroupingContext;
  customInstructions?: string;
  language: "zh" | "en";
}): string {
  const metadataLines = buildPageMetadataPrompt(input.metadata, input.language);
  const customInstructions = normalizeAIGroupInstructions(input.customInstructions);
  const isZh = input.language === "zh";
  const labels = isZh
    ? {
        customInstructions: "自定义分类要求",
        existingGroups: "现有标签组（含成员摘要）",
        ungrouped: "当前窗口中尚未分组的标签页",
        currentTab: "当前标签页信息",
        title: "标题",
        description: "描述",
      }
    : {
        customInstructions: "Custom grouping requirements",
        existingGroups: "Existing tab groups (with member summary)",
        ungrouped: "Ungrouped tabs in the current window",
        currentTab: "Current Tab Info",
        title: "Title",
        description: "Description",
      };

  const taskLines = isZh
    ? [
        "任务：为下面这个标签页选择一个已有分组，或创建一个新分组。",
        "判断顺序：",
        "1. 先看「现有标签组」的成员摘要，理解每个分组实际收纳的是哪类内容，而不是只看分组名字面意思。",
        "2. 如果当前标签页与某个分组的成员在用途上高度一致，就复用该分组，groupTitle 必须与其分组名完全一致。",
        "3. 如果都不匹配，参考「尚未分组的标签页」，取一个能同时覆盖这批同类标签页的分组名，而不是只描述当前这一个页面。",
        "4. 分组名要概括网站的整体用途，不要照抄当前页面的具体标题或某一篇文章的主题。",
        "只输出符合 schema 的 JSON。",
        "",
      ]
    : [
        "Task: choose an existing group for the tab below, or create a new one.",
        "Decision order:",
        "1. Read the member summary of each existing group to understand what it actually collects, not just what its name literally says.",
        "2. If the current tab serves the same purpose as a group's members, reuse it and set groupTitle to exactly that group title.",
        "3. If nothing matches, look at the ungrouped tabs and pick a title that would also cover those similar tabs, not just this single page.",
        "4. The title must describe the site's overall purpose, not the specific headline or article topic of the current page.",
        "Return JSON only that matches the schema.",
        "",
      ];

  const ungroupedSection = input.windowContext.ungroupedTitles.length
    ? [
        `${labels.ungrouped}:`,
        ...input.windowContext.ungroupedTitles.map((item) => `- ${item}`),
        "",
      ]
    : [];

  return [
    ...taskLines,
    ...(customInstructions
      ? [`${labels.customInstructions}:`, customInstructions, ""]
      : []),
    `${labels.existingGroups}:`,
    buildExistingGroupsSection(input.windowContext.groups, input.language),
    "",
    ...ungroupedSection,
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

function getDomainGroupTitle(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/\.$/, "");
    const labels = hostname.split(".").filter(Boolean);
    while (labels[0] === "www") {
      labels.shift();
    }
    if (labels.length === 0) return null;
    if (labels.length === 1 || labels.every((label) => /^\d+$/.test(label))) {
      return labels.join(".");
    }

    const tld = labels[labels.length - 1];
    const secondLevel = labels[labels.length - 2];
    const rootIndex =
      labels.length >= 3 &&
      tld.length === 2 &&
      COMMON_SECOND_LEVEL_DOMAIN_LABELS.has(secondLevel)
        ? labels.length - 3
        : labels.length - 2;

    return labels[rootIndex] ?? labels[0] ?? null;
  } catch {
    return null;
  }
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

const AI_SYSTEM_PROMPT_ZH = [
  "你是浏览器 Tab 自动分组助手。你的目标是让同一窗口内用途相近的标签页落到同一个分组里。",
  "核心原则：分组名描述的是「这个网站/这类页面是干什么用的」，而不是「当前这个页面在讲什么」。",
  "例如一篇技术博客文章，应归入「阅读」或「技术」这类用途分组，而不是用文章标题里的具体主题命名。",
  "复用判断：现有标签组会附带成员摘要（成员标题和域名）。请依据成员摘要理解分组的真实语义；",
  "若当前页面与某个分组的成员用途一致，直接使用完全相同的分组名称。",
  "新建判断：若与所有现有分组都不相关，必须新建一个不同于现有分组的简短名称，绝不要把不相关页面硬塞进已有分组。",
  "泛化要求：新建分组名应能覆盖同一网站的其他页面，避免只贴合当前这一个页面而导致后续同站页面无法复用。",
  "如果提供了自定义分类要求，请优先按这些要求判断分组归属，但仍需遵守输出格式和长度限制。",
  "长度要求：groupTitle 中文不超过 5 个字，英文不超过 2 个单词。",
].join("\n");

const AI_SYSTEM_PROMPT_EN = [
  "You are a browser tab grouping assistant. Your goal is to make tabs with similar purposes land in the same group within a window.",
  "Core principle: the group title describes what the site or page type is FOR, not what the current page is ABOUT.",
  "For example, a technical blog post belongs in a purpose group like \"Reading\" or \"Tech\", not a group named after that article's specific topic.",
  "Reuse: existing groups come with a member summary (member titles and domains). Use that summary to understand each group's real meaning;",
  "if the current tab serves the same purpose as a group's members, reuse the exact same group title.",
  "Create: if it is unrelated to every existing group, you MUST create a concise new title that differs from all existing ones. Never force unrelated tabs into an existing group.",
  "Generalization: a new title should also fit other pages of the same site, so later pages from that site can reuse it.",
  "If custom grouping requirements are provided, prioritize them when deciding the grouping logic while still following the output format and length limits.",
  "Length requirement: groupTitle must be no more than 5 Chinese characters or 2 English words.",
].join("\n");

async function suggestAITabGroup(input: {
  url: string;
  title?: string;
  description?: string;
  metadata?: TabGroupPageMetadata;
  windowContext: WindowGroupingContext;
  customInstructions?: string;
}): Promise<AITabGroupDecision> {
  const config = await resolveAgentConfig();
  assertAgentConfigured(config.rawConfig);

  const result = await runExtensionCommand<Record<string, never>, AITabGroupSuggestion>({
    config,
    temperature: 0.1,
    maxIterations: 1,
    systemPrompt:
      config.language === "zh" ? AI_SYSTEM_PROMPT_ZH : AI_SYSTEM_PROMPT_EN,
    command: {
      name: "suggestTabGroup",
      description: "Suggest a native browser tab group title.",
      outputSchema: aiTabGroupSuggestionOutputSchema,
      prompt: buildAITabGroupPrompt({
        url: input.url,
        title: input.title,
        description: input.description,
        metadata: input.metadata,
        windowContext: input.windowContext,
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
      if (settings.domainAutoGroupEnabled && !settings.aiAutoGroupEnabled && isSupportedTabUrl(url)) {
        const groupTitle = getDomainGroupTitle(url);
        if (!groupTitle) return false;

        const existingGroup = await findExistingGroup(windowId, groupTitle);
        const groupId = existingGroup
          ? await api.tabs.group({ tabIds: tabId, groupId: existingGroup.id })
          : await api.tabs.group({ tabIds: tabId });

        await api.tabGroups.update(groupId, {
          title: groupTitle,
          color: existingGroup?.color ?? getRandomColor(),
          collapsed: false,
        });

        return true;
      }

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

      const cachedEntry = cacheKey
        ? await tabGroupRulesStorage.getAIGroupCache(cacheKey)
        : null;
      const legacyCachedEntry =
        !cachedEntry && legacyCacheKey && legacyCacheKey !== cacheKey
          ? await tabGroupRulesStorage.getAIGroupCache(legacyCacheKey)
          : null;

      // pending 结论仅在同栏目页面复用，multiPurpose 域名完全跳过缓存
      const reusableEntry =
        cachedEntry && canUseCachedSuggestion(cachedEntry, url)
          ? cachedEntry
          : legacyCachedEntry && canUseCachedSuggestion(legacyCachedEntry, url)
            ? legacyCachedEntry
            : null;

      let suggestion: AITabGroupDecision;
      if (reusableEntry) {
        suggestion = {
          groupTitle: reusableEntry.groupTitle,
          color: reusableEntry.color,
        };
      } else {
        const windowContext = await collectWindowGroupingContext(
          windowId,
          tabId,
          existingGroups,
        );
        suggestion = await suggestAITabGroup({
          url,
          title,
          description: options.description,
          metadata: options.metadata,
          windowContext,
          customInstructions,
        });
      }

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

      // 仅在真正调用过 AI 时更新缓存状态，复用缓存的路径不重复计票
      if (!reusableEntry && cacheKey) {
        await tabGroupRulesStorage.setAIGroupCache(
          cacheKey,
          reconcileAIGroupCache(cachedEntry, {
            url,
            groupTitle: suggestion.groupTitle,
            color: suggestion.color,
          }),
        );
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
