import type { AgentTool } from "@browser-agent-sdk/agent";
import { browser } from "wxt/browser";
import { bookmarkStorage, configStorage } from "@/lib/storage";
import { getExtensionURL } from "@/utils/browser-api";
import type { ChatSearchSession } from "./chat-search-tools";
import { createChatSearchTools } from "./chat-search-tools";
import { sanitizeSafeSettingsUpdate } from "./safe-settings";
import { createListHamHomeFeaturesTool } from "../skills/hamhome-feature-skill";

const OPENABLE_VIEWS = [
  "all",
  "settings",
  "privacy",
  "categories",
  "tags",
  "workspaces",
  "tab-groups",
  "import-export",
  "about",
] as const;
const SETTINGS_TABS = ["ai", "general", "storage"] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function hasPatch(value: Record<string, unknown>): boolean {
  return Object.keys(value).length > 0;
}

async function getSafeSettingsSnapshot() {
  const [settings, aiConfig, embeddingConfig] = await Promise.all([
    configStorage.getSettings(),
    configStorage.getAIConfig(),
    configStorage.getEmbeddingConfig(),
  ]);

  return {
    settings,
    aiConfig: {
      provider: aiConfig.provider,
      model: aiConfig.model,
      temperature: aiConfig.temperature,
      maxTokens: aiConfig.maxTokens,
      enableTranslation: aiConfig.enableTranslation,
      enableSmartCategory: aiConfig.enableSmartCategory,
      enableTagSuggestion: aiConfig.enableTagSuggestion,
      presetTags: aiConfig.presetTags || [],
      autoDetectPrivacy: aiConfig.autoDetectPrivacy,
      hasApiKey: !!aiConfig.apiKey?.trim(),
      hasBaseUrl: !!aiConfig.baseUrl?.trim(),
      privacyDomainCount: aiConfig.privacyDomains?.length || 0,
    },
    embeddingConfig: {
      enabled: embeddingConfig.enabled,
      provider: embeddingConfig.provider,
      model: embeddingConfig.model,
      dimensions: embeddingConfig.dimensions,
      batchSize: embeddingConfig.batchSize,
      hasApiKey: !!embeddingConfig.apiKey?.trim(),
      hasBaseUrl: !!embeddingConfig.baseUrl?.trim(),
    },
  };
}

async function openExtensionView(view: string, tab?: string) {
  const hash = view === "settings" && tab ? `${view}?tab=${tab}` : view;
  const url = getExtensionURL(`app.html#${hash}`);
  const appUrlPrefix = getExtensionURL("app.html");

  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (activeTab && activeTab.url?.startsWith(appUrlPrefix) && activeTab.id) {
    try {
      await browser.tabs.sendMessage(activeTab.id, {
        type: "FORCE_HASH_NAVIGATION",
        view: hash,
      });
    } catch (e) {
      // Message sending failed (e.g., page not fully loaded), fallback to create
      await browser.tabs.create({ url });
    }
  } else {
    await browser.tabs.create({ url });
  }

  return { opened: true, view, tab, url };
}

/**
 * 创建全局助手工具集合，覆盖功能说明、书签查询、数据摘要、页面跳转与安全配置。
 */
