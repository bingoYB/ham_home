# HamHome 公共模块技术方案

本文档描述 Web 端与浏览器插件端共用的技术能力、模块和逻辑，避免重复开发和维护。

## 1. 公共模块概览

| 模块名称 | 说明 | 所在目录 |
|---------|------|---------|
| `@hamhome/ui` | 共享 UI 组件库 | `packages/ui` |
| `@hamhome/ai` | AI 客户端 SDK 封装 | `packages/ai` |
| `@hamhome/types` | 共享类型定义 | `packages/types` |
| `@hamhome/utils` | 通用工具函数 | `packages/utils` |
| `@hamhome/parser` | 网页内容解析器 | `packages/parser` |
| `@hamhome/storage` | 存储抽象层 | `packages/storage` |

---

## 2. UI 组件库 (`@hamhome/ui`)

### 2.1 技术选型
- **基础框架**: React 18+
- **样式方案**: Tailwind CSS + CSS Variables
- **组件基础**: Shadcn/UI (基于 Radix UI)
- **图标库**: Lucide React
- **构建工具**: Tsup (ESM + CJS 双格式)

### 2.2 组件清单

```text
packages/ui/
├── src/
│   ├── components/
│   │   ├── Button/           # 按钮组件
│   │   ├── Input/            # 输入框
│   │   ├── Select/           # 下拉选择
│   │   ├── Dialog/           # 弹窗
│   │   ├── Toast/            # 轻提示
│   │   ├── TagInput/         # 标签输入框 (业务组件)
│   │   ├── BookmarkCard/     # 书签卡片 (业务组件)
│   │   ├── BookmarkForm/     # 书签编辑表单 (业务组件)
│   │   ├── CategorySelect/   # 分类选择器 (业务组件)
│   │   ├── SearchInput/      # 搜索输入框 (业务组件)
│   │   └── LoadingState/     # 加载状态组件
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   └── useTheme.ts
│   ├── styles/
│   │   └── globals.css       # Tailwind 配置 + CSS 变量
│   └── index.ts              # 统一导出
├── package.json
└── tsup.config.ts
```

### 2.3 主题系统

采用 CSS Variables 实现明暗主题切换，Web 端和插件端共享同一套设计 Token：

```css
/* packages/ui/src/styles/globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;
  --border: 214.3 31.8% 91.4%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

### 2.4 核心业务组件

#### BookmarkForm 组件

Web 端和插件端编辑书签时共享的表单组件：

```typescript
// packages/ui/src/components/BookmarkForm/types.ts
export interface BookmarkFormData {
  url: string;
  title: string;
  description: string;
  categoryId: string | null;
  tags: string[];
}

export interface BookmarkFormProps {
  initialData?: Partial<BookmarkFormData>;
  categories: Category[];
  suggestedTags?: string[];
  onSubmit: (data: BookmarkFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}
```

#### TagInput 组件

支持回车添加、点击删除、AI 推荐标签展示：

```typescript
export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];  // AI 推荐标签
  placeholder?: string;
  maxTags?: number;
}
```

---

## 3. AI 客户端 SDK (`@hamhome/ai`)

### 3.1 设计目标
- 统一的 AI 调用接口，屏蔽底层模型差异
- 支持多种模型提供商（OpenAI、Anthropic、Workers AI、本地 Ollama）
- 支持 BYOK（自带 Key）模式
- 结构化输出（强类型 JSON 响应）

### 3.2 架构设计

```text
packages/ai/
├── src/
│   ├── providers/
│   │   ├── openai.ts         # OpenAI 提供商
│   │   ├── anthropic.ts      # Anthropic 提供商
│   │   ├── workers-ai.ts     # Cloudflare Workers AI
│   │   └── ollama.ts         # 本地 Ollama
│   ├── schemas/
│   │   └── bookmark.ts       # 书签元数据 Schema
│   ├── client.ts             # 统一客户端
│   ├── types.ts              # 类型定义
│   └── index.ts
└── package.json
```

### 3.3 核心接口定义

```typescript
// packages/ai/src/types.ts
import { z } from 'zod';

// AI 配置接口
export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'workers-ai' | 'ollama' | 'custom';
  apiKey?: string;           // BYOK 模式
  baseUrl?: string;          // 自定义端点
  model?: string;            // 模型名称
  temperature?: number;      // 0-1
  maxTokens?: number;
}

