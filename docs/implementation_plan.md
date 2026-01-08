# HamHome 详细技术实现方案

本文档基于 PRD 和技术设计概要，详细阐述 HamHome 的前后端技术实现细节、依赖库选型以及项目搭建流程。

## 1. 技术栈详细选型 (Detailed Tech Stack)

### 1.1 项目管理与构建 (Monorepo)
- **Package Manager**: `pnpm` (利用其 workspace 协议管理多包依赖，节省磁盘空间且安装速度快)。
- **Build System**: `Turborepo` (利用缓存和并行执行加速构建和 lint 任务)。
- **Changesets**: 用于管理版本发布和变更日志（可选，视后续是否开源发包而定）。

### 1.2 前端应用 (`apps/web`)
- **Framework**: `Next.js 14+` (App Router)。
  - *理由*: 强大的路由系统，React Server Components (RSC) 提升性能，易于集成 Auth。
- **Deployment**: `Cloudflare Pages` (Static Export 或 Edge Runtime)。
- **Language**: `TypeScript` (Strict Mode)。
- **Styling**: 
  - `Tailwind CSS`: 原子化 CSS，快速开发。
  - `clsx` + `tailwind-merge`: 动态类名合并。
- **UI Components**: `Shadcn/UI` (基于 `Radix UI` 的 Headless 组件库，直接拷贝代码到项目中，拥有最大自定义权)。
  - 核心依赖: `@radix-ui/react-*`, `lucide-react` (图标)。
- **State Management**: `Zustand` (轻量、Hooks API，替代 Context API 处理全局状态)。
- **Data Fetching**: `TanStack Query (v5)` (处理 API 请求状态、缓存、重试)。
- **Forms**: `React Hook Form` + `Zod` (表单验证)。

### 1.3 浏览器插件 (`apps/extension`)
- **Framework**: `WXT` (Web Extension Tools)。
  - *理由*: 基于 Vite，支持 HMR（热更新），自动处理 `manifest.json`，支持多浏览器适配 (Chrome/Edge/Firefox/Safari)。
- **UI**: `React` + `Tailwind CSS` + `Shadcn/UI` (复用 web 端组件)。
- **HTML Packing**: `single-file-core` (用于在客户端将网页打包成单 HTML 文件)。
- **Parser**: `@mozilla/readability` (DOM -> Article) + `turndown` (Article HTML -> Markdown)。
  - *理由*: 将正文转换为 Markdown 喂给 LLM，显著减少 Token 消耗并提高语义理解准确度。

### 1.4 后端 API (`packages/api` -> 部署为 CF Worker)
- **Runtime**: `Cloudflare Workers`。
- **Framework**: `Hono` (轻量、Web Standards 兼容、TypeScript 支持极佳)。
  - *理由*: 比 Express/Koa 快得多，专为 Edge 设计，内置了 Validators、Auth 中间件等。
- **Database**: `Cloudflare D1` (SQLite)。
- **ORM**: `Drizzle ORM`。
  - *理由*: 生成 SQL 仅在编译时，运行时零开销，完美支持 D1。
- **Vector DB**: `Cloudflare Vectorize`。
- **Storage**: `Cloudflare R2` -> **Storj (S3 Compatible)**。
- **Validation**: `Zod` + `@hono/zod-validator`。
- **Parser**: `cheerio` (用于服务端快速清洗/解析 HTML)。
- **S3 Client**: `aws4fetch` (用于连接 Storj)。

### 1.5 身份认证与服务 (Auth & Services)
- **Auth Provider**: `Supabase Auth` (GoTrue)。
  - *理由*: 提供完整的用户管理系统（注册/登录/第三方登录/密码重置），支持 JWT，不仅免费额度高，而且极大地简化了后端 Auth 的实现复杂度（无需维护 Auth 表）。

### 1.6 共享库 (`packages/*`)
- `packages/ui`: 共享 UI 组件（Shadcn/UI），供 web 和 extension 复用。
- `packages/db`: 数据库 Schema (Drizzle) 和类型定义，供 api 和其他需要直接访问 DB 的服务使用。
- `packages/tsconfig`: 统一的 TS 配置。
- `packages/eslint-config`: 统一的 Lint 配置。
- `packages/ai`: 统一的 AI 客户端 SDK (Vercel AI SDK)。

## 2. 项目目录结构 (Directory Structure)

