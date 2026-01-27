# @hamhome/ai 组件文档

## AILanguage 类型

AI 提示词输出语言配置。

| 值 | 说明 |
|---|---|
| `zh` | 中文提示词 |
| `en` | 英文提示词 |
| `auto` | 自动（默认使用中文） |

## createAIClient

创建 AI 客户端，用于书签分析。

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

扩展 AI 客户端，提供额外功能：标签推荐、分类推荐、翻译、分类生成。

### 额外方法

| 方法 | 说明 |
|---|---|
| suggestTags | 推荐 3-5 个相关标签 |
| suggestCategory | 推荐最合适的分类 |
| translate | 翻译文本 |
| generateCategories | 根据描述生成分类方案 |

所有方法均遵循 `language` 配置使用对应语言的提示词。
