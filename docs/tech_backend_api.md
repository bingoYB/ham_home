# HamHome 后端服务技术方案

本文档详细描述 HamHome 后端 API 服务的技术实现方案，基于 Cloudflare Workers 的 Serverless 架构。

> **注意**: 后端服务仅在完整版（非 MVP）中使用。MVP 版本的浏览器插件完全本地化运行，不依赖后端服务。

---

## 1. 技术选型

| 类别 | 选型 | 说明 |
|-----|------|------|
| 运行时 | Cloudflare Workers | 边缘计算，冷启动快 |
| Web 框架 | Hono | 轻量级，Edge 优化 |
| 数据库 | Cloudflare D1 | Serverless SQLite |
| ORM | Drizzle ORM | 类型安全，D1 支持最佳 |
| 向量数据库 | Cloudflare Vectorize | 原生向量搜索 |
| 对象存储 | Storj (S3 Compatible) | 存储网页快照 |
| 认证 | Supabase Auth | JWT 验证 |
| 验证 | Zod | Schema 验证 |
| AI 推理 | Cloudflare Workers AI | Embedding 生成 |

---

## 2. 项目结构

```text
packages/api/
├── src/
│   ├── index.ts               # 入口文件
│   ├── routes/                # API 路由
│   │   ├── bookmarks.ts       # 书签 CRUD
│   │   ├── collections.ts     # 分类管理
│   │   ├── tags.ts            # 标签管理
│   │   ├── search.ts          # 搜索接口
│   │   ├── import.ts          # 导入接口
│   │   ├── export.ts          # 导出接口
│   │   └── settings.ts        # 用户设置
│   │
│   ├── middleware/            # 中间件
│   │   ├── auth.ts            # Supabase JWT 验证
│   │   ├── cors.ts            # CORS 配置
│   │   └── error.ts           # 错误处理
│   │
│   ├── services/              # 业务服务层
│   │   ├── bookmark.service.ts
│   │   ├── collection.service.ts
│   │   ├── search.service.ts
│   │   ├── snapshot.service.ts
│   │   └── ai.service.ts
│   │
│   ├── lib/                   # 工具库
│   │   ├── db.ts              # D1 数据库连接
│   │   ├── storage.ts         # Storj S3 客户端
│   │   ├── vectorize.ts       # Vectorize 客户端
│   │   └── response.ts        # 响应工具
│   │
│   └── types/                 # 类型定义
│       ├── env.ts             # 环境变量类型
│       └── index.ts
│
├── drizzle/                   # 数据库迁移
│   └── migrations/
│
├── wrangler.toml              # Cloudflare 配置
├── drizzle.config.ts          # Drizzle 配置
└── package.json
```

---

## 3. Cloudflare 资源配置

### 3.1 wrangler.toml

```toml
name = "hamhome-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# 环境变量
[vars]
ENVIRONMENT = "production"

# D1 数据库绑定
[[d1_databases]]
binding = "DB"
database_name = "hamhome-db"
database_id = "<YOUR_D1_DATABASE_ID>"

# Vectorize 绑定
[[vectorize]]
binding = "VECTORIZE"
index_name = "hamhome-vec"

# Workers AI 绑定
[ai]
binding = "AI"

# 密钥 (通过 wrangler secret 设置)
# SUPABASE_JWT_SECRET
# STORJ_ACCESS_KEY
# STORJ_SECRET_KEY

# 开发环境配置
[env.dev]
vars = { ENVIRONMENT = "development" }

[[env.dev.d1_databases]]
binding = "DB"
database_name = "hamhome-db-dev"
database_id = "<YOUR_DEV_D1_DATABASE_ID>"
```

### 3.2 环境变量类型定义

```typescript
// src/types/env.ts
export interface Env {
  // Cloudflare Bindings
  DB: D1Database;
  VECTORIZE: VectorizeIndex;
  AI: Ai;
  
  // Environment Variables
  ENVIRONMENT: 'development' | 'production';
  
  // Secrets
  SUPABASE_JWT_SECRET: string;
  SUPABASE_URL: string;
  STORJ_ENDPOINT: string;
  STORJ_BUCKET: string;
  STORJ_ACCESS_KEY: string;
  STORJ_SECRET_KEY: string;
}
```

---

## 4. 数据库设计 (Drizzle ORM)

### 4.1 Schema 定义

