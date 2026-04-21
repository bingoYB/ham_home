# Extension 组件文档

## SavePanel

保存当前页面为 HamHome 书签的弹出面板，负责书签表单、AI 推荐入口和页面快照保存策略。

### SavePanelView

保存面板展示组件。业务状态由 `useSavePanel` 注入，组件只负责渲染表单、快照开关和操作按钮。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| title | `string` | ✓ | - | 书签标题 |
| description | `string` | ✓ | - | 书签摘要 |
| categoryId | `string \| null` | ✓ | - | 当前分类 ID |
| tags | `string[]` | ✓ | - | 当前标签列表 |
| categories | `LocalCategory[]` | ✓ | - | 可选分类列表 |
| allTags | `string[]` | ✓ | - | 标签建议列表 |
| existingBookmark | `LocalBookmark \| null` | ✓ | - | 当前 URL 已存在的书签 |
| aiRecommendedCategory | `string \| null` | ✓ | - | AI 推荐但未创建的分类 |
| aiStatus | `AIStatusType` | ✓ | - | AI 推荐状态 |
| aiError | `string \| null` | ✓ | - | AI 错误信息 |
| saving | `boolean` | ✓ | - | 是否正在保存 |
| saveSnapshot | `boolean` | ✓ | - | 本次保存是否保存快照 |
| defaultSnapshotType | `DefaultSnapshotType` | ✓ | - | 本次保存使用的快照类型策略 |
| snapshotStatus | `SavePanelSnapshotStatus` | ✓ | - | 书签与快照保存状态 |
| snapshotError | `string \| null` | ✓ | - | 快照保存错误信息 |
| onTitleChange | `(value: string) => void` | ✓ | - | 标题变更回调 |
| onDescriptionChange | `(value: string) => void` | ✓ | - | 摘要变更回调 |
| onCategoryChange | `(value: string \| null) => void` | ✓ | - | 分类变更回调 |
| onTagsChange | `(value: string[]) => void` | ✓ | - | 标签变更回调 |
| onSaveSnapshotChange | `(value: boolean) => void` | ✓ | - | 快照开关变更回调 |
| onDefaultSnapshotTypeChange | `(value: DefaultSnapshotType) => void` | ✓ | - | 快照类型策略变更回调 |
| onLoadSuggestions | `() => void` | ✓ | - | 触发 AI 推荐 |
| onApplyAICategory | `() => void` | ✓ | - | 应用 AI 推荐分类 |
| onRetry | `() => void` | ✓ | - | 重试 AI 推荐 |
| onConfigureAI | `() => void` | - | - | 打开 AI 设置 |
| onSave | `() => void` | ✓ | - | 保存书签 |
| onCancel | `() => void` | - | - | 取消保存 |
| onDelete | `() => void` | - | - | 删除现有书签 |

**用法示例：**

```tsx
<SavePanelView
  title={title}
  description={description}
  categoryId={categoryId}
  tags={tags}
  categories={categories}
  allTags={allTags}
  existingBookmark={existingBookmark}
  aiRecommendedCategory={aiRecommendedCategory}
  aiStatus={aiStatus}
  aiError={aiError}
  saving={saving}
  saveSnapshot={saveSnapshot}
  defaultSnapshotType={defaultSnapshotType}
  snapshotStatus={snapshotStatus}
  snapshotError={snapshotError}
  onTitleChange={setTitle}
  onDescriptionChange={setDescription}
  onCategoryChange={setCategoryId}
  onTagsChange={setTags}
  onSaveSnapshotChange={setSaveSnapshot}
  onDefaultSnapshotTypeChange={setDefaultSnapshotType}
  onLoadSuggestions={runAIAnalysis}
  onApplyAICategory={applyAIRecommendedCategory}
  onRetry={retryAnalysis}
  onSave={save}
/>
```

**行为说明：**

- `saveSnapshot` 初始值跟随设置页的默认保存快照策略。
- 保存面板内调整快照开关只影响本次保存，不反写设置页默认值。
- `defaultSnapshotType` 为 `none` 时会关闭本次快照保存。
- 快照保存失败不会回滚已保存书签，面板会保留错误状态，用户可稍后通过书签管理页重试。

## bookmarkPanel

书签面板相关组件，用于 Content UI 侧边书签浏览。

### BookmarkPanel

书签面板主容器组件，整合头部搜索筛选和分类树列表。

| Prop           | Type                    | Required | Default | Description            |
| -------------- | ----------------------- | -------- | ------- | ---------------------- |
| bookmarks      | `LocalBookmark[]`       | ✓        | -       | 书签数据列表           |
| categories     | `LocalCategory[]`       | ✓        | -       | 分类数据列表           |
| isOpen         | `boolean`               | ✓        | -       | 面板是否打开           |
| position       | `PanelPosition`         | ✓        | -       | 面板位置（left/right） |
| onClose        | `() => void`            | ✓        | -       | 关闭回调               |
| onOpenBookmark | `(url: string) => void` | -        | -       | 打开书签回调           |
| onOpenSettings | `() => void`            | -        | -       | 打开设置回调           |

**行为说明：**

- 面板始终按当前视口左右边缘定位，不依赖挂载容器宽度
- 监听 `settings.panelPosition` 变化，内容页无需刷新即可在左/右侧间切换
- 面板关闭时禁用 pointer events，避免隐藏态遮挡页面交互
- 当前页面不可见或失去活跃状态时，content UI 不响应打开指令并自动收起面板

---

### BookmarkHeader

书签面板头部组件，包含关键词搜索框、筛选器和快捷操作（QuickActions）。

| Prop                   | Type                                                    | Required | Default | Description           |
| ---------------------- | ------------------------------------------------------- | -------- | ------- | --------------------- |
| searchQuery            | `string`                                                | ✓        | -       | 搜索关键词            |
| onSearchChange         | `(query: string) => void`                               | ✓        | -       | 搜索变更回调          |
| bookmarkCount          | `number`                                                | ✓        | -       | 总书签数              |
| filteredCount          | `number`                                                | ✓        | -       | 筛选后书签数          |
| allTags                | `string[]`                                              | ✓        | -       | 所有可用标签          |
| selectedTags           | `string[]`                                              | ✓        | -       | 已选标签              |
| onToggleTag            | `(tag: string) => void`                                 | ✓        | -       | 切换标签选择          |
| onClearTagFilter       | `() => void`                                            | ✓        | -       | 清除标签筛选          |
| timeRange              | `TimeRange`                                             | ✓        | -       | 时间范围筛选          |
| onTimeRangeChange      | `(range: TimeRange) => void`                            | ✓        | -       | 时间范围变更          |
| onClearTimeFilter      | `() => void`                                            | ✓        | -       | 清除时间筛选          |
| customFilters          | `CustomFilter[]`                                        | ✓        | -       | 自定义筛选器列表      |
| selectedCustomFilterId | `string`                                                | -        | -       | 选中的自定义筛选器 ID |
| onSelectCustomFilter   | `(filterId: string \| null) => void`                    | -        | -       | 选择自定义筛选器回调  |
| onSaveCustomFilter     | `(name: string, conditions: FilterCondition[]) => void` | -        | -       | 保存自定义筛选器回调  |
| className              | `string`                                                | -        | -       | 自定义样式类          |

**行为说明：**

- 快捷操作区域使用共享的 `QuickActions` 组件
- 包含主题切换、语言切换和"更多"下拉菜单
- AI 搜索使用底部的 `AIChatPanel` 组件

---

## common

通用共享组件，可在多处复用。

### QuickActions

快捷操作组件，包含主题切换、语言切换和"更多"下拉菜单。可复用于 BookmarkHeader 和 Popup。

| Prop            | Type                | Required | Default     | Description                    |
| --------------- | ------------------- | -------- | ----------- | ------------------------------ |
| size            | `'default' \| 'sm'` | -        | `'default'` | 尺寸变体                       |
| showTooltip     | `boolean`           | -        | `true`      | 是否显示 tooltip               |
| className       | `string`            | -        | -           | 自定义样式类                   |
| portalContainer | `HTMLElement`       | -        | -           | Portal 容器（用于 content UI） |

**功能说明：**

- **主题切换按钮**：点击切换浅色/深色主题
- **语言切换按钮**：点击切换中文/英文语言
- **更多菜单**（hover 触发下拉）：
  - 管理书签：打开书签管理页面（app.html）
  - 查看快捷键：打开浏览器扩展快捷键设置页面
  - 设置：打开扩展设置页面

**用法示例：**

```tsx
// 在 BookmarkHeader (content UI) 中使用
const { container: portalContainer } = useContentUI();
<QuickActions portalContainer={portalContainer} />

// 在 Popup 中使用
<QuickActions size="sm" showTooltip />
```

**行为说明：**

- 更多菜单使用 hover 触发，鼠标移入按钮打开，移出菜单关闭
- 在 content UI 环境中需要传入 portalContainer 确保 Portal 正确渲染
- 使用 `useShortcuts` hook 获取快捷键信息并显示在菜单项中

---

### CategorySelect

分类选择组件，用于书签保存/编辑场景，支持树形分类搜索、未分类选项和 AI 推荐分类映射。

| Prop                  | Type                         | Required | Default | Description                      |
| --------------------- | ---------------------------- | -------- | ------- | -------------------------------- |
| value                 | `string \| null`             | ✓        | -       | 当前选中的分类 ID，`null` 表示未分类 |
| onChange              | `(value: string \| null) => void` | ✓   | -       | 分类变更回调                     |
| categories            | `LocalCategory[]`            | ✓        | -       | 分类列表                         |
| aiRecommendedCategory | `string \| null`             | -        | -       | AI 推荐分类路径或名称            |
| onApplyAICategory     | `() => void`                 | -        | -       | 应用 AI 推荐分类回调             |
| placeholder           | `string`                     | -        | -       | 自定义占位文案                   |
| className             | `string`                     | -        | -       | 自定义容器样式类                 |

**行为说明：**

