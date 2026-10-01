import type { AIConfig, EmbeddingConfig } from "../types";

const DEFAULT_AI_BASE_URL = "http://127.0.0.1:31415/v1";
const DEFAULT_EMBEDDING_BASE_URL = "http://127.0.0.1:31415/v1";
const SUPPORTED_PROVIDERS: AIConfig["provider"][] = [
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
];
const embeddingDimensions = readOptionalNumberEnv("E2E_EMBEDDING_DIMENSIONS");

export interface E2EExtensionConfig {
  aiConfig: AIConfig;
  embeddingConfig: EmbeddingConfig;
}

export const E2E_EXTENSION_CONFIG: E2EExtensionConfig = {
  aiConfig: {
    provider: readProviderEnv("E2E_AI_PROVIDER", "custom"),
    apiKey: process.env.E2E_AI_API_KEY ?? "e2e-test-key",
    baseUrl: process.env.E2E_AI_BASE_URL ?? DEFAULT_AI_BASE_URL,
    model: process.env.E2E_AI_MODEL ?? "e2e-chat-model",
    temperature: readNumberEnv("E2E_AI_TEMPERATURE", 0.1),
    apiMode: readApiModeEnv("E2E_AI_API_MODE", "chat"),
    enableTranslation: readBooleanEnv("E2E_AI_ENABLE_TRANSLATION", false),
    enableSmartCategory: readBooleanEnv("E2E_AI_ENABLE_SMART_CATEGORY", true),
    enableTagSuggestion: readBooleanEnv("E2E_AI_ENABLE_TAG_SUGGESTION", true),
    privacyDomains: [],
    autoDetectPrivacy: false,
    language: "zh",
  },
  embeddingConfig: {
    enabled: readBooleanEnv("E2E_EMBEDDING_ENABLED", true),
    provider: readProviderEnv("E2E_EMBEDDING_PROVIDER", "custom"),
    apiKey: process.env.E2E_EMBEDDING_API_KEY ?? "e2e-test-key",
    baseUrl: process.env.E2E_EMBEDDING_BASE_URL ?? DEFAULT_EMBEDDING_BASE_URL,
    model: process.env.E2E_EMBEDDING_MODEL ?? "e2e-embedding-model",
    ...(embeddingDimensions ? { dimensions: embeddingDimensions } : {}),
    batchSize: readNumberEnv("E2E_EMBEDDING_BATCH_SIZE", 16),
  },
};

export function shouldInjectE2EExtensionConfig(): boolean {
  return process.env.E2E_INJECT_AI_CONFIG !== "0";
}

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value == null || value === "") return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

function readNumberEnv(name: string, fallback: number): number {
  const value = readOptionalNumberEnv(name);
  return value ?? fallback;
}

function readOptionalNumberEnv(name: string): number | undefined {
  const value = process.env[name];
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`[e2e] ${name} 必须是数字，当前值：${value}`);
  }
  return parsed;
}

function readProviderEnv(
  name: string,
  fallback: AIConfig["provider"],
): AIConfig["provider"] {
  const value = process.env[name];
  if (!value) return fallback;
  if (SUPPORTED_PROVIDERS.includes(value as AIConfig["provider"])) {
    return value as AIConfig["provider"];
  }
  throw new Error(
    `[e2e] ${name} 必须是支持的 provider，当前值：${value}`,
  );
}

function readApiModeEnv(
  name: string,
  fallback: NonNullable<AIConfig["apiMode"]>,
): NonNullable<AIConfig["apiMode"]> {
  const value = process.env[name];
  if (value === "chat" || value === "responses") return value;
  if (value) {
    throw new Error(`[e2e] ${name} 必须是 chat 或 responses，当前值：${value}`);
  }
  return fallback;
}
