# HamHome 浏览器插件端技术方案

本文档详细描述 HamHome 浏览器插件的技术实现方案，重点阐述 **MVP 版本**（完全本地化、可独立运行）的设计与实现。

---

## 1. 版本规划与边界划分

### 1.1 MVP 版本 (v1.0 - 开源版)

**核心原则：完全本地化、可独立运行、无需后端依赖**

| 特性 | 说明 |
|-----|------|
| 登录要求 | ❌ 无需登录 |
| 后端依赖 | ❌ 无需后端服务 |
| 数据存储 | ✅ 本地存储 (`chrome.storage.local`) |
| AI 能力 | ✅ 用户自行配置 API Key/Endpoint |
| AI 调用 | ✅ 插件直接调用 AI 服务，不经过自建后端 |
| 数据同步 | ❌ 不支持跨设备同步 |
| 快照存储 | ✅ 本地存储 (IndexedDB) |

#### MVP 功能范围

```
✅ 核心功能（MVP 包含）
├── 网页收藏
│   ├── 一键收藏当前页面
│   ├── 自动提取网页正文 (Readability)
│   └── 快捷键支持 (Cmd/Ctrl + Shift + E)
├── AI 智能分析
│   ├── 自动生成摘要
│   ├── 自动推荐标签
│   └── 自动推荐分类
├── 本地书签管理
│   ├── 查看书签列表
│   ├── 编辑/删除书签
│   ├── 分类管理
│   ├── 标签管理
│   └── 关键词搜索
├── 网页快照
│   └── 本地 HTML 快照 (IndexedDB)
├── 数据导入/导出
│   ├── 导入浏览器书签
│   ├── 导出 JSON 格式
│   └── 导出 HTML 格式
└── AI 配置
    ├── 支持 OpenAI/Anthropic/自定义
    ├── 支持本地 Ollama
    └── 自定义 Base URL (兼容 OneAPI)

❌ 扩展功能（非 MVP，后续版本）
├── 用户账号系统
├── 云端数据同步
├── 向量搜索 / 语义搜索
├── 自然语言问答
├── 每日/每周回顾推送
└── 移动端同步
```

### 1.2 完整版本 (v2.0+)

在 MVP 基础上增加：
- 用户认证（Supabase Auth）
- 云端数据同步（后端 API）
- 向量搜索（Cloudflare Vectorize）
- 高级 AI 功能（语义搜索、问答）

---

## 2. 技术选型

| 类别 | 选型 | 说明 |
|-----|------|------|
| 插件框架 | WXT | 基于 Vite，支持 HMR，多浏览器适配 |
| UI 框架 | React 18 | 与 Web 端共享组件 |
| 样式 | Tailwind CSS | 共享设计系统 |
| UI 组件 | Shadcn/UI | 共享组件库 (@hamhome/ui) |
| 正文提取 | @mozilla/readability | DOM → Article |
| HTML→MD | turndown | Article HTML → Markdown |
| HTML 打包 | single-file-core | 网页快照 |
| AI SDK | @hamhome/ai | 共享 AI 客户端 |
| 存储 | chrome.storage + IndexedDB | 本地持久化 |

---

## 3. 项目结构

```text
apps/extension/
├── entrypoints/                 # WXT 入口点
│   ├── popup/                   # 弹出面板
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.html
│   ├── options/                 # 设置页面
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.html
│   ├── content.ts               # Content Script
│   └── background.ts            # Service Worker
│
├── components/                  # UI 组件
│   ├── SavePanel/               # 保存面板
│   │   ├── SavePanel.tsx
│   │   ├── AIStatus.tsx
│   │   └── FormFields.tsx
│   ├── BookmarkList/            # 书签列表
│   ├── Settings/                # 设置相关
│   └── common/                  # 通用组件
│
├── hooks/                       # 自定义 Hooks
│   ├── useBookmarks.ts
│   ├── useCategories.ts
│   ├── useAIConfig.ts
│   └── useCurrentPage.ts
│
├── lib/                         # 核心库
│   ├── storage/                 # 存储层
│   │   ├── bookmark-storage.ts
│   │   ├── snapshot-storage.ts  # IndexedDB
│   │   └── config-storage.ts
│   ├── parser/                  # 解析器
│   │   ├── readability.ts
│   │   └── turndown.ts
│   ├── ai/                      # AI 调用
│   │   └── client.ts
│   └── snapshot/                # 快照
│       └── single-file.ts
│
├── stores/                      # 状态管理
│   └── app-store.ts
│
├── types/                       # 类型定义
│   └── index.ts
│
├── assets/                      # 静态资源
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
│
├── wxt.config.ts                # WXT 配置
├── tailwind.config.js
└── package.json
```

---

## 4. MVP 本地存储方案

### 4.1 存储架构

```
┌─────────────────────────────────────────────────────────┐
│                     存储层架构                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  chrome.storage.local (结构化数据，有大小限制)            │
│  ├── bookmarks: Bookmark[]     ← 书签元数据              │
│  ├── categories: Category[]    ← 分类列表                │
│  ├── aiConfig: AIConfig        ← AI 配置                │
│  └── settings: Settings        ← 用户设置               │
│                                                         │
│  IndexedDB (大文件存储，无大小限制)                       │
│  └── snapshots                 ← 网页 HTML 快照          │
│      ├── id: string                                     │
│      ├── bookmarkId: string                             │
│      ├── html: Blob                                     │
│      └── createdAt: number                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.2 数据结构定义

```typescript
// apps/extension/types/index.ts

// 书签
export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;        // AI 生成的摘要
  content?: string;           // 提取的正文 (Markdown)
  categoryId: string | null;
  tags: string[];
  favicon?: string;
  hasSnapshot: boolean;       // 是否有本地快照
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;        // 软删除标记
}

