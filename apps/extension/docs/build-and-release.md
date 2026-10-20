# HamHome 扩展打包与发布文档

**版本：** 1.2.0  
**更新日期：** 2026-10-20  
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
| Node.js | >= 18.0.0（发布推荐 22） | Node 24+ 下 `wxt submit` 上传异常，发布脚本会直接拒绝运行，见 [8.2](#82-一键发布) |
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
- 产物会经过 `scripts/escape-unicode-noncharacters.ts` 插件处理，把 Unicode 非字符
  （U+FDD0–U+FDEF、各平面的 U+xFFFE / U+xFFFF、落单代理项）转义成 `\uXXXX`

> **为什么需要转义非字符**
>
> Chrome 安装扩展时用 `base::IsStringUTF8()` 校验内容脚本与 CSS，它比标准 UTF-8 更严格，
> 会拒绝 Unicode 非字符。第三方库（例如数学公式解析）常在正则里直接写 U+FFFF，
> 一旦这样的字符进入内容脚本产物，**整个扩展都会加载失败**，报错为：
> 「无法为内容脚本加载 xxx.js 文件。该文件采用的不是 UTF-8 编码。」
> 这类失败在浏览器里只体现为扩展没加载，e2e 里则表现为等不到 Service Worker，排查成本很高。
> 插件同时会在构建期校验 CSS/JSON/HTML 产物，发现非字符直接让构建失败。

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
# 从根目录，必须使用 Node 22 且工作区干净
nvm use 22
pnpm submit:extension       # 自动执行：发布前检查 → 读取 .env.submit → zip:all → wxt submit

# 跳过重新打包（使用已有 ZIP）
pnpm --filter hamhome submit:all -- --skip-zip

# 查看脚本参数说明
pnpm --filter hamhome submit:all -- --help
```

发布脚本（`scripts/submit.js`）执行逻辑：
1. 检查 Node 版本：运行脚本的 Node 和 `pnpm exec` 实际使用的 Node 只要有一个 >= 24 就直接退出（原因见 [常见问题](#11-常见问题)）；子进程会优先使用运行脚本的那个 Node
2. 从 `wxt.config.ts` 读取版本号，打印仓库路径、当前分支、HEAD commit 和待发布版本号
3. 检查 git 工作区：`git status --porcelain` 非空则拒绝发布（除非传入 `--allow-dirty`）
4. 读取 `.env.submit`
5. 调用 `pnpm zip:all` 生成最新 ZIP（除非传入 `--skip-zip`），打包完成后再检查一次工作区，期间有文件被改动就退出
6. 根据环境变量确定需要发布的商店，打印每个待上传 ZIP 的路径和修改时间
7. 构建 `wxt submit` 参数并执行

**脚本参数：**

| 参数 | 说明 |
|------|------|
| `--skip-zip` | 复用 `.output/` 中已有的 ZIP。对应当前版本的 ZIP 缺失，或修改时间早于 HEAD commit 时，脚本会报错退出 |
| `--allow-dirty` | 工作区有未提交改动时仍然发布（会打印改动列表和警告），仅在明确知道后果时使用 |
| `-h` / `--help` | 打印参数说明后退出，不做任何检查 |
| 其他参数 | 原样透传给 `wxt submit`，例如 `--dry-run` |

> **为什么要求工作区干净**
>
> `zip:all` 打包的是当前工作区的代码，而不是某个 commit。工作区里有未提交的改动时，
> 这些改动会被直接发到商店，事后也无法从 git 历史中还原线上版本。
> 检查范围是整个仓库（扩展依赖 `packages/*`），已暂存、未暂存和未跟踪的文件都算改动；
> 被 `.gitignore` 忽略的文件（`.env.submit`、`.output/`、`node_modules/` 等）不影响检查。
>
> `.env.submit` 一般只放在日常开发的 checkout 里，而那里往往有未提交的工作。推荐在干净的 worktree 中发布：
>
> ```bash
> git worktree add --detach ../ham_home-release <发布分支或 commit>
> cp apps/extension/.env.submit ../ham_home-release/apps/extension/.env.submit
> cd ../ham_home-release
> pnpm install
> nvm use 22
> pnpm submit:extension
> ```

> **`--skip-zip` 的新鲜度检查**只能证明 ZIP 是在 HEAD commit 之后生成的，不能证明一定由 HEAD 打包
> （例如打包后又切换过分支）。脚本会打印每个 ZIP 的路径和修改时间，发布前请核对；拿不准时去掉 `--skip-zip` 重新打包。

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
3. 提交改动，确保 `git status` 干净（发布脚本会拒绝在有未提交改动的工作区运行）
4. 执行 `pnpm zip:extension` 生成新版 ZIP
5. 切换到 Node 22，执行 `pnpm submit:extension` 发布

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

### Q：发布显示成功，但商店里还是旧版本，或 Firefox 返回 415

**原因：** `wxt submit` 依赖的 `publish-browser-extension@2.3.1` 通过 ofetch / 原生 fetch 发送 `formdata-node` 的 FormData。
在 Node.js >= 24 上，请求体会被序列化成字符串 `"[object FormData]"`（`Content-Type: text/plain;charset=UTF-8`），而且不会抛错：
Chrome 会把之前上传的草稿当作新版本发布，工具仍然报告成功；Firefox 则返回 415。
已在 Node 24.19 和 25.5 上复现，Node 18 / 20 / 22 会正常发送 multipart 请求。  
**解决：** 发布脚本在 Node >= 24 时会直接报错退出。切换到 Node 22 后重新发布：

```bash
nvm use 22
node -v                     # 确认是 v22.x
pnpm submit:extension
```

如果已经在 Node 24+ 上用旧版脚本发布过，请到各商店后台确认线上版本号和包内容。
升级 wxt / `publish-browser-extension` 并确认问题修复后，再调整 `scripts/submit.js` 中的 `FIRST_UNSUPPORTED_NODE_MAJOR`。

---

### Q：发布脚本提示 `Refusing to submit: the zips would include uncommitted code`

**原因：** 当前仓库 `git status --porcelain` 非空（已暂存、未暂存或未跟踪的文件），脚本会打印改动列表并拒绝发布，避免把未提交的代码打包上传。  
**解决：**
1. 提交这些改动（或用 `git stash -u` 临时收起）后重新执行；或按 [8.2](#82-一键发布) 的方式在干净的 worktree 中发布
2. 确实需要发布当前工作区时，显式传入 `--allow-dirty`：

```bash
pnpm --filter hamhome submit:all -- --allow-dirty
```

---

### Q：使用 `--skip-zip` 时提示 ZIP `older than commit`

**原因：** `.output/` 中当前版本 ZIP 的修改时间早于 HEAD commit，说明它是用旧代码打的包。  
**解决：** 去掉 `--skip-zip` 重新执行，让脚本重新打包。

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
