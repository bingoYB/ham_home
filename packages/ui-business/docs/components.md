# @hamhome/ui-business 组件文档

## 概述

`@hamhome/ui-business` 是 HamHome 的共享业务 UI 组件包，提供跨 Extension 和 Web 复用的 Headless 展示组件。

组件特点：
- **无平台依赖**：不依赖 DnD、i18n、浏览器扩展 API
- **Slot 模式**：通过 `dragHandle`、`actions`、`sortableWrapper` 等插槽注入平台逻辑
- **Context 注入文本**：通过 `WorkspaceLabelsProvider` 解耦 i18n

---

## Workspace 模块

### WorkspaceLabelsProvider

i18n 解耦的 Context Provider，向下游组件提供文本标签。

#### Props

| Prop | Type | Description |
|---|---|---|
| `labels` | `WorkspaceLabels` | 所有文本标签对象 |
| `children` | `ReactNode` | 子组件 |

#### 用法

```tsx
// Extension 端 — 通过 useTranslation 注入
import { WorkspaceLabelsProvider, type WorkspaceLabels } from "@hamhome/ui-business/workspace";
import { useTranslation } from "react-i18next";

const { t } = useTranslation("bookmark");
const labels: WorkspaceLabels = {
  pageCount: (count) => t("workspace.pageCount", { count }),
  restoredAt: t("workspace.restoredAt"),
  // ...
};

<WorkspaceLabelsProvider labels={labels}>
  {/* workspace 组件 */}
</WorkspaceLabelsProvider>
```

```tsx
// Web 端 — 静态文本
const labels: WorkspaceLabels = {
  pageCount: (count) => `${count} 个标签页`,
  restoredAt: "恢复时间",
  // ...
};

<WorkspaceLabelsProvider labels={labels}>
  {/* workspace 组件 */}
</WorkspaceLabelsProvider>
```

---

### FaviconIcon

通用 favicon 展示组件。

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `favicon` | `string?` | - | favicon URL |
| `className` | `string?` | - | 自定义 class |

---

### WorkspacePageTile

页面卡片 — Headless，通过插槽注入拖拽和操作菜单。

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `page` | `WorkspaceTabPageData` | - | 页面数据 |
| `dragHandle` | `ReactNode?` | - | 拖拽手柄插槽 |
| `actions` | `ReactNode?` | - | 操作菜单插槽 |
| `onClick` | `() => void?` | - | 点击回调 |
| `className` | `string?` | - | 自定义 class |
| `isDragPlaceholder` | `boolean` | `false` | 拖拽占位态 |

---

### WorkspaceSectionHeader

工作空间区块头部 — 通过 Context 获取文本。

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `workspace` | `WorkspaceData` | - | 工作空间数据 |
| `categoryName` | `string` | - | 分类名称 |
| `categoryIcon` | `string?` | - | 分类图标 |
| `onEdit` | `(workspace) => void` | - | 编辑回调 |
| `onRestore` | `(workspace, mode) => void` | - | 恢复回调 |
| `onDelete` | `(workspace) => void` | - | 删除回调 |
| `onUpdateName` | `(id, name) => void?` | - | 名称更新回调 |
| `expanded` | `boolean` | `true` | 是否展开 |
| `onToggle` | `() => void?` | - | 切换展开 |
| `dragHandle` | `ReactNode?` | - | 拖拽手柄插槽 |
| `isDragging` | `boolean?` | - | 是否拖拽中 |

---

### WorkspaceTabGroupList

标签分组列表 — Headless，通过 `sortableWrapper` 注入排序容器。

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `pages` | `WorkspaceTabPageData[]` | - | 页面列表 |
| `tabGroups` | `WorkspaceTabGroupData[]?` | - | 分组信息 |
| `grid` | `boolean` | `false` | 网格布局 |
| `workspaceId` | `string?` | - | 工作空间 ID |
| `renderPage` | `(page, sortableId?) => ReactNode` | - | 页面渲染函数 |
| `sortableWrapper` | `(items, children) => ReactNode?` | - | 排序容器包装器 |
| `insertPlaceholder` | `{ pageId, position }?` | - | 插入占位 |

---

## Bookmark 模块

### BookmarkCard

书签管理网格卡片，展示分类、创建时间、favicon、摘要、标签和更多操作菜单。

#### Props