// 分类
export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: number;
}

// AI 配置
export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'custom';
  apiKey?: string;
  baseUrl?: string;           // 自定义端点
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enabled: boolean;           // 是否启用 AI 分析
}

// 用户设置
export interface Settings {
  autoSaveSnapshot: boolean;  // 自动保存快照
  defaultCategory: string | null;
  theme: 'light' | 'dark' | 'system';
  language: 'zh' | 'en';
  shortcut: string;           // 快捷键配置
}

// 快照 (IndexedDB)
export interface Snapshot {
  id: string;
  bookmarkId: string;
  html: Blob;
  size: number;
  createdAt: number;
}

// 导出数据格式
export interface ExportData {
  version: string;
  exportedAt: number;
  bookmarks: Bookmark[];
  categories: Category[];
  settings?: Settings;
}
```

### 4.3 存储实现

#### Chrome Storage 操作封装

```typescript
// apps/extension/lib/storage/bookmark-storage.ts
import { nanoid } from 'nanoid';
import type { Bookmark, Category, BookmarkQuery } from '@/types';

const STORAGE_KEYS = {
  BOOKMARKS: 'bookmarks',
  CATEGORIES: 'categories',
  AI_CONFIG: 'aiConfig',
  SETTINGS: 'settings',
};

class BookmarkStorage {
  // ============ 书签操作 ============
  
  async getBookmarks(query?: BookmarkQuery): Promise<Bookmark[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.BOOKMARKS);
    let bookmarks: Bookmark[] = result.bookmarks || [];
    
    // 过滤已删除
    bookmarks = bookmarks.filter(b => !b.isDeleted);
    
    // 分类筛选
    if (query?.categoryId) {
      bookmarks = bookmarks.filter(b => b.categoryId === query.categoryId);
    }
    
    // 标签筛选
    if (query?.tags?.length) {
      bookmarks = bookmarks.filter(b => 
        query.tags!.some(tag => b.tags.includes(tag))
      );
    }
    
    // 搜索
    if (query?.search) {
      const searchLower = query.search.toLowerCase();
      bookmarks = bookmarks.filter(b => 
        b.title.toLowerCase().includes(searchLower) ||
        b.description.toLowerCase().includes(searchLower) ||
        b.url.toLowerCase().includes(searchLower) ||
        b.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }
    
    // 排序
    const sortBy = query?.sortBy || 'createdAt';
    const sortOrder = query?.sortOrder || 'desc';
    bookmarks.sort((a, b) => {
      const aVal = a[sortBy as keyof Bookmark] as number || 0;
      const bVal = b[sortBy as keyof Bookmark] as number || 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    // 分页
    if (query?.offset) bookmarks = bookmarks.slice(query.offset);
    if (query?.limit) bookmarks = bookmarks.slice(0, query.limit);
    
    return bookmarks;
  }

  async getBookmarkById(id: string): Promise<Bookmark | null> {
    const bookmarks = await this.getBookmarks();
    return bookmarks.find(b => b.id === id) || null;
  }

  async getBookmarkByUrl(url: string): Promise<Bookmark | null> {
    const bookmarks = await this.getBookmarks();
    const normalizedUrl = this.normalizeUrl(url);
    return bookmarks.find(b => this.normalizeUrl(b.url) === normalizedUrl) || null;
  }

  async createBookmark(
    data: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Bookmark> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.BOOKMARKS);
    const bookmarks: Bookmark[] = result.bookmarks || [];
    
    // URL 去重检查
    const normalizedUrl = this.normalizeUrl(data.url);
    const exists = bookmarks.find(
      b => this.normalizeUrl(b.url) === normalizedUrl && !b.isDeleted
    );
    if (exists) {
      throw new Error('该网址已收藏');
    }

    const now = Date.now();
    const bookmark: Bookmark = {
      ...data,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    };

    await chrome.storage.local.set({
      [STORAGE_KEYS.BOOKMARKS]: [...bookmarks, bookmark],
    });

    return bookmark;
  }

  async updateBookmark(id: string, data: Partial<Bookmark>): Promise<Bookmark> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.BOOKMARKS);
    const bookmarks: Bookmark[] = result.bookmarks || [];
    
    const index = bookmarks.findIndex(b => b.id === id);
    if (index === -1) {
      throw new Error('书签不存在');
    }

    const updated: Bookmark = {
      ...bookmarks[index],
      ...data,
      updatedAt: Date.now(),
    };
    
    bookmarks[index] = updated;
    await chrome.storage.local.set({ [STORAGE_KEYS.BOOKMARKS]: bookmarks });
    
