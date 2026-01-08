# HamHome 浏览器插件 MVP 任务清单

## 背景说明

### 当前项目状态
- ✅ WXT 框架配置完成，支持 HMR 开发
- ✅ 共享包已创建：`@hamhome/ui`、`@hamhome/types`、`@hamhome/utils`、`@hamhome/ai`
- ✅ 基础 UI 组件可用：Button、Input、Card、Label、Badge、Separator
- ✅ 类型定义已存在：Bookmark、Category、Settings、AIClientConfig
- ⚠️ `popup/App.tsx` 当前仅为模块验证测试页面
- ⚠️ `@hamhome/ai` 客户端仅为 Mock 实现
- ❌ 无 Content Script
- ❌ 无 Options Page
- ❌ 无本地存储层实现

### MVP 功能边界
根据 `docs/tech_browser_extension.md` 第 1.1 节，MVP 版本仅包含：
- 网页收藏（一键收藏 + 正文提取 + 快捷键）
- AI 智能分析（摘要 + 标签 + 分类）
- 本地书签管理（列表 + 编辑 + 删除 + 搜索）
- 网页快照（IndexedDB 存储）
- 数据导入/导出
- AI 配置（支持 OpenAI/Anthropic/Ollama/自定义）

**明确排除**：用户账号、云端同步、向量搜索、语义问答、回顾推送

---

## 任务清单

### 阶段一：基础设施完善

| 编号 | 任务描述 | 输入依据 | 执行说明 | 完成标准 |
|------|----------|----------|----------|----------|
| **1.1** | **补充插件所需依赖** | tech_browser_extension.md §9 依赖清单 | 1. 编辑 `apps/extension/package.json`<br>2. 添加依赖：`@mozilla/readability`、`turndown`、`lucide-react`<br>3. 执行 `pnpm install` | 依赖安装成功，无报错 |
| **1.2** | **更新 WXT 配置增加权限** | tech_browser_extension.md §7 WXT 配置 | 1. 编辑 `apps/extension/wxt.config.ts`<br>2. 添加 permissions: `scripting`, `downloads`<br>3. 配置 icons 路径 | `pnpm --filter extension build` 成功，manifest 包含新权限 |
| **1.3** | **创建插件类型定义文件** | tech_browser_extension.md §4.2 数据结构 | 1. 新建 `apps/extension/types/index.ts`<br>2. 定义 `LocalBookmark`（适配本地存储的时间戳为 number）<br>3. 定义 `LocalCategory`、`AIConfig`（带 enabled 字段）、`LocalSettings`<br>4. 定义 `Snapshot`、`PageContent`、`BookmarkQuery` | TypeScript 编译通过，类型可被其他文件引用 |
| **1.4** | **创建路径别名配置** | tech_browser_extension.md §3 项目结构 | 1. 编辑 `apps/extension/wxt.config.ts`，添加 `@/*` 别名指向项目根目录<br>2. 编辑 `apps/extension/tsconfig.json`，添加对应 paths 配置 | `import { xxx } from '@/types'` 可正常解析 |

---

### 阶段二：存储层实现

