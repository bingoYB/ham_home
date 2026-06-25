# HamHome 扩展打包与发布文档

**版本：** 1.2.0  
**更新日期：** 2026-06-23  
**构建工具：** WXT 0.20+ / pnpm 9 / Turborepo 2

---

## 目录

1. [环境要求](#1-环境要求)
2. [项目结构](#2-项目结构)
3. [依赖安装](#3-依赖安装)
4. [开发调试](#4-开发调试)
5. [生产构建](#5-生产构建)
6. [打包 ZIP](#6-打包-zip)
7. [产物说明](#7-产物说明)
8. [发布到商店](#8-发布到商店)
9. [包体积分析](#9-包体积分析)
10. [版本管理](#10-版本管理)
11. [常见问题](#11-常见问题)

---

## 1. 环境要求

| 工具 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 18.0.0（推荐 18–24） | Node 25+ 可能导致 `wxt submit` 异常 |
| pnpm | 9.x | 项目强制 `packageManager: pnpm@9.0.0` |
| Chrome / Edge | 最新稳定版 | 用于加载未打包扩展调试 |
| Firefox | >= 109.0 | 扩展最低支持版本 |

---

## 2. 项目结构

```
ham_home/
├── apps/
│   └── extension/          # 扩展主包（WXT）
│       ├── entrypoints/    # 入口文件
│       │   ├── background.ts       # Service Worker
│       │   ├── content.ts          # Content Script
│       │   ├── app/                # Options/主应用页
│       │   └── popup/              # Popup 页
│       ├── components/     # React 组件
│       ├── hooks/          # 自定义 Hooks
│       ├── lib/            # 核心逻辑（storage、services、agent）
│       ├── locales/        # i18n 文案（zh / en）
│       ├── public/         # 静态资源（图标、_locales）
│       ├── scripts/        # 构建辅助脚本
│       │   └── submit.js   # 多商店发布脚本
│       ├── wxt.config.ts   # WXT 构建配置 & Manifest
│       └── package.json
├── packages/               # 共享库（ui、agent、utils 等）
├── turbo.json              # Turborepo 任务依赖配置
└── package.json            # 根工作区
```

### 入口文件说明

| 文件 | 类型 | 说明 |
|------|------|------|
| `background.ts` | Service Worker | 快捷键、右键菜单、消息路由、定时同步 |
| `content.ts` | Content Script | 页面内容提取、侧边面板 UI 注入 |
| `app/` | Options Page | 主管理界面（书签、分类、设置、导入导出） |
| `popup/` | Popup | 工具栏点击弹窗，快速保存当前页 |

---

## 3. 依赖安装

在 **项目根目录**（`ham_home/`）执行：

```bash
pnpm install
```

Turborepo + pnpm workspace 会自动安装所有子包依赖，包括 `packages/*` 中的共享库。

> **注意：** 不要在 `apps/extension/` 内单独执行 `pnpm install`，会破坏 workspace 软链。

---

## 4. 开发调试

### 启动开发服务器

```bash
# 从根目录启动（推荐）
pnpm dev:extension          # Chrome（默认）
pnpm dev:ext-firefox        # Firefox
pnpm dev:ext-edge           # Edge

# 或在 apps/extension/ 目录内直接使用 wxt
pnpm --filter hamhome dev
pnpm --filter hamhome dev:firefox
pnpm --filter hamhome dev:edge
```

开发服务器固定端口 **3124**，支持热重载（HMR）。

### 在浏览器中加载

**Chrome / Edge：**
1. 打开 `chrome://extensions/` 或 `edge://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `apps/extension/.output/chrome-mv3/`（dev 模式目录）

**Firefox：**
1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击「临时载入附加组件」
3. 选择 `apps/extension/.output/firefox-mv2/manifest.json`

---

## 5. 生产构建

### 构建单个浏览器

```bash
# 在根目录
pnpm build:extension        # 构建全部三个浏览器（Chrome + Firefox + Edge）

# 或按需单独构建
pnpm --filter hamhome build            # Chrome
pnpm --filter hamhome build:firefox   # Firefox
pnpm --filter hamhome build:edge      # Edge
```

### 构建说明

- 生产构建会自动 **移除所有 `console.log` 和 `debugger`**（`wxt.config.ts` 中 esbuild `drop` 配置）
- 共享包（`packages/*`）由 Turborepo `dependsOn: ["^build"]` 保证先于扩展完成构建
- 构建产物输出至 `apps/extension/.output/`

### 构建产物目录

```
apps/extension/.output/
├── chrome-mv3/     # Chrome 生产构建
├── firefox-mv2/    # Firefox 生产构建
└── edge-mv3/       # Edge 生产构建（与 Chrome 结构相同）
```

---

## 6. 打包 ZIP

提交到各浏览器商店前需要将构建产物打成 ZIP 包。

```bash
# 从根目录（推荐）
pnpm zip:extension          # 打包全部三个平台

# 或按平台单独打包
pnpm --filter hamhome zip             # Chrome
pnpm --filter hamhome zip:firefox    # Firefox
pnpm --filter hamhome zip:edge       # Edge
pnpm --filter hamhome zip:all        # 全部
```

ZIP 产物输出到 `apps/extension/.output/`，命名格式：

```
hamhome-{version}-chrome.zip
hamhome-{version}-firefox.zip
hamhome-{version}-edge.zip
hamhome-{version}-sources.zip    # Firefox 审核要求的源码包
```

> `version` 取自 `wxt.config.ts` 的 `manifest.version` 字段，当前为 **1.2.0**。

---

## 7. 产物说明

### 各平台差异

| 项目 | Chrome | Edge | Firefox |
|------|--------|------|---------|
| Manifest 版本 | V3 | V3 | V2 |
| Background | Service Worker | Service Worker | Background Page |
| `tabGroups` 权限 | ✅ | ✅ | ❌（已条件排除） |
| `favicon` API | ✅ | ✅ | ❌（安全回退） |
| `gecko` 配置 | — | — | ✅（`hamhome@example.com`） |
| 最低版本 | 最新 | 最新 | 109.0 |

### Manifest 关键配置（`wxt.config.ts`）

```typescript
version: "1.2.0"
default_locale: "zh_CN"
permissions: [
  "storage", "unlimitedStorage", "activeTab", "tabs",
  "tabGroups",   // 仅 Chromium
  "scripting", "clipboardWrite", "contextMenus",
  "bookmarks", "alarms", "favicon"
]
host_permissions: ["<all_urls>"]
omnibox: { keyword: "ham" }
commands: {
  "save-bookmark":         Ctrl+Shift+X / Cmd+Shift+X
  "save-workspace":        Ctrl+Shift+Y / Cmd+Shift+Y
  "toggle-bookmark-panel": Ctrl+Shift+L / Cmd+Shift+L
}
```

---

## 8. 发布到商店

### 8.1 配置环境变量

在 `apps/extension/` 目录下创建 `.env.submit` 文件（**不要提交到 git**）：

```bash
# Chrome Web Store
CHROME_EXTENSION_ID=your_extension_id
CHROME_CLIENT_ID=your_client_id
CHROME_CLIENT_SECRET=your_client_secret
CHROME_REFRESH_TOKEN=your_refresh_token

# Firefox Add-ons (AMO)
FIREFOX_EXTENSION_ID=hamhome@example.com
FIREFOX_JWT_ISSUER=your_jwt_issuer
FIREFOX_JWT_SECRET=your_jwt_secret

# Microsoft Edge Add-ons
EDGE_PRODUCT_ID=your_product_id
EDGE_CLIENT_ID=your_client_id
EDGE_API_KEY=your_api_key
```

只需配置目标商店的变量，未配置的商店会被自动跳过。

### 8.2 一键发布

```bash
# 从根目录
pnpm submit:extension       # 自动执行：zip:all → 读取 .env.submit → wxt submit

# 跳过重新打包（使用已有 ZIP）
pnpm --filter hamhome submit:all -- --skip-zip
```

发布脚本（`scripts/submit.js`）执行逻辑：
1. 调用 `pnpm zip:all` 生成最新 ZIP（除非传入 `--skip-zip`）
2. 从 `wxt.config.ts` 读取版本号
3. 根据 `.env.submit` 中配置的环境变量，确定需要发布的商店
4. 构建 `wxt submit` 参数并执行

### 8.3 初始化提交配置

首次发布前需要初始化：

```bash
pnpm submit:init
# 或
pnpm --filter hamhome submit:init
```

### 8.4 Firefox 源码包

Firefox AMO 审核要求提交源码包（`.output/hamhome-{version}-sources.zip`），`zip:all` 命令会自动生成。

---

## 9. 包体积分析

构建时传入 `ANALYZE=true` 环境变量，可生成可视化体积报告（`stats.html`，自动在浏览器打开）：

**Windows（PowerShell）：**
```powershell
$env:ANALYZE="true"; pnpm --filter hamhome build
```

**macOS / Linux：**
```bash
ANALYZE=true pnpm --filter hamhome build
```

或使用 `package.json` 中预置的 `analyze` 脚本：
```bash
pnpm --filter hamhome analyze
```

报告包含 gzip 和 brotli 两种压缩尺寸，由 `rollup-plugin-visualizer` 生成。

---

## 10. 版本管理

**版本号只在一处维护：**

```typescript
// apps/extension/wxt.config.ts
manifest: () => ({
  version: "1.2.0",   // ← 修改此处
  ...
})
```

发布脚本和 ZIP 命名均从此处自动读取，无需同步修改其他文件。

### 升版本步骤

1. 修改 `apps/extension/wxt.config.ts` 中的 `version`
2. 同步修改 `apps/extension/package.json` 中的 `version`（保持一致，便于维护）
3. 执行 `pnpm zip:extension` 生成新版 ZIP
4. 执行 `pnpm submit:extension` 发布

---

## 11. 常见问题

### Q：构建失败，提示找不到共享包

```
Cannot resolve '@hamhome/ui'
```

**原因：** `packages/*` 共享库未构建。  
**解决：** 先在根目录执行 `pnpm build`（Turborepo 会自动处理依赖顺序），或单独执行：

```bash
pnpm --filter @hamhome/ui build
pnpm --filter @hamhome/agent build
```

---

### Q：`wxt submit` 报错 Node.js 版本兼容问题

**原因：** Node.js >= 25 与 `wxt submit` 的上游依赖存在已知兼容问题。  
**解决：** 切换到 Node 18–24，推荐使用 nvm：

```bash
nvm use 20
```

---

### Q：Firefox 构建缺少 `tabGroups` 但报错

**说明：** `wxt.config.ts` 中已通过 `browser !== "firefox"` 条件排除此权限，Firefox 构建不会包含它，属于正常行为。

---

### Q：开发模式热重载不生效

**解决：**
1. 确认开发服务器端口 3124 未被占用
2. 在浏览器扩展管理页面点击「刷新」扩展
3. 若 content script 修改未生效，刷新目标网页

---

### Q：打包后扩展体积过大

**排查：**
1. 运行 `pnpm --filter hamhome analyze` 查看体积分布
2. 检查是否有不必要的依赖被打入扩展包
3. 生产构建已自动移除 `console.log`（esbuild `drop` 配置）

---

### Q：如何清理所有构建产物

```bash
# 清理全部（含 node_modules）
pnpm clean

# 仅清理扩展构建产物
pnpm --filter hamhome clean
# 等价于：rm -rf apps/extension/.wxt apps/extension/.output apps/extension/dist
```