| name | type | required | default | description |
|---|---|---|---|---|
| `bookmark` | `BookmarkItemData` | ✓ | - | 书签展示数据 |
| `categoryName` | `string` | ✓ | - | 展示用分类名称或路径 |
| `formattedDate` | `string` | ✓ | - | 已格式化的创建时间 |
| `isSelected` | `boolean` | ✓ | - | 是否处于批量选中状态 |
| `isHighlighted` | `boolean` | - | `false` | 是否高亮当前书签 |
| `columnSize` | `number` | - | - | 网格/瀑布流列宽；不传时自适应容器 |
| `faviconSrc` | `string \| null` | - | `bookmark.favicon` | 外部解析后的 favicon URL |
| `onToggleSelect` | `() => void` | ✓ | - | 切换选中状态 |
| `onOpen` | `() => void` | ✓ | - | 更多菜单中的打开动作 |
| `onEdit` | `() => void` | ✓ | - | 编辑动作 |
| `onDelete` | `() => void` | ✓ | - | 删除动作 |
| `onViewSnapshot` | `() => void` | - | - | 查看快照动作 |
| `onSaveSnapshot` | `() => void` | - | - | 保存/更新快照动作 |
| `onDeleteSnapshot` | `() => void` | - | - | 删除快照动作 |
| `onSyncToObsidian` | `() => void` | - | - | 同步到 Obsidian 动作 |
| `onTogglePin` | `() => void` | - | - | 置顶/取消置顶动作 |
| `isPinned` | `boolean` | - | `false` | 是否已置顶 |
| `onReanalyzeAI` | `() => void` | - | - | 重新 AI 分析动作 |
| `isProcessingAI` | `boolean` | - | - | AI 批处理是否进行中 |
| `t` | `BookmarkLabelResolver` | ✓ | - | 操作菜单文案解析函数 |

#### Usage

```tsx
import { BookmarkCard } from "@hamhome/ui-business/bookmark";

<BookmarkCard
  bookmark={bookmark}
  categoryName="技术开发 > 前端框架"
  formattedDate="Today"
  isSelected={false}
  onToggleSelect={() => toggleSelect(bookmark.id)}
  onOpen={() => openBookmark(bookmark.url)}
  onEdit={() => editBookmark(bookmark)}
  onDelete={() => deleteBookmark(bookmark)}
  t={t}
/>
```

#### Behavior Notes

- 组件只负责展示和派发回调，不直接访问存储、i18n 或扩展 API。
- 快照、置顶和 AI 重新分析菜单项仅在对应回调存在时展示。

### BookmarkListItem

书签管理列表行，展示 favicon、标题、摘要、域名、分类、时间、标签和更多操作菜单。

#### Props

| name | type | required | default | description |
|---|---|---|---|---|
| `bookmark` | `BookmarkItemData` | ✓ | - | 书签展示数据 |
| `categoryName` | `string` | ✓ | - | 展示用分类名称或路径 |
| `formattedDate` | `string` | ✓ | - | 已格式化的创建时间 |
| `isSelected` | `boolean` | ✓ | - | 是否处于批量选中状态 |
| `isHighlighted` | `boolean` | - | `false` | 是否高亮当前书签 |
| `faviconSrc` | `string \| null` | - | `bookmark.favicon` | 外部解析后的 favicon URL |
| `onToggleSelect` | `() => void` | ✓ | - | 切换选中状态 |
| `onOpen` | `() => void` | ✓ | - | 更多菜单中的打开动作 |
| `onEdit` | `() => void` | ✓ | - | 编辑动作 |
| `onDelete` | `() => void` | ✓ | - | 删除动作 |
| `onViewSnapshot` | `() => void` | - | - | 查看快照动作 |
| `onSaveSnapshot` | `() => void` | - | - | 保存/更新快照动作 |
| `onDeleteSnapshot` | `() => void` | - | - | 删除快照动作 |
| `onSyncToObsidian` | `() => void` | - | - | 同步到 Obsidian 动作 |
| `onTogglePin` | `() => void` | - | - | 置顶/取消置顶动作 |
| `isPinned` | `boolean` | - | `false` | 是否已置顶 |
| `onReanalyzeAI` | `() => void` | - | - | 重新 AI 分析动作 |
| `isProcessingAI` | `boolean` | - | - | AI 批处理是否进行中 |
| `t` | `BookmarkLabelResolver` | ✓ | - | 操作菜单文案解析函数 |

#### Usage

