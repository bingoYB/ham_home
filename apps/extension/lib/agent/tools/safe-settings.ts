import type {
  AIConfig,
  AIProvider,
  EmbeddingConfig,
  LocalSettings,
  PanelPosition,
  ThemeMode,
  WebDAVConfig,
} from "@/types";

type SafeSettingsPatch = Partial<{
  settings: Record<string, unknown>;
  aiConfig: Record<string, unknown>;
  embeddingConfig: Record<string, unknown>;
  webdavConfig: Record<string, unknown>;
}>;

interface RejectedSetting {
  scope: "settings" | "aiConfig" | "embeddingConfig" | "webdavConfig";
  key: string;
  reason: string;
}

export interface SanitizedSafeSettingsUpdate {
  settings: Partial<LocalSettings>;
  aiConfig: Partial<AIConfig>;
  embeddingConfig: Partial<EmbeddingConfig>;
  webdavConfig: Partial<WebDAVConfig>;
  rejected: RejectedSetting[];
}

const AI_PROVIDERS = new Set<AIProvider>([
  "openai",
  "anthropic",
  "google",
  "azure",
  "deepseek",
  "groq",
  "mistral",
  "moonshot",
  "zhipu",
  "hunyuan",
  "nvidia",
  "siliconflow",
  "ollama",
  "custom",
]);
const THEMES = new Set<ThemeMode>(["light", "dark", "system"]);
const LANGUAGES = new Set(["zh", "en"]);
const PANEL_POSITIONS = new Set<PanelPosition>(["left", "right"]);
const SENSITIVE_KEYS = new Set([
  "apiKey",
  "baseUrl",
  "privacyDomains",
  "username",
  "password",
  "e2ePassword",
  "shortcut",
  "panelShortcut",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function reject(
  rejected: RejectedSetting[],
  scope: RejectedSetting["scope"],
  key: string,
  reason: string,
) {
  rejected.push({ scope, key, reason });
}

function inspectUnknownKeys(
  rejected: RejectedSetting[],
  scope: RejectedSetting["scope"],
  input: Record<string, unknown>,
  allowed: Set<string>,
) {
  for (const key of Object.keys(input)) {
    if (SENSITIVE_KEYS.has(key)) {
      reject(rejected, scope, key, "sensitive field must be configured by the user");
    } else if (!allowed.has(key)) {
      reject(rejected, scope, key, "field is not supported by the safe settings tool");
    }
  }
}

/**
 * 过滤 agent 请求修改的插件配置，只保留安全白名单字段。
 *
 * 示例：
 * ```ts
 * const patch = sanitizeSafeSettingsUpdate({ settings: { theme: "dark" } });
 * patch.settings.theme; // "dark"
 * ```
 */
export function sanitizeSafeSettingsUpdate(
  input: unknown,
): SanitizedSafeSettingsUpdate {
  const patch = isObject(input) ? (input as SafeSettingsPatch) : {};
  const rejected: RejectedSetting[] = [];
  const settings: Partial<LocalSettings> = {};
  const aiConfig: Partial<AIConfig> = {};
  const embeddingConfig: Partial<EmbeddingConfig> = {};
  const webdavConfig: Partial<WebDAVConfig> = {};

  const rawSettings = isObject(patch.settings) ? patch.settings : {};
  inspectUnknownKeys(
    rejected,
    "settings",
    rawSettings,
    new Set([
      "theme",
      "language",
      "autoSaveSnapshot",
      "enableOmniboxSearch",
      "defaultCategory",
      "panelPosition",
    ]),
  );

  if (THEMES.has(rawSettings.theme as ThemeMode)) {
    settings.theme = rawSettings.theme as ThemeMode;
  } else if ("theme" in rawSettings) {
    reject(rejected, "settings", "theme", "theme must be light, dark, or system");
  }

  if (LANGUAGES.has(rawSettings.language as string)) {
    settings.language = rawSettings.language as LocalSettings["language"];
  } else if ("language" in rawSettings) {
    reject(rejected, "settings", "language", "language must be zh or en");
  }

  if (isBoolean(rawSettings.autoSaveSnapshot)) {
    settings.autoSaveSnapshot = rawSettings.autoSaveSnapshot;
  } else if ("autoSaveSnapshot" in rawSettings) {
    reject(rejected, "settings", "autoSaveSnapshot", "value must be boolean");
  }

  if (isBoolean(rawSettings.enableOmniboxSearch)) {
    settings.enableOmniboxSearch = rawSettings.enableOmniboxSearch;
  } else if ("enableOmniboxSearch" in rawSettings) {
    reject(rejected, "settings", "enableOmniboxSearch", "value must be boolean");
  }

  if (isNullableString(rawSettings.defaultCategory)) {
    settings.defaultCategory = rawSettings.defaultCategory;
  } else if ("defaultCategory" in rawSettings) {
    reject(rejected, "settings", "defaultCategory", "value must be category id or null");
  }

  if (PANEL_POSITIONS.has(rawSettings.panelPosition as PanelPosition)) {
    settings.panelPosition = rawSettings.panelPosition as PanelPosition;
  } else if ("panelPosition" in rawSettings) {
    reject(rejected, "settings", "panelPosition", "panelPosition must be left or right");
  }

  const rawAIConfig = isObject(patch.aiConfig) ? patch.aiConfig : {};
  inspectUnknownKeys(
    rejected,
    "aiConfig",
    rawAIConfig,
    new Set([
      "provider",
      "model",
      "temperature",
      "maxTokens",
      "enableTranslation",
      "enableSmartCategory",
      "enableTagSuggestion",
      "presetTags",
      "autoDetectPrivacy",
      "apiMode",
      "language",
    ]),
  );

  if (AI_PROVIDERS.has(rawAIConfig.provider as AIProvider)) {
    aiConfig.provider = rawAIConfig.provider as AIProvider;
  } else if ("provider" in rawAIConfig) {
    reject(rejected, "aiConfig", "provider", "unsupported provider");
  }

  if (isString(rawAIConfig.model) && rawAIConfig.model.trim()) {
    aiConfig.model = rawAIConfig.model.trim();
  } else if ("model" in rawAIConfig) {
    reject(rejected, "aiConfig", "model", "model must be a non-empty string");
  }

  if (rawAIConfig.apiMode === "chat" || rawAIConfig.apiMode === "responses") {
    aiConfig.apiMode = rawAIConfig.apiMode as "chat" | "responses";
  } else if ("apiMode" in rawAIConfig) {
    reject(rejected, "aiConfig", "apiMode", "apiMode must be chat or responses");
  }

  if (LANGUAGES.has(rawAIConfig.language as string)) {
    aiConfig.language = rawAIConfig.language as LocalSettings["language"];
  } else if ("language" in rawAIConfig) {
    reject(rejected, "aiConfig", "language", "language must be zh or en");
  }

  if (
    isFiniteNumber(rawAIConfig.temperature) &&
    rawAIConfig.temperature >= 0 &&
    rawAIConfig.temperature <= 2
  ) {
    aiConfig.temperature = rawAIConfig.temperature;
  } else if ("temperature" in rawAIConfig) {
    reject(rejected, "aiConfig", "temperature", "temperature must be between 0 and 2");
  }

  if (
    Number.isInteger(rawAIConfig.maxTokens) &&
    Number(rawAIConfig.maxTokens) > 0 &&
    Number(rawAIConfig.maxTokens) <= 8000
  ) {
    aiConfig.maxTokens = Number(rawAIConfig.maxTokens);
  } else if ("maxTokens" in rawAIConfig) {
    reject(rejected, "aiConfig", "maxTokens", "maxTokens must be an integer between 1 and 8000");
  }

  for (const key of [
    "enableTranslation",
    "enableSmartCategory",
    "enableTagSuggestion",
    "autoDetectPrivacy",
  ] as const) {
    if (isBoolean(rawAIConfig[key])) {
      aiConfig[key] = rawAIConfig[key];
    } else if (key in rawAIConfig) {
      reject(rejected, "aiConfig", key, "value must be boolean");
    }
  }

  if (isStringArray(rawAIConfig.presetTags)) {
    aiConfig.presetTags = rawAIConfig.presetTags.map((tag) => tag.trim()).slice(0, 50);
  } else if ("presetTags" in rawAIConfig) {
    reject(rejected, "aiConfig", "presetTags", "presetTags must be a string array");
  }

  const rawEmbeddingConfig = isObject(patch.embeddingConfig)
    ? patch.embeddingConfig
    : {};
  inspectUnknownKeys(
    rejected,
    "embeddingConfig",
    rawEmbeddingConfig,
    new Set(["enabled", "provider", "model", "dimensions", "batchSize"]),
  );

  if (isBoolean(rawEmbeddingConfig.enabled)) {
    embeddingConfig.enabled = rawEmbeddingConfig.enabled;
  } else if ("enabled" in rawEmbeddingConfig) {
    reject(rejected, "embeddingConfig", "enabled", "value must be boolean");
  }

  if (AI_PROVIDERS.has(rawEmbeddingConfig.provider as AIProvider)) {
    embeddingConfig.provider = rawEmbeddingConfig.provider as AIProvider;
  } else if ("provider" in rawEmbeddingConfig) {
    reject(rejected, "embeddingConfig", "provider", "unsupported provider");
  }

  if (isString(rawEmbeddingConfig.model) && rawEmbeddingConfig.model.trim()) {
    embeddingConfig.model = rawEmbeddingConfig.model.trim();
  } else if ("model" in rawEmbeddingConfig) {
    reject(rejected, "embeddingConfig", "model", "model must be a non-empty string");
  }

  if (
    rawEmbeddingConfig.dimensions === undefined ||
    rawEmbeddingConfig.dimensions === null
  ) {
    // dimensions is optional; no patch needed.
  } else if (
    Number.isInteger(rawEmbeddingConfig.dimensions) &&
    Number(rawEmbeddingConfig.dimensions) > 0
  ) {
    embeddingConfig.dimensions = Number(rawEmbeddingConfig.dimensions);
  } else if ("dimensions" in rawEmbeddingConfig) {
    reject(rejected, "embeddingConfig", "dimensions", "dimensions must be a positive integer");
  }

  if (
    Number.isInteger(rawEmbeddingConfig.batchSize) &&
    Number(rawEmbeddingConfig.batchSize) > 0 &&
    Number(rawEmbeddingConfig.batchSize) <= 128
  ) {
    embeddingConfig.batchSize = Number(rawEmbeddingConfig.batchSize);
  } else if ("batchSize" in rawEmbeddingConfig) {
    reject(rejected, "embeddingConfig", "batchSize", "batchSize must be an integer between 1 and 128");
  }

  const rawWebdavConfig = isObject(patch.webdavConfig) ? patch.webdavConfig : {};
  inspectUnknownKeys(
    rejected,
    "webdavConfig",
    rawWebdavConfig,
    new Set(["enabled", "url"]),
  );

  if (isBoolean(rawWebdavConfig.enabled)) {
    webdavConfig.enabled = rawWebdavConfig.enabled;
  } else if ("enabled" in rawWebdavConfig) {
    reject(rejected, "webdavConfig", "enabled", "value must be boolean");
  }
  
  if (isString(rawWebdavConfig.url) && rawWebdavConfig.url.trim()) {
    webdavConfig.url = rawWebdavConfig.url.trim();
  } else if ("url" in rawWebdavConfig) {
    reject(rejected, "webdavConfig", "url", "url must be a non-empty string");
  }

  return { settings, aiConfig, embeddingConfig, webdavConfig, rejected };
}
