/**
 * 插件 AI 客户端封装
 * 从本地配置加载 AI 设置，提供统一的 AI 分析接口
 * 基于 @hamhome/ai 包（使用 Vercel AI SDK）
 * 
 * 优化：参考 SmartBookmark 的实现
 * - 传递完整的页面元数据给 AI
 * - 一次调用同时获取标题、摘要、分类、标签
 * - 提供上下文（已有标签和分类）提高推荐准确性
 */
import { createExtendedAIClient, getDefaultModel } from '@hamhome/ai';
import type { AIClient, AnalyzeBookmarkInput, GeneratedCategory } from '@hamhome/ai';
import { configStorage } from '@/lib/storage';
import type { AIConfig, AnalysisResult, TagSuggestion, CategorySuggestion, LocalCategory, PageContent, PageMetadata, HierarchicalCategory } from '@/types';
import { matchCategories, PRESET_CATEGORIES, formatCategoryHierarchy, buildCategoryTree } from '@/lib/preset-categories';
import { bookmarkStorage } from '@/lib/storage';

type ExtendedAIClient = ReturnType<typeof createExtendedAIClient>;

/**
 * 增强的分析输入（包含页面完整信息）
 */
export interface EnhancedAnalyzeInput {
  pageContent: PageContent;
  userCategories?: LocalCategory[];
}

class ExtensionAIClient {
  private config: AIConfig | null = null;
  private client: ExtendedAIClient | null = null;

  /**
   * 加载配置
   */
  async loadConfig(): Promise<AIConfig> {
    this.config = await configStorage.getAIConfig();
    return this.config;
  }

  /**
   * 检查是否已配置
   */
  isConfigured(): boolean {
    if (!this.config) return false;

    // Ollama 不需要 API Key
    if (this.config.provider === 'ollama') {
      return !!this.config.baseUrl;
    }

    return !!this.config.apiKey;
  }

  /**
   * 获取或创建客户端
   */
  private getOrCreateClient(): ExtendedAIClient {
    if (!this.client && this.config) {
      this.client = createExtendedAIClient({
        provider: this.config.provider,
        apiKey: this.config.apiKey,
        baseUrl: this.config.baseUrl,
        model: this.config.model || getDefaultModel(this.config.provider),
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });
    }
    return this.client!;
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
      const client = this.getOrCreateClient();

      console.log('this.config?.presetTags', this.config?.presetTags);
      
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
        metadata: input.pageContent.metadata ? {
          description: input.pageContent.metadata.description,
          keywords: input.pageContent.metadata.keywords,
          author: input.pageContent.metadata.author,
          siteName: input.pageContent.metadata.siteName,
        } : undefined,
        isReaderable: input.pageContent.isReaderable,
        // 上下文信息，帮助 AI 更好地推荐
        presetTags: this.config?.presetTags,
        // 传递带层级关系的分类信息
        existingCategories: categoryContext.length > 0 ? categoryContext : input.userCategories?.map(c => c.name),
      };

