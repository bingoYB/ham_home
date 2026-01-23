# 🐹 HamHome - 智能书签助手

> 让收藏不再积灰，AI 驱动的智能书签管理工具

HamHome 是一款现代化的浏览器扩展，通过 AI 技术帮助您更好地管理和组织书签。它不仅能够智能提取网页内容，还提供了强大的分类、标签、搜索和快照功能，让您的书签真正发挥作用。

## ✨ 核心功能

### 🤖 AI 智能分析
- **智能分类推荐**：基于网页内容自动推荐合适的分类
- **标签建议**：AI 分析内容生成相关标签
- **内容摘要**：自动提取网页摘要，快速了解页面内容
- **隐私保护**：支持配置隐私域名，敏感网站内容不会被发送到 AI 服务

### 📄 智能内容提取
- **正文提取**：使用 Mozilla Readability 算法提取网页正文
- **Markdown 转换**：自动将 HTML 内容转换为 Markdown 格式
- **元数据提取**：自动提取 Open Graph、Meta 标签等元数据
- **快照功能**：保存完整的网页快照，即使原网站失效也能查看

### 🗂️ 强大的组织功能
- **多级分类**：支持无限层级的分类结构
- **标签系统**：灵活的标签管理，支持多标签筛选
- **自定义筛选器**：创建复杂的筛选条件组合，快速找到目标书签
- **时间筛选**：按时间范围筛选书签（今天、本周、本月、本年、自定义）

### 🔍 高效的搜索与浏览
- **全文搜索**：搜索标题、描述和内容
- **多视图模式**：网格视图和列表视图切换
- **瀑布流布局**：网格视图采用响应式瀑布流布局
- **批量操作**：支持批量选择和批量删除

### 🎨 现代化界面
- **主题切换**：支持浅色/深色主题，跟随系统设置
- **多语言支持**：中文和英文界面
- **响应式设计**：适配不同屏幕尺寸
- **流畅动画**：优雅的交互动画效果

### 🔒 隐私与安全
- **本地存储**：所有数据存储在本地，保护隐私
- **隐私域名**：配置隐私域名列表，防止敏感内容泄露
- **数据导出**：支持导出为 JSON 格式，方便备份和迁移
- **数据导入**：支持从 JSON 文件导入书签

### 🚀 便捷操作
- **快捷键支持**：`Ctrl+Shift+E`（Mac: `Command+Shift+E`）快速保存当前页面
- **边缘触发**：鼠标移动到屏幕边缘自动显示书签面板
- **Content UI**：在网页中直接打开侧边栏浏览书签
- **一键保存**：Popup 窗口快速保存当前标签页

## 🛠️ 技术栈

- **框架**：[WXT](https://wxt.dev/) - 基于 Vite 的浏览器扩展开发框架
- **UI 库**：React 19 + TypeScript
- **样式**：Tailwind CSS
- **内容提取**：[Mozilla Readability](https://github.com/mozilla/readability)
- **Markdown 转换**：[Turndown](https://github.com/mixmark-io/turndown)
- **国际化**：i18next + react-i18next
- **存储**：Chrome Storage API + IndexedDB

## 🌐 浏览器支持

- ✅ Chrome / Chromium（Manifest V3）
- ✅ Microsoft Edge（Manifest V3）
- ✅ Firefox（Manifest V2/V3）

## 📦 安装

### 从源码构建

1. **克隆仓库**
```bash
git clone https://github.com/your-username/ham_home.git
cd ham_home
```

2. **安装依赖**
```bash
pnpm install
```

3. **构建扩展**
```bash
# 构建 Chrome/Edge 版本
pnpm --filter extension build

# 构建 Firefox 版本
pnpm --filter extension build:firefox

# 构建所有浏览器版本
pnpm --filter extension build:all
```

4. **加载扩展**
   - Chrome/Edge: 打开 `chrome://extensions/`，启用"开发者模式"，点击"加载已解压的扩展程序"，选择 `apps/extension/.output/chrome-mv3` 目录
   - Firefox: 打开 `about:debugging`，点击"此 Firefox"，点击"临时载入附加组件"，选择 `apps/extension/.output/firefox-mv2/manifest.json` 文件

### 开发模式

```bash
# 启动开发服务器（Chrome）
pnpm --filter extension dev

# 启动开发服务器（Firefox）
pnpm --filter extension dev:firefox

# 启动开发服务器（Edge）
pnpm --filter extension dev:edge
```

## 📖 使用指南

### 快速保存书签

1. **使用快捷键**：按 `Ctrl+Shift+E`（Mac: `Command+Shift+E`）打开保存面板
2. **点击扩展图标**：点击浏览器工具栏中的 HamHome 图标
3. **边缘触发**：将鼠标移动到屏幕左侧或右侧边缘，自动显示书签面板

### 管理分类

1. 打开扩展选项页面（点击扩展图标 → 设置）
2. 进入"分类"页面
3. 创建、编辑或删除分类
4. 支持拖拽调整分类顺序

### 使用标签

1. 保存书签时添加标签
2. 在主界面使用标签筛选器筛选书签
3. 在"标签"页面管理所有标签

### 查看快照

1. 保存书签时可以选择保存网页快照
2. 在书签卡片上点击快照图标查看
3. 快照存储在本地 IndexedDB，不占用浏览器书签空间

### 导入导出

1. 进入"导入/导出"页面
2. 导出：下载 JSON 格式的书签数据
3. 导入：上传之前导出的 JSON 文件

## 🏗️ 项目结构

```
apps/extension/
├── components/          # React 组件
│   ├── bookmarkPanel/  # 书签面板组件
│   ├── bookmarkListMng/# 书签列表管理组件
│   ├── SavePanel/      # 保存面板组件
│   └── ...
├── contexts/           # React Context
├── hooks/              # 自定义 Hooks
├── lib/                # 核心库
│   ├── ai/            # AI 客户端
│   ├── storage/       # 存储抽象层
│   ├── contentUi/     # Content UI 相关
│   └── i18n/          # 国际化配置
├── entrypoints/        # 入口文件
│   ├── background.ts  # Background Script
│   ├── content.ts     # Content Script
│   ├── popup/         # Popup 页面
│   └── app/           # Options 页面
├── locales/           # 国际化资源
├── utils/             # 工具函数
└── types/             # TypeScript 类型定义
```

## 🔧 配置

### AI 配置

在设置页面配置 AI 服务：
- API 端点
- API Key
- 模型选择
- 隐私域名列表

### 应用设置

- 主题：浅色/深色/跟随系统
- 语言：中文/英文
- 默认分类
- 自动保存快照

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 开发规范

- 使用 TypeScript 进行类型安全
- 遵循 React Hooks 最佳实践
- 组件职责单一，逻辑与 UI 分离
- 使用自定义 Hooks 封装业务逻辑
- 所有 Portal 相关逻辑必须使用 `useContentUI()` 提供的容器

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](../LICENSE) 文件了解详情

## 🙏 致谢

- [WXT](https://wxt.dev/) - 优秀的浏览器扩展开发框架
- [Mozilla Readability](https://github.com/mozilla/readability) - 网页内容提取算法
- [Turndown](https://github.com/mixmark-io/turndown) - HTML 转 Markdown 工具
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库

## 📮 反馈与支持

- 提交 Issue：[GitHub Issues](https://github.com/your-username/ham_home/issues)
- 功能建议：欢迎在 Issues 中提出

---

Made with ❤️ by HamHome Team