    return updated;
  }

  async deleteBookmark(id: string, permanent = false): Promise<void> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.BOOKMARKS);
    const bookmarks: Bookmark[] = result.bookmarks || [];
    
    if (permanent) {
      // 永久删除
      await chrome.storage.local.set({
        [STORAGE_KEYS.BOOKMARKS]: bookmarks.filter(b => b.id !== id),
      });
      // 同时删除快照
      await snapshotStorage.deleteSnapshot(id);
    } else {
      // 软删除
      const index = bookmarks.findIndex(b => b.id === id);
      if (index !== -1) {
        bookmarks[index].isDeleted = true;
        bookmarks[index].updatedAt = Date.now();
        await chrome.storage.local.set({ [STORAGE_KEYS.BOOKMARKS]: bookmarks });
      }
    }
  }

  async restoreBookmark(id: string): Promise<Bookmark> {
    return this.updateBookmark(id, { isDeleted: false });
  }

  async getDeletedBookmarks(): Promise<Bookmark[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.BOOKMARKS);
    const bookmarks: Bookmark[] = result.bookmarks || [];
    return bookmarks.filter(b => b.isDeleted);
  }

  // ============ 分类操作 ============

  async getCategories(): Promise<Category[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CATEGORIES);
    return result.categories || [];
  }

  async createCategory(name: string, parentId: string | null = null): Promise<Category> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CATEGORIES);
    const categories: Category[] = result.categories || [];
    
    // 同名检查
    if (categories.some(c => c.name === name && c.parentId === parentId)) {
      throw new Error('分类名称已存在');
    }

    const category: Category = {
      id: nanoid(),
      name,
      parentId,
      order: categories.length,
      createdAt: Date.now(),
    };

    await chrome.storage.local.set({
      [STORAGE_KEYS.CATEGORIES]: [...categories, category],
    });

    return category;
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CATEGORIES);
    const categories: Category[] = result.categories || [];
    
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('分类不存在');
    }

    const updated = { ...categories[index], ...data };
    categories[index] = updated;
    
    await chrome.storage.local.set({ [STORAGE_KEYS.CATEGORIES]: categories });
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.CATEGORIES,
      STORAGE_KEYS.BOOKMARKS,
    ]);
    
    const categories: Category[] = result.categories || [];
    const bookmarks: Bookmark[] = result.bookmarks || [];
    
    // 将该分类下的书签移至"未分类"
    const updatedBookmarks = bookmarks.map(b => 
      b.categoryId === id ? { ...b, categoryId: null, updatedAt: Date.now() } : b
    );

    await chrome.storage.local.set({
      [STORAGE_KEYS.CATEGORIES]: categories.filter(c => c.id !== id),
      [STORAGE_KEYS.BOOKMARKS]: updatedBookmarks,
    });
  }

  // ============ 标签操作 ============

  async getAllTags(): Promise<string[]> {
    const bookmarks = await this.getBookmarks();
    const tagSet = new Set<string>();
    bookmarks.forEach(b => b.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }

  // ============ 工具方法 ============

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // 移除 tracking 参数
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'fbclid'];
      trackingParams.forEach(param => parsed.searchParams.delete(param));
      // 移除末尾斜杠
      return parsed.toString().replace(/\/$/, '');
    } catch {
      return url;
    }
  }
}

export const bookmarkStorage = new BookmarkStorage();
```

#### IndexedDB 快照存储

```typescript
// apps/extension/lib/storage/snapshot-storage.ts
import type { Snapshot } from '@/types';

const DB_NAME = 'hamhome-snapshots';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