| 编号 | 任务描述 | 输入依据 | 执行说明 | 完成标准 |
|------|----------|----------|----------|----------|
| **2.1** | **实现书签存储模块** | tech_browser_extension.md §4.3 Chrome Storage 操作封装 | 1. 新建 `apps/extension/lib/storage/bookmark-storage.ts`<br>2. 实现 `BookmarkStorage` 类，包含方法：<br>   - `getBookmarks(query?)`<br>   - `getBookmarkById(id)`<br>   - `getBookmarkByUrl(url)`<br>   - `createBookmark(data)`<br>   - `updateBookmark(id, data)`<br>   - `deleteBookmark(id, permanent?)`<br>   - `restoreBookmark(id)`<br>   - `getDeletedBookmarks()`<br>3. 实现 `normalizeUrl` 私有方法（移除 utm 参数）<br>4. 导出单例 `bookmarkStorage` | 在 popup 中调用 `bookmarkStorage.createBookmark()` 后，通过 `chrome.storage.local.get('bookmarks')` 可查看数据 |
| **2.2** | **实现分类存储模块** | tech_browser_extension.md §4.3 分类操作 | 1. 在 `apps/extension/lib/storage/bookmark-storage.ts` 中继续添加方法：<br>   - `getCategories()`<br>   - `createCategory(name, parentId?)`<br>   - `updateCategory(id, data)`<br>   - `deleteCategory(id)`（同时将该分类下书签移至"未分类"）<br>   - `getAllTags()` | 分类 CRUD 功能正常，删除分类时书签的 categoryId 被置为 null |
| **2.3** | **实现 IndexedDB 快照存储** | tech_browser_extension.md §4.3 IndexedDB 快照存储 | 1. 新建 `apps/extension/lib/storage/snapshot-storage.ts`<br>2. 实现 `SnapshotStorage` 类，包含方法：<br>   - `getDB()`（初始化 IndexedDB，创建 store 和索引）<br>   - `saveSnapshot(bookmarkId, html)`<br>   - `getSnapshot(bookmarkId)`<br>   - `getSnapshotAsUrl(bookmarkId)`<br>   - `deleteSnapshot(bookmarkId)`<br>   - `getStorageUsage()`<br>   - `clearAllSnapshots()`<br>3. 导出单例 `snapshotStorage` | 调用 `saveSnapshot` 后，IndexedDB 中存在 `hamhome-snapshots` 数据库，可通过 `getSnapshot` 获取数据 |
| **2.4** | **实现配置存储模块** | tech_browser_extension.md §4.3 AI 配置存储 | 1. 新建 `apps/extension/lib/storage/config-storage.ts`<br>2. 定义 `DEFAULT_AI_CONFIG`（enabled: false）和 `DEFAULT_SETTINGS`<br>3. 实现 `ConfigStorage` 类，包含方法：<br>   - `getAIConfig()`<br>   - `setAIConfig(config)`<br>   - `getSettings()`<br>   - `setSettings(settings)`<br>4. 导出单例 `configStorage` | 配置读写正常，默认值合并正确 |
| **2.5** | **创建存储模块统一导出** | - | 新建 `apps/extension/lib/storage/index.ts`，统一导出所有存储模块 | `import { bookmarkStorage, snapshotStorage, configStorage } from '@/lib/storage'` 可用 |

---

### 阶段三：Content Script 实现

| 编号 | 任务描述 | 输入依据 | 执行说明 | 完成标准 |
|------|----------|----------|----------|----------|
| **3.1** | **创建 Content Script 入口** | tech_browser_extension.md §6.1 Content Script | 1. 新建 `apps/extension/entrypoints/content.ts`<br>2. 使用 `defineContentScript` 定义 content script，matches 为 `['<all_urls>']`<br>3. 实现 `extractPageContent()` 函数：<br>   - 使用 Readability 提取正文<br>   - 使用 Turndown 转换为 Markdown<br>   - 获取 meta description 作为备用 excerpt<br>   - 获取 favicon<br>4. 监听 `chrome.runtime.onMessage`，响应 `EXTRACT_CONTENT` 消息 | 在任意网页打开控制台，执行 `chrome.runtime.sendMessage({ type: 'EXTRACT_CONTENT' })` 返回 `PageContent` 对象 |
| **3.2** | **验证正文提取效果** | - | 1. 运行 `pnpm --filter extension dev`<br>2. 在浏览器中访问一篇长文（如 Medium 文章）<br>3. 通过 popup 或控制台调用提取功能<br>4. 确认返回的 `content` 为有效 Markdown | 提取的 content 包含文章正文，无导航/广告等干扰内容 |

---

### 阶段四：AI 客户端实现

| 编号 | 任务描述 | 输入依据 | 执行说明 | 完成标准 |
|------|----------|----------|----------|----------|
| **4.1** | **完善 @hamhome/ai 客户端** | tech_browser_extension.md §5.4 AI 客户端实现 | 1. 编辑 `packages/ai/package.json`，添加依赖 `openai`<br>2. 编辑 `packages/ai/src/client.ts`：<br>   - 根据 provider 创建对应 API 客户端<br>   - 实现 `analyzeBookmark` 方法，调用真实 AI API<br>   - 使用 structured output 或 JSON mode 确保返回格式正确<br>   - 错误处理：API 失败时返回默认值而非抛异常<br>3. 添加 system prompt 模板（中文，要求返回 title/summary/category/tags） | Mock 配置时返回默认值；配置有效 API Key 后能返回真实 AI 分析结果 |
| **4.2** | **创建插件 AI 客户端封装** | tech_browser_extension.md §5.4 ExtensionAIClient | 1. 新建 `apps/extension/lib/ai/client.ts`<br>2. 实现 `ExtensionAIClient` 类：<br>   - `loadConfig()` - 从 configStorage 加载配置<br>   - `isConfigured()` - 检查配置是否有效（Ollama 不需要 apiKey）<br>   - `analyze(input)` - 调用 AI 分析，失败时返回默认值<br>   - `testConnection()` - 测试连接是否成功<br>3. 导出单例 `aiClient` | `aiClient.isConfigured()` 正确返回配置状态；`aiClient.analyze()` 正常调用并返回结果 |