```tsx
import { BookmarkListItem } from "@hamhome/ui-business/bookmark";

<BookmarkListItem
  bookmark={bookmark}
  categoryName="技术开发 > 前端框架"
  formattedDate="Yesterday"
  isSelected={selectedIds.has(bookmark.id)}
  onToggleSelect={() => toggleSelect(bookmark.id)}
  onOpen={() => openBookmark(bookmark.url)}
  onEdit={() => editBookmark(bookmark)}
  onDelete={() => deleteBookmark(bookmark)}
  t={t}
/>
```

#### Behavior Notes

- 标签区在大屏展示，多标签会限制高度避免撑开虚拟列表项。
- 点击标题区域使用普通链接打开，菜单动作由父组件控制。

### BookmarkActionsMenu

书签更多操作菜单，为卡片和列表行提供统一动作入口。

#### Props

| name | type | required | default | description |
|---|---|---|---|---|
| `bookmark` | `BookmarkItemData` | ✓ | - | 书签展示数据 |
| `triggerClassName` | `string` | - | `h-8 w-8` | 触发按钮 className |
| `onOpen` | `() => void` | ✓ | - | 打开动作 |
| `onEdit` | `() => void` | ✓ | - | 编辑动作 |
| `onDelete` | `() => void` | ✓ | - | 删除动作 |
| `onViewSnapshot` | `() => void` | - | - | 查看快照动作 |
| `onSaveSnapshot` | `() => void` | - | - | 保存/更新快照动作 |
| `onDeleteSnapshot` | `() => void` | - | - | 删除快照动作 |
| `onSyncToObsidian` | `() => void` | - | - | 同步到 Obsidian 动作 |
| `onTogglePin` | `() => void` | - | - | 置顶/取消置顶动作 |
| `isPinned` | `boolean` | - | `false` | 是否已置顶 |
| `onReanalyzeAI` | `() => void` | - | - | 重新 AI 分析动作 |
| `isProcessingAI` | `boolean` | - | - | AI 批处理是否进行中 |
| `t` | `BookmarkLabelResolver` | ✓ | - | 操作菜单文案解析函数 |

#### Usage

```tsx
<BookmarkActionsMenu
  bookmark={bookmark}
  onOpen={openBookmark}
  onEdit={editBookmark}
  onDelete={deleteBookmark}
  t={t}
/>
```

#### Behavior Notes

- 复制链接和 Web Share 使用浏览器标准能力；不支持分享时回退为复制链接。
- `bookmark.hasSnapshot` 为真且传入快照回调时才展示快照相关动作。

### BookmarkFavicon

书签 favicon 容器，提供统一尺寸、背景和缺省链接图标。

#### Props

| name | type | required | default | description |
|---|---|---|---|---|
| `src` | `string \| null` | - | - | favicon URL |
| `size` | `"sm" \| "md"` | - | `"md"` | 图标尺寸 |

#### Usage

```tsx
<BookmarkFavicon src={bookmark.favicon} size="sm" />
```

#### Behavior Notes

- 图片加载失败时隐藏图片，保留统一容器尺寸。

### BookmarkCategoryBadge

书签分类 Badge，使用 HamHome 统一的绿色分类样式。

#### Props

| name | type | required | default | description |
|---|---|---|---|---|
| `categoryName` | `string` | ✓ | - | 分类名称或路径 |

#### Usage

```tsx
<BookmarkCategoryBadge categoryName="技术开发 > 前端框架" />
```

#### Behavior Notes

- 长分类名会截断，完整内容放在 `title` 属性中。

---

## Common 模块

### TagInput

标签输入组件，统一保存书签、导入演示等场景中的标签展示、添加、删除和建议选择。

#### Props

| name | type | required | default | description |
|---|---|---|---|---|
| `value` | `string[]` | ✓ | - | 当前标签列表 |
| `onChange` | `(tags: string[]) => void` | ✓ | - | 标签列表变更回调 |
| `placeholder` | `string` | - | `"输入标签后按回车"` | 输入框占位文案 |
| `maxTags` | `number` | - | `10` | 最大标签数 |
| `suggestions` | `string[]` | - | `[]` | 标签建议来源 |
| `className` | `string` | - | - | 自定义样式类 |
| `labels` | `Partial<TagInputLabels>` | - | - | 最大数量、计数、删除按钮文案 |

#### Usage

```tsx
import { TagInput } from "@hamhome/ui-business/common";

<TagInput value={tags} onChange={setTags} suggestions={allTags} />
```

#### Behavior Notes