```text
.
├── apps/
│   ├── web/                 # Next.js 管理后台 & 落地页
│   │   ├── src/app/         # App Router
│   │   ├── src/components/  # 业务组件
│   │   └── ...
│   └── extension/           # WXT 浏览器插件
│       ├── entrypoints/     # content, popup, background, options
│       ├── components/      # 插件 UI
│       └── utils/           # html打包, readability, turndown 等工具
├── packages/
│   ├── api/                 # Hono 后端服务 (Cloudflare Worker)
│   │   ├── src/routes/      # API 路由
│   │   ├── src/middleware/  # Supabase JWT 验证中间件
│   │   └── wrangler.toml    # CF 配置
│   ├── db/                  # Drizzle Schema & Migrations
│   │   ├── src/schema.ts
│   │   └── drizzle.config.ts
│   ├── ui/                  # 共享 UI 组件库
│   │   ├── src/components/
│   │   └── package.json
│   ├── ai/                  # 共享 AI 客户端配置
│   │   ├── src/index.ts     # Vercel AI SDK 封装
│   │   └── package.json
│   ├── tsconfig/            # 共享 TSConfig
│   └── eslint-config/       # 共享 ESLint Config
├── package.json             # Root package.json (pnpm workspace)
├── pnpm-workspace.yaml      # Workspace 定义
├── turbo.json               # Turborepo 配置
└── README.md
```

## 3. 详细实现流程与关键代码

### 3.1 环境配置与资源准备 (Environment & Resources)

在开始编码前，必须先创建好 Cloudflare 相关资源并配置环境变量。

#### 1. Cloudflare 资源创建清单
需要登录 Cloudflare Dashboard 或使用 `wrangler` CLI 创建以下资源，并记录 ID/Name。

| 资源类型 | 资源名称 (建议) | 用途 | 获取/创建命令 |
| :--- | :--- | :--- | :--- |
| **D1 Database** | `hamhome-db` | 核心业务数据 (User, Bookmark) | `wrangler d1 create hamhome-db` |
| **Storj Bucket** | `hamhome-snapshots` | 存储网页 HTML 快照 | (通过 Storj Dashboard 创建) |
| **Vectorize Index** | `hamhome-vec` | 存储文本向量 (Embeddings) | `wrangler vectorize create hamhome-vec --dimensions 1536 --metric cosine` |
| **Workers AI** | - | 运行 LLM (Llama 3) 和 Embedding 模型 | (开箱即用，无需创建，需绑定) |

#### 2. 环境变量清单 (.env)
将在项目根目录和各 package 中使用的核心环境变量。

```ini
# --- Cloudflare Resource Bindings (在 wrangler.toml 中配置，此处为对应 ID) ---
CLOUDFLARE_ACCOUNT_ID="<YOUR_ACCOUNT_ID>"
CLOUDFLARE_DATABASE_ID="<OUTPUT_FROM_D1_CREATE>"
# CLOUDFLARE_R2_BUCKET_NAME="hamhome-snapshots" (已替换为 Storj)
CLOUDFLARE_VECTORIZE_INDEX="<OUTPUT_FROM_VECTORIZE_CREATE>"

# --- Storage (Storj S3) ---
STORJ_BUCKET="<YOUR_STORJ_BUCKET>"
STORJ_ENDPOINT="https://gateway.storjshare.io"
STORJ_ACCESS_KEY="<YOUR_ACCESS_KEY>"
STORJ_SECRET_KEY="<YOUR_SECRET_KEY>"

# --- Authentication (Supabase) ---
NEXT_PUBLIC_SUPABASE_URL="<YOUR_SUPABASE_PROJECT_URL>"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<YOUR_SUPABASE_ANON_KEY>"
SUPABASE_SERVICE_ROLE_KEY="<YOUR_SUPABASE_SERVICE_ROLE_KEY>" # 仅后端使用
SUPABASE_JWT_SECRET="<YOUR_SUPABASE_JWT_SECRET>" # 用于后端验证 Token

# --- AI Provider (BYOK 模式 / Optional) ---
# 如果使用 OpenAI 代替 CF Workers AI
OPENAI_API_KEY="sk-..."
# 如果使用 CF Workers AI，需要在 Worker 内部通过 binding 调用，无需 Key

# --- OAuth Providers (在 Supabase Dashboard 配置) ---
# 此时只需在 Supabase 后台配置 GitHub/Google Client ID/Secret
```

### 3.2 初始化项目 (Phase 1)

1.  **创建根目录**：
    ```bash
    mkdir ham-home && cd ham-home
    pnpm init
    git init
    ```

2.  **配置 `pnpm-workspace.yaml`**：
    ```yaml
    packages:
      - "apps/*"
      - "packages/*"
    ```

3.  **配置 `turbo.json`**：
    配置 build, dev, lint 等任务的 pipeline。

### 3.3 搭建共享包 (packages/ui, packages/db, packages/ai)

1.  **Package: `ui`**:
    -   初始化 React + TS + Tailwind 环境。
    -   安装 shadcn/ui CLI，生成组件到 `src/components`。
    -   配置 `package.json` 导出组件。

