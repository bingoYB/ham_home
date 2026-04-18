import { createExtensionAgent, resolveAgentConfig } from "../factory";
import {
  getDefaultBaseUrl,
  PROVIDER_DEFAULTS,
  requiresApiKey,
} from "../provider-config";

export interface AvailableModelsResult {
  models: string[];
  endpoint: string;
}

class AgentConfigService {
  private resolveModelsEndpoint(provider: string, baseUrl?: string): string {
    const normalizedBaseUrl = (baseUrl || "").replace(/\/+$/, "");

    if (!normalizedBaseUrl) {
      throw new Error("请先配置 Base URL");
    }

    if (provider === "anthropic") {
      return normalizedBaseUrl.endsWith("/v1")
        ? `${normalizedBaseUrl}/models`
        : `${normalizedBaseUrl}/v1/models`;
    }

    return normalizedBaseUrl.endsWith("/models")
      ? normalizedBaseUrl
      : `${normalizedBaseUrl}/models`;
  }

  private getModelsRequestHeaders(provider: string, apiKey?: string): HeadersInit {
    const headers: HeadersInit = { Accept: "application/json" };

    if (provider === "anthropic") {
      if (!apiKey) {
        throw new Error("请先配置 API Key");
      }

      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      return headers;
    }

    if (requiresApiKey(provider as never) && !apiKey) {
      throw new Error("请先配置 API Key");
    }

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    return headers;
  }

  private extractModelIds(payload: unknown): string[] {
    if (!payload || typeof payload !== "object") {
      return [];
    }

    const response = payload as Record<string, unknown>;
    const list = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.models)
        ? response.models
        : [];

    return [
      ...new Set(
        list
          .map((item) => {
            if (typeof item === "string") {
              return item;
            }

            if (!item || typeof item !== "object") {
              return null;
            }

            const model = item as Record<string, unknown>;
            return (
              (typeof model.id === "string" && model.id) ||
              (typeof model.name === "string" && model.name) ||
              (typeof model.model === "string" && model.model) ||
              null
            );
          })
          .filter((item): item is string => !!item?.trim()),
      ),
    ];
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const { agent } = await createExtensionAgent({
        name: "agent-config-test",
        systemPrompt:
          "You are a connection probe. Reply with exactly 'ok' and nothing else.",
      });

      const result = await agent.step("Reply with exactly 'ok'.", {
        maxTokens: 20,
        temperature: 0,
      });

      return {
        success: true,
        message: result.text.trim() || "连接成功",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "连接失败",
      };
    }
  }

  async listAvailableModels(
    configOverride?: {
      provider?: string;
      apiKey?: string;
      baseUrl?: string;
    },
  ): Promise<AvailableModelsResult> {
    const resolved = await resolveAgentConfig({
      provider: configOverride?.provider as never,
      apiKey: configOverride?.apiKey,
      baseUrl:
        configOverride?.baseUrl ||
        getDefaultBaseUrl((configOverride?.provider as never) || "openai"),
    });

    const provider = resolved.provider;
    const baseUrl =
      configOverride?.baseUrl?.trim() ||
      resolved.rawConfig.baseUrl?.trim() ||
      PROVIDER_DEFAULTS[provider].baseUrl;
    const endpoint = this.resolveModelsEndpoint(provider, baseUrl);
    const headers = this.getModelsRequestHeaders(provider, configOverride?.apiKey || resolved.apiKey);

    const response = await fetch(endpoint, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      let message = `请求失败 (${response.status})`;

      try {
        const errorBody = (await response.json()) as
          | { error?: { message?: string }; message?: string }
          | undefined;
        message =
          errorBody?.error?.message ||
          errorBody?.message ||
          response.statusText ||
          message;
      } catch {
        message = response.statusText || message;
      }

      throw new Error(message);
    }

    const payload = (await response.json()) as unknown;
    const models = this.extractModelIds(payload);

    if (!models.length) {
      throw new Error("未从 /models 返回可用模型");
    }

    return { models, endpoint };
  }
}

export const agentConfigService = new AgentConfigService();