export async function createGlobalAgentTools(
  session: ChatSearchSession,
): Promise<AgentTool[]> {
  const searchTools = await createChatSearchTools(session);

  return [
    createListHamHomeFeaturesTool(),
    ...searchTools,
    {
      name: "get_safe_plugin_settings",
      description:
        "Read non-sensitive HamHome settings. Sensitive values are summarized as booleans or counts.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      metadata: { readOnly: true, riskLevel: "low" },
      execute: getSafeSettingsSnapshot,
    },
    {
      name: "update_safe_plugin_settings",
      description:
        "Update safe HamHome settings by allowlist. Never accepts apiKey, baseUrl, privacyDomains, sync credentials, or browser shortcuts.",
      parameters: {
        type: "object",
        properties: {
          settings: { type: "object" },
          aiConfig: { type: "object" },
          embeddingConfig: { type: "object" },
        },
        additionalProperties: false,
      },
      metadata: { readOnly: false, riskLevel: "medium" },
      async execute(input) {
        const sanitized = sanitizeSafeSettingsUpdate(input);

        const [settings, aiConfig, embeddingConfig] = await Promise.all([
          hasPatch(sanitized.settings as Record<string, unknown>)
            ? configStorage.setSettings(sanitized.settings)
            : configStorage.getSettings(),
          hasPatch(sanitized.aiConfig as Record<string, unknown>)
            ? configStorage.setAIConfig(sanitized.aiConfig)
            : configStorage.getAIConfig(),
          hasPatch(sanitized.embeddingConfig as Record<string, unknown>)
            ? configStorage.setEmbeddingConfig(sanitized.embeddingConfig)
            : configStorage.getEmbeddingConfig(),
        ]);

        return {
          updated: {
            settings: sanitized.settings,
            aiConfig: sanitized.aiConfig,
            embeddingConfig: sanitized.embeddingConfig,
          },
          rejected: sanitized.rejected,
          nextStep:
            sanitized.rejected.length > 0
              ? "Open the relevant settings page for rejected sensitive or unsupported fields."
              : undefined,
          current: {
            settings,
            aiConfig: {
              provider: aiConfig.provider,
              model: aiConfig.model,
              temperature: aiConfig.temperature,
              maxTokens: aiConfig.maxTokens,
              enableTranslation: aiConfig.enableTranslation,
              enableSmartCategory: aiConfig.enableSmartCategory,
              enableTagSuggestion: aiConfig.enableTagSuggestion,
              autoDetectPrivacy: aiConfig.autoDetectPrivacy,
            },
            embeddingConfig: {
              enabled: embeddingConfig.enabled,
              provider: embeddingConfig.provider,
              model: embeddingConfig.model,
              dimensions: embeddingConfig.dimensions,
              batchSize: embeddingConfig.batchSize,
            },
          },
        };
      },
    },
    {
      name: "open_extension_view",
      description:
        "Open a HamHome extension page such as settings, privacy, bookmarks, categories, tags, workspaces, tab groups, import/export, or about.",
      parameters: {
        type: "object",
        properties: {
          view: { type: "string", enum: [...OPENABLE_VIEWS] },
          tab: {
            type: "string",
            enum: [...SETTINGS_TABS],
            description: "Only applies when view is settings.",
          },
        },
        required: ["view"],
        additionalProperties: false,
      },
      metadata: { readOnly: false, riskLevel: "low" },
      async execute(input) {
        const raw = isObject(input) ? input : {};
        const view = isString(raw.view) && (OPENABLE_VIEWS as readonly string[]).includes(raw.view)
          ? raw.view
          : "settings";
        const tab =
          isString(raw.tab) && (SETTINGS_TABS as readonly string[]).includes(raw.tab)
            ? raw.tab
            : undefined;

        return openExtensionView(view, tab);
      },
    },
    {
      name: "get_plugin_data_summary",
      description:
        "Get a compact summary of local HamHome data: bookmark count, categories, tags, snapshots, and AI/embedding availability.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      metadata: { readOnly: true, riskLevel: "low" },
      async execute() {
        const [bookmarks, categories, tags, settingsSnapshot] = await Promise.all([
          bookmarkStorage.getBookmarks({ isDeleted: false }),
          bookmarkStorage.getCategories(),
          bookmarkStorage.getAllTags(),
          getSafeSettingsSnapshot(),
        ]);
        const snapshotCount = bookmarks.filter((bookmark) => bookmark.hasSnapshot).length;

        return {
          bookmarkCount: bookmarks.length,
          categoryCount: categories.length,
          tagCount: tags.length,
          snapshotCount,
          recentBookmarks: bookmarks
            .slice()
            .sort((left, right) => right.createdAt - left.createdAt)
            .slice(0, 5)
            .map((bookmark) => ({
              id: bookmark.id,
              title: bookmark.title,
              url: bookmark.url,
              tags: bookmark.tags,
              createdAt: bookmark.createdAt,
            })),
          settings: settingsSnapshot,
        };
      },
    },
    {
      name: "get_active_tab_summary",
      description:
        "Read the active browser tab title and url without extracting page content.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      metadata: { readOnly: true, riskLevel: "low" },
      async execute() {
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });

        return tab
          ? {
              title: tab.title || "",
              url: tab.url || "",
              id: tab.id,
            }
          : { error: "No active tab found." };
      },
    },
  ];
}