- 触发器支持 `Enter`、`Space`、`ArrowUp`、`ArrowDown` 打开下拉
- 下拉打开后支持 `↑/↓` 高亮切换、`Enter` 选择、`Esc` 关闭、`Home/End` 跳转到首尾项
- 树节点在非搜索态下支持 `←/→` 收起或展开子分类
- 打开下拉后会自动聚焦搜索框，输入字符可直接过滤分类结果

---

### CategoryTreeView

分类层级树视图组件，按分类层级展示书签，支持展开/折叠。

| Prop                  | Type                                        | Required | Default | Description              |
| --------------------- | ------------------------------------------- | -------- | ------- | ------------------------ |
| bookmarks             | `LocalBookmark[]`                           | ✓        | -       | 书签数据列表             |
| categories            | `LocalCategory[]`                           | ✓        | -       | 分类数据列表             |
| highlightedBookmarkId | `string \| null`                            | -        | -       | 高亮的书签 ID            |
| bookmarkRefs          | `MutableRefObject<Map<string, HTMLElement>>`| -        | -       | 书签元素引用（用于滚动） |
| onOpenBookmark        | `(url: string) => void`                     | -        | -       | 打开书签回调             |
| className             | `string`                                    | -        | -       | 自定义样式类             |

**行为说明：**

- 默认展开所有顶层分类和未分类节点
- 点击分类头部可切换展开/折叠
- 支持多层嵌套分类结构
- 未分类书签（`categoryId` 为 `null`、空字符串、或指向不存在的分类）归类到"未分类"节点

---

### FilterDropdown

筛选类型选择下拉组件，提供标签筛选和时间筛选入口。

| Prop              | Type                         | Required | Default | Description    |
| ----------------- | ---------------------------- | -------- | ------- | -------------- |
| hasTagFilter      | `boolean`                    | ✓        | -       | 是否有标签筛选 |
| hasTimeFilter     | `boolean`                    | ✓        | -       | 是否有时间筛选 |
| onSelectFilter    | `(type: FilterType) => void` | ✓        | -       | 选择筛选类型   |
| onClearTagFilter  | `() => void`                 | -        | -       | 清除标签筛选   |
| onClearTimeFilter | `() => void`                 | -        | -       | 清除时间筛选   |

---

### TagFilterPopover

标签筛选弹窗组件，支持搜索标签和多选。

| Prop         | Type                      | Required | Default | Description  |
| ------------ | ------------------------- | -------- | ------- | ------------ |
| open         | `boolean`                 | ✓        | -       | 弹窗是否打开 |
| onOpenChange | `(open: boolean) => void` | ✓        | -       | 打开状态变更 |
| allTags      | `string[]`                | ✓        | -       | 所有可用标签 |
| selectedTags | `string[]`                | ✓        | -       | 已选标签     |
| onToggleTag  | `(tag: string) => void`   | ✓        | -       | 切换标签选择 |
| onConfirm    | `() => void`              | -        | -       | 确认回调     |

---

### TimeFilterPopover

时间范围筛选弹窗组件，支持预设时间范围和自定义范围。

| Prop              | Type                         | Required | Default | Description  |
| ----------------- | ---------------------------- | -------- | ------- | ------------ |
| open              | `boolean`                    | ✓        | -       | 弹窗是否打开 |
| onOpenChange      | `(open: boolean) => void`    | ✓        | -       | 打开状态变更 |
| timeRange         | `TimeRange`                  | ✓        | -       | 当前时间范围 |
| onTimeRangeChange | `(range: TimeRange) => void` | ✓        | -       | 时间范围变更 |

**预设选项：**

- 全部时间
- 今天
- 最近一周
- 最近一月
- 最近一年
- 自定义范围

---

### BookmarkListItem

书签列表项组件，用于在分类树中显示单个书签。

| Prop     | Type            | Required | Default | Description |
| -------- | --------------- | -------- | ------- | ----------- |
| bookmark | `LocalBookmark` | ✓        | -       | 书签数据    |

**行为说明：**

- 使用 `<a>` 标签打开链接，在新标签页中打开
- 只显示书签标题，不显示链接地址
- 鼠标悬停时显示 Tooltip，包含标题、描述和完整链接地址
- 显示书签 favicon，加载失败时显示默认图标

**用法示例：**

```tsx
<BookmarkListItem bookmark={bookmark} />
```

---

## bookmarkListMng

书签管理页面组件，用于主应用中的网格/列表展示、编辑和快照操作。

### BookmarkCard

网格视图书签卡片，展示书签摘要、分类、标签和更多操作菜单。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| bookmark | `LocalBookmark` | ✓ | - | 书签数据 |
| categoryName | `string` | ✓ | - | 展示用分类路径 |
| formattedDate | `string` | ✓ | - | 格式化后的创建时间 |
| isSelected | `boolean` | ✓ | - | 是否被批量选中 |
| isHighlighted | `boolean` | - | `false` | 是否高亮 |
| columnSize | `number` | - | `356` | 瀑布流列宽 |
| onToggleSelect | `() => void` | ✓ | - | 切换选中状态 |
| onOpen | `() => void` | ✓ | - | 打开书签 |
| onEdit | `() => void` | ✓ | - | 编辑书签 |
| onDelete | `() => void` | ✓ | - | 删除书签 |
| onViewSnapshot | `() => void` | - | - | 查看快照 |
| onSaveSnapshot | `() => void` | - | - | 保存或更新快照 |
| onDeleteSnapshot | `() => void` | - | - | 删除快照 |
| onReanalyzeAI | `() => void` | - | - | 重新执行 AI 分析 |
| isProcessingAI | `boolean` | - | - | AI 批处理是否运行中 |
| t | `(key: string, options?: Record<string, unknown>) => string` | ✓ | - | i18n 翻译函数 |

**用法示例：**

```tsx
<BookmarkCard
  bookmark={bookmark}
  categoryName={categoryName}
  formattedDate={formattedDate}
  isSelected={false}
  onToggleSelect={toggleSelect}
  onOpen={openBookmark}
  onEdit={editBookmark}
  onDelete={deleteBookmark}
  onViewSnapshot={bookmark.hasSnapshot ? viewSnapshot : undefined}
  onSaveSnapshot={saveSnapshot}
  onDeleteSnapshot={bookmark.hasSnapshot ? deleteSnapshot : undefined}
  t={t}
/>
```

**行为说明：**

- 有快照时展示 `查看快照` 和 `删除快照`。
- 始终可通过更多菜单触发 `保存快照` 或 `更新快照`。
- 快照操作由父组件注入，组件不直接访问存储或浏览器 API。

### BookmarkListItem（管理列表）

列表视图书签行，展示书签标题、域名、分类、时间、标签和更多操作菜单。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| bookmark | `LocalBookmark` | ✓ | - | 书签数据 |
| categoryName | `string` | ✓ | - | 展示用分类路径 |
| formattedDate | `string` | ✓ | - | 格式化后的创建时间 |
| isSelected | `boolean` | ✓ | - | 是否被批量选中 |
| isHighlighted | `boolean` | - | `false` | 是否高亮 |
| onToggleSelect | `() => void` | ✓ | - | 切换选中状态 |
| onOpen | `() => void` | ✓ | - | 打开书签 |
| onEdit | `() => void` | ✓ | - | 编辑书签 |
| onDelete | `() => void` | ✓ | - | 删除书签 |
| onViewSnapshot | `() => void` | - | - | 查看快照 |
| onSaveSnapshot | `() => void` | - | - | 保存或更新快照 |
| onDeleteSnapshot | `() => void` | - | - | 删除快照 |
| onReanalyzeAI | `() => void` | - | - | 重新执行 AI 分析 |
| isProcessingAI | `boolean` | - | - | AI 批处理是否运行中 |
| t | `(key: string, options?: Record<string, unknown>) => string` | ✓ | - | i18n 翻译函数 |

**用法示例：**

```tsx
<BookmarkListItem
  bookmark={bookmark}
  categoryName={categoryName}
  formattedDate={formattedDate}
  isSelected={false}
  onToggleSelect={toggleSelect}
  onOpen={openBookmark}
  onEdit={editBookmark}
  onDelete={deleteBookmark}
  onSaveSnapshot={saveSnapshot}
  t={t}
/>
```

**行为说明：**

- 快照菜单项与网格视图一致。
- 快照状态来自 `bookmark.hasSnapshot`，删除快照后父组件需要刷新书签列表。
- 组件保持展示职责，不直接执行快照存储逻辑。

---

## aiSearch

AI 对话式搜索相关组件，提供底部 AI 搜索栏和对话窗口。

### SearchInputArea

关键词搜索输入组件（纯关键词搜索）。

| Prop        | Type                    | Required | Default | Description        |
| ----------- | ----------------------- | -------- | ------- | ------------------ |
| value       | `string`                | ✓        | -       | 搜索值             |
| onChange    | `(val: string) => void` | ✓        | -       | 值变化回调         |
| onSubmit    | `() => void`            | -        | -       | 搜索提交回调       |
| compact     | `boolean`               | -        | `false` | 紧凑模式（侧边栏） |
| className   | `string`                | -        | -       | 自定义样式类       |
| placeholder | `string`                | -        | -       | placeholder 覆盖   |

**用法示例：**

```tsx
<SearchInputArea
  value={searchQuery}
  onChange={setSearchQuery}
  compact
/>
```

**行为说明：**

- 纯关键词搜索输入框
- Enter 键触发搜索提交
- 支持 compact 模式用于侧边栏紧凑布局

---

### AIChatPanel

AI 对话面板组件，合并了搜索栏和对话窗口，使用 sticky 布局吸附在底部。内容区域最大宽度 720px，居中显示，顶部圆角。