      const result = await client.analyzeBookmark(enhancedInput);
      return result;
    } catch (error) {
      console.error('[ExtensionAIClient] Analysis failed:', error);
      // AI 调用失败，返回降级结果
      return this.getFallbackResult(input.pageContent);
    }
  }

  /**
   * 兼容旧的 analyze 方法（简化输入）
   */
  async analyze(input: {
    url: string;
    title: string;
    content: string;
  }): Promise<AnalysisResult> {
    // 转换为增强输入格式
    const pageContent: PageContent = {
      url: input.url,
      title: input.title,
      content: input.content,
      textContent: input.content,
      excerpt: '',
      favicon: '',
    };
    
    return this.analyzeComplete({ pageContent });
  }

  /**
   * AI 失败时的降级策略（参考 SmartBookmark 的 getFallbackTags）
   */
  private getFallbackResult(pageContent: PageContent): AnalysisResult {
    const tags: string[] = [];
    const stopWords = new Set([
      '的', '了', '和', '与', '或', '在', '是', '到',
      'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with'
    ]);
    
    // 1. 尝试从 keywords 提取
    if (pageContent.metadata?.keywords) {
      const keywordTags = pageContent.metadata.keywords
        .split(/[,，;；]/)
        .map(t => t.trim())
        .filter(t => t.length >= 1 && t.length <= 20 && !stopWords.has(t.toLowerCase()))
        .slice(0, 3);
      tags.push(...keywordTags);
    }
    
    // 2. 从标题提取关键词
    if (tags.length < 3 && pageContent.title) {
      const titleWords = pageContent.title
        .split(/[\s\-\_\,\.\。\，\|\:：]+/)
        .map(w => w.trim())
        .filter(w => w.length >= 2 && w.length <= 20 && !stopWords.has(w.toLowerCase()));
      tags.push(...titleWords.slice(0, 3 - tags.length));
    }

    // 3. 从 URL 提取域名相关信息
    try {
      const url = new URL(pageContent.url);
      const domain = url.hostname.replace('www.', '').split('.')[0];
      if (domain && domain.length >= 2 && !tags.includes(domain)) {
        tags.push(domain);
      }
    } catch {}
    
    return {
      title: pageContent.title || '未命名书签',
      summary: pageContent.excerpt || pageContent.metadata?.description || '',
      category: '', // 留空，让用户选择
      tags: [...new Set(tags)].slice(0, 5),
    };
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config?.apiKey && this.config?.provider !== 'ollama') {
      return { success: false, message: '请先配置 API Key' };
    }

    if (this.config?.provider === 'ollama' && !this.config?.baseUrl) {
      return { success: false, message: '请配置 Ollama 地址' };
    }

    try {
      const client = this.getOrCreateClient();
      await client.analyzeBookmark({
        url: 'https://example.com',
        title: 'Test',
        content: 'This is a test.',
      });

      return { success: true, message: '连接成功' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '连接失败';
      return { success: false, message };
    }
  }

  /**
   * 推荐标签
   * 基于已有标签和内容，推荐相关标签
   */
  async suggestTags(input: {
    url: string;
    title: string;
    content: string;
    existingTags: string[];
  }): Promise<TagSuggestion[]> {
    if (!this.config) {
      await this.loadConfig();
    }

    // 如果未启用标签推荐，返回基于规则的推荐
    if (!this.config?.enableTagSuggestion || !this.isConfigured()) {
      return this.getRuleBasedTagSuggestions(input);
    }

    try {
      const client = this.getOrCreateClient();
      const result = await client.suggestTags(input);
      return result.map(item => ({
        tag: item.tag,
        confidence: 0.8,
        reason: item.reason,
      }));
    } catch (error) {
      console.error('[ExtensionAIClient] Tag suggestion failed:', error);
      return this.getRuleBasedTagSuggestions(input);
    }
  }

  /**
   * 智能分类推荐
   */
  async suggestCategory(input: {
    url: string;
    title: string;
    content: string;
    userCategories: LocalCategory[];
  }): Promise<CategorySuggestion[]> {
    if (!this.config) {
      await this.loadConfig();
    }

    const text = `${input.url} ${input.title} ${input.content}`.toLowerCase();

    // 如果未启用智能分类或 AI 未配置，使用规则匹配
    if (!this.config?.enableSmartCategory || !this.isConfigured()) {
      return this.getRuleBasedCategorySuggestions(text, input.userCategories);
    }

    try {
      const client = this.getOrCreateClient();
      const result = await client.suggestCategory({
        url: input.url,
        title: input.title,
        content: input.content,
        userCategories: input.userCategories.map(c => c.name),
      });

      return result.map(item => {
        // 查找匹配的分类
        const userCategory = input.userCategories.find(
          (c) => c.name.toLowerCase() === item.name.toLowerCase()
        );
        const presetCategory = PRESET_CATEGORIES.find(
          (c) => c.name.toLowerCase() === item.name.toLowerCase()
        );

        return {
          categoryId: userCategory?.id || presetCategory?.id || '',
          categoryName: item.name,
          confidence: 0.8,
          reason: item.reason,
        };
      });
    } catch (error) {
      console.error('[ExtensionAIClient] Category suggestion failed:', error);
      return this.getRuleBasedCategorySuggestions(text, input.userCategories);
    }
  }

  /**
   * 翻译文本（标签或摘要）
   */
  async translate(text: string, targetLang: 'zh' | 'en' = 'zh'): Promise<string> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config?.enableTranslation || !this.isConfigured()) {
      return text; // 未启用翻译，直接返回原文
    }

    try {
      const client = this.getOrCreateClient();
      return await client.translate(text, targetLang);
    } catch (error) {
      console.error('[ExtensionAIClient] Translation failed:', error);
      return text;
    }
  }

  /**
   * 基于规则的标签推荐（备用方案）
   */
  private getRuleBasedTagSuggestions(input: {
    url: string;
    title: string;
    content: string;
    existingTags: string[];
  }): TagSuggestion[] {
    const suggestions: TagSuggestion[] = [];
    const text = `${input.url} ${input.title} ${input.content}`.toLowerCase();

    // 根据 URL 域名推荐
    const domainTags: Record<string, string[]> = {
      'github.com': ['开发', '代码', 'GitHub'],
      'stackoverflow.com': ['开发', '问答', '技术'],
      'medium.com': ['文章', '博客'],
      'youtube.com': ['视频'],
      'bilibili.com': ['视频', 'B站'],
      'twitter.com': ['社交', 'Twitter'],
      'reddit.com': ['社交', 'Reddit'],
    };

    for (const [domain, tags] of Object.entries(domainTags)) {
      if (text.includes(domain)) {
        tags.forEach((tag) => {
          if (!input.existingTags.includes(tag)) {
            suggestions.push({ tag, confidence: 0.7, reason: `来自 ${domain}` });
          }
        });
      }
    }

    // 根据关键词推荐
    const keywordTags: Record<string, string> = {
      'tutorial': '教程',
      'guide': '指南',
      'documentation': '文档',
      'api': 'API',
      'react': 'React',
      'vue': 'Vue',
      'javascript': 'JavaScript',
      'python': 'Python',
      'design': '设计',
      'ai': 'AI',
    };

    for (const [keyword, tag] of Object.entries(keywordTags)) {
      if (text.includes(keyword) && !input.existingTags.includes(tag)) {
        suggestions.push({ tag, confidence: 0.6, reason: `包含关键词: ${keyword}` });
      }
    }

    return suggestions.slice(0, 5);
  }

  /**
   * 基于规则的分类推荐（备用方案）
   */
  private getRuleBasedCategorySuggestions(
    text: string,
    userCategories: LocalCategory[]
  ): CategorySuggestion[] {
    const suggestions: CategorySuggestion[] = [];

    // 先尝试匹配用户已有分类
    for (const category of userCategories) {
      if (text.includes(category.name.toLowerCase())) {
        suggestions.push({
          categoryId: category.id,
          categoryName: category.name,
          confidence: 0.8,
          reason: '内容包含分类名称',
        });
      }
    }

    // 如果没有匹配到用户分类，使用预设分类匹配
    if (suggestions.length === 0) {
      const matches = matchCategories(text, 0.2);
      suggestions.push(
        ...matches.slice(0, 3).map((m) => ({
          categoryId: m.category.id,
          categoryName: m.category.name,
          confidence: m.confidence,
          reason: '基于内容关键词匹配',
        }))
      );
    }

    return suggestions;
  }

  /**
   * 重置客户端（配置更新后调用）
   */
  reset(): void {
    this.config = null;
    this.client = null;
  }

  /**
   * 根据用户描述生成分类方案
   */
  async generateCategories(description: string): Promise<GeneratedCategory[]> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.isConfigured()) {
      throw new Error('请先配置 AI 服务');
    }

    try {
      const client = this.getOrCreateClient();
      return await client.generateCategories(description);
    } catch (error) {
      console.error('[ExtensionAIClient] Category generation failed:', error);
      throw error;
    }
  }
}

export const aiClient = new ExtensionAIClient();
