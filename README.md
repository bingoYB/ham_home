# 🐹 HamHome - 智能书签管理工具

让收藏不再积灰，AI 驱动的智能书签管理工具。

## 项目结构

```
ham_home/
├── apps/
│   ├── web/           # Next.js Web 管理端
│   └── extension/     # WXT 浏览器插件
├── packages/
│   ├── api/           # Cloudflare Workers API
│   ├── db/            # 数据库 Schema (Drizzle ORM)
│   ├── ui/            # 共享 UI 组件库
│   ├── types/         # 共享类型定义
│   ├── utils/         # 通用工具函数
│   ├── ai/            # AI 客户端 SDK
│   ├── parser/        # 网页内容解析器
│   └── storage/       # 存储抽象层
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 构建公共模块

```bash
pnpm build:packages
```

### 启动开发

```bash
# 启动 Web 端
pnpm dev:web

# 启动浏览器插件
pnpm dev:extension

# 启动 API (Cloudflare Workers)
pnpm dev:api
```

## 技术栈

- **前端**: Next.js 14, React 18, Tailwind CSS
- **插件**: WXT (基于 Vite)
- **后端**: Cloudflare Workers, Hono
- **数据库**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **包管理**: pnpm + Turborepo

## 模块说明

| 模块 | 说明 |
|------|------|
| `@hamhome/ui` | 共享 UI 组件库 (Button, Input 等) |
| `@hamhome/types` | 共享类型定义 (Bookmark, Category 等) |
| `@hamhome/utils` | 通用工具函数 (URL 处理, 日期格式化等) |
| `@hamhome/ai` | AI 客户端 SDK |
| `@hamhome/parser` | 网页内容解析器 |
| `@hamhome/storage` | 存储抽象层接口 |
| `@hamhome/db` | 数据库 Schema |
| `@hamhome/api` | 后端 API 服务 |

## License

MIT