| Prop              | Type                              | Required | Default | Description          |
| ----------------- | --------------------------------- | -------- | ------- | -------------------- |
| isOpen            | `boolean`                         | ✓        | -       | 是否展开对话窗口     |
| onClose           | `() => void`                      | ✓        | -       | 关闭回调             |
| query             | `string`                          | ✓        | -       | 搜索值               |
| onQueryChange     | `(val: string) => void`           | ✓        | -       | 搜索值变化回调       |
| onSubmit          | `() => void`                      | ✓        | -       | 搜索提交回调         |
| messages          | `ChatMessage[]`                   | ✓        | -       | 对话历史             |
| currentAnswer     | `string`                          | ✓        | -       | 当前正在生成的回答   |
| status            | `AISearchStatus`                  | ✓        | -       | 当前状态             |
| error             | `string \| null`                  | -        | -       | 错误信息             |
| sources           | `Source[]`                        | ✓        | -       | 当前回答的引用源     |
| onSourceClick     | `(bookmarkId: string) => void`    | ✓        | -       | 点击引用回调         |
| suggestions       | `string[]`                        | -        | `[]`    | 后续建议             |
| onSuggestionClick | `(suggestion: string) => void`    | -        | -       | 后续建议点击回调     |
| onRetry           | `() => void`                      | -        | -       | 重试回调             |
| className         | `string`                          | -        | -       | 自定义样式类         |

**子组件：**

该组件由以下子组件组成，可单独使用：

- `AIChatSearchBar` - 搜索输入栏
- `AIChatStatusIndicator` - 状态指示器
- `AIChatSources` - 引用源列表
- `AIChatSuggestions` - 后续建议
- `AIChatMessage` - 消息组件

---

### AIChatSearchBar

AI 搜索输入栏组件，包含输入框和提交按钮。搜索栏最大宽度 720px，居中显示。

| Prop          | Type                      | Required | Default | Description      |
| ------------- | ------------------------- | -------- | ------- | ---------------- |
| query         | `string`                  | ✓        | -       | 搜索值           |
| isSearching   | `boolean`                 | ✓        | -       | 是否正在搜索     |
| onQueryChange | `(value: string) => void` | ✓        | -       | 搜索值变化回调   |
| onSubmit      | `() => void`              | ✓        | -       | 提交回调         |

**用法示例：**

```tsx
<AIChatSearchBar
  query={query}
  isSearching={isSearching}
  onQueryChange={setQuery}
  onSubmit={handleSearch}
/>
```

---

### AIChatStatusIndicator

AI 状态指示器组件，显示当前搜索/生成状态。

| Prop    | Type                | Required | Default | Description |
| ------- | ------------------- | -------- | ------- | ----------- |
| status  | `AISearchStatus`    | ✓        | -       | 当前状态    |
| error   | `string \| null`    | -        | -       | 错误信息    |
| onRetry | `() => void`        | -        | -       | 重试回调    |

**用法示例：**

```tsx
<AIChatStatusIndicator status={status} error={error} onRetry={handleRetry} />
```

---

### AIChatSources

AI 引用源列表组件，显示回答引用的书签来源。

| Prop          | Type                         | Required | Default | Description    |
| ------------- | ---------------------------- | -------- | ------- | -------------- |
| sources       | `Source[]`                   | ✓        | -       | 引用源列表     |
| onSourceClick | `(source: Source) => void`   | ✓        | -       | 点击引用回调   |

**用法示例：**

```tsx
<AIChatSources sources={sources} onSourceClick={handleSourceClick} />
```

---

### AIChatSuggestions

AI 后续建议组件，显示可点击的建议操作。

| Prop              | Type                           | Required | Default | Description        |
| ----------------- | ------------------------------ | -------- | ------- | ------------------ |
| suggestions       | `string[]`                     | ✓        | -       | 建议列表           |
| onSuggestionClick | `(suggestion: string) => void` | -        | -       | 点击建议回调       |

**用法示例：**

```tsx
<AIChatSuggestions
  suggestions={suggestions}
  onSuggestionClick={handleSuggestionClick}
/>
```

---

### AIChatMessage

AI 消息组件，显示单条对话消息（用户或助手）。

| Prop          | Type                         | Required | Default | Description            |
| ------------- | ---------------------------- | -------- | ------- | ---------------------- |
| message       | `ChatMessage`                | ✓        | -       | 消息内容               |
| sources       | `Source[]`                   | -        | `[]`    | 引用源（解析引用标记） |
| onSourceClick | `(source: Source) => void`   | ✓        | -       | 点击引用回调           |

**用法示例：**

```tsx
<AIChatMessage
  message={message}
  sources={sources}
  onSourceClick={handleSourceClick}
/>
```

**行为说明：**

- 用户消息显示在右侧，助手消息显示在左侧
- 自动解析消息内容中的 `[1]`、`[2]` 等引用标记并转换为可点击按钮

**用法示例：**

```tsx
<AIChatPanel
  isOpen={isAIChatOpen}
  onClose={closeAIChat}
  query={aiQuery}
  onQueryChange={setAIQuery}
  onSubmit={handleAISearch}
  messages={aiMessages}
  currentAnswer={aiCurrentAnswer}
  status={aiStatus}
  error={aiError}
  sources={aiResults}
  onSourceClick={handleSourceClick}
  suggestions={aiSuggestions}
  onSuggestionClick={(suggestion) => {
    setAIQuery(suggestion);
    handleAISearch();
  }}
  onRetry={handleAISearch}
/>
```

**行为说明：**

- 使用 `sticky bottom-0` 布局，始终吸附在滚动容器底部
- 搜索输入栏始终可见，对话窗口在搜索后展开
- 对话窗口最大高度为 50vh，超出时内部滚动
- 回答中的 `[1]`、`[2]` 等引用标记可点击跳转
- 点击引用会触发 `onSourceClick` 回调，滚动定位到对应书签
- 支持流式输出动画显示

---

### AIAnswerPanel（已弃用）

AI 回答面板组件，展示 AI 回答、引用源和后续建议。已被 `AIChatPanel` 替代，保留用于向后兼容。

| Prop              | Type                              | Required | Default | Description          |
| ----------------- | --------------------------------- | -------- | ------- | -------------------- |
| compact           | `boolean`                         | -        | `false` | 紧凑模式（侧边栏）   |
| answer            | `string`                          | ✓        | -       | AI 回答内容          |
| status            | `AISearchStatus`                  | ✓        | -       | AI 状态              |
| error             | `string \| null`                  | -        | -       | 错误信息             |
| sources           | `Source[]`                        | ✓        | -       | 引用源列表           |
| onSourceClick     | `(bookmarkId: string) => void`    | ✓        | -       | 点击引用回调         |
| onClose           | `() => void`                      | ✓        | -       | 关闭/收起回调        |
| suggestions       | `string[]`                        | -        | `[]`    | 后续建议列表         |
| onSuggestionClick | `(suggestion: string) => void`    | -        | -       | 后续建议点击回调     |
| onRetry           | `() => void`                      | -        | -       | 重试回调             |
| className         | `string`                          | -        | -       | 自定义样式类         |

**AISearchStatus 类型：**

```ts
type AISearchStatus = 'idle' | 'thinking' | 'searching' | 'writing' | 'done' | 'error';
```

**Source 类型：**

```ts
interface Source {
  index: number;         // 引用编号（从 1 开始）
  bookmarkId: string;    // 书签 ID
  title: string;         // 书签标题
  url: string;           // 书签 URL
  score?: number;        // 综合相关度分数 (0-1)
  keywordScore?: number; // 关键词匹配分数 (0-1)
  semanticScore?: number;// 语义匹配分数 (0-1)
  matchReason?: string;  // 匹配原因描述
}
```

---

## bookmarkListMng

书签列表管理相关组件，用于 `MainContent` 主内容区的书签展示和编辑。

### BookmarkCard

网格视图下的书签卡片组件。

| Prop           | Type            | Required | Default | Description              |
| -------------- | --------------- | -------- | ------- | ------------------------ |
| bookmark       | `LocalBookmark` | ✓        | -       | 书签数据                 |
| categoryName   | `string`        | ✓        | -       | 分类全路径名称           |
| formattedDate  | `string`        | ✓        | -       | 格式化后的创建日期       |
| isSelected     | `boolean`       | ✓        | -       | 是否被选中               |
| isHighlighted  | `boolean`       | -        | `false` | AI 引用高亮状态          |
| columnSize     | `number`        | -        | `356`   | 卡片宽度                 |
| onToggleSelect | `() => void`    | ✓        | -       | 切换选中状态             |
| onEdit         | `() => void`    | ✓        | -       | 编辑回调                 |
| onDelete       | `() => void`    | ✓        | -       | 删除回调                 |
| t              | `TFunction`     | ✓        | -       | i18n 翻译函数            |

**用法示例：**

```tsx
<BookmarkCard
  bookmark={bookmark}
  categoryName="技术 > 前端"
  formattedDate="今天"
  isSelected={false}
  onToggleSelect={() => toggleSelect(bookmark.id)}
  onEdit={() => setEditingBookmark(bookmark)}
  onDelete={() => handleDelete(bookmark)}
  t={t}
/>
```

---

### BookmarkListItem

列表视图下的书签行组件。

| Prop           | Type            | Required | Default | Description        |
| -------------- | --------------- | -------- | ------- | ------------------ |
| bookmark       | `LocalBookmark` | ✓        | -       | 书签数据           |
| categoryName   | `string`        | ✓        | -       | 分类全路径名称     |
| formattedDate  | `string`        | ✓        | -       | 格式化后的创建日期 |
| isSelected     | `boolean`       | ✓        | -       | 是否被选中         |
| isHighlighted  | `boolean`       | -        | `false` | AI 引用高亮状态    |
| onToggleSelect | `() => void`    | ✓        | -       | 切换选中状态       |
| onOpen         | `() => void`    | ✓        | -       | 打开书签回调       |
| onEdit         | `() => void`    | ✓        | -       | 编辑回调           |
| onDelete       | `() => void`    | ✓        | -       | 删除回调           |
| t              | `TFunction`     | ✓        | -       | i18n 翻译函数      |

**用法示例：**

```tsx
<BookmarkListItem
  bookmark={bookmark}
  categoryName="技术 > 前端"
  formattedDate="昨天"
  isSelected={selectedIds.has(bookmark.id)}
  onToggleSelect={() => toggleSelect(bookmark.id)}
  onOpen={() => window.open(bookmark.url, "_blank")}
  onEdit={() => setEditingBookmark(bookmark)}
  onDelete={() => handleDelete(bookmark)}
  t={t}
/>
```

---

### EditBookmarkDialog