class SnapshotStorage {
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('bookmarkId', 'bookmarkId', { unique: true });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  async saveSnapshot(bookmarkId: string, html: string): Promise<Snapshot> {
    const db = await this.getDB();
    const blob = new Blob([html], { type: 'text/html' });
    
    const snapshot: Snapshot = {
      id: crypto.randomUUID(),
      bookmarkId,
      html: blob,
      size: blob.size,
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      // 先删除已存在的快照
      const index = store.index('bookmarkId');
      const getRequest = index.get(bookmarkId);
      
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          store.delete(getRequest.result.id);
        }
        
        const addRequest = store.add(snapshot);
        addRequest.onsuccess = () => resolve(snapshot);
        addRequest.onerror = () => reject(addRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getSnapshot(bookmarkId: string): Promise<Snapshot | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('bookmarkId');
      const request = index.get(bookmarkId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getSnapshotAsUrl(bookmarkId: string): Promise<string | null> {
    const snapshot = await this.getSnapshot(bookmarkId);
    if (!snapshot) return null;
    return URL.createObjectURL(snapshot.html);
  }

  async deleteSnapshot(bookmarkId: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('bookmarkId');
      const request = index.get(bookmarkId);

      request.onsuccess = () => {
        if (request.result) {
          store.delete(request.result.id);
        }
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async getStorageUsage(): Promise<{ count: number; totalSize: number }> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const snapshots: Snapshot[] = request.result || [];
        resolve({
          count: snapshots.length,
          totalSize: snapshots.reduce((sum, s) => sum + s.size, 0),
        });
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllSnapshots(): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const snapshotStorage = new SnapshotStorage();
```

#### AI 配置存储

```typescript
// apps/extension/lib/storage/config-storage.ts
import type { AIConfig, Settings } from '@/types';

const STORAGE_KEYS = {
  AI_CONFIG: 'aiConfig',
  SETTINGS: 'settings',
};

// 默认 AI 配置
const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'openai',
  apiKey: '',
  baseUrl: '',
  model: 'gpt-3.5-turbo',
  temperature: 0.3,
  maxTokens: 1000,
  enabled: false, // 默认关闭，需要用户配置后开启
};

// 默认设置
const DEFAULT_SETTINGS: Settings = {
  autoSaveSnapshot: true,
  defaultCategory: null,
  theme: 'system',
  language: 'zh',
  shortcut: 'Ctrl+Shift+E',
};

class ConfigStorage {
  async getAIConfig(): Promise<AIConfig> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.AI_CONFIG);
    return { ...DEFAULT_AI_CONFIG, ...result.aiConfig };
  }

  async setAIConfig(config: Partial<AIConfig>): Promise<AIConfig> {
    const current = await this.getAIConfig();
    const updated = { ...current, ...config };
    await chrome.storage.local.set({ [STORAGE_KEYS.AI_CONFIG]: updated });
    return updated;
  }

  async getSettings(): Promise<Settings> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...result.settings };
  }

  async setSettings(settings: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
    return updated;
  }
}

export const configStorage = new ConfigStorage();
```

---

## 5. AI 配置与调用流程

### 5.1 AI 配置方式

MVP 版本中，AI 能力完全由用户自行配置，插件直接调用配置的 AI 服务。

```
┌─────────────────────────────────────────────────────────┐
│                   AI 配置流程                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. 用户打开设置页面 (Options Page)                       │
│     └─ 选择 AI 服务商                                    │
│        ├─ OpenAI (官方 / 第三方中转)                      │
│        ├─ Anthropic                                     │
│        ├─ Ollama (本地部署)                              │
│        └─ 自定义 (兼容 OpenAI API)                       │
│                                                         │
│  2. 填写配置信息                                         │
│     ├─ API Key (除 Ollama 外必填)                        │
│     ├─ Base URL (可选，自定义端点)                        │
│     ├─ 模型名称 (可选，有默认值)                          │
│     └─ 参数 (Temperature, Max Tokens)                   │
│                                                         │
│  3. 测试连接                                             │
│     └─ 发送测试请求验证配置有效                           │
│                                                         │
│  4. 保存配置                                             │
│     └─ 存储至 chrome.storage.local                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.2 支持的 AI 服务配置

| 服务商 | API Key | Base URL | 模型示例 |
|-------|---------|----------|---------|
| OpenAI | ✅ 必填 | 默认官方 | gpt-3.5-turbo, gpt-4 |
| Anthropic | ✅ 必填 | 默认官方 | claude-3-haiku, claude-3-sonnet |
| Ollama | ❌ 不需要 | localhost:11434 | llama3, mistral |
| 自定义 | ✅ 必填 | 自定义 URL | 由用户指定 |

### 5.3 AI 调用流程

```
┌─────────────────────────────────────────────────────────┐
│                   AI 调用流程 (MVP)                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  用户点击收藏按钮                                         │
│         │                                               │
│         ▼                                               │
│  ┌─────────────────┐                                    │
│  │  Content Script │                                    │
│  │  提取网页正文    │                                    │
│  └────────┬────────┘                                    │
│           │                                             │
│           ▼                                             │
│  ┌─────────────────┐                                    │
│  │  Popup 面板     │                                    │
│  │  显示提取内容    │                                    │
│  └────────┬────────┘                                    │
│           │                                             │
│           ▼                                             │
│  ┌─────────────────┐    ┌─────────────────┐             │
│  │  检查 AI 配置   │───▶│ AI 已配置?      │             │
│  └─────────────────┘    └────────┬────────┘             │
│                                  │                      │
│           ┌──────────────────────┴──────────────────┐   │
│           ▼                                         ▼   │
│     [AI 已配置]                               [AI 未配置]│
│           │                                         │   │
│           ▼                                         │   │
│  ┌─────────────────┐                                │   │
│  │ 调用 AI 服务    │                                │   │
│  │ (插件直接调用)   │                                │   │
│  └────────┬────────┘                                │   │
│           │                                         │   │
│           ▼                                         ▼   │
│  ┌─────────────────┐                      ┌────────────┐│
│  │ 展示 AI 结果    │                      │ 使用默认值 ││
│  │ (摘要/标签/分类) │                      │ (原标题等) ││
│  └────────┬────────┘                      └─────┬──────┘│
│           │                                     │       │
│           └──────────────┬──────────────────────┘       │
│                          ▼                              │
│                 ┌─────────────────┐                     │
│                 │ 用户编辑确认    │                     │
│                 └────────┬────────┘                     │
│                          │                              │
│                          ▼                              │
│                 ┌─────────────────┐                     │
│                 │ 保存至本地存储  │                     │
│                 └─────────────────┘                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.4 AI 客户端实现

```typescript
// apps/extension/lib/ai/client.ts
import { createAIClient } from '@hamhome/ai';
import { configStorage } from '../storage/config-storage';
import type { AIConfig } from '@/types';

export interface AnalysisResult {
  title: string;
  summary: string;
  category: string;
  tags: string[];
}

class ExtensionAIClient {
  private config: AIConfig | null = null;

  async loadConfig(): Promise<AIConfig> {
    this.config = await configStorage.getAIConfig();
    return this.config;
  }

  isConfigured(): boolean {
    if (!this.config) return false;
    if (!this.config.enabled) return false;
    
    // Ollama 不需要 API Key
    if (this.config.provider === 'ollama') {
      return !!this.config.baseUrl;
    }
    
    return !!this.config.apiKey;
  }

  async analyze(input: {
    url: string;
    title: string;
    content: string;
  }): Promise<AnalysisResult> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.isConfigured()) {
      // AI 未配置，返回默认值
      return {
        title: input.title,
        summary: '',
        category: '',
        tags: [],
      };
    }

    try {
      const client = createAIClient({
        provider: this.config!.provider,
        apiKey: this.config!.apiKey,
        baseUrl: this.config!.baseUrl,
        model: this.config!.model,
        temperature: this.config!.temperature,
        maxTokens: this.config!.maxTokens,
      });

      const result = await client.analyzeBookmark(input);
      return result;
    } catch (error) {
      console.error('AI analysis failed:', error);
      // AI 调用失败，返回默认值，不阻塞用户流程
      return {
        title: input.title,
        summary: '',
        category: '',
        tags: [],
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config?.apiKey && this.config?.provider !== 'ollama') {
      return { success: false, message: '请先配置 API Key' };
    }

    try {
      const client = createAIClient({
        provider: this.config!.provider,
        apiKey: this.config!.apiKey,
        baseUrl: this.config!.baseUrl,
        model: this.config!.model,
      });

      // 发送简单的测试请求
      await client.analyzeBookmark({
        url: 'https://example.com',
        title: 'Test',
        content: 'This is a test.',
      });

      return { success: true, message: '连接成功' };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || 'Connection failed' 
      };
    }
  }
}