- 回车添加标签，空输入时按 Backspace 删除最后一个标签。
- 建议列表只展示未选中且匹配当前输入的前 5 项。

---

## Bookmark Panel 模块

### BookmarkPanelItem

侧边栏书签项，包含 favicon、标题、外链图标和 HoverCard 预览。

#### Props

| name | type | required | default | description |
|---|---|---|---|---|
| `bookmark` | `BookmarkPanelBookmarkData` | ✓ | - | 书签数据 |
| `faviconSrc` | `string \| null` | - | `bookmark.favicon` | 外部解析后的 favicon URL |
| `isHighlighted` | `boolean` | - | `false` | 是否高亮当前书签 |
| `portalContainer` | `HTMLElement` | - | - | HoverCard Portal 容器 |

#### Usage

```tsx
import { BookmarkPanelItem } from "@hamhome/ui-business/bookmark-panel";

<BookmarkPanelItem bookmark={bookmark} portalContainer={portalContainer} />
```

### BookmarkCategoryTreeView

分类层级树视图，按分类关系聚合书签，支持展开/折叠、未分类节点和自定义书签项渲染。

#### Props

| name | type | required | default | description |
|---|---|---|---|---|
| `bookmarks` | `BookmarkPanelBookmarkData[]` | ✓ | - | 书签列表 |
| `categories` | `BookmarkPanelCategoryData[]` | ✓ | - | 分类列表 |
| `highlightedBookmarkId` | `string \| null` | - | - | 高亮书签 ID |
| `bookmarkRefs` | `MutableRefObject<Map<string, HTMLElement>>` | - | - | 书签 DOM 引用映射 |
| `className` | `string` | - | - | 自定义样式类 |
| `uncategorizedLabel` | `string` | - | `"未分类"` | 未分类节点名称 |
| `renderBookmark` | `(bookmark, state) => ReactNode` | - | - | 自定义书签项渲染 |

#### Usage

```tsx
import { BookmarkCategoryTreeView } from "@hamhome/ui-business/bookmark-panel";

<BookmarkCategoryTreeView bookmarks={bookmarks} categories={categories} />
```

#### Behavior Notes

- 默认展开顶层分类与未分类节点。
- 未匹配到有效分类的书签会进入未分类节点。

---

## AI Search 模块

### SearchInputArea

关键词搜索输入框，支持 compact 模式、清空按钮和 Enter 提交。

#### Props

| name | type | required | default | description |
|---|---|---|---|---|
| `value` | `string` | ✓ | - | 搜索值 |
| `onChange` | `(val: string) => void` | ✓ | - | 搜索值变更回调 |
| `onSubmit` | `() => void` | - | - | Enter 提交回调 |
| `compact` | `boolean` | - | `false` | 紧凑模式 |
| `className` | `string` | - | - | 自定义样式类 |
| `placeholder` | `string` | ✓ | - | 输入框占位文案 |

### AIChatPanel

AI 对话搜索面板，包含底部搜索栏、对话消息、状态、引用源和建议操作。

#### Props

| name | type | required | default | description |
|---|---|---|---|---|
| `isOpen` | `boolean` | ✓ | - | 是否展开对话窗口 |
| `onClose` | `() => void` | ✓ | - | 关闭回调 |
| `query` | `string` | ✓ | - | 输入值 |
| `onQueryChange` | `(val: string) => void` | ✓ | - | 输入值变更 |
| `onSubmit` | `() => void` | ✓ | - | 提交回调 |
| `messages` | `ChatMessage[]` | ✓ | - | 对话历史 |
| `currentAnswer` | `string` | ✓ | - | 流式生成中的回答 |
| `status` | `AISearchStatus` | ✓ | - | 当前搜索状态 |
| `error` | `string \| null` | - | - | 错误信息 |
| `sources` | `Source[]` | ✓ | - | 当前引用源 |
| `onSourceClick` | `(bookmarkId: string) => void` | ✓ | - | 引用源点击回调 |
| `suggestions` | `Suggestion[]` | - | `[]` | 建议操作 |
| `onSuggestionClick` | `(suggestion: Suggestion) => void` | - | - | 建议点击回调 |
| `onRetry` | `() => void` | - | - | 重试回调 |
| `sessions` | `AIChatSession[]` | - | `[]` | 可切换的对话列表 |
| `currentSessionId` | `string \| null` | - | - | 当前对话 ID |
| `onSessionChange` | `(sessionId: string) => void` | - | - | 切换对话回调 |
| `onCreateSession` | `() => void` | - | - | 新建对话回调 |
| `onDeleteSession` | `(sessionId: string) => void` | - | - | 删除对话回调 |
| `className` | `string` | - | - | 自定义样式类 |
| `labels` | `AIChatLabels` | ✓ | - | 文案标签 |

