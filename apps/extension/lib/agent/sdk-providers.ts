import type { AiSdkProviderDefinition } from "@hamhome/agent";
import {
  anthropicProvider,
  azureProvider,
  deepseekProvider,
  googleProvider,
  groqProvider,
  mistralProvider,
  openaiCompatibleProvider,
  openaiProvider,
} from "@hamhome/agent/providers";

/**
 * AI SDK providers bundled into the extension: every SDK provider that
 * `resolveAgentProvider()` can return. Providers missing here stay out of the
 * bundle, so add one only together with a new `resolveAgentProvider()` mapping.
 *
 * Example:
 * ```ts
 * createAgent({ providers: EXTENSION_AGENT_PROVIDERS, provider: "openai", model });
 * ```
 */
export const EXTENSION_AGENT_PROVIDERS: AiSdkProviderDefinition[] = [
  openaiProvider,
  anthropicProvider,
  googleProvider,
  azureProvider,
  deepseekProvider,
  groqProvider,
  mistralProvider,
  openaiCompatibleProvider,
];