export const aiClient = new ExtensionAIClient();
```

---

## 6. 核心功能实现

### 6.1 Content Script - 正文提取

```typescript
// apps/extension/entrypoints/content.ts
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';

export interface PageContent {
  url: string;
  title: string;
  content: string;     // Markdown
  textContent: string; // 纯文本
  excerpt: string;
  favicon: string;
}

// 监听来自 Popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_CONTENT') {
    const content = extractPageContent();
    sendResponse(content);
  }
  return true;
});

function extractPageContent(): PageContent | null {
  try {
    // 克隆 DOM 以免影响原页面
    const doc = document.cloneNode(true) as Document;
    
    // 使用 Readability 提取正文
    const reader = new Readability(doc);
    const article = reader.parse();

    if (!article) {
      return {
        url: window.location.href,
        title: document.title,
        content: '',
        textContent: '',
        excerpt: getMetaDescription(),
        favicon: getFavicon(),
      };
    }

    // HTML 转 Markdown
    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
    const markdown = turndown.turndown(article.content);

    return {
      url: window.location.href,
      title: article.title || document.title,
      content: markdown,
      textContent: article.textContent,
      excerpt: article.excerpt || getMetaDescription(),
      favicon: getFavicon(),
    };
  } catch (error) {
    console.error('Failed to extract content:', error);
    return null;
  }
}

function getMetaDescription(): string {
  const meta = document.querySelector('meta[name="description"]');
  return meta?.getAttribute('content') || '';
}

function getFavicon(): string {
  const link = document.querySelector('link[rel*="icon"]') as HTMLLinkElement;
  if (link?.href) return link.href;
  
  return `https://www.google.com/s2/favicons?domain=${window.location.hostname}&sz=32`;
}

// 导出函数供 WXT 使用
export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // Content script 已加载
  },
});
```

### 6.2 Popup - 保存面板

```typescript
// apps/extension/entrypoints/popup/App.tsx
import { useState, useEffect } from 'react';
import { SavePanel } from '@/components/SavePanel';
import { BookmarkList } from '@/components/BookmarkList';
import { useCurrentPage } from '@/hooks/useCurrentPage';
import { bookmarkStorage } from '@/lib/storage/bookmark-storage';
import type { Bookmark } from '@/types';

type View = 'save' | 'list';