// 书签分析结果 Schema
export const BookmarkAnalysisSchema = z.object({
  title: z.string().describe('优化后的标题，简洁明了'),
  summary: z.string().max(200).describe('一句话摘要，不超过200字'),
  category: z.string().describe('推荐分类名称'),
  tags: z.array(z.string()).max(5).describe('相关标签，最多5个'),
});

export type BookmarkAnalysis = z.infer<typeof BookmarkAnalysisSchema>;

// AI 客户端接口
export interface AIClient {
  analyzeBookmark(input: {
    url: string;
    title: string;
    content: string; // Markdown 格式正文
  }): Promise<BookmarkAnalysis>;
  
  generateEmbedding?(text: string): Promise<number[]>;
}
```

### 3.4 统一客户端实现

```typescript
// packages/ai/src/client.ts
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { AIConfig, BookmarkAnalysisSchema, BookmarkAnalysis } from './types';

export function createAIClient(config: AIConfig) {
  const getModel = () => {
    switch (config.provider) {
      case 'openai':
        return openai(config.model || 'gpt-3.5-turbo', {
          apiKey: config.apiKey,
          baseURL: config.baseUrl,
        });
      case 'anthropic':
        return anthropic(config.model || 'claude-3-haiku-20240307', {
          apiKey: config.apiKey,
        });
      case 'ollama':
        // 使用 OpenAI 兼容接口
        return openai(config.model || 'llama3', {
          baseURL: config.baseUrl || 'http://localhost:11434/v1',
          apiKey: 'ollama', // Ollama 不需要真实 Key
        });
      case 'custom':
        return openai(config.model || 'gpt-3.5-turbo', {
          baseURL: config.baseUrl,
          apiKey: config.apiKey,
        });
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  };

  return {
    async analyzeBookmark(input: {
      url: string;
      title: string;
      content: string;
    }): Promise<BookmarkAnalysis> {
      const model = getModel();
      
      const { object } = await generateObject({
        model,
        schema: BookmarkAnalysisSchema,
        temperature: config.temperature ?? 0.3,
        maxTokens: config.maxTokens ?? 1000,
        prompt: `分析以下网页内容，生成结构化元数据：

URL: ${input.url}
标题: ${input.title}
正文内容:
${input.content.slice(0, 4000)}

请基于内容生成：
1. 优化后的标题
2. 简洁的摘要（中文，不超过200字）
3. 推荐的分类
4. 相关标签（最多5个）`,
      });

      return object;
    },
  };
}
```

### 3.5 使用示例

```typescript
// Web 端使用
import { createAIClient } from '@hamhome/ai';

const client = createAIClient({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
});

// 插件端使用 (读取用户配置)
const config = await chrome.storage.local.get('aiConfig');
const client = createAIClient(config.aiConfig);

const result = await client.analyzeBookmark({
  url: 'https://example.com/article',
  title: '原始标题',
  content: '文章正文内容...',
});
```

---

## 4. 网页内容解析器 (`@hamhome/parser`)

### 4.1 功能说明
封装网页正文提取逻辑，供 Web 端导入处理和插件端采集使用。

### 4.2 模块结构

```text
packages/parser/
├── src/
│   ├── readability.ts    # 基于 @mozilla/readability
│   ├── turndown.ts       # HTML 转 Markdown
│   ├── extractor.ts      # 统一提取器
│   └── index.ts
└── package.json
```

### 4.3 核心实现

```typescript
// packages/parser/src/extractor.ts
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';

export interface ExtractResult {
  title: string;
  content: string;        // Markdown 格式
  textContent: string;    // 纯文本
  excerpt: string;        // 摘要
  byline: string | null;  // 作者
  siteName: string | null;
}

export function extractContent(doc: Document): ExtractResult | null {
  const reader = new Readability(doc.cloneNode(true) as Document);
  const article = reader.parse();
  
  if (!article) return null;

  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  return {
    title: article.title,
    content: turndown.turndown(article.content),
    textContent: article.textContent,
    excerpt: article.excerpt,
    byline: article.byline,
    siteName: article.siteName,
  };
}

// 用于截断内容以适应 LLM Token 限制
export function truncateContent(content: string, maxChars: number = 4000): string {
  if (content.length <= maxChars) return content;
  
  // 尝试在段落边界截断
  const truncated = content.slice(0, maxChars);
  const lastParagraph = truncated.lastIndexOf('\n\n');
  
  if (lastParagraph > maxChars * 0.7) {
    return truncated.slice(0, lastParagraph) + '\n\n[内容已截断...]';
  }
  
  return truncated + '...[内容已截断]';
}
```

---

## 5. 存储抽象层 (`@hamhome/storage`)

### 5.1 设计目标
提供统一的存储接口，支持不同存储后端：
- **插件端 MVP**: `chrome.storage.local`
- **插件端完整版**: 后端 API + 云存储
- **Web 端**: 后端 API + 云存储

### 5.2 接口定义

```typescript
// packages/storage/src/types.ts

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  content?: string;
  categoryId: string | null;
  tags: string[];
  snapshotKey?: string;
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

export interface StorageAdapter {
  // 书签操作
  getBookmarks(query?: BookmarkQuery): Promise<Bookmark[]>;
  getBookmarkById(id: string): Promise<Bookmark | null>;
  createBookmark(data: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bookmark>;
  updateBookmark(id: string, data: Partial<Bookmark>): Promise<Bookmark>;
  deleteBookmark(id: string, permanent?: boolean): Promise<void>;
  
  // 分类操作
  getCategories(): Promise<Category[]>;
  createCategory(data: Omit<Category, 'id'>): Promise<Category>;
  updateCategory(id: string, data: Partial<Category>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  
  // 标签操作
  getTags(): Promise<string[]>;
  
  // 搜索
  searchBookmarks(query: string): Promise<Bookmark[]>;
  
  // 导入/导出
  exportAll(): Promise<ExportData>;
  importData(data: ExportData): Promise<ImportResult>;
}

export interface BookmarkQuery {
  categoryId?: string;
  tags?: string[];
  isDeleted?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface ExportData {
  version: string;
  exportedAt: number;
  bookmarks: Bookmark[];
  categories: Category[];
}
```

### 5.3 Chrome Storage 适配器 (插件 MVP 版本)

```typescript
// packages/storage/src/adapters/chrome-storage.ts
import { StorageAdapter, Bookmark, Category } from '../types';
import { nanoid } from 'nanoid';

export class ChromeStorageAdapter implements StorageAdapter {
  private async getData(): Promise<{ bookmarks: Bookmark[]; categories: Category[] }> {
    const result = await chrome.storage.local.get(['bookmarks', 'categories']);
    return {
      bookmarks: result.bookmarks || [],
      categories: result.categories || [],
    };
  }

  private async setData(data: Partial<{ bookmarks: Bookmark[]; categories: Category[] }>) {
    await chrome.storage.local.set(data);
  }

  async getBookmarks(query?: BookmarkQuery): Promise<Bookmark[]> {
    const { bookmarks } = await this.getData();
    let result = bookmarks.filter(b => !b.isDeleted);

    if (query?.categoryId) {
      result = result.filter(b => b.categoryId === query.categoryId);
    }
    if (query?.tags?.length) {
      result = result.filter(b => 
        query.tags!.some(tag => b.tags.includes(tag))
      );
    }
    if (query?.search) {
      const searchLower = query.search.toLowerCase();
      result = result.filter(b => 
        b.title.toLowerCase().includes(searchLower) ||
        b.description.toLowerCase().includes(searchLower) ||
        b.url.toLowerCase().includes(searchLower)
      );
    }

    // 排序
    const sortBy = query?.sortBy || 'createdAt';
    const sortOrder = query?.sortOrder || 'desc';
    result.sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    // 分页
    if (query?.offset) result = result.slice(query.offset);
    if (query?.limit) result = result.slice(0, query.limit);

    return result;
  }

  async createBookmark(data: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bookmark> {
    const { bookmarks } = await this.getData();
    
    // URL 去重检查
    const exists = bookmarks.find(b => b.url === data.url && !b.isDeleted);
    if (exists) {
      throw new Error('URL already exists');
    }

    const now = Date.now();
    const bookmark: Bookmark = {
      ...data,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    };

    await this.setData({ bookmarks: [...bookmarks, bookmark] });
    return bookmark;
  }

  async updateBookmark(id: string, data: Partial<Bookmark>): Promise<Bookmark> {
    const { bookmarks } = await this.getData();
    const index = bookmarks.findIndex(b => b.id === id);
    
    if (index === -1) throw new Error('Bookmark not found');

    const updated = {
      ...bookmarks[index],
      ...data,
      updatedAt: Date.now(),
    };
    
    bookmarks[index] = updated;
    await this.setData({ bookmarks });
    
    return updated;
  }

  async deleteBookmark(id: string, permanent = false): Promise<void> {
    const { bookmarks } = await this.getData();
    
    if (permanent) {
      await this.setData({ bookmarks: bookmarks.filter(b => b.id !== id) });
    } else {
      // 软删除
      const index = bookmarks.findIndex(b => b.id === id);
      if (index !== -1) {
        bookmarks[index].isDeleted = true;
        bookmarks[index].updatedAt = Date.now();
        await this.setData({ bookmarks });
      }
    }
  }

  async searchBookmarks(query: string): Promise<Bookmark[]> {
    return this.getBookmarks({ search: query });
  }

  async exportAll(): Promise<ExportData> {
    const { bookmarks, categories } = await this.getData();
    return {
      version: '1.0.0',
      exportedAt: Date.now(),
      bookmarks: bookmarks.filter(b => !b.isDeleted),
      categories,
    };
  }

  async importData(data: ExportData): Promise<ImportResult> {
    const { bookmarks: existing } = await this.getData();
    const existingUrls = new Set(existing.map(b => b.url));
    
    let imported = 0;
    let skipped = 0;
    
    for (const bookmark of data.bookmarks) {
      if (existingUrls.has(bookmark.url)) {
        skipped++;
        continue;
      }
      
      await this.createBookmark({
        url: bookmark.url,
        title: bookmark.title,
        description: bookmark.description,
        categoryId: bookmark.categoryId,
        tags: bookmark.tags,
      });
      imported++;
    }

    return { imported, skipped, failed: 0 };
  }

  // ... 其他方法实现
}
```

### 5.4 API 适配器 (完整版本)

```typescript
// packages/storage/src/adapters/api-storage.ts
import { StorageAdapter, Bookmark } from '../types';

export class APIStorageAdapter implements StorageAdapter {
  constructor(
    private baseUrl: string,
    private getToken: () => Promise<string>
  ) {}

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = await this.getToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async getBookmarks(query?: BookmarkQuery): Promise<Bookmark[]> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }
    
    return this.request(`/bookmarks?${params}`);
  }

  async createBookmark(data: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bookmark> {
    return this.request('/bookmarks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ... 其他方法实现
}
```

---

## 6. 共享类型定义 (`@hamhome/types`)

### 6.1 模块结构

```text
packages/types/
├── src/
│   ├── bookmark.ts       # 书签相关类型
│   ├── category.ts       # 分类相关类型
│   ├── user.ts           # 用户相关类型
│   ├── ai.ts             # AI 相关类型
│   ├── api.ts            # API 请求/响应类型
│   └── index.ts
└── package.json
```

### 6.2 核心类型

```typescript
// packages/types/src/bookmark.ts
export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  content?: string;
  categoryId: string | null;
  tags: string[];
  snapshotKey?: string;
  waybackUrl?: string;
  isArchived: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// packages/types/src/api.ts
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

---

## 7. 通用工具函数 (`@hamhome/utils`)

### 7.1 模块结构

```text
packages/utils/
├── src/
│   ├── url.ts            # URL 处理
│   ├── date.ts           # 日期格式化
│   ├── string.ts         # 字符串处理
│   ├── validation.ts     # 验证工具
│   └── index.ts
└── package.json
```

### 7.2 核心工具

```typescript
// packages/utils/src/url.ts
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // 移除 tracking 参数
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'ref'];
    trackingParams.forEach(param => parsed.searchParams.delete(param));
    // 移除末尾斜杠
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function getFavicon(url: string): string {
  const domain = getDomain(url);
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

// packages/utils/src/string.ts
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function generateId(): string {
  return nanoid();
}
```

---

## 8. 依赖版本清单

```json
{
  "@hamhome/ui": {
    "react": "^18.2.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-toast": "^1.1.5",
    "lucide-react": "^0.312.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "@hamhome/ai": {
    "ai": "^3.0.0",
    "@ai-sdk/openai": "^0.0.10",
    "@ai-sdk/anthropic": "^0.0.5",
    "zod": "^3.22.0"
  },
  "@hamhome/parser": {
    "@mozilla/readability": "^0.5.0",
    "turndown": "^7.1.2"
  },
  "@hamhome/storage": {
    "nanoid": "^5.0.0"
  },
  "@hamhome/utils": {
    "nanoid": "^5.0.0",
    "date-fns": "^3.0.0"
  }
}
```

---

## 9. 构建与发布

### 9.1 统一构建配置

```typescript
// packages/ui/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
});
```

### 9.2 Workspace 依赖

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

各应用引用共享包：

```json
// apps/web/package.json
{
  "dependencies": {
    "@hamhome/ui": "workspace:*",
    "@hamhome/ai": "workspace:*",
    "@hamhome/types": "workspace:*",
    "@hamhome/utils": "workspace:*"
  }
}
```