```typescript
// packages/db/src/schema.ts
import { 
  sqliteTable, 
  text, 
  integer, 
  index,
  uniqueIndex,
  AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============ 用户表 ============
// 注：主要用户信息存储在 Supabase Auth，此处仅存储扩展信息
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),                // Supabase User ID
  email: text('email').notNull(),
  name: text('name'),
  avatar: text('avatar'),
  aiProvider: text('ai_provider'),            // 用户 AI 配置
  aiApiKey: text('ai_api_key'),               // 加密存储
  aiBaseUrl: text('ai_base_url'),
  aiModel: text('ai_model'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ============ 书签表 ============
export const bookmarks = sqliteTable('bookmarks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  title: text('title').notNull(),
  description: text('description'),           // AI 生成的摘要
  content: text('content'),                   // 提取的正文 (Markdown)
  favicon: text('favicon'),
  collectionId: text('collection_id').references(() => collections.id, { onDelete: 'set null' }),
  
  // 快照相关
  snapshotKey: text('snapshot_key'),          // Storj 对象 Key
  waybackUrl: text('wayback_url'),            // Wayback Machine URL
  
  // 向量 ID (Vectorize)
  vectorId: text('vector_id'),
  
  // 状态
  isArchived: integer('is_archived', { mode: 'boolean' }).default(false),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('bookmarks_user_id_idx').on(table.userId),
  urlIdx: index('bookmarks_url_idx').on(table.url),
  collectionIdIdx: index('bookmarks_collection_id_idx').on(table.collectionId),
  userUrlUnique: uniqueIndex('bookmarks_user_url_unique').on(table.userId, table.url),
}));

// ============ 分类表 ============
export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  parentId: text('parent_id').references((): AnySQLiteColumn => collections.id, { onDelete: 'cascade' }),
  order: integer('order').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('collections_user_id_idx').on(table.userId),
}));

// ============ 标签表 ============
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('tags_user_id_idx').on(table.userId),
  userNameUnique: uniqueIndex('tags_user_name_unique').on(table.userId, table.name),
}));

// ============ 书签-标签关联表 ============
export const bookmarksTags = sqliteTable('bookmarks_tags', {
  bookmarkId: text('bookmark_id').notNull().references(() => bookmarks.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: uniqueIndex('bookmarks_tags_pk').on(table.bookmarkId, table.tagId),
}));

// ============ Relations ============
export const usersRelations = relations(users, ({ many }) => ({
  bookmarks: many(bookmarks),
  collections: many(collections),
  tags: many(tags),
}));

export const bookmarksRelations = relations(bookmarks, ({ one, many }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
  collection: one(collections, {
    fields: [bookmarks.collectionId],
    references: [collections.id],
  }),
  bookmarksTags: many(bookmarksTags),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user: one(users, {
    fields: [collections.userId],
    references: [users.id],
  }),
  parent: one(collections, {
    fields: [collections.parentId],
    references: [collections.id],
    relationName: 'parentChild',
  }),
  children: many(collections, { relationName: 'parentChild' }),
  bookmarks: many(bookmarks),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
  bookmarksTags: many(bookmarksTags),
}));

export const bookmarksTagsRelations = relations(bookmarksTags, ({ one }) => ({
  bookmark: one(bookmarks, {
    fields: [bookmarksTags.bookmarkId],
    references: [bookmarks.id],
  }),
  tag: one(tags, {
    fields: [bookmarksTags.tagId],
    references: [tags.id],
  }),
}));
```

### 4.2 类型导出

```typescript
// packages/db/src/types.ts
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { bookmarks, collections, tags, users } from './schema';

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Bookmark = InferSelectModel<typeof bookmarks>;
export type NewBookmark = InferInsertModel<typeof bookmarks>;

export type Collection = InferSelectModel<typeof collections>;
export type NewCollection = InferInsertModel<typeof collections>;

export type Tag = InferSelectModel<typeof tags>;
export type NewTag = InferInsertModel<typeof tags>;
```

---

## 5. API 路由设计

### 5.1 路由概览