export function App() {
  const [view, setView] = useState<View>('save');
  const [existingBookmark, setExistingBookmark] = useState<Bookmark | null>(null);
  const { pageContent, loading, error } = useCurrentPage();

  // 检查当前页面是否已收藏
  useEffect(() => {
    if (pageContent?.url) {
      bookmarkStorage.getBookmarkByUrl(pageContent.url).then(setExistingBookmark);
    }
  }, [pageContent?.url]);

  if (loading) {
    return (
      <div className="w-[400px] h-[500px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="w-[400px] h-[500px] flex flex-col">
      {/* 顶部导航 */}
      <header className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐹</span>
          <span className="font-semibold">HamHome</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setView('save')}
            className={`px-3 py-1 rounded-md text-sm ${
              view === 'save' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
          >
            收藏
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1 rounded-md text-sm ${
              view === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
          >
            列表
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        {view === 'save' && pageContent && (
          <SavePanel
            pageContent={pageContent}
            existingBookmark={existingBookmark}
            onSaved={() => {
              // 保存成功后刷新状态
              bookmarkStorage.getBookmarkByUrl(pageContent.url).then(setExistingBookmark);
            }}
          />
        )}
        {view === 'list' && <BookmarkList />}
      </main>
    </div>
  );
}
```

### 6.3 保存面板组件

```typescript
// apps/extension/components/SavePanel/SavePanel.tsx
import { useState, useEffect } from 'react';
import { aiClient, type AnalysisResult } from '@/lib/ai/client';
import { bookmarkStorage } from '@/lib/storage/bookmark-storage';
import { snapshotStorage } from '@/lib/storage/snapshot-storage';
import { configStorage } from '@/lib/storage/config-storage';
import { Button, Input, Textarea, TagInput, Select, Toast } from '@hamhome/ui';
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import type { PageContent, Category, Bookmark } from '@/types';

interface SavePanelProps {
  pageContent: PageContent;
  existingBookmark: Bookmark | null;
  onSaved: () => void;
}

type AIStatus = 'idle' | 'loading' | 'success' | 'error' | 'disabled';

export function SavePanel({ pageContent, existingBookmark, onSaved }: SavePanelProps) {
  const [title, setTitle] = useState(pageContent.title);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [aiStatus, setAIStatus] = useState<AIStatus>('idle');
  const [aiError, setAIError] = useState<string | null>(null);

  // 加载分类列表
  useEffect(() => {
    bookmarkStorage.getCategories().then(setCategories);
  }, []);

  // 如果已存在书签，填充现有数据
  useEffect(() => {
    if (existingBookmark) {
      setTitle(existingBookmark.title);
      setDescription(existingBookmark.description);
      setCategoryId(existingBookmark.categoryId);
      setTags(existingBookmark.tags);
    }
  }, [existingBookmark]);

  // 自动触发 AI 分析
  useEffect(() => {
    if (!existingBookmark) {
      runAIAnalysis();
    }
  }, []);

  const runAIAnalysis = async () => {
    const config = await configStorage.getAIConfig();
    
    if (!config.enabled) {
      setAIStatus('disabled');
      return;
    }

    setAIStatus('loading');
    setAIError(null);

    try {
      await aiClient.loadConfig();
      
      if (!aiClient.isConfigured()) {
        setAIStatus('disabled');
        return;
      }

      const result = await aiClient.analyze({
        url: pageContent.url,
        title: pageContent.title,
        content: pageContent.content,
      });

      // 更新表单
      if (result.title) setTitle(result.title);
      if (result.summary) setDescription(result.summary);
      if (result.tags.length) setTags(result.tags);
      
      // 查找匹配的分类
      if (result.category) {
        const matchedCategory = categories.find(
          c => c.name.toLowerCase() === result.category.toLowerCase()
        );
        if (matchedCategory) {
          setCategoryId(matchedCategory.id);
        }
      }

      setAIStatus('success');
    } catch (error: any) {
      setAIStatus('error');
      setAIError(error.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const settings = await configStorage.getSettings();
      
      const data = {
        url: pageContent.url,
        title,
        description,
        content: pageContent.content,
        categoryId,
        tags,
        favicon: pageContent.favicon,
        hasSnapshot: false,
      };

      let bookmark: Bookmark;
      
      if (existingBookmark) {
        // 更新现有书签
        bookmark = await bookmarkStorage.updateBookmark(existingBookmark.id, data);
      } else {
        // 创建新书签
        bookmark = await bookmarkStorage.createBookmark(data);
      }

      // 自动保存快照
      if (settings.autoSaveSnapshot) {
        try {
          // 获取页面 HTML (通过 background script)
          const html = await chrome.runtime.sendMessage({ type: 'GET_PAGE_HTML' });
          if (html) {
            await snapshotStorage.saveSnapshot(bookmark.id, html);
            await bookmarkStorage.updateBookmark(bookmark.id, { hasSnapshot: true });
          }
        } catch (e) {
          console.warn('Failed to save snapshot:', e);
        }
      }

      Toast.success(existingBookmark ? '书签已更新' : '收藏成功');
      onSaved();
    } catch (error: any) {
      Toast.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* AI 状态提示 */}
      <AIStatusBanner 
        status={aiStatus} 
        error={aiError}
        onRetry={runAIAnalysis}
      />

      {/* 已收藏提示 */}
      {existingBookmark && (
        <div className="flex items-center gap-2 p-2 bg-accent rounded-md text-sm">
          <Check className="h-4 w-4 text-green-500" />
          <span>此页面已收藏，可更新信息</span>
        </div>
      )}

      {/* 表单 */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">标题</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入标题"
          />
        </div>

        <div>
          <label className="text-sm font-medium">摘要</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="输入摘要或等待 AI 生成"
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm font-medium">分类</label>
          <Select
            value={categoryId || ''}
            onValueChange={(v) => setCategoryId(v || null)}
          >
            <Select.Option value="">未分类</Select.Option>
            {categories.map((c) => (
              <Select.Option key={c.id} value={c.id}>
                {c.name}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">标签</label>
          <TagInput
            value={tags}
            onChange={setTags}
            placeholder="输入标签后回车"
            maxTags={10}
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={handleSave}
          disabled={saving || !title}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            existingBookmark ? '更新书签' : '保存'
          )}
        </Button>
        
        {aiStatus !== 'loading' && aiClient.isConfigured() && (
          <Button variant="outline" onClick={runAIAnalysis}>
            <Sparkles className="h-4 w-4 mr-1" />
            重新分析
          </Button>
        )}
      </div>
    </div>
  );
}

// AI 状态提示组件
function AIStatusBanner({ 
  status, 
  error,
  onRetry 
}: { 
  status: AIStatus; 
  error: string | null;
  onRetry: () => void;
}) {
  switch (status) {
    case 'loading':
      return (
        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>AI 正在分析...</span>
        </div>
      );
    case 'success':
      return (
        <div className="flex items-center gap-2 p-2 bg-green-100 dark:bg-green-900/30 rounded-md text-sm text-green-700 dark:text-green-300">
          <Sparkles className="h-4 w-4" />
          <span>AI 分析完成</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center justify-between p-2 bg-destructive/10 rounded-md text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>AI 分析失败: {error}</span>
          </div>
          <button onClick={onRetry} className="underline">
            重试
          </button>
        </div>
      );
    case 'disabled':
      return (
        <div className="flex items-center justify-between p-2 bg-muted rounded-md text-sm text-muted-foreground">
          <span>AI 未配置，使用手动填写</span>
          <button 
            onClick={() => chrome.runtime.openOptionsPage()}
            className="underline"
          >
            去配置
          </button>
        </div>
      );
    default:
      return null;
  }
}
```

### 6.4 Background Script

```typescript
// apps/extension/entrypoints/background.ts
import { snapshotStorage } from '@/lib/storage/snapshot-storage';

export default defineBackground(() => {
  // 监听快捷键
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'save-bookmark') {
      // 打开 Popup (如果已打开则聚焦)
      chrome.action.openPopup();
    }
  });

  // 监听消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_PAGE_HTML') {
      // 获取当前标签页的完整 HTML
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (!tabs[0]?.id) {
          sendResponse(null);
          return;
        }

        try {
          // 注入脚本获取完整 HTML
          const results = await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => document.documentElement.outerHTML,
          });
          
          sendResponse(results[0]?.result || null);
        } catch (e) {
          sendResponse(null);
        }
      });
      
      return true; // 保持消息通道开放
    }
  });

  // 安装/更新时初始化
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      // 首次安装，打开设置页面
      chrome.runtime.openOptionsPage();
    }
  });
});
```

### 6.5 Options Page - 设置页面

```typescript
// apps/extension/entrypoints/options/App.tsx
import { useState, useEffect } from 'react';
import { configStorage } from '@/lib/storage/config-storage';
import { snapshotStorage } from '@/lib/storage/snapshot-storage';
import { aiClient } from '@/lib/ai/client';
import { 
  Button, 
  Input, 
  Select, 
  Switch, 
  Toast 
} from '@hamhome/ui';
import type { AIConfig, Settings } from '@/types';

export function App() {
  const [activeTab, setActiveTab] = useState<'ai' | 'general' | 'storage'>('ai');
  
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <header className="flex items-center gap-3 mb-8">
          <span className="text-3xl">🐹</span>
          <div>
            <h1 className="text-2xl font-bold">HamHome 设置</h1>
            <p className="text-muted-foreground">配置你的智能书签助手</p>
          </div>
        </header>

        {/* 标签页导航 */}
        <nav className="flex gap-1 mb-6 border-b">
          {[
            { id: 'ai', label: 'AI 配置' },
            { id: 'general', label: '通用设置' },
            { id: 'storage', label: '存储管理' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* 标签页内容 */}
        {activeTab === 'ai' && <AIConfigTab />}
        {activeTab === 'general' && <GeneralSettingsTab />}
        {activeTab === 'storage' && <StorageManagementTab />}
      </div>
    </div>
  );
}

// AI 配置标签页
function AIConfigTab() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    configStorage.getAIConfig().then((c) => {
      setConfig(c);
      setLoading(false);
    });
  }, []);

  if (loading || !config) {
    return <div className="animate-pulse">加载中...</div>;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await configStorage.setAIConfig(config);
      Toast.success('AI 配置已保存');
    } catch (e) {
      Toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await aiClient.loadConfig();
      const result = await aiClient.testConnection();
      if (result.success) {
        Toast.success(result.message);
      } else {
        Toast.error(result.message);
      }
    } catch (e: any) {
      Toast.error(e.message || '测试失败');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-card rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">启用 AI 分析</h3>
            <p className="text-sm text-muted-foreground">
              开启后，收藏时将自动分析网页内容
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => 
              setConfig({ ...config, enabled: checked })
            }
          />
        </div>
      </div>

      {config.enabled && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">AI 服务商</label>
            <Select
              value={config.provider}
              onValueChange={(v) => 
                setConfig({ ...config, provider: v as AIConfig['provider'] })
              }
            >
              <Select.Option value="openai">OpenAI</Select.Option>
              <Select.Option value="anthropic">Anthropic</Select.Option>
              <Select.Option value="ollama">Ollama (本地)</Select.Option>
              <Select.Option value="custom">自定义 (兼容 OpenAI API)</Select.Option>
            </Select>
          </div>

          {config.provider !== 'ollama' && (
            <div>
              <label className="text-sm font-medium">API Key</label>
              <Input
                type="password"
                value={config.apiKey || ''}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sk-..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                你的 API Key 仅存储在本地，不会上传至任何服务器
              </p>
            </div>
          )}

          {(config.provider === 'ollama' || config.provider === 'custom') && (
            <div>
              <label className="text-sm font-medium">
                {config.provider === 'ollama' ? 'Ollama 地址' : '自定义端点'}
              </label>
              <Input
                value={config.baseUrl || ''}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                placeholder={
                  config.provider === 'ollama' 
                    ? 'http://localhost:11434/v1'
                    : 'https://api.example.com/v1'
                }
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium">模型</label>
            <Input
              value={config.model || ''}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              placeholder={getDefaultModel(config.provider)}
            />
          </div>

          <details className="group">
            <summary className="cursor-pointer text-sm font-medium">
              高级参数
            </summary>
            <div className="mt-3 pl-4 space-y-3">
              <div>
                <label className="text-sm">Temperature ({config.temperature})</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.temperature || 0.3}
                  onChange={(e) => 
                    setConfig({ ...config, temperature: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm">Max Tokens</label>
                <Input
                  type="number"
                  value={config.maxTokens || 1000}
                  onChange={(e) => 
                    setConfig({ ...config, maxTokens: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>
          </details>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存配置'}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? '测试中...' : '测试连接'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// 通用设置标签页
function GeneralSettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    configStorage.getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  if (loading || !settings) {
    return <div className="animate-pulse">加载中...</div>;
  }

  const handleChange = async (key: keyof Settings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await configStorage.setSettings(updated);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-card rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">自动保存快照</h3>
            <p className="text-sm text-muted-foreground">
              收藏时自动保存网页的本地副本
            </p>
          </div>
          <Switch
            checked={settings.autoSaveSnapshot}
            onCheckedChange={(checked) => handleChange('autoSaveSnapshot', checked)}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">主题</label>
        <Select
          value={settings.theme}
          onValueChange={(v) => handleChange('theme', v)}
        >
          <Select.Option value="system">跟随系统</Select.Option>
          <Select.Option value="light">明亮</Select.Option>
          <Select.Option value="dark">暗黑</Select.Option>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">语言</label>
        <Select
          value={settings.language}
          onValueChange={(v) => handleChange('language', v)}
        >
          <Select.Option value="zh">中文</Select.Option>
          <Select.Option value="en">English</Select.Option>
        </Select>
      </div>
    </div>
  );
}

// 存储管理标签页
function StorageManagementTab() {
  const [usage, setUsage] = useState<{ count: number; totalSize: number } | null>(null);

  useEffect(() => {
    snapshotStorage.getStorageUsage().then(setUsage);
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const handleClearSnapshots = async () => {
    if (confirm('确定要清除所有快照吗？此操作不可撤销。')) {
      await snapshotStorage.clearAllSnapshots();
      setUsage({ count: 0, totalSize: 0 });
      Toast.success('快照已清除');
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-card rounded-lg border">
        <h3 className="font-medium mb-2">快照存储</h3>
        {usage ? (
          <div className="text-sm text-muted-foreground">
            <p>快照数量: {usage.count}</p>
            <p>占用空间: {formatSize(usage.totalSize)}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">加载中...</p>
        )}
        <Button 
          variant="destructive" 
          size="sm" 
          className="mt-3"
          onClick={handleClearSnapshots}
        >
          清除所有快照
        </Button>
      </div>

      <div className="p-4 bg-card rounded-lg border">
        <h3 className="font-medium mb-2">数据导出</h3>
        <p className="text-sm text-muted-foreground mb-3">
          导出所有书签数据，可用于备份或迁移
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportAsJSON}>
            导出 JSON
          </Button>
          <Button variant="outline" size="sm" onClick={exportAsHTML}>
            导出 HTML
          </Button>
        </div>
      </div>
    </div>
  );
}

// 工具函数
function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'openai': return 'gpt-3.5-turbo';
    case 'anthropic': return 'claude-3-haiku-20240307';
    case 'ollama': return 'llama3';
    default: return '';
  }
}

async function exportAsJSON() {
  const { bookmarkStorage } = await import('@/lib/storage/bookmark-storage');
  const bookmarks = await bookmarkStorage.getBookmarks();
  const categories = await bookmarkStorage.getCategories();
  
  const data = {
    version: '1.0.0',
    exportedAt: Date.now(),
    bookmarks,
    categories,
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url,
    filename: `hamhome-export-${new Date().toISOString().split('T')[0]}.json`,
  });
}

async function exportAsHTML() {
  const { bookmarkStorage } = await import('@/lib/storage/bookmark-storage');
  const bookmarks = await bookmarkStorage.getBookmarks();
  
  // 生成 Netscape 书签格式
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>HamHome Bookmarks</TITLE>
<H1>HamHome Bookmarks</H1>
<DL><p>
`;
  
  bookmarks.forEach((b) => {
    const addDate = Math.floor(b.createdAt / 1000);
    html += `    <DT><A HREF="${b.url}" ADD_DATE="${addDate}">${b.title}</A>\n`;
  });
  
  html += `</DL><p>`;
  
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url,
    filename: `hamhome-bookmarks-${new Date().toISOString().split('T')[0]}.html`,
  });
}
```

---

## 7. WXT 配置

```typescript
// apps/extension/wxt.config.ts
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'HamHome - 智能书签助手',
    description: '🐹 让收藏不再积灰，AI 驱动的智能书签管理工具',
    version: '1.0.0',
    permissions: [
      'storage',
      'activeTab',
      'scripting',
      'downloads',
    ],
    host_permissions: [
      '<all_urls>',
    ],
    commands: {
      'save-bookmark': {
        suggested_key: {
          default: 'Ctrl+Shift+E',
          mac: 'Command+Shift+E',
        },
        description: '快速收藏当前页面',
      },
    },
    icons: {
      16: 'icon-16.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
  },
});
```

---

## 8. 与完整版本的边界划分

### 8.1 数据迁移方案

MVP 用户升级到完整版时，需要支持本地数据迁移至云端：

```typescript
// 数据迁移接口 (完整版实现)
interface MigrationService {
  // 检测本地数据
  detectLocalData(): Promise<{ bookmarks: number; categories: number; snapshots: number }>;
  
