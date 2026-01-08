import type {
  AIClientConfig,
  AnalyzeBookmarkInput,
  BookmarkAnalysisResult,
  AIClient,
} from './types';

/**
 * 系统提示词 - 用于书签分析
 */
const SYSTEM_PROMPT = `你是一个专业的书签管理助手。你的任务是分析网页内容并生成结构化的元数据。

请根据提供的网页内容，生成以下信息：
1. title: 优化后的标题，简洁明了，不超过50字
2. summary: 一句话摘要，概括文章核心内容，使用中文，不超过200字
3. category: 推荐一个最合适的分类名称（如：技术、设计、生活、新闻、教程、工具、娱乐等）
4. tags: 3-5个相关标签，用于检索

请以 JSON 格式返回，格式如下：
{"title": "...", "summary": "...", "category": "...", "tags": ["tag1", "tag2", ...]}

重要：只返回 JSON，不要包含其他文字说明。`;

/**
 * 创建 AI 客户端
 */
export function createAIClient(config: AIClientConfig): AIClient {
  return {
    async analyzeBookmark(
      input: AnalyzeBookmarkInput
    ): Promise<BookmarkAnalysisResult> {
      // 构建用户消息
      const userMessage = `请分析以下网页内容：

URL: ${input.url}
原始标题: ${input.title}

正文内容:
${input.content.slice(0, 4000)}`;

      try {
        const result = await callAI(config, userMessage);
        return result;
      } catch (error) {
        console.error('[@hamhome/ai] AI analysis failed:', error);
        // 返回默认值而非抛出异常
        return {
          title: input.title || '未命名书签',
          summary: '',
          category: '未分类',
          tags: [],
        };
      }
    },
  };
}

/**
 * 调用 AI API
 */
async function callAI(
  config: AIClientConfig,
  userMessage: string
): Promise<BookmarkAnalysisResult> {
  const { provider, apiKey, baseUrl, model, temperature = 0.3, maxTokens = 1000 } = config;

  let endpoint: string;
  let headers: Record<string, string>;
  let body: unknown;

  switch (provider) {
    case 'openai':
    case 'custom': {
      endpoint = baseUrl
        ? `${baseUrl.replace(/\/$/, '')}/chat/completions`
        : 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      };
      body = {
        model: model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      };
      break;
    }

    case 'anthropic': {
      endpoint = baseUrl
        ? `${baseUrl.replace(/\/$/, '')}/messages`
        : 'https://api.anthropic.com/v1/messages';
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || '',
        'anthropic-version': '2023-06-01',
      };
      body = {
        model: model || 'claude-3-haiku-20240307',
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: `${SYSTEM_PROMPT}\n\n${userMessage}`,
          },
        ],
      };
      break;
    }

    case 'ollama': {
      endpoint = baseUrl
        ? `${baseUrl.replace(/\/$/, '')}/chat/completions`
        : 'http://localhost:11434/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
      };
      body = {
        model: model || 'llama3',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature,
        stream: false,
      };
      break;
    }

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // 解析响应
  let content: string;
  if (provider === 'anthropic') {
    content = data.content?.[0]?.text || '';
  } else {
    content = data.choices?.[0]?.message?.content || '';
  }

  // 解析 JSON 响应
  try {
    // 尝试从响应中提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || '',
        summary: parsed.summary || '',
        category: parsed.category || '未分类',
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
      };
    }
  } catch {
    console.warn('[@hamhome/ai] Failed to parse AI response as JSON');
  }

  // 解析失败时返回默认值
  return {
    title: '',
    summary: content.slice(0, 200),
    category: '未分类',
    tags: [],
  };
}

/**
 * 获取默认模型名称
 */
export function getDefaultModel(provider: AIClientConfig['provider']): string {
  switch (provider) {
    case 'openai':
      return 'gpt-3.5-turbo';
    case 'anthropic':
      return 'claude-3-haiku-20240307';
    case 'ollama':
      return 'llama3';
    case 'workers-ai':
      return '@cf/meta/llama-3-8b-instruct';
    default:
      return 'gpt-3.5-turbo';
  }
}