---

### 阶段五：Popup 保存面板

| 编号 | 任务描述 | 输入依据 | 执行说明 | 完成标准 |
|------|----------|----------|----------|----------|
| **5.1** | **创建 useCurrentPage Hook** | tech_browser_extension.md §6.2 | 1. 新建 `apps/extension/hooks/useCurrentPage.ts`<br>2. 实现 Hook：<br>   - 获取当前 tab 信息<br>   - 向 content script 发送 `EXTRACT_CONTENT` 消息<br>   - 返回 `{ pageContent, loading, error }` | 在 popup 中调用 hook，能获取当前页面的 PageContent |
| **5.2** | **补充 UI 组件** | tech_browser_extension.md §6.3 需要的组件 | 1. 在 `packages/ui` 中添加组件：<br>   - `Textarea` - 多行文本输入<br>   - `Select` - 下拉选择（带 Option 子组件）<br>   - `Switch` - 开关组件<br>2. 更新 `packages/ui/src/index.ts` 导出 | 组件可在 extension 中正常引用和使用 |
| **5.3** | **创建 TagInput 组件** | prd.md §4.1 标签输入 | 1. 新建 `apps/extension/components/common/TagInput.tsx`<br>2. 功能：<br>   - 显示已添加的标签（Badge 形式）<br>   - 点击标签可删除<br>   - 输入框回车添加新标签<br>   - 支持 maxTags 限制 | 标签可添加/删除，回车添加新标签 |
| **5.4** | **创建 AI 状态提示组件** | tech_browser_extension.md §6.3 AIStatusBanner | 1. 新建 `apps/extension/components/SavePanel/AIStatus.tsx`<br>2. 根据状态（idle/loading/success/error/disabled）显示不同 UI<br>3. loading 状态显示加载动画<br>4. error 状态显示错误信息和重试按钮<br>5. disabled 状态显示"去配置"链接 | 不同 AI 状态显示对应的 UI |
| **5.5** | **创建保存面板组件** | tech_browser_extension.md §6.3 SavePanel | 1. 新建 `apps/extension/components/SavePanel/SavePanel.tsx`<br>2. 实现完整保存流程：<br>   - 接收 pageContent 和 existingBookmark<br>   - 自动触发 AI 分析（如已配置）<br>   - 表单字段：标题、摘要、分类（下拉）、标签<br>   - 保存按钮调用 bookmarkStorage<br>   - 可选保存快照（调用 snapshotStorage）<br>3. 新建 `apps/extension/components/SavePanel/index.ts` 导出 | 表单可编辑，点击保存后数据存入 chrome.storage |
| **5.6** | **重写 Popup App** | tech_browser_extension.md §6.2 | 1. 重写 `apps/extension/entrypoints/popup/App.tsx`<br>2. 实现双视图切换：save / list<br>3. 顶部导航栏（logo + 视图切换按钮）<br>4. 检测当前页面是否已收藏<br>5. 集成 SavePanel 组件 | Popup 可正常显示保存面板，切换视图正常 |

---

### 阶段六：书签列表视图

| 编号 | 任务描述 | 输入依据 | 执行说明 | 完成标准 |
|------|----------|----------|----------|----------|
| **6.1** | **创建书签列表 Hook** | - | 1. 新建 `apps/extension/hooks/useBookmarks.ts`<br>2. 实现：<br>   - 加载书签列表<br>   - 支持分类/标签/搜索过滤<br>   - 支持刷新功能<br>   - 返回 `{ bookmarks, loading, refresh }` | Hook 可正确获取和过滤书签列表 |
| **6.2** | **创建书签卡片组件** | prd.md §4.2 列表视图 | 1. 新建 `apps/extension/components/BookmarkList/BookmarkCard.tsx`<br>2. 显示：favicon、标题、摘要（截断）、标签、时间<br>3. 点击打开原链接<br>4. 悬停显示操作按钮（编辑、删除） | 书签卡片正确渲染，点击可跳转 |
| **6.3** | **创建书签列表组件** | tech_browser_extension.md §6.2 | 1. 新建 `apps/extension/components/BookmarkList/BookmarkList.tsx`<br>2. 顶部搜索框<br>3. 书签卡片列表（使用 BookmarkCard）<br>4. 空状态提示<br>5. 新建 `index.ts` 导出 | 列表正确显示书签，搜索功能正常 |
| **6.4** | **创建编辑书签弹窗** | - | 1. 新建 `apps/extension/components/BookmarkList/EditBookmarkDialog.tsx`<br>2. 复用 SavePanel 的表单字段<br>3. 支持删除书签（软删除） | 可编辑已有书签信息并保存 |

