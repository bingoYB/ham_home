# HamHome 前端 Web 端技术方案

本文档描述 HamHome Web 管理端的技术实现细节，包括架构设计、核心模块、页面结构和关键功能实现。

## 1. 技术选型

| 类别 | 选型 | 说明 |
|-----|------|------|
| 框架 | Next.js 14+ (App Router) | RSC 支持，部署便捷 |
| 部署 | Cloudflare Pages | Edge Runtime，全球加速 |
| 语言 | TypeScript | 严格模式 |
| 样式 | Tailwind CSS | 原子化 CSS |
| UI | Shadcn/UI | 共享组件库 (@hamhome/ui) |
| 状态管理 | Zustand | 轻量级全局状态 |
| 数据获取 | TanStack Query v5 | 缓存、重试、乐观更新 |
| 表单 | React Hook Form + Zod | 类型安全表单验证 |
| 认证 | Supabase Auth + @supabase/ssr | SSR 友好的认证方案 |

---

## 2. 项目结构

```text
apps/web/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # 认证相关页面 (无布局)
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/          # 主应用布局
│   │   │   ├── layout.tsx        # Dashboard 布局 (侧边栏 + 主内容)
│   │   │   ├── page.tsx          # 首页 (全部书签)
│   │   │   ├── bookmarks/
│   │   │   │   └── [id]/         # 书签详情/编辑
│   │   │   ├── collections/
│   │   │   │   └── [id]/         # 分类详情
│   │   │   ├── tags/
│   │   │   │   └── [name]/       # 标签筛选
│   │   │   ├── trash/            # 回收站
│   │   │   ├── search/           # 搜索结果
│   │   │   ├── import/           # 书签导入
│   │   │   └── settings/         # 设置页面
│   │   │       ├── profile/
│   │   │       ├── ai/           # AI 配置
│   │   │       └── export/       # 数据导出
│   │   ├── api/                  # API Routes (可选)
│   │   └── layout.tsx            # 根布局
│   │
│   ├── components/               # 业务组件
│   │   ├── bookmark/
│   │   │   ├── BookmarkList.tsx
│   │   │   ├── BookmarkCard.tsx
│   │   │   ├── BookmarkTable.tsx
│   │   │   └── BookmarkActions.tsx
│   │   ├── collection/
│   │   │   ├── CollectionTree.tsx
│   │   │   └── CollectionForm.tsx
│   │   ├── search/
│   │   │   ├── SearchBar.tsx
│   │   │   └── SearchResults.tsx
│   │   ├── import/
│   │   │   ├── ImportUploader.tsx
│   │   │   └── ImportPreview.tsx
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       └── MainContent.tsx
│   │
│   ├── hooks/                    # 自定义 Hooks
│   │   ├── useBookmarks.ts
│   │   ├── useCollections.ts
│   │   ├── useSearch.ts
│   │   └── useAuth.ts
│   │
│   ├── lib/                      # 工具库
│   │   ├── api.ts                # API 客户端
│   │   ├── supabase/
│   │   │   ├── client.ts         # 浏览器端 Client
│   │   │   ├── server.ts         # 服务端 Client
│   │   │   └── middleware.ts     # Auth Middleware
│   │   └── utils.ts
│   │
│   ├── stores/                   # Zustand Stores
│   │   ├── ui-store.ts           # UI 状态 (侧边栏、视图模式)
│   │   └── bookmark-store.ts     # 书签选中状态
│   │
│   └── types/                    # 类型定义
│       └── index.ts
│
├── public/
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## 3. 核心功能模块

### 3.1 认证模块

#### 3.1.1 Supabase SSR 配置

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

#### 3.1.2 认证中间件

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 保护路由
  const protectedPaths = ['/bookmarks', '/collections', '/settings', '/trash', '/import'];
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 已登录用户访问认证页面时重定向
  if (user && (request.nextUrl.pathname.startsWith('/login') || 
               request.nextUrl.pathname.startsWith('/signup'))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
```

#### 3.1.3 登录页面

