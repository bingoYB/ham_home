<p>
  <img src="../logo.png" alt="HamHome" width="280" />
</p>

# HamHome

**AI 驱动的现代浏览器书签管理器**

<p>
  <img src="https://img.shields.io/github/v/release/user/ham_home?style=flat-square" alt="Release" />
  <img src="https://img.shields.io/github/stars/user/ham_home?style=flat-square" alt="Stars" />
  <img src="https://img.shields.io/github/forks/user/ham_home?style=flat-square" alt="Forks" />
  <img src="https://img.shields.io/github/issues/user/ham_home?style=flat-square" alt="Issues" />
  <img src="https://img.shields.io/github/license/user/ham_home?style=flat-square" alt="License" />
</p>

<p>
  <a href="https://bingoyb.github.io/ham_home/">产品介绍</a> •
  <a href="../README.md">English</a> •
  <a href="#功能特性">功能特性</a> •
  <a href="#开发">开发</a> •
  <a href="#贡献">贡献</a>
</p>

## 什么是 HamHome？

HamHome 是一款浏览器扩展，帮助你智能地收集、整理和检索网页内容。它使用 AI 自动分类页面、生成摘要、推荐标签——同时将数据完全保存在本地，保护你的隐私。

👉 **[查看产品介绍](https://bingoyb.github.io/ham_home/)** - 了解更多功能和特性

## 功能特性

### 🤖 AI 辅助整理
- 基于页面内容自动分类
- 智能标签推荐，支持可配置的预设
- AI 生成摘要，快速了解页面内容
- 支持自带 API Key (BYOK)：OpenAI、Anthropic、Ollama 及自定义端点

### 🗂️ 分类管理
- **预设方案**：内置两套分类模板——"通用型"和"专业创作者型"，一键导入
- **AI 生成分类**：描述你的使用场景，让 AI 创建量身定制的分类结构
- 支持无限层级的树形分类结构

### 📸 网页快照
- 本地保存完整 HTML 快照
- 即使原页面失效也能查看内容
- 基于 [Mozilla Readability](https://github.com/mozilla/readability) 算法提取正文

### 🔍 强大的搜索与筛选
- 全文搜索：标题、描述和内容
- 按分类、标签和时间范围筛选
- 创建自定义筛选预设，保存复杂查询条件

### 🎯 隐私优先设计
- 所有数据存储在本地（Chrome Storage + IndexedDB）
- 配置隐私域名，排除敏感网站，不进行 AI 分析
- 随时导出/导入数据（JSON 格式）

### 🖥️ 现代化界面
- 网格（瀑布流）和列表两种视图模式
- 浅色/深色主题，支持系统偏好检测
- 完整的中英文国际化支持
- 快捷键和边缘触发面板

## 浏览器支持

| 浏览器 | 支持状态 |
|--------|----------|
| Chrome / Chromium | ✅ Manifest V3 |
| Microsoft Edge | ✅ Manifest V3 |
| Firefox | ✅ Manifest V2/V3 |

## 下载

- [**Chrome Web Store**](): 待上传
- [**Firefox Add-ons**](): 待上传
- [**Microsoft Edge Addons**](https://microsoftedge.microsoft.com/addons/detail/hamhome/xxx)
- 查看 [releases](https://github.com/user/ham_home/releases) 下载并手动安装。

## 安装

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/user/ham_home.git
cd ham_home

# 安装依赖（需要 pnpm）
pnpm install

# 构建 Chrome/Edge 版本
pnpm --filter extension build

# 构建 Firefox 版本
pnpm --filter extension build:firefox
```

### 加载扩展

- **Chrome/Edge**：打开 `chrome://extensions/`，启用"开发者模式"，点击"加载已解压的扩展程序"，选择 `apps/extension/.output/chrome-mv3` 目录
- **Firefox**：打开 `about:debugging`，点击"此 Firefox"，点击"临时载入附加组件"，选择 `apps/extension/.output/firefox-mv2/manifest.json`

## 开发

```bash
# 启动开发服务器（Chrome）
pnpm --filter extension dev

# 启动开发服务器（Firefox）
pnpm --filter extension dev:firefox

# 构建所有浏览器版本
pnpm --filter extension build:all
```

## 技术栈
<p>
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square&logo=node.js" alt="Node" />
  <img src="https://img.shields.io/badge/pnpm-9.0.0-orange?style=flat-square&logo=pnpm" alt="pnpm" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React" />
</p>


- **框架**：[WXT](https://wxt.dev/)（基于 Vite 的扩展开发框架）
- **UI**：React 19 + TypeScript + Tailwind CSS
- **组件库**：[shadcn/ui](https://ui.shadcn.com/)
- **内容提取**：Mozilla Readability + Turndown
- **国际化**：i18next + react-i18next
- **存储**：Chrome Storage API + IndexedDB

## 项目结构

```
ham_home/
├── apps/
│   └── extension/          # 浏览器扩展
│       ├── components/     # React 组件
│       ├── hooks/          # 自定义 Hooks
│       ├── lib/            # 核心库（AI、存储、国际化）
│       ├── entrypoints/    # 扩展入口
│       └── locales/        # 国际化资源
├── packages/
│   ├── ui/                 # 共享 UI 组件
│   ├── types/              # 共享 TypeScript 类型
│   └── ...                 # 其他共享包
└── docs/                   # 文档
```

## 贡献

欢迎贡献代码！请按以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/your-feature`)
3. 提交更改 (`git commit -m 'Add your feature'`)
4. 推送到分支 (`git push origin feature/your-feature`)
5. 发起 Pull Request

## 许可证

[MIT](../LICENSE)

---

<p align="center">
  如果 HamHome 对你有帮助，欢迎给个 ⭐
</p>