| Method | Path | 描述 | 认证 |
|--------|------|------|------|
| **书签** |
| GET | `/bookmarks` | 获取书签列表 | ✅ |
| GET | `/bookmarks/:id` | 获取单个书签 | ✅ |
| POST | `/bookmarks` | 创建书签 | ✅ |
| PUT | `/bookmarks/:id` | 更新书签 | ✅ |
| DELETE | `/bookmarks/:id` | 删除书签 (软删除) | ✅ |
| POST | `/bookmarks/:id/restore` | 恢复书签 | ✅ |
| POST | `/bookmarks/batch` | 批量操作 | ✅ |
| **分类** |
| GET | `/collections` | 获取分类列表 | ✅ |
| POST | `/collections` | 创建分类 | ✅ |
| PUT | `/collections/:id` | 更新分类 | ✅ |
| DELETE | `/collections/:id` | 删除分类 | ✅ |
| **标签** |
| GET | `/tags` | 获取标签列表 | ✅ |
| **搜索** |
| GET | `/search` | 混合搜索 | ✅ |
| POST | `/search/semantic` | 语义搜索 | ✅ |
| **导入/导出** |
| POST | `/import` | 导入书签 | ✅ |
| GET | `/export` | 导出书签 | ✅ |
| **设置** |
| GET | `/settings/ai` | 获取 AI 配置 | ✅ |
| PUT | `/settings/ai` | 更新 AI 配置 | ✅ |
| POST | `/settings/ai/test` | 测试 AI 连接 | ✅ |
| **快照** |
| GET | `/snapshots/:id` | 获取快照 | ✅ |
| POST | `/snapshots` | 上传快照 | ✅ |

### 5.2 入口文件

```typescript
// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';
import { bookmarksRouter } from './routes/bookmarks';
import { collectionsRouter } from './routes/collections';
import { tagsRouter } from './routes/tags';
import { searchRouter } from './routes/search';
import { importRouter } from './routes/import';
import { exportRouter } from './routes/export';
import { settingsRouter } from './routes/settings';
import { snapshotsRouter } from './routes/snapshots';

import type { Env } from './types/env';

// 创建 Hono 应用
const app = new Hono<{ Bindings: Env }>();

// 全局中间件
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: [
    'https://hamhome.app',
    'chrome-extension://*',
    'http://localhost:3000', // 开发环境
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// 错误处理
app.onError(errorHandler);

// 健康检查
app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// 需要认证的路由
app.use('/bookmarks/*', authMiddleware);
app.use('/collections/*', authMiddleware);
app.use('/tags/*', authMiddleware);
app.use('/search/*', authMiddleware);
app.use('/import/*', authMiddleware);
app.use('/export/*', authMiddleware);
app.use('/settings/*', authMiddleware);
app.use('/snapshots/*', authMiddleware);

// 挂载路由
app.route('/bookmarks', bookmarksRouter);
app.route('/collections', collectionsRouter);
app.route('/tags', tagsRouter);
app.route('/search', searchRouter);
app.route('/import', importRouter);
app.route('/export', exportRouter);
app.route('/settings', settingsRouter);
app.route('/snapshots', snapshotsRouter);

export default app;
```

---

## 6. 中间件实现

### 6.1 认证中间件 (Supabase JWT)

```typescript
// src/middleware/auth.ts
import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { jwtVerify } from 'jose';
import type { Env } from '../types/env';

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing or invalid authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // 验证 Supabase JWT
    const secret = new TextEncoder().encode(c.env.SUPABASE_JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      issuer: c.env.SUPABASE_URL + '/auth/v1',
    });

    // 提取用户信息
    const user: AuthUser = {
      id: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
    };

    // 检查 Token 是否过期
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new HTTPException(401, { message: 'Token expired' });
    }

    c.set('user', user);
    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(401, { message: 'Invalid token' });
  }
}
```

### 6.2 错误处理中间件

```typescript
// src/middleware/error.ts
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export function errorHandler(err: Error, c: Context) {
  console.error('Error:', err);

  // Zod 验证错误
  if (err instanceof ZodError) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.errors,
      },
    }, 400);
  }

  // HTTP 异常
  if (err instanceof HTTPException) {
    return c.json({
      success: false,
      error: {
        code: err.status === 401 ? 'UNAUTHORIZED' : 'HTTP_ERROR',
        message: err.message,
      },
    }, err.status);
  }

  // 未知错误
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: c.env.ENVIRONMENT === 'production' 
        ? 'Internal server error' 
        : err.message,
    },
  }, 500);
}
```

---

## 7. 路由实现

### 7.1 书签路由

