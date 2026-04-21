# @hamhome/ai 组件文档

## 架构说明

`@hamhome/ai` 当前基于 `@hamhome/agent` 与 AI SDK 构建，并保持原有 facade API 不变：

- `config/providers.ts`：复用 `@hamhome/agent` 的 provider 元数据与默认配置
- `prompts/*`：提示词模板与输入上下文拼装
- `strategies/bookmark-analysis.ts`：单阶段 / 分批分析策略（Strategy）
- `facade/client-facade.ts`：对外统一 API 门面（Facade）
- `config/embedding-providers.ts`：复用 `@hamhome/agent` 的 embedding provider 配置
- `@hamhome/agent`：统一提供 structured output 与 embedding 执行能力

这样可以让扩展侧只负责配置读取与业务上下文适配，未来也能直接在服务端环境复用同一套 AI 能力。

## 轻量子入口

为减少浏览器扩展首屏静态依赖，`@hamhome/ai` 额外提供了按职责拆分的子入口：

- `@hamhome/ai/providers`：provider 元数据、默认模型、embedding 支持判断
- `@hamhome/ai/fallback`：本地规则 fallback
- `@hamhome/ai/search-rules`：搜索规则解析与状态合并
- `@hamhome/ai/search-planner`：基于 AI SDK 结构化输出的搜索 AI planner
- `@hamhome/ai/clients`：完整 chat client / extended client
- `@hamhome/ai/embeddings`：完整 embedding client

推荐原则：

- 设置页、表单、provider 选择器优先使用 `@hamhome/ai/providers`
- 只有在真正发起 AI 请求时，才动态加载 `@hamhome/ai/clients`、`@hamhome/ai/search-planner`、`@hamhome/ai/embeddings`

## AILanguage 类型

AI 提示词输出语言配置。

| 值 | 说明 |
|---|---|
| `zh` | 中文提示词 |
| `en` | 英文提示词 |
| `auto` | 自动（默认使用中文） |

## createAIClient

创建 AI 客户端，用于书签分析。

内部实现基于 `@hamhome/agent` 暴露的 AI SDK 结构化输出能力。

### Props

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| provider | AIProvider | 是 | - | AI 服务提供商 |
| apiKey | string | 否 | - | API 密钥 |
| baseUrl | string | 否 | 提供商默认 | 自定义 API 地址 |
| model | string | 否 | 提供商默认首选 | 模型名称 |
| temperature | number | 否 | 0.3 | 温度参数 |
| maxTokens | number | 否 | 1000 | 最大 token 数 |
| debug | boolean | 否 | false | 是否打印调试日志 |
| language | AILanguage | 否 | 'auto' | 提示词语言 |

### 使用示例

```typescript
import { createAIClient } from '@hamhome/ai';

// 中文提示词（默认）
const client = createAIClient({
  provider: 'openai',
  apiKey: 'sk-xxx',
  language: 'zh',
});

// 英文提示词
const clientEn = createAIClient({
  provider: 'openai',
  apiKey: 'sk-xxx',
  language: 'en',
});

const result = await client.analyzeBookmark({
  url: 'https://example.com',
  title: 'Example Page',
  content: '...',
});
```

### 行为说明

- 当 `language: 'en'` 时，所有系统提示词和用户提示词使用英文
- 当 `language: 'zh'` 或 `language: 'auto'` 时，使用中文提示词
- 英文提示词适用于英文网页内容分析，可获得更准确的英文输出

## createExtendedAIClient

扩展 AI 客户端，提供额外功能：标签推荐、分类推荐、翻译、分类生成、通用结构化输出。

### 额外方法

| 方法 | 说明 |
|---|---|
| suggestTags | 推荐 3-5 个相关标签 |
| suggestCategory | 推荐最合适的分类 |
| translate | 翻译文本 |
| generateCategories | 根据描述生成分类方案 |
| generateObject | 通用结构化输出生成（基于 Zod schema） |
| generateRaw | 原始文本生成 |

所有方法均遵循 `language` 配置使用对应语言的提示词。

### generateObject 方法

用于生成符合指定 Zod schema 的结构化输出。

内部统一走 AI SDK 结构化输出调用，适合搜索解析、意图识别与其他需要稳定 JSON 输出的场景。

#### 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| schema | z.ZodType<T> | 是 | Zod schema 定义输出结构 |
| prompt | string | 是 | 用户提示词 |
| system | string | 否 | 系统提示词 |

#### 使用示例

```typescript
import { createExtendedAIClient } from '@hamhome/ai';
import { z } from 'zod';

const client = createExtendedAIClient({
  provider: 'openai',
  apiKey: 'sk-xxx',
});

const SearchRequestSchema = z.object({
  intent: z.enum(['find', 'summarize', 'compare', 'qa']),
  query: z.string(),
  topK: z.number(),
});

const result = await client.generateObject({
  schema: SearchRequestSchema,
  system: '你是一个搜索查询解析器...',
  prompt: '帮我找最近保存的 React 相关文章',
});

console.log(result.intent); // 'find'
console.log(result.query);  // 'React 相关文章'
```