#### Usage

```tsx
import { AIChatPanel } from "@hamhome/ui-business/ai-search";

<AIChatPanel
  isOpen={isOpen}
  onClose={close}
  query={query}
  onQueryChange={setQuery}
  onSubmit={search}
  messages={messages}
  currentAnswer={currentAnswer}
  status={status}
  sources={sources}
  onSourceClick={openSource}
  sessions={sessions}
  currentSessionId={currentSessionId}
  onSessionChange={switchSession}
  onCreateSession={createSession}
  labels={labels}
/>
```

---

## Category 模块

### CategoryPreviewTree

分类方案预览树，复用在 Web 演示和 Extension 分类页面的预设/AI 分类预览。

#### Props

| name | type | required | default | description |
|---|---|---|---|---|
| `categories` | `HierarchicalCategoryData[]` | ✓ | - | 层级分类数据 |
| `level` | `number` | - | `0` | 当前递归层级 |
| `generated` | `boolean` | - | `false` | 是否使用 AI 生成分类样式 |

#### Usage

```tsx
import { CategoryPreviewTree } from "@hamhome/ui-business/category";

<CategoryPreviewTree categories={categories} generated />
```

---

## Import Export 模块

### ImportExportDemoPanel

导入导出演示面板，统一 Web 演示与插件导入配置的视觉结构。

#### Props

| name | type | required | default | description |
|---|---|---|---|---|
| `texts` | `ImportExportDemoTexts` | ✓ | - | 面板全部展示文案 |
| `preserveFolders` | `boolean` | ✓ | - | 是否保留目录结构 |
| `enableAIAnalysis` | `boolean` | ✓ | - | 是否启用 AI 分析 |
| `fetchPageContent` | `boolean` | ✓ | - | 是否抓取页面内容 |
| `importing` | `boolean` | ✓ | - | 是否正在导入 |
| `progress` | `number` | ✓ | - | 导入进度 |
| `result` | `ImportExportDemoResult \| null` | ✓ | - | 导入结果 |
| `onPreserveFoldersChange` | `(checked: boolean) => void` | ✓ | - | 保留目录结构变更 |
| `onEnableAIAnalysisChange` | `(checked: boolean) => void` | ✓ | - | AI 分析开关变更 |
| `onFetchPageContentChange` | `(checked: boolean) => void` | ✓ | - | 抓取页面内容变更 |
| `onImportFile` | `() => void` | ✓ | - | 从文件导入 |
| `onImportBrowser` | `() => void` | ✓ | - | 从浏览器导入 |

#### Usage

```tsx
import { ImportExportDemoPanel } from "@hamhome/ui-business/import-export";

<ImportExportDemoPanel
  texts={texts}
  preserveFolders={preserveFolders}
  enableAIAnalysis={enableAIAnalysis}
  fetchPageContent={fetchPageContent}
  importing={importing}
  progress={progress}
  result={result}
  onPreserveFoldersChange={setPreserveFolders}
  onEnableAIAnalysisChange={setEnableAIAnalysis}
  onFetchPageContentChange={setFetchPageContent}
  onImportFile={importFile}
  onImportBrowser={importBrowser}
/>
```

---

## 工具函数

| 函数 | 描述 |
|---|---|
| `formatWorkspaceDate` | 格式化时间（短） |
| `formatWorkspaceDateTime` | 格式化时间（完整） |
| `getWorkspaceTabGroupKey` | Tab group 唯一键 |
| `getWorkspacePageGroupKey` | Page 所属分组键 |
| `filterWorkspaceTabGroups` | 过滤有效分组 |
| `CATEGORY_COLOR` | 分类 badge 颜色 |
| `getBookmarkHostname` | 从书签 URL 中提取 hostname，非法 URL 回退原字符串 |
| `BOOKMARK_CATEGORY_COLOR` | 书签分类 badge 颜色 |
| `formatScore` | 格式化 AI 引用源相关度百分比 |
| `getScoreColor` | 根据 AI 引用源分数返回颜色 class |
| `getSuggestionIcon` | 根据建议动作返回图标组件 |
| `isDirectAction` | 判断建议是否为直接动作 |