书签编辑弹窗组件，支持修改书签的 URL、标题、摘要、分类和标签。

| Prop     | Type            | Required | Default | Description      |
| -------- | --------------- | -------- | ------- | ---------------- |
| bookmark | `LocalBookmark` | ✓        | -       | 要编辑的书签数据 |
| onSaved  | `() => void`    | ✓        | -       | 保存成功回调     |
| onClose  | `() => void`    | ✓        | -       | 关闭弹窗回调     |

**用法示例：**

```tsx
{
  editingBookmark && (
    <EditBookmarkDialog
      bookmark={editingBookmark}
      onSaved={() => {
        refreshBookmarks();
        setEditingBookmark(null);
      }}
      onClose={() => setEditingBookmark(null)}
    />
  );
}
```

**行为说明：**

- 内部使用 `useSavePanel` hook 管理表单状态
- 支持 AI 推荐分类功能
- 自动加载已有标签列表作为建议

---

### SnapshotViewer

网页快照查看器组件，在弹窗中展示保存的网页快照。

| Prop           | Type             | Required | Default | Description      |
| -------------- | ---------------- | -------- | ------- | ---------------- |
| open           | `boolean`        | ✓        | -       | 是否显示         |
| snapshotUrl    | `string \| null` | ✓        | -       | 快照 Blob URL    |
| title          | `string`         | ✓        | -       | 书签标题         |
| loading        | `boolean`        | -        | -       | 加载状态         |
| error          | `string \| null` | -        | -       | 错误信息         |
| onClose        | `() => void`     | ✓        | -       | 关闭回调         |
| onOpenInNewTab | `() => void`     | -        | -       | 新标签页打开回调 |
| onDownload     | `() => void`     | -        | -       | 下载快照回调     |
| onDelete       | `() => void`     | -        | -       | 删除快照回调     |
| t              | `TFunction`      | ✓        | -       | i18n 翻译函数    |

**用法示例：**

```tsx
const { snapshotUrl, loading, error, openSnapshot, closeSnapshot } =
  useSnapshot();

<SnapshotViewer
  open={!!snapshotBookmark}
  snapshotUrl={snapshotUrl}
  title={snapshotBookmark?.title || ""}
  loading={loading}
  error={error}
  onClose={closeSnapshot}
  onDelete={handleDeleteSnapshot}
  t={t}
/>;
```

**行为说明：**

- 使用 iframe 展示快照内容
- 支持在新标签页中打开
- 支持下载快照为 HTML 文件
- 支持删除快照

---

## Hooks

### useConversationalSearch

AI 对话式搜索 Hook，封装 AI 对话状态机与检索逻辑。内部通过 `chatSearchAgent` 调用统一的 extension agent 接入层，由 agent tool loop 负责搜索编排、帮助问答、统计和筛选。

**返回值：**

| Property                 | Type                              | Description            |
| ------------------------ | --------------------------------- | ---------------------- |
| query                    | `string`                          | 查询文本               |
| setQuery                 | `(query: string) => void`         | 设置查询               |
| messages                 | `ChatMessage[]`                   | 对话历史               |
| currentAnswer            | `string`                          | 当前正在生成的回答     |
| status                   | `AISearchStatus`                  | AI 状态                |
| error                    | `string \| null`                  | 错误信息               |
| results                  | `Source[]`                        | 当前回答的引用源       |
| suggestions              | `Suggestion[]`                    | 后续建议               |
| highlightedBookmarkId    | `string \| null`                  | 高亮的书签 ID          |
| setHighlightedBookmarkId | `(id: string \| null) => void`    | 设置高亮书签           |
| handleSearch             | `() => Promise<void>`             | 执行搜索               |
| handleSuggestion         | `(suggestion: Suggestion) => Promise<void>` | 执行结构化建议动作 |
| clearConversation        | `() => void`                      | 清除对话               |
| closeChat                | `() => void`                      | 关闭对话窗口           |
| isChatOpen               | `boolean`                         | 对话窗口是否打开       |

**ChatMessage 类型：**

```ts
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: Source[];
}
```

**用法示例：**

```tsx
const {
  query,
  setQuery,
  messages,
  currentAnswer,
  status,
  results,
  suggestions,
  highlightedBookmarkId,
  setHighlightedBookmarkId,
  handleSearch,
  handleSuggestion,
  closeChat,
  isChatOpen,
} = useConversationalSearch();

// 处理引用点击 - 滚动到对应书签
const handleSourceClick = (bookmarkId: string) => {
  setHighlightedBookmarkId(bookmarkId);
  // 滚动定位...
};
```

**行为说明：**

- 调用 `handleSearch()` 打开对话窗口并执行 AI 搜索
- `handleSearch()` 与 `handleSuggestion()` 都会进入统一的 `chatSearchAgent.runTurn()` 回合流程：
  1. 将用户文本或 suggestion action 解析为当前回合输入
  2. agent 读取搜索上下文、历史、过滤条件、分类、标签、快捷键等工具信息
  3. agent 自主调用 `search_bookmarks`、`apply_filter`、`continue_search` 等工具完成检索编排
  4. formatter 基于工具结果生成最终回答、引用源和下一步建议
- 支持连续对话，过滤条件、已展示结果与最近几轮历史会持续保留
- 支持流式输出动画
- 搜索类 suggestion 会直接执行结构化动作，而不是仅把文案塞回输入框
- 关闭对话窗口时自动清除对话状态
- AI 未配置或调用失败时直接返回错误，不再静默回退

---

### useBookmarkSearch

书签搜索筛选 Hook，管理搜索、标签筛选、分类筛选和时间范围筛选状态。

**参数：**

| Param        | Type                           | Description      |
| ------------ | ------------------------------ | ---------------- |
| bookmarks    | `LocalBookmark[]`              | 原始书签列表     |
| categories   | `LocalCategory[]`              | 分类列表（可选） |
| initialState | `Partial<BookmarkSearchState>` | 初始状态（可选） |

**返回值：**

| Property            | Type                         | Description                     |
| ------------------- | ---------------------------- | ------------------------------- |
| searchQuery         | `string`                     | 搜索关键词                      |
| selectedTags        | `string[]`                   | 已选标签                        |
| selectedCategory    | `string`                     | 已选分类 ID（`'all'` 表示全部） |
| timeRange           | `TimeRange`                  | 时间范围筛选                    |
| hasFilters          | `boolean`                    | 是否有任何筛选条件              |
| filteredBookmarks   | `LocalBookmark[]`            | 筛选后的书签列表                |
| setSearchQuery      | `(query: string) => void`    | 设置搜索关键词                  |
| setSelectedTags     | `(tags: string[]) => void`   | 设置已选标签                    |
| setSelectedCategory | `(category: string) => void` | 设置分类                        |
| setTimeRange        | `(range: TimeRange) => void` | 设置时间范围                    |
| toggleTagSelection  | `(tag: string) => void`      | 切换标签选择                    |
| clearFilters        | `() => void`                 | 清除所有筛选                    |
| clearTagFilters     | `() => void`                 | 清除标签筛选                    |
| clearTimeFilter     | `() => void`                 | 清除时间筛选                    |

**TimeRange 类型：**

```ts
type TimeRangeType = "all" | "today" | "week" | "month" | "year" | "custom";

interface TimeRange {
  type: TimeRangeType;
  startDate?: number; // 时间戳（custom 类型时使用）
  endDate?: number; // 时间戳（custom 类型时使用）
}
```

**用法示例：**

```tsx
const {
  searchQuery,
  selectedTags,
  timeRange,
  filteredBookmarks,
  setSearchQuery,
  toggleTagSelection,
  setTimeRange,
  clearFilters,
} = useBookmarkSearch({ bookmarks, categories });
```

---

### useBookmarkFilter

书签筛选逻辑 Hook，管理搜索、标签筛选、分类筛选状态。

**参数：**

| Param     | Type              | Description  |
| --------- | ----------------- | ------------ |
| bookmarks | `LocalBookmark[]` | 原始书签列表 |

**返回值：**

| Property            | Type                         | Description                     |
| ------------------- | ---------------------------- | ------------------------------- |
| searchQuery         | `string`                     | 搜索关键词                      |
| selectedTags        | `string[]`                   | 已选标签                        |
| selectedCategory    | `string`                     | 已选分类 ID（`'all'` 表示全部） |
| hasFilters          | `boolean`                    | 是否有任何筛选条件              |
| filteredBookmarks   | `LocalBookmark[]`            | 筛选后的书签列表                |
| setSearchQuery      | `(query: string) => void`    | 设置搜索关键词                  |
| setSelectedCategory | `(category: string) => void` | 设置分类                        |
| toggleTagSelection  | `(tag: string) => void`      | 切换标签选择                    |
| clearFilters        | `() => void`                 | 清除所有筛选                    |
| clearSelectedTags   | `() => void`                 | 清除已选标签                    |

**用法示例：**

```tsx
const { searchQuery, filteredBookmarks, setSearchQuery, clearFilters } =
  useBookmarkFilter(bookmarks);
```

---

### useBookmarkSelection

书签批量选择逻辑 Hook。

**返回值：**

| Property            | Type                         | Description       |
| ------------------- | ---------------------------- | ----------------- |
| selectedIds         | `Set<string>`                | 已选书签 ID 集合  |
| toggleSelect        | `(id: string) => void`       | 切换单个选择      |
| selectAll           | `(ids: string[]) => void`    | 全选              |
| deselectAll         | `() => void`                 | 取消全选          |
| toggleSelectAll     | `(allIds: string[]) => void` | 切换全选/取消全选 |
| removeFromSelection | `(id: string) => void`       | 从选择中移除      |

**用法示例：**

```tsx
const { selectedIds, toggleSelect, toggleSelectAll } = useBookmarkSelection();
```

---

### useVirtualBookmarkList

虚拟书签列表 Hook，使用 TanStack Virtual 实现高性能虚拟滚动。

**参数：**

| Param        | Type                   | Default | Description                    |
| ------------ | ---------------------- | ------- | ------------------------------ |
| items        | `{ id: string }[]`     | -       | 书签列表                       |
| estimateSize | `number`               | `88`    | 每项估计高度（像素）           |
| overscan     | `number`               | `5`     | 过扫描数量（预渲染的额外项数） |

