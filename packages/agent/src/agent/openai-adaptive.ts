/**
 * OpenAI API 模式自适应探测器
 *
 * 在首次调用时自动尝试 responses 和 chat/completions 两种 API，
 * 成功后缓存结果以固化调用方式。
 */

import type { LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";
import { logger } from "../utils/logger";
import type { ProviderCreateOptions } from "./providers";
import {
  getCachedApiMode,
  setCachedApiMode,
  type OpenAIApiMode,
} from "./api-mode-cache";

/** 正在进行中的探测 Promise（按缓存 key 去重） */
const pendingProbes = new Map<string, Promise<OpenAIApiMode>>();

interface OpenAIAdaptiveOptions {
  apiKey?: string;
  baseURL?: string;
  model: string;
}

/**
 * 使用指定模式创建 OpenAI LanguageModel。
 */
function createOpenAIModelWithMode(
  options: OpenAIAdaptiveOptions,
  mode: OpenAIApiMode,
): LanguageModel {
  const provider = createOpenAI({
    apiKey: options.apiKey,
    ...(options.baseURL ? { baseURL: options.baseURL } : {}),
  });

  return mode === "responses"
    ? provider.responses(options.model)
    : provider.chat(options.model);
}

/**
 * 探测单一模式是否可用。
 * 发送一个极小的请求来验证 API 端点连通性。
 */
async function probeMode(
  options: OpenAIAdaptiveOptions,
  mode: OpenAIApiMode,
): Promise<boolean> {
  try {
    const model = createOpenAIModelWithMode(options, mode);
    await generateText({
      model,
      prompt: "hi",
      maxOutputTokens: 1,
    });
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("Invalid JSON response")) {
      logger.debug(`OpenAI ${mode} API generateText probe failed with Invalid JSON response, trying streamText fallback...`);
      try {
        const result = streamText({
          model: createOpenAIModelWithMode(options, mode),
          prompt: "hi",
          maxOutputTokens: 1,
        });
        await result.text;
        return true;
      } catch (streamError) {
        logger.debug(`OpenAI ${mode} API streamText probe also failed: ${streamError instanceof Error ? streamError.message : String(streamError)}`);
      }
    }
    logger.debug(`OpenAI ${mode} API probe failed: ${msg}`);
    return false;
  }
}

/**
 * 自动探测可用的 OpenAI API 模式。
 *
 * 策略：
 * 1. 先尝试 responses API（更新、功能更强）
 * 2. 失败后尝试 chat/completions API（兼容性更好）
 * 3. 都失败则抛出错误
 */
async function detectApiMode(
  options: OpenAIAdaptiveOptions,
): Promise<OpenAIApiMode> {
  logger.info("Detecting OpenAI API mode...", {
    baseURL: options.baseURL,
    model: options.model,
  });

  // 先尝试 responses（新 API，默认优先）
  if (await probeMode(options, "responses")) {
    logger.info("OpenAI API mode detected: responses");
    return "responses";
  }

  // 降级到 chat/completions
  if (await probeMode(options, "chat")) {
    logger.info("OpenAI API mode detected: chat");
    return "chat";
  }

  throw new Error(
    "OpenAI API connection failed: both responses and chat/completions endpoints are unavailable. " +
    "Please check your API key, base URL, and model configuration.",
  );
}

/**
 * 创建自适应 OpenAI LanguageModel。
 *
 * - 如果已有缓存的 API 模式，直接使用
 * - 否则自动探测，成功后缓存模式
 * - 支持并发请求去重（同一 provider+baseURL 只探测一次）
 */
export async function createAdaptiveOpenAIModel(
  providerName: string,
  options: ProviderCreateOptions,
): Promise<LanguageModel> {
  const adaptiveOptions: OpenAIAdaptiveOptions = {
    apiKey: options.apiKey,
    baseURL: options.baseURL,
    model: options.model,
  };

  // 1. 查缓存
  const cached = await getCachedApiMode(providerName, options.baseURL);
  if (cached) {
    logger.debug(`Using cached OpenAI API mode: ${cached}`);
    return createOpenAIModelWithMode(adaptiveOptions, cached);
  }

  // 2. 去重并发探测
  const cacheKey = `${providerName}::${options.baseURL || "default"}`;

  if (!pendingProbes.has(cacheKey)) {
    const probePromise = detectApiMode(adaptiveOptions)
      .then(async (mode) => {
        await setCachedApiMode(providerName, options.baseURL, mode);
        return mode;
      })
      .finally(() => {
        pendingProbes.delete(cacheKey);
      });

    pendingProbes.set(cacheKey, probePromise);
  }

  const mode = await pendingProbes.get(cacheKey)!;
  return createOpenAIModelWithMode(adaptiveOptions, mode);
}

/**
 * 创建同步的 OpenAI LanguageModel（非自适应）。
 * 使用指定的 API 模式，不进行探测。
 */
export function createOpenAIModelSync(
  options: ProviderCreateOptions,
  mode: OpenAIApiMode = "chat",
): LanguageModel {
  return createOpenAIModelWithMode(
    { apiKey: options.apiKey, baseURL: options.baseURL, model: options.model },
    mode,
  );
}