---

### 阶段七：Options 设置页面

| 编号 | 任务描述 | 输入依据 | 执行说明 | 完成标准 |
|------|----------|----------|----------|----------|
| **7.1** | **创建 Options 页面入口** | tech_browser_extension.md §6.5 | 1. 新建目录 `apps/extension/entrypoints/options/`<br>2. 创建 `index.html`、`main.tsx`、`App.tsx`<br>3. App 实现标签页切换：AI 配置 / 通用设置 / 存储管理 | Options 页面可通过 `chrome.runtime.openOptionsPage()` 打开 |
| **7.2** | **实现 AI 配置标签页** | tech_browser_extension.md §6.5 AIConfigTab | 1. 新建 `apps/extension/components/Settings/AIConfigTab.tsx`<br>2. 实现：<br>   - 启用 AI 分析开关<br>   - 服务商选择（OpenAI/Anthropic/Ollama/自定义）<br>   - API Key 输入（密码类型）<br>   - Base URL 输入（Ollama/自定义时显示）<br>   - 模型名称输入<br>   - 高级参数（折叠）：Temperature、Max Tokens<br>   - 保存按钮<br>   - 测试连接按钮 | 配置可保存，测试连接功能正常 |
| **7.3** | **实现通用设置标签页** | tech_browser_extension.md §6.5 GeneralSettingsTab | 1. 新建 `apps/extension/components/Settings/GeneralSettingsTab.tsx`<br>2. 实现：<br>   - 自动保存快照开关<br>   - 主题选择（跟随系统/明亮/暗黑）<br>   - 语言选择（中文/English） | 设置可保存，立即生效 |
| **7.4** | **实现存储管理标签页** | tech_browser_extension.md §6.5 StorageManagementTab | 1. 新建 `apps/extension/components/Settings/StorageManagementTab.tsx`<br>2. 实现：<br>   - 显示快照数量和占用空间<br>   - 清除所有快照按钮（带确认）<br>   - 导出 JSON 按钮<br>   - 导出 HTML 按钮 | 存储信息正确显示，导出功能正常下载文件 |
| **7.5** | **实现数据导出功能** | tech_browser_extension.md §6.5 exportAsJSON/exportAsHTML | 1. 新建 `apps/extension/lib/export.ts`<br>2. 实现 `exportAsJSON()`：导出所有书签和分类为 JSON<br>3. 实现 `exportAsHTML()`：导出为 Netscape 书签格式 HTML<br>4. 使用 `chrome.downloads.download()` 触发下载 | 点击导出按钮后，浏览器下载对应格式文件 |

---

### 阶段八：Background Script 完善

| 编号 | 任务描述 | 输入依据 | 执行说明 | 完成标准 |
|------|----------|----------|----------|----------|
| **8.1** | **完善 Background Script** | tech_browser_extension.md §6.4 | 1. 编辑 `apps/extension/entrypoints/background.ts`<br>2. 添加消息监听：<br>   - `GET_PAGE_HTML` - 获取当前页面完整 HTML（用于快照）<br>3. 首次安装时打开 Options 页面 | 发送 `GET_PAGE_HTML` 消息可获取页面 HTML |

---

### 阶段九：样式与主题

| 编号 | 任务描述 | 输入依据 | 执行说明 | 完成标准 |
|------|----------|----------|----------|----------|
| **9.1** | **配置插件 Tailwind** | - | 1. 确认 `apps/extension/style.css` 正确引入 Tailwind<br>2. 确认 postcss 配置正确<br>3. 添加主题变量（参考 @hamhome/ui 的 globals.css） | 样式正常生效，组件显示正确 |
| **9.2** | **实现暗黑模式支持** | prd.md §3.1 主题模式 | 1. 在 popup 和 options 的根元素添加 dark 类支持<br>2. 根据 settings.theme 设置对应类名<br>3. 监听系统主题变化（system 模式） | 切换主题后 UI 正确响应 |