```typescript
// src/routes/bookmarks.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, like, desc, asc, isNull, or } from 'drizzle-orm';
import { bookmarks, bookmarksTags, tags } from '@hamhome/db/schema';
import type { Env } from '../types/env';

export const bookmarksRouter = new Hono<{ Bindings: Env }>();

// 查询参数 Schema
const querySchema = z.object({
  collectionId: z.string().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  isDeleted: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// 创建书签 Schema
const createBookmarkSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  content: z.string().optional(),
  favicon: z.string().url().optional(),
  collectionId: z.string().nullable().optional(),
  tags: z.array(z.string()).max(20).optional(),
  snapshotKey: z.string().optional(),
  vectorId: z.string().optional(),
});

// 更新书签 Schema
const updateBookmarkSchema = createBookmarkSchema.partial();

// GET /bookmarks - 获取书签列表
bookmarksRouter.get('/', zValidator('query', querySchema), async (c) => {
  const user = c.get('user');
  const query = c.req.valid('query');
  const db = drizzle(c.env.DB);

  // 构建查询条件
  const conditions = [
    eq(bookmarks.userId, user.id),
    eq(bookmarks.isDeleted, query.isDeleted),
  ];

  if (query.collectionId) {
    conditions.push(eq(bookmarks.collectionId, query.collectionId));
  }

  if (query.search) {
    const searchPattern = `%${query.search}%`;
    conditions.push(
      or(
        like(bookmarks.title, searchPattern),
        like(bookmarks.description, searchPattern),
        like(bookmarks.url, searchPattern)
      )!
    );
  }

  // 排序
  const orderBy = query.sortOrder === 'desc' 
    ? desc(bookmarks[query.sortBy])
    : asc(bookmarks[query.sortBy]);

  // 执行查询
  const items = await db
    .select()
    .from(bookmarks)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(query.limit)
    .offset(query.offset);

  // 获取标签
  const bookmarkIds = items.map(b => b.id);
  const tagsData = bookmarkIds.length > 0 
    ? await db
        .select({
          bookmarkId: bookmarksTags.bookmarkId,
          tagName: tags.name,
        })
        .from(bookmarksTags)
        .innerJoin(tags, eq(bookmarksTags.tagId, tags.id))
        .where(
          or(...bookmarkIds.map(id => eq(bookmarksTags.bookmarkId, id)))!
        )
    : [];

  // 组装结果
  const tagsMap = new Map<string, string[]>();
  tagsData.forEach(t => {
    if (!tagsMap.has(t.bookmarkId)) {
      tagsMap.set(t.bookmarkId, []);
    }
    tagsMap.get(t.bookmarkId)!.push(t.tagName);
  });

  const result = items.map(item => ({
    ...item,
    tags: tagsMap.get(item.id) || [],
  }));

  // 获取总数
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookmarks)
    .where(and(...conditions));

  return c.json({
    success: true,
    data: {
      items: result,
      total: count,
      hasMore: query.offset + query.limit < count,
    },
  });
});

// GET /bookmarks/:id - 获取单个书签
bookmarksRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const db = drizzle(c.env.DB);

  const [bookmark] = await db
    .select()
    .from(bookmarks)
    .where(and(
      eq(bookmarks.id, id),
      eq(bookmarks.userId, user.id)
    ));

  if (!bookmark) {
    return c.json({ success: false, error: { message: 'Bookmark not found' } }, 404);
  }

  // 获取标签
  const tagsData = await db
    .select({ name: tags.name })
    .from(bookmarksTags)
    .innerJoin(tags, eq(bookmarksTags.tagId, tags.id))
    .where(eq(bookmarksTags.bookmarkId, id));

  return c.json({
    success: true,
    data: {
      ...bookmark,
      tags: tagsData.map(t => t.name),
    },
  });
});

// POST /bookmarks - 创建书签
bookmarksRouter.post('/', zValidator('json', createBookmarkSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // URL 去重检查
  const [existing] = await db
    .select()
    .from(bookmarks)
    .where(and(
      eq(bookmarks.userId, user.id),
      eq(bookmarks.url, body.url),
      eq(bookmarks.isDeleted, false)
    ));

  if (existing) {
    return c.json({
      success: false,
      error: { code: 'DUPLICATE_URL', message: 'URL already exists' },
    }, 409);
  }

  const bookmarkId = nanoid();
  const now = new Date();

  // 创建书签
  await db.insert(bookmarks).values({
    id: bookmarkId,
    userId: user.id,
    url: body.url,
    title: body.title,
    description: body.description,
    content: body.content,
    favicon: body.favicon,
    collectionId: body.collectionId,
    snapshotKey: body.snapshotKey,
    vectorId: body.vectorId,
    createdAt: now,
    updatedAt: now,
  });

  // 处理标签
  if (body.tags?.length) {
    await upsertTags(db, user.id, bookmarkId, body.tags);
  }

  // 生成向量 (异步)
  if (body.content) {
    c.executionCtx.waitUntil(
      generateAndStoreVector(c.env, bookmarkId, body.title, body.content)
    );
  }

  return c.json({
    success: true,
    data: { id: bookmarkId },
  }, 201);
});

// PUT /bookmarks/:id - 更新书签
bookmarksRouter.put('/:id', zValidator('json', updateBookmarkSchema), async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const db = drizzle(c.env.DB);

  // 检查书签是否存在
  const [existing] = await db
    .select()
    .from(bookmarks)
    .where(and(
      eq(bookmarks.id, id),
      eq(bookmarks.userId, user.id)
    ));

  if (!existing) {
    return c.json({ success: false, error: { message: 'Bookmark not found' } }, 404);
  }

  // 更新书签
  const { tags: tagNames, ...updateData } = body;
  
  await db
    .update(bookmarks)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(bookmarks.id, id));

  // 更新标签
  if (tagNames !== undefined) {
    // 删除旧的关联
    await db.delete(bookmarksTags).where(eq(bookmarksTags.bookmarkId, id));
    // 添加新的标签
    if (tagNames.length > 0) {
      await upsertTags(db, user.id, id, tagNames);
    }
  }

  return c.json({ success: true });
});

// DELETE /bookmarks/:id - 删除书签 (软删除)
bookmarksRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const permanent = c.req.query('permanent') === 'true';
  const db = drizzle(c.env.DB);

  // 检查书签是否存在
  const [existing] = await db
    .select()
    .from(bookmarks)
    .where(and(
      eq(bookmarks.id, id),
      eq(bookmarks.userId, user.id)
    ));

  if (!existing) {
    return c.json({ success: false, error: { message: 'Bookmark not found' } }, 404);
  }

  if (permanent) {
    // 永久删除
    await db.delete(bookmarks).where(eq(bookmarks.id, id));
    
    // 删除向量
    if (existing.vectorId) {
      await c.env.VECTORIZE.deleteByIds([existing.vectorId]);
    }
    
    // 删除快照
    if (existing.snapshotKey) {
      c.executionCtx.waitUntil(deleteSnapshot(c.env, existing.snapshotKey));
    }
  } else {
    // 软删除
    await db
      .update(bookmarks)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookmarks.id, id));
  }

  return c.json({ success: true });
});

// POST /bookmarks/:id/restore - 恢复书签
bookmarksRouter.post('/:id/restore', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const db = drizzle(c.env.DB);

  await db
    .update(bookmarks)
    .set({
      isDeleted: false,
      deletedAt: null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(bookmarks.id, id),
      eq(bookmarks.userId, user.id)
    ));

  return c.json({ success: true });
});

// POST /bookmarks/batch - 批量操作
const batchSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  action: z.enum(['delete', 'restore', 'move', 'tag']),
  payload: z.object({
    collectionId: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

bookmarksRouter.post('/batch', zValidator('json', batchSchema), async (c) => {
  const user = c.get('user');
  const { ids, action, payload } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  switch (action) {
    case 'delete':
      await db
        .update(bookmarks)
        .set({ isDeleted: true, deletedAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(bookmarks.userId, user.id),
          or(...ids.map(id => eq(bookmarks.id, id)))!
        ));
      break;

    case 'restore':
      await db
        .update(bookmarks)
        .set({ isDeleted: false, deletedAt: null, updatedAt: new Date() })
        .where(and(
          eq(bookmarks.userId, user.id),
          or(...ids.map(id => eq(bookmarks.id, id)))!
        ));
      break;

    case 'move':
      if (payload?.collectionId !== undefined) {
        await db
          .update(bookmarks)
          .set({ collectionId: payload.collectionId, updatedAt: new Date() })
          .where(and(
            eq(bookmarks.userId, user.id),
            or(...ids.map(id => eq(bookmarks.id, id)))!
          ));
      }
      break;

    case 'tag':
      if (payload?.tags) {
        for (const bookmarkId of ids) {
          await upsertTags(db, user.id, bookmarkId, payload.tags);
        }
      }
      break;
  }

  return c.json({ success: true });
});

// ============ 辅助函数 ============

async function upsertTags(
  db: ReturnType<typeof drizzle>,
  userId: string,
  bookmarkId: string,
  tagNames: string[]
) {
  for (const name of tagNames) {
    // 查找或创建标签
    let [tag] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.userId, userId), eq(tags.name, name)));

    if (!tag) {
      const tagId = nanoid();
      await db.insert(tags).values({
        id: tagId,
        userId,
        name,
        createdAt: new Date(),
      });
      tag = { id: tagId, userId, name, createdAt: new Date() };
    }

    // 创建关联
    await db.insert(bookmarksTags).values({
      bookmarkId,
      tagId: tag.id,
    }).onConflictDoNothing();
  }
}

async function generateAndStoreVector(
  env: Env,
  bookmarkId: string,
  title: string,
  content: string
) {
  try {
    // 生成 Embedding
    const text = `${title}\n${content}`.slice(0, 8000);
    const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text });

    // 存储向量
    const vectorId = nanoid();
    await env.VECTORIZE.insert([{
      id: vectorId,
      values: embedding.data[0],
      metadata: { bookmarkId },
    }]);

    // 更新书签
    const db = drizzle(env.DB);
    await db
      .update(bookmarks)
      .set({ vectorId })
      .where(eq(bookmarks.id, bookmarkId));
  } catch (error) {
    console.error('Failed to generate vector:', error);
  }
}

async function deleteSnapshot(env: Env, key: string) {
  // 使用 S3 API 删除快照
  // 实现省略...
}
```