2.  **Package: `db`**:
    -   安装 `drizzle-orm`, `drizzle-kit`.
    -   定义 `schema.ts` (User, Bookmark, Tag, Collection)。
    -   编写 `migrate` 脚本，用于向 D1 推送结构变更。

3.  **Package: `ai`**:
    -   安装 `ai` (Vercel AI SDK Core) 和 `@ai-sdk/openai`。
    -   封装统一的 `generateObject` 方法，用于结构化输出。

### 3.4 搭建后端 API (packages/api)

1.  **初始化 Hono**:
    ```bash
    npm create hono@latest packages/api
    # 选择 Cloudflare Workers 模板
    ```
2.  **配置 `wrangler.toml`**:
    -   绑定 D1, Vectorize, AI。
    -   **配置 Storj S3 环境变量** (`vars`): `STORJ_ENDPOINT`, `STORJ_BUCKET`。
    -   **移除** Auth.js 相关的环境变量，改为 Supabase JWT 验证。

3.  **实现路由 (Route Handlers)**:
    -   **Middleware**: 实现 `supabaseAuthMiddleware`，验证请求头中的 `Authorization: Bearer <token>`，解析 Supabase JWT，获取 `user_id` 并注入 `c.get('user')`。
    -   `POST /bookmarks`:
        -   从中间件获取 `user_id`。
        -   业务逻辑不变（存入 D1, Vectorize, R2）。

### 3.5 搭建浏览器插件 (apps/extension)

1.  **初始化 WXT**:
    ```bash
    pnpm create wxt@latest apps/extension
    # 选择 React
    ```
2.  **核心逻辑实现**:
    -   **Auth**:
        -   使用 `@supabase/supabase-js`。
        -   提供**独立登录页**（或 Popup 内登录），调用 `supabase.auth.signInWithPassword` 或 `signInWithOAuth`。
        -   登录成功后，`supabase-js` 会自动管理 Token (通常存入 `chrome.storage.local` 如果配置了适配器)。
        -   请求后端 API 时，显式获取 Session Token 并放入 Header。
    -   **功能**: 采集、AI 分析、保存等逻辑不变。

### 3.6 搭建 Web 前端 (apps/web)

1.  **初始化 Next.js**:
    ```bash
    pnpm create next-app@latest apps/web --typescript --tailwind --eslint
    ```
2.  **业务功能**:
    -   **Auth**: 使用 `@supabase/ssr` (Server Side Auth) 处理 Next.js 中的登录状态和中间件保护。
    -   **Bookmark List**: 使用 TanStack Query 调用 `GET /api/bookmarks`。
    -   **Search**: 实现搜索框，调用后端混合搜索接口。

### 3.7 核心业务逻辑实现细节 (Business Logic Details)

#### 3.6.1 智能解析与 AI 交互 (Smart Parse)
- **SDK 选型**: **Vercel AI SDK Core** (`ai` package)。
  - *理由*: 
    1. **轻量且无关框架**: 相比 LangChain 更轻量，专为 Edge 和 Serverless 设计，完美适配 Cloudflare Workers。
    2. **结构化输出**: 内置 `generateObject` 方法，结合 Zod schema，能强制 LLM 输出符合要求的 JSON，无需手动 parse。
    3. **多模型支持**: 统一的 Provider 接口，轻松切换 OpenAI, Anthropic, Google Gemini 或 Cloudflare Workers AI (通过 Custom Provider)。

- **正文提取策略 (Markdown 优化)**:
  - **Step 1**: 使用 `@mozilla/readability` 从 DOM 中提取出核心 Article（去除导航、广告）。
  - **Step 2**: 使用 `turndown` 将 Article HTML 转换为 Markdown。
  - **Step 3**: 截断 Markdown 至 Token 限制内（如 4000 chars），作为 Prompt 输入。
  - *优势*: Markdown 格式清晰，去除了大量 HTML 噪音标签，大幅减少 Token 消耗，且 LLM 对 Markdown 的理解能力更强。

- **Prompt Engineering (使用 Vercel AI SDK)**:
  ```typescript
  import { generateObject } from 'ai';
  import { z } from 'zod';
  import { openai } from '@ai-sdk/openai';

  const schema = z.object({
    summary: z.string().describe('一句话总结，中文，<50字'),
    tags: z.array(z.string()).max(5).describe('相关标签'),
    category: z.enum(['技术', '设计', '生活', '其他']).describe('推荐分类'),
  });

  const { object } = await generateObject({
    model: openai('gpt-3.5-turbo'), // 或自定义 CF AI provider
    schema: schema,
    prompt: `分析以下网页内容并提取元数据:\n标题: ${title}\n内容(Markdown): ${markdownContent}`,
  });
  ```