```typescript
// src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Input } from '@hamhome/ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center">登录 HamHome</h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">或</span>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthLogin('google')}
          >
            使用 Google 登录
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthLogin('github')}
          >
            使用 GitHub 登录
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

### 3.2 书签管理模块

#### 3.2.1 API 客户端

```typescript
// src/lib/api.ts
import { createClient } from './supabase/client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.hamhome.app';

class APIClient {
  private async getHeaders() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    return {
      'Content-Type': 'application/json',
      'Authorization': session?.access_token 
        ? `Bearer ${session.access_token}` 
        : '',
    };
  }

  async get<T>(path: string): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE}${path}`, { headers });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }

  async post<T>(path: string, data: unknown): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }

  async put<T>(path: string, data: unknown): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }

  async delete(path: string): Promise<void> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
  }
}

export const api = new APIClient();
```

#### 3.2.2 书签 Hooks (TanStack Query)

```typescript
// src/hooks/useBookmarks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Bookmark, BookmarkQuery } from '@hamhome/types';

// 查询 Keys
export const bookmarkKeys = {
  all: ['bookmarks'] as const,
  lists: () => [...bookmarkKeys.all, 'list'] as const,
  list: (query: BookmarkQuery) => [...bookmarkKeys.lists(), query] as const,
  details: () => [...bookmarkKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookmarkKeys.details(), id] as const,
};

// 获取书签列表
export function useBookmarks(query: BookmarkQuery = {}) {
  return useQuery({
    queryKey: bookmarkKeys.list(query),
    queryFn: () => api.get<{ items: Bookmark[]; total: number }>(
      `/bookmarks?${new URLSearchParams(query as Record<string, string>)}`
    ),
  });
}

// 获取单个书签
export function useBookmark(id: string) {
  return useQuery({
    queryKey: bookmarkKeys.detail(id),
    queryFn: () => api.get<Bookmark>(`/bookmarks/${id}`),
    enabled: !!id,
  });
}

// 创建书签
export function useCreateBookmark() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>) =>
      api.post<Bookmark>('/bookmarks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.lists() });
    },
  });
}

// 更新书签
export function useUpdateBookmark() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Bookmark> & { id: string }) =>
      api.put<Bookmark>(`/bookmarks/${id}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.lists() });
      queryClient.setQueryData(bookmarkKeys.detail(data.id), data);
    },
  });
}