### 7.2 搜索路由

```typescript
// src/routes/search.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, like, or, desc, sql } from 'drizzle-orm';
import { bookmarks, bookmarksTags, tags } from '@hamhome/db/schema';
import type { Env } from '../types/env';

export const searchRouter = new Hono<{ Bindings: Env }>();

const searchSchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
  mode: z.enum(['keyword', 'semantic', 'hybrid']).optional().default('hybrid'),
});

// GET /search - 混合搜索
searchRouter.get('/', zValidator('query', searchSchema), async (c) => {
  const user = c.get('user');
  const { q, limit, mode } = c.req.valid('query');
  const db = drizzle(c.env.DB);

  let results: Array<{ id: string; score: number; source: string }> = [];

  // 关键词搜索
  if (mode === 'keyword' || mode === 'hybrid') {
    const keywordResults = await keywordSearch(db, user.id, q, limit);
    results.push(...keywordResults.map(r => ({ ...r, source: 'keyword' })));
  }

  // 语义搜索
  if (mode === 'semantic' || mode === 'hybrid') {
    const semanticResults = await semanticSearch(c.env, user.id, q, limit);
    results.push(...semanticResults.map(r => ({ ...r, source: 'semantic' })));
  }

  // 混合模式：合并结果并去重
  if (mode === 'hybrid') {
    results = mergeSearchResults(results);
  }

  // 按分数排序
  results.sort((a, b) => b.score - a.score);
  results = results.slice(0, limit);

  // 获取完整书签数据
  const bookmarkIds = results.map(r => r.id);
  const bookmarksData = await db
    .select()
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.userId, user.id),
        eq(bookmarks.isDeleted, false),
        or(...bookmarkIds.map(id => eq(bookmarks.id, id)))!
      )
    );

  // 按搜索结果顺序排序
  const idToBookmark = new Map(bookmarksData.map(b => [b.id, b]));
  const sortedBookmarks = results
    .map(r => idToBookmark.get(r.id))
    .filter(Boolean);

  return c.json({
    success: true,
    data: {
      items: sortedBookmarks,
      total: sortedBookmarks.length,
      searchType: mode,
    },
  });
});

// POST /search/semantic - 仅语义搜索
searchRouter.post('/semantic', zValidator('json', z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(50).optional().default(20),
})), async (c) => {
  const user = c.get('user');
  const { query, limit } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  const results = await semanticSearch(c.env, user.id, query, limit);
  
  // 获取书签数据
  const bookmarkIds = results.map(r => r.id);
  const bookmarksData = await db
    .select()
    .from(bookmarks)
    .where(
      or(...bookmarkIds.map(id => eq(bookmarks.id, id)))!
    );

  return c.json({
    success: true,
    data: {
      items: bookmarksData,
      scores: results,
    },
  });
});

// ============ 搜索实现 ============

async function keywordSearch(
  db: ReturnType<typeof drizzle>,
  userId: string,
  query: string,
  limit: number
): Promise<Array<{ id: string; score: number }>> {
  const searchPattern = `%${query}%`;

  const results = await db
    .select({
      id: bookmarks.id,
      titleMatch: sql<number>`CASE WHEN title LIKE ${searchPattern} THEN 1 ELSE 0 END`,
      descMatch: sql<number>`CASE WHEN description LIKE ${searchPattern} THEN 0.8 ELSE 0 END`,
      contentMatch: sql<number>`CASE WHEN content LIKE ${searchPattern} THEN 0.6 ELSE 0 END`,
    })
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.userId, userId),
        eq(bookmarks.isDeleted, false),
        or(
          like(bookmarks.title, searchPattern),
          like(bookmarks.description, searchPattern),
          like(bookmarks.content, searchPattern)
        )
      )
    )
    .limit(limit * 2); // 取更多结果用于后续合并

  return results.map(r => ({
    id: r.id,
    score: r.titleMatch + r.descMatch + r.contentMatch,
  }));
}

async function semanticSearch(
  env: Env,
  userId: string,
  query: string,
  limit: number
): Promise<Array<{ id: string; score: number }>> {
  try {
    // 生成查询向量
    const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: query });

    // 向量搜索
    const vectorResults = await env.VECTORIZE.query(embedding.data[0], {
      topK: limit * 2,
      returnMetadata: true,
    });

    // 过滤用户的书签
    const db = drizzle(env.DB);
    const bookmarkIds = vectorResults.matches
      .map(m => m.metadata?.bookmarkId as string)
      .filter(Boolean);

    if (bookmarkIds.length === 0) {
      return [];
    }

    // 验证书签属于当前用户
    const userBookmarks = await db
      .select({ id: bookmarks.id })
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.isDeleted, false),
          or(...bookmarkIds.map(id => eq(bookmarks.id, id)))!
        )
      );

    const userBookmarkIds = new Set(userBookmarks.map(b => b.id));

    return vectorResults.matches
      .filter(m => userBookmarkIds.has(m.metadata?.bookmarkId as string))
      .map(m => ({
        id: m.metadata?.bookmarkId as string,
        score: m.score,
      }));
  } catch (error) {
    console.error('Semantic search error:', error);
    return [];
  }
}

function mergeSearchResults(
  results: Array<{ id: string; score: number; source: string }>
): Array<{ id: string; score: number; source: string }> {
  const merged = new Map<string, { id: string; score: number; source: string }>();

  // 权重配置
  const weights = { keyword: 0.4, semantic: 0.6 };

  for (const r of results) {
    if (merged.has(r.id)) {
      const existing = merged.get(r.id)!;
      // 两种搜索都命中，分数叠加
      existing.score += r.score * weights[r.source as keyof typeof weights];
      existing.source = 'hybrid';
    } else {
      merged.set(r.id, {
        ...r,
        score: r.score * weights[r.source as keyof typeof weights],
      });
    }
  }

  return Array.from(merged.values());
}
```