---

### 阶段十：数据导入功能

| 编号 | 任务描述 | 输入依据 | 执行说明 | 完成标准 |
|------|----------|----------|----------|----------|
| **10.1** | **实现书签导入功能** | prd.md §3.6 书签导入 | 1. 新建 `apps/extension/lib/import.ts`<br>2. 实现 `importFromHTML(file)`：<br>   - 解析 Netscape 书签格式 HTML<br>   - 提取 URL、标题、添加时间<br>   - 去重检查（跳过已存在 URL）<br>   - 批量创建书签<br>   - 返回 ImportResult（imported/skipped/failed） | 上传 HTML 书签文件后，书签被正确导入 |
| **10.2** | **在存储管理页添加导入入口** | - | 1. 在 StorageManagementTab 中添加"导入书签"区域<br>2. 文件选择器（accept=".html"）<br>3. 显示导入进度和结果 | 可选择文件并触发导入，显示结果 |

---

### 阶段十一：集成测试与优化

| 编号 | 任务描述 | 输入依据 | 执行说明 | 完成标准 |
|------|----------|----------|----------|----------|
| **11.1** | **端到端流程验证** | - | 1. 运行 `pnpm --filter extension dev`<br>2. 验证完整收藏流程：<br>   - 访问任意网页<br>   - 点击插件图标<br>   - AI 分析（如已配置）或手动填写<br>   - 保存书签<br>3. 验证列表视图显示新书签<br>4. 验证编辑/删除功能<br>5. 验证 Options 页面所有功能 | 所有 MVP 功能可正常使用 |
| **11.2** | **构建与打包验证** | tech_browser_extension.md §10 | 1. 运行 `pnpm --filter extension build`<br>2. 运行 `pnpm --filter extension zip`<br>3. 在 Chrome 中加载打包后的插件测试 | 构建成功，zip 包可正常安装使用 |

---

## 任务依赖关系图

```
阶段一（基础设施）
    │
    ├──► 阶段二（存储层）
    │        │
    │        └──► 阶段四（AI客户端）
    │                │
    └──► 阶段三（Content Script）
             │
             └──► 阶段五（Popup保存面板）
                      │
                      ├──► 阶段六（书签列表）
                      │
                      └──► 阶段七（Options设置）
                               │
                               └──► 阶段八（Background完善）
                                        │
                                        └──► 阶段九（样式主题）
                                                 │
                                                 └──► 阶段十（数据导入）
                                                          │
                                                          └──► 阶段十一（集成测试）
```

---

## 排除项（非 MVP）

以下功能明确排除，不在此任务清单中：

- ❌ 用户注册/登录系统
- ❌ 云端数据同步
- ❌ 向量搜索 / 语义搜索
- ❌ 自然语言问答（Chat with Bookmarks）
- ❌ 每日/每周回顾推送
- ❌ 随机漫步功能
- ❌ 移动端同步
- ❌ 分类树视图（MVP 仅支持平铺分类）
- ❌ 批量 AI 处理（导入时）
- ❌ 多语言国际化（仅中文）
- ❌ 单元测试/E2E 测试
- ❌ CI/CD 配置
- ❌ 错误监控/埋点

---

## 总结

此任务清单共 **11 个阶段、27 个具体任务**，按顺序执行可完成 HamHome 浏览器插件 MVP 版本的开发。

### 预计工作量估算

| 阶段 | 任务数 | 预计耗时 |
|------|--------|----------|
| 阶段一：基础设施 | 4 | 1-2h |
| 阶段二：存储层 | 5 | 3-4h |
| 阶段三：Content Script | 2 | 1-2h |
| 阶段四：AI 客户端 | 2 | 2-3h |
| 阶段五：Popup 面板 | 6 | 4-5h |
| 阶段六：书签列表 | 4 | 3-4h |
| 阶段七：Options 页面 | 5 | 3-4h |
| 阶段八：Background | 1 | 0.5-1h |
| 阶段九：样式主题 | 2 | 1-2h |
| 阶段十：数据导入 | 2 | 1-2h |
| 阶段十一：集成测试 | 2 | 1-2h |
| **合计** | **27** | **20-30h** |

