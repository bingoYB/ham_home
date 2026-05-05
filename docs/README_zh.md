<p>
  <img src="../logo.png" alt="HamHome" width="280" />
</p>

# HamHome（仓鼠家）

**AI 驱动的现代浏览器书签管理器**

<p>
  <img src="https://img.shields.io/github/v/release/bingoYB/ham_home?style=flat-square" alt="Release" />
  <img src="https://img.shields.io/github/stars/bingoYB/ham_home?style=flat-square" alt="Stars" />
  <img src="https://img.shields.io/github/forks/bingoYB/ham_home?style=flat-square" alt="Forks" />
  <img src="https://img.shields.io/github/issues/bingoYB/ham_home?style=flat-square" alt="Issues" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
</p>

<p>
  <a href="https://bingoyb.github.io/ham_home/">产品介绍</a> •
  <a href="../README.md">English</a> •
  <a href="./USAGE_zh.md">使用文档</a> •
  <a href="./USAGE_en.md">Usage</a> •
  <a href="#功能特性">功能特性</a> •
  <a href="#开发">开发</a> •
  <a href="#贡献">贡献</a>
</p>

## 什么是 HamHome？

HamHome（仓鼠家） 是一款 AI 驱动的现代浏览器书签管理插件。它使用 AI 自动对收藏的网站进行分类、打标签、生成摘要，并支持语义化搜索；同时可以保存/恢复浏览器工作空间、管理原生 Tab 分组规则，让书签、会话与配置都更容易迁移和同步。

👉 **[查看产品介绍](https://bingoyb.github.io/ham_home/)** - 了解更多功能和特性

## 产品截图

|                     **侧边面板**                     |                      **保存面板**                      |
| :--------------------------------------------------: | :----------------------------------------------------: |
| ![侧边面板](screenshot/compressed/ch/side-panel.png) |  ![保存面板](screenshot/compressed/ch/save-panel.png)  |
|                    **语义化搜索**                    |                      **预设分类**                      |
|    ![语义化搜索](https://i.imgur.com/8HHRTb9.png)    |      ![预设分类](https://i.imgur.com/0Qku5cx.png)      |
|                     **管理页面**                     |                      **设置页面**                      |
|  ![管理页面](screenshot/compressed/ch/mng-page.png)  | ![设置页面](screenshot/compressed/ch/setting-page.png) |
|                     **工作空间**                     |                    **Tab 分组规则**                    |
|                      【待补充】                      |                       【待补充】                       |
|                    **完整数据备份**                  |                     **WebDAV 同步**                    |
|                      【待补充】                      |                       【待补充】                       |


## 功能特性

### 🤖 AI 辅助整理
- 基于页面内容自动分类
- 智能标签推荐，支持可配置的预设
- AI 生成摘要，快速了解页面内容
- 支持自带 API Key (BYOK)：OpenAI、Anthropic、Claude、Ollama 及自定义端点

### 🔄 多端同步 (WebDAV)
- 支持通过 WebDAV 协议进行多设备同步（如 Nextcloud, InfiniCLOUD 等）
- 同步范围覆盖书签、分类、设置、工作空间、工作空间分类和 Tab 分组配置
- 支持数据加密同步，保障信息安全
- 顶栏实时同步状态显示，数据流转清晰可见
- 灵活的远程数据管理，支持随时清空远程残留数据

### 🧩 工作空间与 Tab 会话
- 将当前打开的页面保存为可恢复的工作空间，适合研究资料、项目上下文和周期性浏览场景
- 支持保存并恢复浏览器原生 Tab Groups（在支持的浏览器中）
- 工作空间拥有独立分类和标签，不与书签分类混用
- 可对工作空间页面进行分析，识别重复页面，并推荐适合转为长期书签的页面

### 🧠 智能 Tab 分组
- 支持按域名、URL、标题、忽略大小写标题或正则创建自动分组规则
- 可配置目标分组名称、颜色、折叠状态和多条匹配条件
- 可选 AI 自动分组，使用已配置的 AI 服务，并缓存相同页面的分组结果

### 🗂️ 分类管理
- **图标支持**：支持为分类设置 Emoji 图标，视觉识别更轻松。
- **预设方案**：内置两套分类模板——"通用型"和"专业创作者型"，一键导入
- **AI 生成分类**：描述你的使用场景，让 AI 创建量身定制的分类结构
- 支持无限层级的树形分类结构

### 📸 网页快照
- 本地保存完整 HTML 快照 (IndexedDB)
- 即使原页面失效也能查看内容
- 基于 [Mozilla Readability](https://github.com/mozilla/readability) 算法提取正文

### 🔍 强大的搜索与筛选
- 全文搜索：标题、描述和内容
- 语义化搜索 (基于向量检索)
- 按分类、标签和时间范围筛选
- 创建自定义筛选预设，保存复杂查询条件

### 📦 导入、导出与迁移
- JSON 备份包含书签、分类、工作空间、工作空间分类、Tab 分组规则和自动分组设置
- JSON 恢复会自动映射分类关联；已存在的工作空间或 Tab 分组规则会按 ID 更新
- HTML 导入/导出兼容 Chrome、Firefox、Edge 等浏览器的标准书签文件

### 🎯 隐私优先与存储管理
- **本地优先**：所有数据存储在本地（Chrome Storage + IndexedDB）
- **细粒度存储管理**：清晰查看书签、网页快照和向量化数据的占用空间。
- **差异化清理**：支持独立删除特定类型的数据（如仅清理快照），保留配置信息。
- **隐私域名**：配置域名黑名单，排除敏感网站，不进行 AI 分析

### 🖥️ 现代化界面
- 网格（瀑布流）和列表两种视图模式
- 浅色/深色主题，支持系统偏好检测
- 完整的中英文国际化支持
- 快捷键和边缘触发面板

## 浏览器支持

| 浏览器            | 支持状态         |
| ----------------- | ---------------- |
| Chrome / Chromium | ✅ Manifest V3    |
| Microsoft Edge    | ✅ Manifest V3    |
| Firefox           | ✅ Manifest V2/V3 |

## 下载

- [**Chrome Web Store**](https://chromewebstore.google.com/detail/hamhome-%E6%99%BA%E8%83%BD%E4%B9%A6%E7%AD%BE%E5%8A%A9%E6%89%8B/mkdokbchcfegdkgoiikagecikldbkbmg)
- [**Firefox Add-ons**](https://addons.mozilla.org/zh-CN/firefox/addon/hamhome-%E6%99%BA%E8%83%BD%E4%B9%A6%E7%AD%BE%E5%8A%A9%E6%89%8B/)
- [**Microsoft Edge Addons**](https://microsoftedge.microsoft.com/addons/detail/hamhome-smart-bookmark-/nmbdgbicgagmokdmohgngcbhkaicfnpi)
- 查看 [releases](https://github.com/bingoYB/ham_home/releases) 下载并手动安装。

## 安装

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/bingoYB/ham_home.git
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