---

## 8. 存储服务

### 8.1 Storj S3 客户端

```typescript
// src/lib/storage.ts
import { AwsClient } from 'aws4fetch';
import type { Env } from '../types/env';

export function createS3Client(env: Env) {
  return new AwsClient({
    accessKeyId: env.STORJ_ACCESS_KEY,
    secretAccessKey: env.STORJ_SECRET_KEY,
    service: 's3',
    region: 'auto',
  });
}

export async function uploadSnapshot(
  env: Env,
  userId: string,
  bookmarkId: string,
  html: string
): Promise<string> {
  const client = createS3Client(env);
  
  // 生成存储路径
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const key = `${userId}/${year}/${month}/${bookmarkId}.html`;

  const url = `${env.STORJ_ENDPOINT}/${env.STORJ_BUCKET}/${key}`;

  await client.fetch(url, {
    method: 'PUT',
    body: html,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });

  return key;
}

export async function getSnapshot(env: Env, key: string): Promise<string | null> {
  const client = createS3Client(env);
  const url = `${env.STORJ_ENDPOINT}/${env.STORJ_BUCKET}/${key}`;

  const response = await client.fetch(url);
  
  if (!response.ok) {
    return null;
  }

  return response.text();
}

export async function deleteSnapshot(env: Env, key: string): Promise<void> {
  const client = createS3Client(env);
  const url = `${env.STORJ_ENDPOINT}/${env.STORJ_BUCKET}/${key}`;

  await client.fetch(url, { method: 'DELETE' });
}

export async function getSnapshotUrl(env: Env, key: string): Promise<string> {
  const client = createS3Client(env);
  const url = `${env.STORJ_ENDPOINT}/${env.STORJ_BUCKET}/${key}`;

  // 生成预签名 URL (1 小时有效)
  const signedUrl = await client.sign(url, {
    method: 'GET',
    aws: { signQuery: true },
    headers: {
      'X-Amz-Expires': '3600',
    },
  });

  return signedUrl.url;
}
```