**返回值：**

| Property         | Type                                      | Description                |
| ---------------- | ----------------------------------------- | -------------------------- |
| parentRef        | `RefObject<HTMLDivElement>`               | 滚动容器 ref               |
| virtualizer      | `Virtualizer`                             | TanStack Virtual 实例      |
| virtualItems     | `VirtualItem[]`                           | 当前可见的虚拟项列表       |
| totalSize        | `number`                                  | 列表总高度（像素）         |
| scrollToBookmark | `(bookmarkId: string) => void`            | 滚动到指定书签             |
| bookmarkRefs     | `RefObject<Map<string, HTMLElement>>`     | 书签元素引用 Map           |

**用法示例：**

```tsx
const {
  parentRef,
  virtualItems,
  totalSize,
  scrollToBookmark,
  bookmarkRefs,
} = useVirtualBookmarkList({
  items: filteredBookmarks,
  estimateSize: 88,
  overscan: 5,
});

// 渲染虚拟列表
<div ref={parentRef} className="h-full overflow-auto">
  <div style={{ height: `${totalSize}px`, position: 'relative' }}>
    {virtualItems.map((virtualItem) => {
      const bookmark = filteredBookmarks[virtualItem.index];
      return (
        <div
          key={virtualItem.key}
          style={{
            position: 'absolute',
            top: `${virtualItem.start}px`,
            height: `${virtualItem.size}px`,
          }}
        >
          <BookmarkListItem bookmark={bookmark} />
        </div>
      );
    })}
  </div>
</div>
```

**行为说明：**

- 使用 TanStack Virtual 实现虚拟滚动，仅渲染可见区域的书签
- `estimateSize` 应设置为 BookmarkListItem 的估计高度（默认 88px）
- `overscan` 控制预渲染的额外项数，增加可减少滚动时的空白
- `scrollToBookmark` 支持平滑滚动到指定书签（用于 AI 引用点击定位）

---

### useMasonryLayout

瀑布流布局计算 Hook。

**参数：**

| Param            | Type     | Default | Description |
| ---------------- | -------- | ------- | ----------- |
| benchWidth       | `number` | `356`   | 基准列宽    |
| itemGap          | `number` | `16`    | 项目间距    |
| maxCol           | `number` | `12`    | 最大列数    |
| minCol           | `number` | `1`     | 最小列数    |
| containerPadding | `number` | `48`    | 容器内边距  |

**返回值：**

| Property     | Type                                   | Description    |
| ------------ | -------------------------------------- | -------------- |
| containerRef | `RefObject<HTMLDivElement>`            | 容器 ref       |
| config       | `{ cols: number; columnSize: number }` | 计算后的列配置 |

**用法示例：**

```tsx
const { containerRef, config } = useMasonryLayout({ benchWidth: 356 });

<div ref={containerRef}>
  <Masonry columnNum={config.cols} columnSize={config.columnSize} ... />
</div>
```

---

### useTheme

主题管理 Hook，管理主题状态（light/dark/system），支持 View Transitions API 动画切换。

**参数：**

| Param                 | Type                  | Description                                         |
| --------------------- | --------------------- | --------------------------------------------------- |
| options.targetElement | `HTMLElement \| null` | 可选的目标元素（用于 content UI 环境的 Shadow DOM） |

**返回值：**

| Property               | Type                                                                | Description                                          |
| ---------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| theme                  | `'light' \| 'dark' \| 'system'`                                     | 当前主题                                             |
| setTheme               | `(theme: Theme) => Promise<void>`                                   | 设置主题并保存到存储（无动画）                       |
| setThemeWithTransition | `(theme: Theme, options?: ThemeTransitionOptions) => Promise<void>` | 设置主题并使用 View Transitions API 圆形扩展动画切换 |

**ThemeTransitionOptions 类型：**

| Property        | Type      | Default  | Description       |
| --------------- | --------- | -------- | ----------------- |
| x               | `number`  | 屏幕中心 | 点击事件的 X 坐标 |
| y               | `number`  | 屏幕中心 | 点击事件的 Y 坐标 |
| enableAnimation | `boolean` | `true`   | 是否启用动画      |

**用法示例：**

```tsx
// 普通环境
const { theme, setTheme } = useTheme();

// Content UI 环境（需要传入 Shadow DOM 容器）
const { container } = useContentUI();
const { theme, setThemeWithTransition } = useTheme({
  targetElement: container,
});

// 使用圆形扩展动画切换主题（从点击位置向外扩展）
const handleToggleTheme = (e: React.MouseEvent) => {
  const newTheme = theme === "dark" ? "light" : "dark";
  setThemeWithTransition(newTheme, {
    x: e.clientX,
    y: e.clientY,
  });
};

<Button onClick={handleToggleTheme}>
  {theme === "dark" ? <Sun /> : <Moon />}
</Button>;
```

**行为说明：**

- 主题会自动应用到目标元素（添加/移除 `dark` class）
- 如果未指定 targetElement，默认应用到 `document.documentElement`
- 在 content UI 环境中，需要传入 Shadow DOM 容器
- 支持跟随系统主题（`system` 模式）
- 主题设置会自动保存到 WXT Storage 并持久化
- 自动监听 settings 变化，跨标签页同步主题
- `setThemeWithTransition` 使用 View Transitions API 实现从点击位置向外扩展的圆形动画
- 如果浏览器不支持 View Transitions API，会自动降级为无动画切换
- 支持 `prefers-reduced-motion` 媒体查询，尊重用户的动画偏好设置

---

### useLanguage

语言管理 Hook，管理应用的语言切换和持久化。

**返回值：**

| Property            | Type                               | Description                         |
| ------------------- | ---------------------------------- | ----------------------------------- |
| language            | `'en' \| 'zh'`                     | 当前语言                            |
| switchLanguage      | `(lng: Language) => Promise<void>` | 切换语言                            |
| availableLanguages  | `['en', 'zh']`                     | 可用语言列表                        |
| isLoading           | `boolean`                          | 是否正在切换语言                    |
| currentLanguageName | `string`                           | 当前语言名称（'English' 或 '中文'） |

**用法示例：**

```tsx
const { language, switchLanguage } = useLanguage();

<Button onClick={() => switchLanguage(language === "zh" ? "en" : "zh")}>
  <Languages /> {language === "zh" ? "EN" : "中文"}
</Button>;
```

**行为说明：**

- 此 Hook **可独立使用**，不依赖 `BookmarkContext`
- 语言设置会同步到 WXT Storage、`localStorage` 和 `i18n` 实例
- 自动监听其他标签页的语言变化并同步
- 触发自定义事件 `languageChange`，便于其他组件监听

---

### useShortcuts

扩展快捷键管理 Hook，获取当前配置的快捷键信息。

**返回值：**

| Property  | Type                  | Description    |
| --------- | --------------------- | -------------- |
| shortcuts | `ShortcutInfo[]`      | 快捷键列表     |
| isLoading | `boolean`             | 是否加载中     |
| refresh   | `() => Promise<void>` | 刷新快捷键配置 |

**ShortcutInfo 类型：**

| Property    | Type     | Description            |
| ----------- | -------- | ---------------------- |
| name        | `string` | 命令名称               |
| description | `string` | 命令描述               |
| shortcut    | `string` | 当前快捷键（可能为空） |

**用法示例：**

```tsx
const { shortcuts, isLoading, refresh } = useShortcuts();

{
  shortcuts.map((s) => (
    <div key={s.name}>
      <span>{s.description}</span>
      <kbd>{s.shortcut || "未设置"}</kbd>
    </div>
  ));
}
```

**行为说明：**

- 使用 `chrome.commands.getAll()` API 获取快捷键配置
- 自动监听窗口焦点变化，用户从浏览器设置页返回时自动刷新
- 过滤掉内置命令（如 `_execute_action`）

---

### useSnapshot

网页快照管理 Hook，处理快照的查看、保存、删除等操作。

**返回值：**

| Property        | Type                                                  | Description             |
| --------------- | ----------------------------------------------------- | ----------------------- |
| snapshotUrl     | `string \| null`                                      | 当前查看的快照 Blob URL |
| loading         | `boolean`                                             | 是否正在加载            |
| error           | `string \| null`                                      | 错误信息                |
| openSnapshot    | `(bookmarkId: string) => Promise<void>`               | 打开快照查看器          |
| closeSnapshot   | `() => void`                                          | 关闭快照查看器          |
| hasSnapshot     | `(bookmarkId: string) => Promise<boolean>`            | 检查书签是否有快照      |
| saveSnapshot    | `(bookmarkId: string) => Promise<boolean>`            | 手动保存当前页面快照    |
| deleteSnapshot  | `(bookmarkId: string) => Promise<void>`               | 删除快照                |
| getStorageUsage | `() => Promise<{ count: number; totalSize: number }>` | 获取存储使用情况        |

**用法示例：**

```tsx
const {
  snapshotUrl,
  loading,
  error,
  openSnapshot,
  closeSnapshot,
  deleteSnapshot,
} = useSnapshot();

// 打开快照
const handleViewSnapshot = async (bookmark: LocalBookmark) => {
  await openSnapshot(bookmark.id);
};

// 删除快照
const handleDeleteSnapshot = async (bookmarkId: string) => {
  await deleteSnapshot(bookmarkId);
};
```

**行为说明：**

- 使用 IndexedDB 存储快照（Blob 格式）
- 自动管理 Blob URL 的创建和释放
- 与 `snapshotStorage` 模块配合使用
- 更新书签的 `hasSnapshot` 字段
- 通过 `@webext-core/proxy-service` 调用 background 获取页面 HTML

---

## Services

基于 `@webext-core/proxy-service` 的类型安全服务层，用于跨 context 调用 background 方法。

### BackgroundService

提供类型安全的 background 方法调用，替代原生 `chrome.runtime.sendMessage`。

#### 接口定义