## createSearchQueryPlanner

创建对话式搜索查询规划器，用于把自然语言搜索输入解析成结构化检索请求。

### 适用场景

- 对话搜索输入解析
- 多轮搜索状态继承
- 搜索过滤条件抽取
- 搜索意图识别（`query / statistics / help`）

### 使用示例

```typescript
import { createSearchQueryPlanner } from '@hamhome/ai';

const planner = createSearchQueryPlanner({
  provider: 'openai',
  apiKey: 'sk-xxx',
  model: 'gpt-4o-mini',
  language: 'zh',
});

const request = await planner.parse('最近收藏的 React 教程', {
  categories: [{ id: 'cat-1', name: '技术' }],
  existingTags: ['React', '前端'],
});

console.log(request.intent);       // 'query'
console.log(request.refinedQuery); // 'React 教程'
```

## createEmbeddingClient

创建 Embedding 客户端，用于生成文本向量。内部复用 `@hamhome/agent` 的 AI SDK embedding client。

### Props

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| provider | AIProvider | 是 | - | AI 服务提供商 |
| apiKey | string | 否 | - | API 密钥 |
| baseUrl | string | 否 | 提供商默认 | 自定义 API 地址 |
| model | string | 是 | - | Embedding 模型名 |
| dimensions | number | 否 | - | 向量维度（部分 provider 支持） |

### 支持的 Provider

| Provider | 是否支持 | 默认模型 |
|---|---|---|
| openai | ✅ | text-embedding-3-small |
| anthropic | ❌ | - |
| google | ✅ | text-embedding-004 |
| azure | ✅ | text-embedding-ada-002 |
| deepseek | ❌ | - |
| groq | ❌ | - |
| mistral | ✅ | mistral-embed |
| moonshot | ❌ | - |
| zhipu | ✅ | embedding-3 |
| hunyuan | ✅ | hunyuan-embedding |
| nvidia | ✅ | nvidia/embed-qa-4 |
| siliconflow | ✅ | BAAI/bge-m3 |
| ollama | ✅ | nomic-embed-text |
| custom | ✅ | text-embedding-3-small |

### 返回的客户端方法

| 方法 | 说明 |
|---|---|
| embed(text) | 生成单个文本的 embedding |
| embedMany(texts) | 批量生成 embedding |
| testConnection() | 测试连接 |
| getModelKey() | 获取模型标识（用于向量存储） |

说明：
AI SDK embedding 接口会在 provider 支持时返回 token usage；不支持时返回 `0`。

### 使用示例

```typescript
import { createEmbeddingClient, isEmbeddingSupported } from '@hamhome/ai';

// 检查 provider 是否支持 embedding
if (isEmbeddingSupported('openai')) {
  const client = createEmbeddingClient({
    provider: 'openai',
    apiKey: 'sk-xxx',
    model: 'text-embedding-3-small',
    dimensions: 1536,
  });

  // 单个文本
  const { embedding, tokens } = await client.embed('Hello world');
  console.log(embedding.length); // 1536

  // 批量文本
  const { embeddings } = await client.embedMany([
    'First text',
    'Second text',
  ]);
  console.log(embeddings.length); // 2
}
```

## calculateCosineSimilarity

计算两个向量的 cosine 相似度。

### 使用示例

```typescript
import { calculateCosineSimilarity } from '@hamhome/ai';

const similarity = calculateCosineSimilarity(
  [0.1, 0.2, 0.3],
  [0.1, 0.2, 0.4]
);
console.log(similarity); // 0.99...
```

## 辅助函数

| 函数 | 说明 |
|---|---|
| `getDefaultModel(provider)` | 获取 provider 默认聊天模型 |
| `getProviderModels(provider)` | 获取 provider 可选聊天模型列表 |
| `getDefaultBaseUrl(provider)` | 获取 provider 默认 Base URL |
| `requiresApiKey(provider)` | 判断 provider 是否要求 API Key |
| `createBookmarkAnalysisFallback(input)` | 生成书签分析降级结果 |
| `parseSearchQueryWithRules(input, language)` | 基于规则解析搜索请求 |
| `refineSearchQuery(input, language)` | 提炼搜索关键词 |
| `isPureSearchFilterQuery(input, language)` | 判断是否为纯过滤查询 |
| `mergeSearchRequestWithState(request, state)` | 合并多轮搜索状态 |
| isEmbeddingSupported(provider) | 检查 provider 是否支持 embedding |
| getDefaultEmbeddingModel(provider) | 获取 provider 的默认 embedding 模型 |
| getEmbeddingModelKey(config) | 生成模型标识字符串 |