// 删除书签 (软删除)
export function useDeleteBookmark() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.delete(`/bookmarks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.lists() });
    },
  });
}

// 批量操作
export function useBatchBookmarkAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: {
      ids: string[];
      action: 'delete' | 'move' | 'tag';
      payload?: { categoryId?: string; tags?: string[] };
    }) => api.post('/bookmarks/batch', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.lists() });
    },
  });
}
```

#### 3.2.3 书签列表组件

```typescript
// src/components/bookmark/BookmarkList.tsx
'use client';

import { useState } from 'react';
import { useBookmarks, useDeleteBookmark } from '@/hooks/useBookmarks';
import { BookmarkCard } from './BookmarkCard';
import { BookmarkTable } from './BookmarkTable';
import { Button, Skeleton } from '@hamhome/ui';
import { Grid, List, Trash2 } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useBookmarkStore } from '@/stores/bookmark-store';

interface BookmarkListProps {
  categoryId?: string;
  tags?: string[];
}

export function BookmarkList({ categoryId, tags }: BookmarkListProps) {
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const { selectedIds, toggleSelection, clearSelection } = useBookmarkStore();
  
  const { data, isLoading, error } = useBookmarks({
    categoryId,
    tags,
    limit: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const deleteBookmark = useDeleteBookmark();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        加载失败: {error.message}
      </div>
    );
  }

  const bookmarks = data?.items || [];

  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        暂无书签，去收藏一些内容吧~
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                已选择 {selectedIds.length} 项
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  selectedIds.forEach((id) => deleteBookmark.mutate(id));
                  clearSelection();
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                删除
              </Button>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'card' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('card')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 书签展示 */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookmarks.map((bookmark) => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              selected={selectedIds.includes(bookmark.id)}
              onSelect={() => toggleSelection(bookmark.id)}
            />
          ))}
        </div>
      ) : (
        <BookmarkTable
          bookmarks={bookmarks}
          selectedIds={selectedIds}
          onSelect={toggleSelection}
        />
      )}
    </div>
  );
}
```

---

### 3.3 搜索模块

#### 3.3.1 搜索 Hook

```typescript
// src/hooks/useSearch.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDebounce } from '@hamhome/ui';
import type { Bookmark } from '@hamhome/types';

interface SearchResult {
  items: Bookmark[];
  total: number;
  searchType: 'keyword' | 'semantic' | 'hybrid';
}

export function useSearch(query: string, enabled = true) {
  const debouncedQuery = useDebounce(query, 300);
  
  return useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) {
        return { items: [], total: 0, searchType: 'keyword' };
      }
      
      return api.get<SearchResult>(
        `/search?q=${encodeURIComponent(debouncedQuery)}`
      );
    },
    enabled: enabled && debouncedQuery.length > 0,
    staleTime: 1000 * 60, // 1 分钟缓存
  });
}
```

#### 3.3.2 搜索组件

```typescript
// src/components/search/SearchBar.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@hamhome/ui';
import { Search, X } from 'lucide-react';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setQuery('');
    }
  };

  // 快捷键 Cmd/Ctrl + K 聚焦搜索框
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };
    
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        id="search-input"
        type="search"
        placeholder="搜索书签... (⌘K)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="pl-9 pr-9"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </button>
      )}
    </form>
  );
}
```

---

### 3.4 书签导入模块

#### 3.4.1 导入流程

```
┌─────────────────────────────────────────────────────────┐
│                      书签导入流程                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. 选择导入方式                                         │
│     ├─ 上传 HTML 书签文件                                │
│     └─ 读取当前浏览器书签 (Web 端不支持)                   │
│                                                         │
│  2. 解析书签文件                                         │
│     └─ 客户端使用 cheerio 解析 Netscape HTML              │
│                                                         │
│  3. 预览与配置                                           │
│     ├─ 展示解析结果 (数量、文件夹结构)                     │
│     ├─ 选择: 保留文件夹 / 转为标签                        │
│     └─ 选择: 是否启用 AI 处理                             │
│                                                         │
│  4. 批量处理                                             │
│     ├─ 分批提交 (每批 20 条)                              │
│     ├─ AI 处理 (可选，前端调用)                           │
│     └─ 显示进度条                                        │
│                                                         │
│  5. 导入完成                                             │
│     └─ 显示结果: 成功/跳过/失败数量                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 3.4.2 书签解析器

```typescript
// src/lib/bookmark-parser.ts
import * as cheerio from 'cheerio';

export interface ParsedBookmark {
  url: string;
  title: string;
  addDate?: number;
  folder?: string[];  // 文件夹路径
}

export interface ParseResult {
  bookmarks: ParsedBookmark[];
  folderCount: number;
  totalCount: number;
}

export function parseBookmarkHTML(html: string): ParseResult {
  const $ = cheerio.load(html);
  const bookmarks: ParsedBookmark[] = [];
  
  function traverse(element: cheerio.Cheerio<any>, path: string[] = []) {
    element.children().each((_, child) => {
      const $child = $(child);
      
      if (child.tagName === 'dt') {
        const $a = $child.children('a').first();
        const $h3 = $child.children('h3').first();
        
        if ($a.length) {
          // 书签链接
          const url = $a.attr('href');
          const title = $a.text().trim();
          const addDate = parseInt($a.attr('add_date') || '0', 10) * 1000;
          
          if (url && title) {
            bookmarks.push({
              url,
              title,
              addDate: addDate || undefined,
              folder: path.length > 0 ? [...path] : undefined,
            });
          }
        } else if ($h3.length) {
          // 文件夹
          const folderName = $h3.text().trim();
          const $dl = $child.children('dl').first();
          
          if ($dl.length && folderName) {
            traverse($dl, [...path, folderName]);
          }
        }
      } else if (child.tagName === 'dl') {
        traverse($child, path);
      }
    });
  }

  const $root = $('dl').first();
  traverse($root);

  const folders = new Set<string>();
  bookmarks.forEach((b) => {
    if (b.folder) {
      b.folder.forEach((_, i) => {
        folders.add(b.folder!.slice(0, i + 1).join('/'));
      });
    }
  });

  return {
    bookmarks,
    folderCount: folders.size,
    totalCount: bookmarks.length,
  };
}
```

#### 3.4.3 导入组件

```typescript
// src/components/import/ImportUploader.tsx
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { parseBookmarkHTML, ParseResult } from '@/lib/bookmark-parser';
import { Button, Progress } from '@hamhome/ui';
import { Upload, FileText, Check, X } from 'lucide-react';

interface ImportUploaderProps {
  onParsed: (result: ParseResult) => void;
}

export function ImportUploader({ onParsed }: ImportUploaderProps) {
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setParsing(true);
    setError(null);

    try {
      const html = await file.text();
      const result = parseBookmarkHTML(html);
      
      if (result.totalCount === 0) {
        setError('未在文件中找到有效书签');
        return;
      }
      
      onParsed(result);
    } catch (err) {
      setError('解析文件失败，请确保上传的是有效的书签 HTML 文件');
    } finally {
      setParsing(false);
    }
  }, [onParsed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/html': ['.html', '.htm'],
    },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
        transition-colors
        ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
        ${error ? 'border-destructive' : ''}
      `}
    >
      <input {...getInputProps()} />
      
      {parsing ? (
        <div className="space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">正在解析书签文件...</p>
        </div>
      ) : (
        <>
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">
            {isDragActive ? '释放文件开始导入' : '拖拽或点击上传书签文件'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            支持 Chrome/Firefox/Safari 导出的 HTML 书签文件
          </p>
        </>
      )}
      
      {error && (
        <p className="text-destructive text-sm mt-4">{error}</p>
      )}
    </div>
  );
}
```

---

### 3.5 设置模块

#### 3.5.1 AI 配置页面

```typescript
// src/app/(dashboard)/settings/ai/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Select, Toast } from '@hamhome/ui';
import { api } from '@/lib/api';

const AIConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'custom', 'workers-ai']),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional().or(z.literal('')),
  model: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
});

type AIConfigForm = z.infer<typeof AIConfigSchema>;

export default function AISettingsPage() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const form = useForm<AIConfigForm>({
    resolver: zodResolver(AIConfigSchema),
    defaultValues: {
      provider: 'openai',
      temperature: 0.3,
    },
  });

  const provider = form.watch('provider');

  // 加载现有配置
  useEffect(() => {
    api.get<AIConfigForm>('/settings/ai')
      .then((data) => form.reset(data))
      .catch(() => {});
  }, [form]);

  const onSubmit = async (data: AIConfigForm) => {
    setLoading(true);
    try {
      await api.put('/settings/ai', data);
      Toast.success('AI 配置已保存');
    } catch (err) {
      Toast.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      await api.post('/settings/ai/test', form.getValues());
      Toast.success('连接成功');
    } catch (err) {
      Toast.error('连接失败，请检查配置');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">AI 配置</h1>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">AI 服务商</label>
          <Select
            value={provider}
            onValueChange={(v) => form.setValue('provider', v as any)}
          >
            <Select.Option value="openai">OpenAI</Select.Option>
            <Select.Option value="anthropic">Anthropic</Select.Option>
            <Select.Option value="workers-ai">Cloudflare Workers AI</Select.Option>
            <Select.Option value="custom">自定义 (兼容 OpenAI API)</Select.Option>
          </Select>
        </div>

        {provider !== 'workers-ai' && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <Input
                type="password"
                placeholder="sk-..."
                {...form.register('apiKey')}
              />
              <p className="text-xs text-muted-foreground">
                你的 API Key 将加密存储在服务器端
              </p>
            </div>

            {provider === 'custom' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">自定义端点</label>
                <Input
                  placeholder="https://api.example.com/v1"
                  {...form.register('baseUrl')}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">模型</label>
              <Input
                placeholder={provider === 'openai' ? 'gpt-3.5-turbo' : 'claude-3-haiku-20240307'}
                {...form.register('model')}
              />
            </div>
          </>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? '保存中...' : '保存配置'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={testConnection}
            disabled={testing}
          >
            {testing ? '测试中...' : '测试连接'}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

---

## 4. 布局与导航

### 4.1 Dashboard 布局

```typescript
// src/app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 4.2 侧边栏组件

```typescript
// src/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCollections } from '@/hooks/useCollections';
import { cn } from '@hamhome/ui';
import { 
  Bookmark, 
  Folder, 
  Tag, 
  Trash2, 
  Settings, 
  Upload,
  ChevronRight 
} from 'lucide-react';

const navItems = [
  { href: '/', label: '全部书签', icon: Bookmark },
  { href: '/trash', label: '回收站', icon: Trash2 },
  { href: '/import', label: '导入', icon: Upload },
  { href: '/settings', label: '设置', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: collections } = useCollections();

  return (
    <aside className="w-64 bg-card border-r flex flex-col">
      <div className="p-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🐹</span>
          <span className="font-bold text-lg">HamHome</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
              'hover:bg-accent transition-colors',
              pathname === item.href && 'bg-accent font-medium'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}

        {/* 分类列表 */}
        <div className="pt-4">
          <div className="flex items-center justify-between px-3 py-2 text-sm font-medium text-muted-foreground">
            <span>分类</span>
            <button className="hover:text-foreground">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {collections?.map((collection) => (
            <Link
              key={collection.id}
              href={`/collections/${collection.id}`}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
                'hover:bg-accent transition-colors',
                pathname === `/collections/${collection.id}` && 'bg-accent font-medium'
              )}
            >
              <Folder className="h-4 w-4" />
              {collection.name}
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
}
```

---

## 5. 状态管理

### 5.1 UI Store

```typescript
// src/stores/ui-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  viewMode: 'card' | 'list';
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  
  setViewMode: (mode: 'card' | 'list') => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      viewMode: 'card',
      sidebarCollapsed: false,
      theme: 'system',
      
      setViewMode: (mode) => set({ viewMode: mode }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'hamhome-ui',
    }
  )
);
```

### 5.2 Bookmark Selection Store

```typescript
// src/stores/bookmark-store.ts
import { create } from 'zustand';

interface BookmarkState {
  selectedIds: string[];
  
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
}

export const useBookmarkStore = create<BookmarkState>((set) => ({
  selectedIds: [],
  
  toggleSelection: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((i) => i !== id)
        : [...s.selectedIds, id],
    })),
    
  selectAll: (ids) => set({ selectedIds: ids }),
  
  clearSelection: () => set({ selectedIds: [] }),
}));
```

---

## 6. 部署配置

### 6.1 Next.js 配置

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静态导出 (如果不使用 Edge Runtime)
  // output: 'export',
  
  // 使用 Edge Runtime
  experimental: {
    runtime: 'edge',
  },
  
  images: {
    unoptimized: true, // Cloudflare Pages 不支持 Image Optimization
  },
  
  // 环境变量
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
```

### 6.2 Cloudflare Pages 配置

```toml
# wrangler.toml (for next-on-pages)
name = "hamhome-web"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
NEXT_PUBLIC_SUPABASE_URL = ""
NEXT_PUBLIC_SUPABASE_ANON_KEY = ""
NEXT_PUBLIC_API_URL = ""
```

---

## 7. 依赖清单

```json
{
  "dependencies": {
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/ssr": "^0.1.0",
    "@supabase/supabase-js": "^2.39.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.49.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "cheerio": "^1.0.0-rc.12",
    "react-dropzone": "^14.2.0",
    "@hamhome/ui": "workspace:*",
    "@hamhome/types": "workspace:*",
    "@hamhome/utils": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "@types/react": "^18.2.0",
    "@types/node": "^20.10.0"
  }
}
```

