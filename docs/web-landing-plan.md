# HamHome 产品介绍页面开发计划

## 概述

在 `apps/web` 目录下开发产品介绍页面，用于展示 HamHome 浏览器扩展的功能特性和下载入口。

**核心特点**: 通过实时渲染真实 UI 组件展示产品功能，而非静态截图。

页面 UI 参考图片 [web-landing-demo](./landpage-demo.png)

## 技术栈

| 项   | 配置                           |
| ---- | ------------------------------ |
| 框架 | Next.js 16 (App Router)        |
| UI   | `@hamhome/ui` + Tailwind CSS 4 |
| 图标 | `lucide-react`                 |
| 动画 | CSS + Framer Motion (可选)     |
| 部署 | GitHub Pages (静态导出)        |

## 目录结构

```
apps/web/
├── app/
│   ├── layout.tsx              # 根布局 (SEO, 主题)
│   ├── page.tsx                # 首页 (Landing)
│   ├── globals.css             # 全局样式
│   └── components/
│       ├── Header.tsx          # 导航栏 (Logo + 语言/主题切换)
│       ├── Footer.tsx          # 页脚
│       ├── FeatureShowcase.tsx # 功能展示区 (Tab 切换)
│       └── demos/              # 实时渲染的 Demo 组件
│           ├── SaveBookmarkDemo.tsx      # 保存书签演示
│           ├── BookmarkPanelDemo.tsx     # 书签面板演示
│           ├── BookmarkListMngDemo.tsx   # 管理视图演示
│           └── AIFeatureDemo.tsx         # AI 功能演示
├── data/
│   └── mock-bookmarks.ts       # Mock 书签数据，包含中英文两套数据
├── public/
│   ├── logo.png
│   └── og-image.png
└── package.json
```

## 页面布局设计

参考图片，页面采用单页垂直布局：

### Header

| 元素     | 说明                         |
| -------- | ---------------------------- |
| Logo     | HamHome 品牌图标 + 名称      |
| 副标题   | "智能书签助手"               |
| 右侧操作 | 语言切换 (EN) + 主题切换开关 |

### Hero 区块

| 元素 | 说明                                                                             |
| ---- | -------------------------------------------------------------------------------- |
| 标题 | "产品功能展示"                                                                   |
| 描述 | "HamHome 是一款 AI 驱动的智能书签管理工具，帮助你更高效地收藏、整理和检索网页。" |

### 功能展示区 (核心)

使用 **Tab 切换** 展示 4 个功能模块，每个 Tab 渲染真实 UI 组件：

| Tab      | 图标       | Demo 组件             | 展示内容                                                                                           |
| -------- | ---------- | --------------------- | -------------------------------------------------------------------------------------------------- |
| 保存书签 | `Bookmark` | `SaveBookmarkDemo`    | 保存书签弹窗，含 AI 分类建议                                                                       |
| 书签面板 | `Folder`   | `BookmarkPanelDemo`   | 使用 apps/extension/components/bookmarkPanel 里的UI 视图，展示侧边栏的功能、搜搜索、筛选功能都要有 |
| 书签管理 | `Tag`      | `BookmarkListMngDemo` | 展示书签管理页面视图，包含完整的搜索、筛选、视图切换功能                                           |
| AI 功能  | `Sparkles` | `AIFeatureDemo`       | AI 自动分类/标签演示                                                                               |

每个 Demo 区块包含：

- **小标题** (如 "书签卡片视图")
- **描述文字** (如 "瀑布流布局，美观展示你的收藏")
- **实时渲染的 UI 组件** (使用 mock 数据)

### Footer

简洁页脚: "HamHome - 让收藏不再积灰 🐹"

## Mock 数据设计

```ts
// data/mock-bookmarks.ts
export const mockBookmarks: Bookmark[] = [
  {
    id: "1",
    title: "React - The library for web and native user interfaces",
    url: "https://react.dev",
    description:
      "React 官方文档，提供了最新的 React 18 特性说明、教程和 API 参考...",
    category: "前端框架",
    tags: ["React", "JavaScript", "前端框架", "官方文档"],
    favicon: "https://react.dev/favicon.ico",
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 天前
  },
  {
    id: "2",
    title: "Vue.js - The Progressive JavaScript Framework",
    url: "https://vuejs.org",
    description: "Vue.js 是一款渐进式 JavaScript 框架，易于上手，性能出色...",
    category: "前端框架",
    tags: ["Vue", "JavaScript", "前端框架"],
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
  },
  {
    id: "3",
    title: "Tailwind CSS - Rapidly build modern websites",
    url: "https://tailwindcss.com",
    description:
      "一个功能类优先的 CSS 框架，让你无需离开 HTML 就能快速构建现代化的网页设计。",
    category: "设计资源",
    tags: ["CSS", "Tailwind", "UI框架", "设计"],
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
  // ... 更多 mock 数据
];

export const mockCategories: Category[] = [
  { id: "1", name: "前端框架", icon: "code", count: 12 },
  { id: "2", name: "设计资源", icon: "palette", count: 8 },
  { id: "3", name: "AI与机器学习", icon: "brain", count: 5 },
  // ... 更多 mock 数据
];
```

## 实现步骤

### Phase 1: 基础框架

1. 更新 `layout.tsx` - SEO metadata、主题支持
2. 创建 `Header.tsx` - Logo + 语言/主题切换
3. 创建 `Footer.tsx` - 简洁页脚
4. 创建 `mock-bookmarks.ts` - Mock 数据

### Phase 2: 功能展示区

5. 创建 `FeatureShowcase.tsx` - Tab 切换容器
6. 创建 `CardViewDemo.tsx` - 卡片视图演示 (瀑布流)
7. 创建 `SaveBookmarkDemo.tsx` - 保存书签弹窗演示
8. 创建 `BookmarkPanelDemo.tsx` - 书签面板演示
9. 创建 `AIFeatureDemo.tsx` - AI 功能演示

### Phase 3: 整合与优化

10. 重写 `page.tsx` - 组装 Header + Hero + FeatureShowcase + Footer
11. 添加深色/浅色主题切换
12. 响应式适配

### Phase 4: 部署

13. 配置静态导出 (`output: 'export'`)
14. 生成 OG Image
15. 部署到 GitHub Pages

## 新增依赖

```json
{
  "dependencies": {
    "lucide-react": "^0.469.0"
  }
}
```

## SEO 配置

```tsx
// app/layout.tsx
export const metadata: Metadata = {
  title: "HamHome - AI 驱动的智能书签管理工具",
  description: "让收藏不再积灰，一键收藏、AI 自动分类、隐私保护",
  keywords: ["书签管理", "浏览器扩展", "AI", "收藏夹"],
  openGraph: {
    title: "HamHome - 智能书签助手",
    description: "让收藏不再积灰",
    images: ["/og-image.png"],
  },
};
```

## 部署选项

| 方案             | 配置                                     |
| ---------------- | ---------------------------------------- |
| **GitHub Pages** | `next.config.js` 添加 `output: 'export'` |

## Demo 组件设计

能使用 extension 里的组件就使用，不能使用，就直接复制代码过来