  // 上传本地数据到云端
  migrateToCloud(token: string): Promise<MigrationResult>;
  
  // 清除本地数据 (迁移后可选)
  clearLocalData(): Promise<void>;
}
```

### 8.2 功能开关

```typescript
// 版本检测与功能开关
const isCloudEnabled = async (): Promise<boolean> => {
  const config = await chrome.storage.local.get('cloudConfig');
  return !!config.cloudConfig?.enabled && !!config.cloudConfig?.token;
};

// 在存储层中根据配置切换实现
const getStorageAdapter = async () => {
  if (await isCloudEnabled()) {
    return new CloudStorageAdapter(); // 完整版：调用后端 API
  }
  return new LocalStorageAdapter();   // MVP：本地存储
};
```

### 8.3 扩展功能预留

MVP 版本中，以下功能模块预留接口但不实现：

| 功能 | MVP 状态 | 接口预留 |
|-----|---------|---------|
| 向量搜索 | ❌ 不支持 | `searchByVector(query: string)` |
| 语义问答 | ❌ 不支持 | `askQuestion(question: string)` |
| 跨设备同步 | ❌ 不支持 | `sync()` |
| 回顾推送 | ❌ 不支持 | `getReviewSuggestions()` |

---

## 9. 依赖清单

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@mozilla/readability": "^0.5.0",
    "turndown": "^7.1.2",
    "nanoid": "^5.0.0",
    "@hamhome/ui": "workspace:*",
    "@hamhome/ai": "workspace:*",
    "@hamhome/types": "workspace:*",
    "@hamhome/utils": "workspace:*"
  },
  "devDependencies": {
    "wxt": "^0.18.0",
    "@wxt-dev/module-react": "^1.0.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## 10. 开发与发布

### 10.1 本地开发

```bash
# 启动开发模式
pnpm --filter extension dev

# 构建生产版本
pnpm --filter extension build

# 打包为 zip
pnpm --filter extension zip
```

### 10.2 发布流程

1. **Chrome Web Store**
   - 生成 zip 包
   - 上传至 Chrome 开发者控制台
   - 填写商店信息、截图
   - 提交审核

2. **Edge Add-ons**
   - 复用 Chrome 构建包
   - 提交至 Edge 开发者中心

3. **Firefox Add-ons**
   - 运行 `wxt build --browser firefox`
   - 提交至 Firefox Add-ons

4. **开源发布**
   - GitHub Releases 发布 zip 包
   - 用户可手动加载插件