---

## 9. AI 服务

### 9.1 Workers AI 集成

```typescript
// src/services/ai.service.ts
import type { Env } from '../types/env';

export interface EmbeddingResult {
  vector: number[];
}

export async function generateEmbedding(
  env: Env,
  text: string
): Promise<EmbeddingResult> {
  const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: text.slice(0, 8000), // 限制输入长度
  });

  return {
    vector: result.data[0],
  };
}

export async function generateSummary(
  env: Env,
  title: string,
  content: string
): Promise<{ summary: string; tags: string[]; category: string }> {
  const prompt = `分析以下网页内容，生成结构化元数据：

标题: ${title}
内容: ${content.slice(0, 4000)}

请以 JSON 格式返回：
{
  "summary": "一句话摘要（中文，不超过100字）",
  "tags": ["标签1", "标签2", "标签3"],
  "category": "推荐分类"
}`;

  const result = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
    prompt,
    max_tokens: 500,
  });

  try {
    // 尝试解析 JSON
    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }

  // 返回默认值
  return {
    summary: '',
    tags: [],
    category: '',
  };
}
```

---

## 10. 数据迁移

### 10.1 Drizzle 配置

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: '../db/src/schema.ts',
  out: './drizzle/migrations',
  driver: 'd1',
  dbCredentials: {
    wranglerConfigPath: './wrangler.toml',
    dbName: 'hamhome-db',
  },
} satisfies Config;
```

### 10.2 迁移命令

```bash
# 生成迁移文件
pnpm drizzle-kit generate:sqlite