- **错误处理**: 若 AI 调用失败或 JSON 解析失败，自动使用 Meta Description 作为摘要，Tag 留空，不阻塞用户流程。

#### 3.6.2 快照存储策略 (Snapshot)
- **HTML 打包配置**:
  - 使用 `single-file-core`。
  - 配置 `removeScripts: true` (防 XSS, 减小体积)。
  - 配置 `removeAudioVideo: true`, `removeHiddenElements: true`。
  - 设置超时时间 (如 10s)，防止卡死。
- **Storj S3 存储路径**:
  - 路径规则: `{userId}/{yyyy}/{MM}/{randomId}.html`。
  - 设置 `Content-Type: text/html; charset=utf-8`。
  - 使用 `aws4fetch` 上传。

#### 3.6.3 混合搜索算法 (Hybrid Search)
- **搜索流程**:
  1. **向量检索 (Vector Search)**: 调用 `Vectorize` 查询 embedding，获取 Top 20 相似 ID (Score A)。
  2. **关键词检索 (Keyword Search)**: 使用 D1 `LIKE` 查询 (`title LIKE %q% OR content LIKE %q%`)，获取 Top 20 (Score B)。
  3. **加权融合 (Rerank)**:
     - 若 ID 同时出现在两者中，分数叠加 (Score = A * 0.7 + B * 0.3)。
     - 优先展示关键词完全匹配标题的结果。
     - 最终返回 Top 20。

#### 3.6.4 书签导入与去重 (Import & Dedupe)
- **解析**: 客户端使用 `cheerio` 解析上传的 Netscape HTML 书签文件。
- **层级处理**: 
  - 递归遍历 `<DL><DT><H3>Folder Name...</H3><DL>...`。
  - 若用户选择“文件夹转标签”，将路径 `Tech > Frontend > React` 转换为标签 `Tech`, `Frontend`, `React`。
- **批量入库**:
  - 拆分为小批次 (Batch Size = 20) 并发请求后端。
  - 后端使用 `INSERT OR IGNORE` (基于 URL 唯一索引) 跳过重复项。

#### 3.6.5 用户认证流 (Auth Flow - Supabase)
- **Web 端**:
  - 使用 `auth-ui-react` 或自定义表单调用 `supabase.auth.signInWithPassword`.
  - 登录态维持在 Cookie (由 `@supabase/ssr` 处理)。
- **Extension 端**:
  - 弹出独立登录页。
  - 登录成功后获取 `access_token`。
  - 调用 API 时，Header 携带 `Authorization: Bearer <access_token>`。
- **后端 (API)**:
  - 验证 JWT 签名 (使用 `SUPABASE_JWT_SECRET`)。
  - 提取 `sub` (即 User ID) 用于后续 D1 查询。
  - *注意*: 用户表实际存储在 Supabase Auth 中，D1 中的 `users` 表仅作为 Profile 副本或关联表存在（可选，或者直接信任 Supabase ID）。

## 4. 环境依赖清单

### 全局工具
- Node.js >= 18
- pnpm >= 8
- Wrangler (Cloudflare CLI)

### 核心依赖版本参考 (package.json)
- `next`: ^14.0.0
- `react`: ^18.2.0
- `wxt`: ^0.18.0
- `hono`: ^4.0.0
- `drizzle-orm`: ^0.30.0
- `@cloudflare/workers-types`: ^4.20240101.0
- `zod`: ^3.22.0
- `@tanstack/react-query`: ^5.0.0
- `single-file-core`: ^1.0.0
- `ai`: ^3.0.0 (Vercel AI SDK)
- `@ai-sdk/openai`: ^0.0.10
- `@supabase/supabase-js`: ^2.0.0
- `@supabase/ssr`: ^0.1.0
- `turndown`: ^7.1.2
- `cheerio`: ^1.0.0-rc.12

## 5. 开发与部署流程

### 本地开发 (Local Dev)
利用 Turborepo 并行启动所有应用：
```bash
pnpm dev
# 同时启动：
# - apps/web (localhost:3000)
# - apps/extension (加载到 Chrome)
# - packages/api (localhost:8787 - 本地 Worker 模拟环境)
```

### 数据库迁移 (Migration)
```bash
pnpm --filter @packages/db db:generate  # 生成 SQL
pnpm --filter @packages/db db:migrate:local # 应用到本地 SQLite
pnpm --filter @packages/db db:migrate:prod  # 应用到远程 Cloudflare D1
```

### 部署 (Deployment)
- **API**: `pnpm --filter @packages/api deploy` (Wrangler 自动发布到 CF Workers)。
- **Web**: `git push` 触发 Cloudflare Pages 自动构建。
- **Extension**: 构建生成 zip，手动或通过 CI 发布到 Chrome Web Store。