```ts
interface IBackgroundService {
  /** 获取所有书签 */
  getBookmarks(): Promise<LocalBookmark[]>;
  /** 获取所有分类 */
  getCategories(): Promise<LocalCategory[]>;
  /** 获取所有标签 */
  getAllTags(): Promise<string[]>;
  /** 获取设置 */
  getSettings(): Promise<Settings>;
  /** 获取当前页面 HTML */
  getPageHtml(): Promise<string | null>;
  /** 打开设置页面 */
  openOptionsPage(): Promise<void>;
  /** 打开新标签页 */
  openTab(url: string): Promise<void>;

  // ========== Embedding 相关方法 ==========

  /** 获取向量存储统计信息 */
  getVectorStats(): Promise<VectorStoreStats>;
  /** 清空所有向量数据 */
  clearVectorStore(): Promise<void>;
  /** 获取 embedding 队列状态 */
  getEmbeddingQueueStatus(): Promise<QueueStatus>;
  /** 开始重建向量索引 */
  startEmbeddingRebuild(): Promise<{ jobCount: number }>;
  /** 暂停 embedding 队列 */
  pauseEmbeddingQueue(): Promise<void>;
  /** 恢复 embedding 队列 */
  resumeEmbeddingQueue(): Promise<void>;
  /** 停止 embedding 队列 */
  stopEmbeddingQueue(): Promise<void>;
  /** 测试 embedding 连接 */
  testEmbeddingConnection(): Promise<{ success: boolean; error?: string; dimensions?: number }>;
  /** 添加书签到 embedding 队列（保存书签时调用） */
  queueBookmarkEmbedding(bookmarkId: string): Promise<void>;
  /** 批量添加书签到 embedding 队列（导入书签时调用） */
  queueBookmarksEmbedding(bookmarkIds: string[]): Promise<void>;

  // ========== 语义搜索相关方法（用于 content script 调用） ==========

  /** 执行语义搜索（在 background 中执行，确保访问正确的 IndexedDB） */
  semanticSearch(query: string, options?: SemanticSearchOptions): Promise<SemanticSearchResult>;
  /** 检查语义搜索是否可用 */
  isSemanticAvailable(): Promise<boolean>;
  /** 查找相似书签 */
  findSimilarBookmarks(bookmarkId: string, options?: SemanticSearchOptions): Promise<SemanticSearchResult>;
  /** 获取书签的 embedding */
  getBookmarkEmbedding(bookmarkId: string): Promise<BookmarkEmbedding | null>;
  /** 获取指定模型的所有 embeddings */
  getEmbeddingsByModel(modelKey: string): Promise<BookmarkEmbedding[]>;
  /** 获取 embedding 覆盖率统计 */
  getEmbeddingCoverageStats(): Promise<{ total: number; withEmbedding: number; coverage: number }>;

  // ========== 其他方法 ==========

  /** 获取扩展快捷键配置（commands API 只能在 background 中调用） */
  getShortcuts(): Promise<ShortcutCommand[]>;
}
```

#### 使用方式

**1. 在 background.ts 中注册服务（必须在顶部同步执行）：**

```ts
import { registerBackgroundService } from "@/lib/services";

export default defineBackground(() => {
  registerBackgroundService();
  // ...
});
```

**2. 在任意位置获取并调用服务：**

```ts
import { getBackgroundService } from "@/lib/services";

// 获取数据
const backgroundService = getBackgroundService();
const bookmarks = await backgroundService.getBookmarks();
const categories = await backgroundService.getCategories();
const settings = await backgroundService.getSettings();

// 获取页面 HTML
const html = await backgroundService.getPageHtml();

// 打开设置页
await backgroundService.openOptionsPage();

// Embedding 相关操作（在 background 中执行，不受页面关闭影响）
const stats = await backgroundService.getVectorStats();
await backgroundService.startEmbeddingRebuild();

// 语义搜索（在 content script 中使用时自动通过 background service 调用）
const available = await backgroundService.isSemanticAvailable();
const result = await backgroundService.semanticSearch("查找前端相关书签");
```

**Embedding 进度监听：**

Embedding 重建任务在 background 中执行，进度通过消息广播更新：

```ts
import { browser } from 'wxt/browser';

// 监听 embedding 进度
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'EMBEDDING_PROGRESS' && message.payload) {
    const progress = message.payload; // { total, completed, failed, percentage }
    console.log(`进度: ${progress.percentage}%`);
  }
});
```

**行为说明：**

- 服务必须在 background script 启动时同步注册
- 方法调用会自动路由到 background 执行
- 完全类型安全，提供良好的 IDE 支持
- 替代手动编写 `chrome.runtime.sendMessage` / `onMessage` 样板代码
- **Embedding 任务在 background 中执行**，页面关闭后任务不会中断
- **语义搜索在 content script 中自动通过 background service 调用**，确保访问扩展的 IndexedDB 而非当前网页的 IndexedDB

---

### 跨浏览器消息传递工具

对于无法使用 `proxy-service` 的场景（如 background → content script 广播），使用 `browser-api.ts` 中的安全函数：

#### safeSendMessageToTab

安全地向指定 tab 的 content script 发送消息，兼容 Chrome/Firefox/Edge。

```ts
import { safeSendMessageToTab } from "@/utils/browser-api";

// 发送消息并获取响应
const content = await safeSendMessageToTab<PageContent>(tabId, {
  type: "EXTRACT_CONTENT",
});
```

#### safeSendMessageToActiveTab

安全地向当前活动 tab 的 content script 发送消息。

```ts
import { safeSendMessageToActiveTab } from "@/utils/browser-api";

await safeSendMessageToActiveTab({ type: "TOGGLE_BOOKMARK_PANEL" });
```

#### safeBroadcastToTabs

安全地向所有 tab 广播消息，用于 background → content script 场景。

```ts
import { safeBroadcastToTabs } from "@/utils/browser-api";

// 广播给所有 tab
await safeBroadcastToTabs({ type: "TOGGLE_BOOKMARK_PANEL" });

// 带过滤条件的广播
await safeBroadcastToTabs({ type: "REFRESH" }, { url: "*://*.example.com/*" });
```

**兼容性说明：**

- WXT 框架自动处理 `chrome.*` / `browser.*` API polyfill
- 这些工具函数提供额外的错误处理和静默失败机制
- 适用于 Chrome、Firefox、Edge 等主流浏览器

#### isContentScriptContext

检查当前是否在 content script 环境中运行。用于判断是否需要通过 background service 访问扩展的 IndexedDB。

```ts
import { isContentScriptContext } from "@/utils/browser-api";

if (isContentScriptContext()) {
  // 在 content script 中，需要通过 background service 访问扩展存储
  const bgService = getBackgroundService();
  const result = await bgService.semanticSearch(query);
} else {
  // 在扩展页面或 background 中，可以直接访问
  const result = await semanticRetriever.search(query);
}
```

**原理说明：**

- Content script 运行在网页的 origin 下，访问 IndexedDB 时会使用网页的数据库
- 扩展页面（popup、options）和 background 运行在扩展的 origin 下
- 通过检查 `location.protocol` 是否为 `chrome-extension:` 或 `moz-extension:` 来判断环境

---

## Utils

### bookmark-utils

书签相关工具函数。

#### getCategoryPath

获取分类的完整路径（用 `>` 连接）。

```ts
getCategoryPath(
  categoryId: string | null,
  categories: Category[],
  uncategorizedLabel: string
): string
```

#### formatDate

格式化书签创建日期。

```ts
formatDate(
  timestamp: number,
  language: string,
  todayLabel: string,
  yesterdayLabel: string
): string
```

#### CATEGORY_COLOR

分类徽章颜色常量：`'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'`

---

## Storage 存储模块

基于 WXT Storage 和 IndexedDB 的存储层抽象。

### bookmark-storage

书签和分类的 CRUD 操作，支持跨设备同步。

**存储策略（分离存储）：**

- 书签元数据存储在 `sync`（跨设备同步，不含 content）
- 书签内容存储在 `local`（本地存储，大体积数据）

#### 存储项

| Key                      | Type                     | Description                            |
| ------------------------ | ------------------------ | -------------------------------------- |
| `sync:bookmarks`         | `BookmarkMeta[]`         | 书签元数据（不含 content，跨设备同步） |
| `sync:categories`        | `LocalCategory[]`        | 分类列表（跨设备同步）                 |
| `local:bookmarkContents` | `Record<string, string>` | 书签内容映射（本地存储）               |

#### BookmarkStorage 方法

| Method                  | Parameters                                        | Return                           | Description                                 |
| ----------------------- | ------------------------------------------------- | -------------------------------- | ------------------------------------------- |
| `getBookmarks`          | `query?: BookmarkQuery, includeContent?: boolean` | `Promise<LocalBookmark[]>`       | 获取书签列表（`includeContent` 默认 false） |
| `getBookmarkById`       | `id: string`                                      | `Promise<LocalBookmark \| null>` | 根据 ID 获取书签                            |
| `getBookmarkByUrl`      | `url: string`                                     | `Promise<LocalBookmark \| null>` | 根据 URL 获取书签                           |
| `createBookmark`        | `data: CreateBookmarkInput`                       | `Promise<LocalBookmark>`         | 创建书签                                    |
| `updateBookmark`        | `id: string, data: UpdateBookmarkInput`           | `Promise<LocalBookmark>`         | 更新书签                                    |
| `deleteBookmark`        | `id: string, permanent?: boolean`                 | `Promise<void>`                  | 删除书签（软删除/永久）                     |
| `restoreBookmark`       | `id: string`                                      | `Promise<LocalBookmark>`         | 恢复已删除书签                              |
| `getDeletedBookmarks`   | -                                                 | `Promise<LocalBookmark[]>`       | 获取回收站书签                              |
| `getCategories`         | -                                                 | `Promise<LocalCategory[]>`       | 获取所有分类                                |
| `createCategory`        | `name: string, parentId?: string \| null`         | `Promise<LocalCategory>`         | 创建分类                                    |
| `updateCategory`        | `id: string, data: Partial<LocalCategory>`        | `Promise<LocalCategory>`         | 更新分类                                    |
| `deleteCategory`        | `id: string`                                      | `Promise<void>`                  | 删除分类                                    |
| `getAllTags`            | -                                                 | `Promise<string[]>`              | 获取所有标签                                |
| `batchOperate`          | `params: BatchOperationParams`                    | `Promise<BatchOperationResult>`  | 批量操作                                    |
| `watchBookmarks`        | `callback: (bookmarks) => void`                   | `() => void`                     | 监听书签变化（不含 content）                |
| `watchCategories`       | `callback: (categories) => void`                  | `() => void`                     | 监听分类变化                                |
| `getBookmarkContent`    | `bookmarkId: string`                              | `Promise<string \| undefined>`   | 获取书签内容                                |
| `setBookmarkContent`    | `bookmarkId: string, content: string`             | `Promise<void>`                  | 设置书签内容                                |
| `deleteBookmarkContent` | `bookmarkId: string`                              | `Promise<void>`                  | 删除书签内容                                |