# 应用到本地 D1
wrangler d1 migrations apply hamhome-db --local

# 应用到远程 D1
wrangler d1 migrations apply hamhome-db --remote
```

---

## 11. 部署

### 11.1 部署命令

```bash
# 部署到 Cloudflare Workers
pnpm --filter @hamhome/api deploy

# 或直接使用 wrangler
wrangler deploy
```

### 11.2 环境变量设置

```bash
# 设置 Secrets
wrangler secret put SUPABASE_JWT_SECRET
wrangler secret put STORJ_ACCESS_KEY
wrangler secret put STORJ_SECRET_KEY
```

---

## 12. 监控与日志

### 12.1 日志配置

```typescript
// src/lib/logger.ts
export function log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };

  console.log(JSON.stringify(entry));
}

// 在路由中使用
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  
  log('info', 'Request completed', {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
  });
});
```

### 12.2 错误追踪

```typescript
// 在 errorHandler 中添加错误追踪
export function errorHandler(err: Error, c: Context) {
  log('error', 'Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  });

  // ... 返回错误响应
}
```

---

## 13. 依赖清单

```json
{
  "dependencies": {
    "hono": "^4.0.0",
    "drizzle-orm": "^0.30.0",
    "@hono/zod-validator": "^0.2.0",
    "zod": "^3.22.0",
    "nanoid": "^5.0.0",
    "jose": "^5.2.0",
    "aws4fetch": "^1.0.0",
    "@hamhome/db": "workspace:*",
    "@hamhome/types": "workspace:*"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240101.0",
    "drizzle-kit": "^0.20.0",
    "wrangler": "^3.0.0",
    "typescript": "^5.3.0"
  }
}
```

