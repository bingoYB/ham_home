/**
 * 插件 AI 客户端封装
 * 从本地配置加载 AI 设置，提供统一的 AI 分析接口
 * 基于 @hamhome/ai 包（使用 LangChain）
 *
 * 优化：参考 SmartBookmark 的实现
 * - 传递完整的页面元数据给 AI
 * - 一次调用同时获取标题、摘要、分类、标签
 * - 提供上下文（已有标签和分类）提高推荐准确性
 */
import { createBookmarkAnalysisFallback } from "@hamhome/ai/fallback";
import { getDefaultModel } from "@hamhome/ai/providers";
import type {
  AnalyzeBookmarkInput,
  ExtendedAIClient,
  GeneratedCategory,
} from "@hamhome/ai";
import { configStorage } from "@/lib/storage";
import type {
  AIConfig,
  AnalysisResult,
  TagSuggestion,
  CategorySuggestion,
  LocalCategory,
  PageContent,
} from "@/types";
import {
  matchCategories,
  formatCategoryHierarchy,
  buildCategoryTree,
} from "@/lib/preset-categories";

/**
 * 增强的分析输入（包含页面完整信息）
 */
export interface EnhancedAnalyzeInput {
  pageContent: PageContent;
  userCategories?: LocalCategory[];
  existingTags?: string[]; // 用户已有的标签（避免生成语义相近的重复标签）
}

class ExtensionAIClient {
  private config: AIConfig | null = null;
  private client: ExtendedAIClient | null = null;
  private clientPromise: Promise<ExtendedAIClient> | null = null;

  /**
   * 加载配置
   */
  async loadConfig(): Promise<AIConfig> {
    this.config = await configStorage.getAIConfig();
    const settings = await configStorage.getSettings();
    this.config.language = settings.language;
    return this.config;
  }

  /**
   * 检查是否已配置
   */
  isConfigured(): boolean {
    if (!this.config) return false;

    // Ollama 不需要 API Key
    if (this.config.provider === "ollama") {
      return !!this.config.baseUrl;
    }

    return !!this.config.apiKey;
  }

  /**
   * 获取或创建客户端
   */
  private async getOrCreateClient(): Promise<ExtendedAIClient> {
    if (this.client) {
      return this.client;
    }

    if (!this.clientPromise && this.config) {
      const config = this.config;
      this.clientPromise = import("@hamhome/ai/clients")
        .then(({ createExtendedAIClient }) =>
          createExtendedAIClient({
            provider: config.provider,
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
            model: config.model || getDefaultModel(config.provider),
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            debug: true,
            language: config.language,
          }),
        )
        .catch((error) => {
          this.clientPromise = null;
          throw error;
        });
    }

    this.client = await this.clientPromise!;
    return this.client;
  }

  /**
   * 一次性分析书签内容（整合标题、摘要、分类、标签生成）
   * 参考 SmartBookmark 的 generateTags 实现，但整合为一次调用
   */
  async analyzeComplete(input: EnhancedAnalyzeInput): Promise<AnalysisResult> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.isConfigured()) {
      // AI 未配置，返回降级结果
      return this.getFallbackResult(input.pageContent);
    }

    try {
      const client = await this.getOrCreateClient();

      console.log("this.config?.presetTags", this.config?.presetTags);

      // 构建带层级关系的分类信息
      let categoryContext: string[] = [];
      if (input.userCategories && input.userCategories.length > 0) {
        const categoryTree = buildCategoryTree(input.userCategories);
        categoryContext = formatCategoryHierarchy(categoryTree);
      }

      // 构建增强的输入，包含完整的页面信息和上下文
      const enhancedInput: AnalyzeBookmarkInput = {
        url: input.pageContent.url,
        title: input.pageContent.title,
        content: input.pageContent.content || input.pageContent.textContent,
        excerpt: input.pageContent.excerpt,
        metadata: input.pageContent.metadata
          ? {
              description: input.pageContent.metadata.description,
              keywords: input.pageContent.metadata.keywords,
              author: input.pageContent.metadata.author,
              siteName: input.pageContent.metadata.siteName,
            }
          : undefined,
        isReaderable: input.pageContent.isReaderable,
        // 上下文信息，帮助 AI 更好地推荐
        presetTags: this.config?.presetTags,
        // 传递带层级关系的分类信息
        existingCategories:
          categoryContext.length > 0
            ? categoryContext
            : input.userCategories?.map((c) => c.name),
        // 传递已有标签，避免生成语义相近的重复标签
        existingTags: input.existingTags,
      };

      // 直接抛出错误，让调用方决定如何处理（不静默吞掉）
      const result = await client.analyzeBookmark(enhancedInput);
      return result;
    } catch (error) {
      console.error("[ExtensionAIClient] Analysis failed:", error);
      // 重新抛出，让调用方感知 AI 错误
      throw error;
    }
  }

  /**
   * AI 失败时的降级策略
   */
  private getFallbackResult(pageContent: PageContent): AnalysisResult {
    const fallbackResult = createBookmarkAnalysisFallback({
      url: pageContent.url,
      title: pageContent.title,
      excerpt: pageContent.excerpt,
      metadata: pageContent.metadata
        ? {
            description: pageContent.metadata.description,
            keywords: pageContent.metadata.keywords,
            author: pageContent.metadata.author,
            siteName: pageContent.metadata.siteName,
          }
        : undefined,
    });

    return {
      ...fallbackResult,
      category: "",
    };
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config?.apiKey && this.config?.provider !== "ollama") {
      return { success: false, message: "请先配置 API Key" };
    }

    if (this.config?.provider === "ollama" && !this.config?.baseUrl) {
      return { success: false, message: "请配置 Ollama 地址" };
    }

    try {
      const client = await this.getOrCreateClient();
      // 使用 generateRaw 测试，它会在失败时抛出错误（不像 analyzeBookmark 有 fallback）
      await client.generateRaw("Reply with 'ok'");
      return { success: true, message: "连接成功" };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "连接失败";
      return { success: false, message };
    }
  }

  /**
   * 翻译文本（标签或摘要）
   */
  async translate(
    text: string,
    targetLang: "zh" | "en" = "zh",
  ): Promise<string> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config?.enableTranslation || !this.isConfigured()) {
      return text; // 未启用翻译，直接返回原文
    }

    try {
      const client = await this.getOrCreateClient();
      return await client.translate(text, targetLang);
    } catch (error) {
      console.error("[ExtensionAIClient] Translation failed:", error);
      return text;
    }
  }

  /**
   * 重置客户端（配置更新后调用）
   */
  reset(): void {
    this.config = null;
    this.client = null;
    this.clientPromise = null;
  }

  /**
   * 根据用户描述生成分类方案
   */
  async generateCategories(description: string): Promise<GeneratedCategory[]> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.isConfigured()) {
      throw new Error("请先配置 AI 服务");
    }

    try {
      const client = await this.getOrCreateClient();
      return await client.generateCategories(description);
    } catch (error) {
      console.error("[ExtensionAIClient] Category generation failed:", error);
      throw error;
    }
  }
}

export const aiClient = new ExtensionAIClient();