**用法示例：**

```ts
import { bookmarkStorage } from "@/lib/storage";

// 获取书签（不含 content，性能更好）
const bookmarks = await bookmarkStorage.getBookmarks({ search: "react" });

// 获取书签（包含 content）
const bookmarksWithContent = await bookmarkStorage.getBookmarks({}, true);

// 单独获取书签内容
const content = await bookmarkStorage.getBookmarkContent(bookmarkId);

// 监听变化
const unwatch = bookmarkStorage.watchBookmarks((newBookmarks) => {
  console.log("书签已更新", newBookmarks);
});
```

---

### config-storage

AI 配置和用户设置存储，基于 **WXT Storage (sync)** 实现，支持跨设备同步。

#### 存储项

| Key                  | Type             | Description                |
| -------------------- | ---------------- | -------------------------- |
| `sync:aiConfig`      | `AIConfig`       | AI 配置（跨设备同步）      |
| `sync:settings`      | `LocalSettings`  | 用户设置（跨设备同步）     |
| `sync:customFilters` | `CustomFilter[]` | 自定义筛选器（跨设备同步） |

#### AIProvider 类型

支持的 AI 服务提供商：

| 值            | 服务商名称     | API 兼容性 | 默认 Base URL                                             | 可用模型（第一个为默认）                                                                                  |
| ------------- | -------------- | ---------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `openai`      | OpenAI         | OpenAI     | `https://api.openai.com/v1`                               | gpt-4o-mini, gpt-4o, gpt-4-turbo, gpt-3.5-turbo, o1-mini, o1-preview                                      |
| `anthropic`   | Anthropic      | Anthropic  | `https://api.anthropic.com`                               | claude-3-5-haiku-latest, claude-3-5-sonnet-latest, claude-3-opus-latest                                   |
| `google`      | Google Gemini  | OpenAI     | `https://generativelanguage.googleapis.com/v1beta/openai` | gemini-2.0-flash, gemini-2.0-flash-lite, gemini-1.5-flash, gemini-1.5-pro                                 |
| `azure`       | Azure OpenAI   | OpenAI     | 用户配置                                                  | gpt-4o-mini, gpt-4o, gpt-4-turbo, gpt-35-turbo                                                            |
| `deepseek`    | DeepSeek       | OpenAI     | `https://api.deepseek.com/v1`                             | deepseek-chat, deepseek-reasoner                                                                          |
| `groq`        | Groq           | OpenAI     | `https://api.groq.com/openai/v1`                          | llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768, gemma2-9b-it                           |
| `mistral`     | Mistral AI     | OpenAI     | `https://api.mistral.ai/v1`                               | mistral-small-latest, mistral-medium-latest, mistral-large-latest, open-mistral-7b                        |
| `moonshot`    | Moonshot/Kimi  | OpenAI     | `https://api.moonshot.cn/v1`                              | moonshot-v1-8k, moonshot-v1-32k, moonshot-v1-128k                                                         |
| `zhipu`       | 智谱AI/GLM     | OpenAI     | `https://open.bigmodel.cn/api/paas/v4`                    | glm-4-flash, glm-4-plus, glm-4-air, glm-4-long                                                            |
| `hunyuan`     | 腾讯混元       | OpenAI     | `https://api.hunyuan.cloud.tencent.com/v1`                | hunyuan-lite, hunyuan-standard, hunyuan-pro, hunyuan-turbo                                                |
| `nvidia`      | NVIDIA NIM     | OpenAI     | `https://integrate.api.nvidia.com/v1`                     | meta/llama-3.1-8b-instruct, meta/llama-3.1-70b-instruct, nvidia/llama-3.1-nemotron-70b-instruct           |
| `siliconflow` | 硅基流动       | OpenAI     | `https://api.siliconflow.cn/v1`                           | Qwen/Qwen2.5-7B-Instruct, Qwen/Qwen2.5-72B-Instruct, deepseek-ai/DeepSeek-V3, Pro/deepseek-ai/DeepSeek-R1 |
| `ollama`      | Ollama（本地） | OpenAI     | `http://localhost:11434/v1`                               | llama3.2, llama3.1, mistral, qwen2.5, phi3                                                                |
| `custom`      | 自定义         | OpenAI     | 用户配置                                                  | gpt-4o-mini                                                                                               |

**辅助函数：**

| 函数                | 参数                   | 返回值     | 描述                   |
| ------------------- | ---------------------- | ---------- | ---------------------- |
| `getDefaultModel`   | `provider: AIProvider` | `string`   | 获取默认模型（第一个） |
| `getProviderModels` | `provider: AIProvider` | `string[]` | 获取提供商所有可用模型 |
| `getDefaultBaseUrl` | `provider: AIProvider` | `string`   | 获取默认 Base URL      |
| `requiresApiKey`    | `provider: AIProvider` | `boolean`  | 检查是否需要 API Key   |

**行为说明：**

- 大多数提供商兼容 OpenAI API，使用统一的 OpenAI SDK 调用
- `azure` 和 `custom` 需要用户手动配置 Base URL
- `ollama` 不需要 API Key，使用本地服务
- 切换提供商时自动选择第一个模型作为默认值
- 模型选择器支持从预设列表选择，也支持输入自定义模型名称
- 设置页支持通过当前 provider 的官方 `/models` 接口拉取可用模型列表，并与预设推荐一起展示

#### ConfigStorage 方法

| Method               | Parameters                                         | Return                    | Description      |
| -------------------- | -------------------------------------------------- | ------------------------- | ---------------- |
| `getAIConfig`        | -                                                  | `Promise<AIConfig>`       | 获取 AI 配置     |
| `setAIConfig`        | `config: Partial<AIConfig>`                        | `Promise<AIConfig>`       | 设置 AI 配置     |
| `getSettings`        | -                                                  | `Promise<LocalSettings>`  | 获取用户设置     |
| `setSettings`        | `settings: Partial<LocalSettings>`                 | `Promise<LocalSettings>`  | 设置用户设置     |
| `resetAIConfig`      | -                                                  | `Promise<AIConfig>`       | 重置 AI 配置     |
| `resetSettings`      | -                                                  | `Promise<LocalSettings>`  | 重置用户设置     |
| `getCustomFilters`   | -                                                  | `Promise<CustomFilter[]>` | 获取自定义筛选器 |
| `setCustomFilters`   | `filters: CustomFilter[]`                          | `Promise<void>`           | 保存自定义筛选器 |
| `addCustomFilter`    | `filter: CustomFilter`                             | `Promise<void>`           | 添加筛选器       |
| `updateCustomFilter` | `filterId: string, updates: Partial<CustomFilter>` | `Promise<void>`           | 更新筛选器       |
| `deleteCustomFilter` | `filterId: string`                                 | `Promise<void>`           | 删除筛选器       |
| `watchAIConfig`      | `callback: (config) => void`                       | `() => void`              | 监听 AI 配置变化 |
| `watchSettings`      | `callback: (settings) => void`                     | `() => void`              | 监听设置变化     |
| `watchCustomFilters` | `callback: (filters) => void`                      | `() => void`              | 监听筛选器变化   |
| `getEmbeddingConfig` | -                                                  | `Promise<EmbeddingConfig>` | 获取 Embedding 配置 |
| `setEmbeddingConfig` | `config: Partial<EmbeddingConfig>`                 | `Promise<EmbeddingConfig>` | 设置 Embedding 配置 |
| `resetEmbeddingConfig` | -                                                | `Promise<EmbeddingConfig>` | 重置 Embedding 配置 |
| `watchEmbeddingConfig` | `callback: (config) => void`                     | `() => void`              | 监听 Embedding 配置变化 |

#### EmbeddingConfig 类型

用于语义搜索的 Embedding 服务配置。

| 属性 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `enabled` | `boolean` | ✓ | `false` | 是否启用语义检索 |
| `provider` | `AIProvider` | ✓ | `'openai'` | 服务提供商 |
| `baseUrl` | `string` | - | - | OpenAI-compatible base url |
| `apiKey` | `string` | - | - | API Key（云端 provider 需要） |
| `model` | `string` | ✓ | `'text-embedding-3-small'` | Embedding 模型名 |
| `dimensions` | `number` | - | - | 向量维度（部分 provider 支持指定） |
| `batchSize` | `number` | - | `16` | 批量 embedding 大小 |

**支持 Embedding 的 Provider：**

| Provider | 默认模型 | 说明 |
|----------|----------|------|
| `openai` | `text-embedding-3-small` | OpenAI Embedding API |
| `google` | `text-embedding-004` | Google Gemini Embedding |
| `azure` | `text-embedding-ada-002` | Azure OpenAI（需配置 baseUrl） |
| `mistral` | `mistral-embed` | Mistral AI Embedding |
| `zhipu` | `embedding-3` | 智谱 AI Embedding |
| `hunyuan` | `hunyuan-embedding` | 腾讯混元 Embedding |
| `nvidia` | `nvidia/embed-qa-4` | NVIDIA NIM Embedding |
| `siliconflow` | `BAAI/bge-m3` | 硅基流动 BGE-M3 |
| `ollama` | `nomic-embed-text` | Ollama 本地 Embedding（无需 API Key） |
| `custom` | `text-embedding-3-small` | 自定义 OpenAI 兼容端点 |

**不支持 Embedding 的 Provider：** `anthropic`、`deepseek`、`groq`、`moonshot`

---

### vector-store

书签向量存储模块，基于 **IndexedDB** 实现语义搜索的向量存储。

#### VectorStore 方法

| Method | Parameters | Return | Description |
|--------|------------|--------|-------------|
| `saveEmbedding` | `embedding: BookmarkEmbedding` | `Promise<void>` | 保存单个书签向量 |
| `saveEmbeddings` | `embeddings: BookmarkEmbedding[]` | `Promise<void>` | 批量保存书签向量 |
| `getEmbedding` | `bookmarkId: string` | `Promise<BookmarkEmbedding \| null>` | 获取单个书签向量 |
| `getEmbeddings` | `bookmarkIds: string[]` | `Promise<Map<string, BookmarkEmbedding>>` | 批量获取书签向量 |
| `getEmbeddingsByModel` | `modelKey: string` | `Promise<BookmarkEmbedding[]>` | 获取指定模型的所有向量 |
| `getAllEmbeddings` | - | `Promise<BookmarkEmbedding[]>` | 获取所有向量（用于语义搜索） |
| `needsUpdate` | `bookmarkId: string, newChecksum: string` | `Promise<boolean>` | 检查是否需要重新生成向量 |
| `deleteEmbedding` | `bookmarkId: string` | `Promise<void>` | 删除单个书签向量 |
| `deleteEmbeddings` | `bookmarkIds: string[]` | `Promise<void>` | 批量删除书签向量 |
| `deleteByModel` | `modelKey: string` | `Promise<number>` | 删除指定模型的所有向量 |
| `clearAll` | - | `Promise<void>` | 清空所有向量 |
| `getStats` | - | `Promise<VectorStoreStats>` | 获取存储统计信息 |
| `getMissingBookmarkIds` | `allBookmarkIds: string[]` | `Promise<string[]>` | 获取没有向量的书签 ID 列表 |

#### VectorStoreStats 类型

| 属性 | 类型 | 描述 |
|------|------|------|
| `count` | `number` | 总向量数 |
| `countByModel` | `Record<string, number>` | 按模型分组的向量数 |
| `estimatedSize` | `number` | 估算存储大小（字节） |

**用法示例：**

```ts
import { vectorStore } from '@/lib/storage';

// 获取向量统计
const stats = await vectorStore.getStats();
console.log(`已索引 ${stats.count} 个书签，占用 ${(stats.estimatedSize / 1024).toFixed(1)} KB`);

// 获取书签向量
const embedding = await vectorStore.getEmbedding(bookmarkId);

// 清空所有向量（重建前）
await vectorStore.clearAll();
```

---

### Agent Services

插件内 AI 能力统一收敛到 `lib/agent/services/*`，UI 与 hooks 不再直接调用旧 `aiClient`。

#### bookmarkAnalysisService.analyzeBookmark

一次性分析书签内容，生成标题、摘要、分类、标签。

**参数（EnhancedAnalyzeInput）：**

| Property       | Type              | Required | Description                                |
| -------------- | ----------------- | -------- | ------------------------------------------ |
| pageContent    | `PageContent`     | ✓        | 页面内容对象                               |
| userCategories | `LocalCategory[]` | -        | 用户已有分类（用于优先复用分类）           |
| existingTags   | `string[]`        | -        | 用户已有标签（避免生成语义相近的重复标签） |

**行为说明：**

- 使用统一 agent 配置工厂初始化模型
- 输出固定结构：`title`、`summary`、`category`、`tags`
- AI 失败时直接抛出错误，由调用方决定 UI 提示

**用法示例：**

```ts
import { bookmarkAnalysisService } from "@/lib/agent";

const result = await bookmarkAnalysisService.analyzeBookmark({
  pageContent,
  userCategories: categories,
  existingTags,
});
```

#### translationService.translate

翻译文本（标签或摘要），目标语言由用户设置决定。

| Property   | Type           | Required | Default      | Description  |
| ---------- | -------------- | -------- | ------------ | ------------ |
| text       | `string`       | ✓        | -            | 要翻译的文本 |
| targetLang | `'zh' \| 'en'` | -        | `'zh'`       | 目标语言     |

**行为说明：**

- 由统一 agent 接入层发起模型请求
- 保留 Markdown、列表和术语
- 翻译失败时直接抛出错误，不回退原文

**用法示例：**

```ts
import { translationService } from "@/lib/agent";

const translated = await translationService.translate(text, settings.language);
```

#### categoryGenerationService.generateCategories

根据用户描述生成层级分类方案。

| Property      | Type       | Required | Description      |
| ------------- | ---------- | -------- | ---------------- |
| description   | `string`   | ✓        | 分类方案需求描述 |

#### agentConfigService

统一封装连接测试与可用模型拉取。

| Method                  | Parameters                                 | Return                                   | Description      |
| ----------------------- | ------------------------------------------ | ---------------------------------------- | ---------------- |
| `testConnection`        | -                                          | `Promise<{ success: boolean; message: string }>` | 测试模型连通性   |
| `listAvailableModels`   | `{ provider?, apiKey?, baseUrl? }`         | `Promise<{ models: string[]; endpoint: string }>` | 拉取远端模型列表 |

---

### ai-cache-storage

AI 分析结果缓存，基于 **IndexedDB** 实现（适合大数据存储）。

#### AICacheStorage 方法

| Method                 | Parameters                                         | Return                                     | Description        |
| ---------------------- | -------------------------------------------------- | ------------------------------------------ | ------------------ |
| `getCachedAnalysis`    | `url: string`                                      | `Promise<AnalysisResult \| null>`          | 获取缓存的分析结果 |
| `cacheAnalysis`        | `pageContent: PageContent, result: AnalysisResult` | `Promise<void>`                            | 缓存分析结果       |
| `deleteCachedAnalysis` | `url: string`                                      | `Promise<void>`                            | 删除缓存           |
| `cleanupExpiredCache`  | -                                                  | `Promise<number>`                          | 清理过期缓存       |
| `clearAll`             | -                                                  | `Promise<void>`                            | 清空所有缓存       |
| `getStats`             | -                                                  | `Promise<{ count: number; size: number }>` | 获取缓存统计       |

**行为说明：**

- 缓存有效期为 24 小时
- 自动过期清理
- 使用 URL 作为唯一 key

---

### snapshot-storage

网页快照存储，基于 **IndexedDB** 实现（存储 HTML Blob）。

#### SnapshotStorage 方法

| Method              | Parameters                         | Return                                          | Description       |
| ------------------- | ---------------------------------- | ----------------------------------------------- | ----------------- |
| `saveSnapshot`      | `bookmarkId: string, html: string` | `Promise<Snapshot>`                             | 保存快照          |
| `getSnapshot`       | `bookmarkId: string`               | `Promise<Snapshot \| null>`                     | 获取快照          |
| `getSnapshotAsUrl`  | `bookmarkId: string`               | `Promise<string \| null>`                       | 获取快照 Blob URL |
| `deleteSnapshot`    | `bookmarkId: string`               | `Promise<void>`                                 | 删除快照          |
| `getStorageUsage`   | -                                  | `Promise<{ count: number; totalSize: number }>` | 获取存储使用情况  |
| `clearAllSnapshots` | -                                  | `Promise<void>`                                 | 清除所有快照      |

**行为说明：**

- 每个书签只保存一个快照
- 使用 Blob 格式存储 HTML

---

## ImportExportPage

导入导出页面组件，支持书签和分类的导入导出功能。

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| -    | -    | -        | -       | 无 props    |

### 导出功能

- **JSON 格式**：导出完整数据（书签、分类、标签），适合插件间迁移
- **HTML 格式**：导出标准浏览器书签格式，可导入到其他浏览器

### 导入功能

支持两种文件格式：

1. **JSON 格式**（插件导出的数据）
   - 自动建立分类 ID 映射表，确保导入后关联关系正确
   - 按层级顺序处理分类，先创建父分类再创建子分类
   - 书签的 `categoryId` 自动转换为新系统中的对应 ID

2. **HTML 格式**（浏览器书签）
   - 支持保留目录结构选项
   - 支持 AI 分析选项（与保留目录互斥）
   - 自动去重（检查 URL 是否已存在）

**导入选项：**

| 选项             | 说明                             |
| ---------------- | -------------------------------- |
| 保留目录结构     | 将浏览器文件夹转换为插件分类     |
| AI 分析          | 使用 AI 自动分类和打标签         |
| 获取页面内容     | AI 分析时抓取页面内容提高准确性  |

**行为说明：**

- JSON 导入时，分类 ID 会被重新生成，通过映射表维护书签与分类的关联关系
- 同名同父级的分类不会重复创建，直接复用已有分类
- 导入进度实时显示，支持大量书签的批量导入

---

## pageShell

管理页与设置页的页面级壳层行为说明。

### OptionsPage

扩展设置页面组件，负责 AI、通用设置与存储管理。

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| -    | -    | -        | -       | 无 props    |

**用法示例：**

```tsx
<OptionsPage />
```

**行为说明：**

- 与产品介绍相关的信息已拆分到独立的 `AboutPage`

### AboutPage

关于 HamHome 的独立菜单页，集中展示产品信息与外部入口。

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| -    | -    | -        | -       | 无 props    |

**用法示例：**

```tsx
<AboutPage />
```

**行为说明：**

- 展示当前扩展版本、官网地址、GitHub 仓库地址和 GitHub Star 引导
- 官网与仓库入口使用新标签页打开，避免打断当前扩展管理流程

### App 页面顶部工具栏

管理页面顶部工具栏，承载常用全局操作入口。

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| -    | -    | -        | -       | 页面内部结构，无独立 props |

**用法示例：**

```tsx
<header className="flex h-16 shrink-0 items-center gap-2 border-b">...</header>
```

**行为说明：**

- 左侧侧边栏新增“关于”独立菜单项，对应 `AboutPage`
- 右上角在语言切换按钮左侧新增 GitHub 仓库快捷入口
- GitHub 按钮通过 Tooltip 提示用途，并在新标签页打开项目仓库
