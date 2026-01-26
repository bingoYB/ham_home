# Extension 组件文档

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

---

### BookmarkHeader

书签面板头部组件，包含搜索框、筛选器和快捷操作（QuickActions）。

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

### CategoryTreeView

分类层级树视图组件，按分类层级展示书签，支持展开/折叠。

| Prop           | Type                    | Required | Default | Description  |
| -------------- | ----------------------- | -------- | ------- | ------------ |
| bookmarks      | `LocalBookmark[]`       | ✓        | -       | 书签数据列表 |
| categories     | `LocalCategory[]`       | ✓        | -       | 分类数据列表 |
| onOpenBookmark | `(url: string) => void` | -        | -       | 打开书签回调 |
| className      | `string`                | -        | -       | 自定义样式类 |

**行为说明：**

- 默认展开所有顶层分类
- 点击分类头部可切换展开/折叠
- 支持多层嵌套分类结构
- 未分类书签单独归类到"未分类"节点

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

书签列表管理相关组件，用于 `MainContent` 主内容区的书签展示和编辑。

### BookmarkCard

网格视图下的书签卡片组件。

| Prop           | Type            | Required | Default | Description        |
| -------------- | --------------- | -------- | ------- | ------------------ |
| bookmark       | `LocalBookmark` | ✓        | -       | 书签数据           |
| categoryName   | `string`        | ✓        | -       | 分类全路径名称     |
| formattedDate  | `string`        | ✓        | -       | 格式化后的创建日期 |
| isSelected     | `boolean`       | ✓        | -       | 是否被选中         |
| columnSize     | `number`        | -        | `356`   | 卡片宽度           |
| onToggleSelect | `() => void`    | ✓        | -       | 切换选中状态       |
| onEdit         | `() => void`    | ✓        | -       | 编辑回调           |
| onDelete       | `() => void`    | ✓        | -       | 删除回调           |
| t              | `TFunction`     | ✓        | -       | i18n 翻译函数      |

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

| Property              | Type                                                             | Description                                          |
| --------------------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| theme                 | `'light' \| 'dark' \| 'system'`                                  | 当前主题                                             |
| setTheme              | `(theme: Theme) => Promise<void>`                                | 设置主题并保存到存储（无动画）                       |
| setThemeWithTransition | `(theme: Theme, options?: ThemeTransitionOptions) => Promise<void>` | 设置主题并使用 View Transitions API 圆形扩展动画切换 |

**ThemeTransitionOptions 类型：**

| Property        | Type      | Default | Description               |
| --------------- | --------- | ------- | ------------------------- |
| x               | `number`  | 屏幕中心 | 点击事件的 X 坐标          |
| y               | `number`  | 屏幕中心 | 点击事件的 Y 坐标          |
| enableAnimation | `boolean` | `true`  | 是否启用动画               |

**用法示例：**

```tsx
// 普通环境
const { theme, setTheme } = useTheme();

// Content UI 环境（需要传入 Shadow DOM 容器）
const { container } = useContentUI();
const { theme, setThemeWithTransition } = useTheme({ targetElement: container });

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
```

**行为说明：**

- 服务必须在 background script 启动时同步注册
- 方法调用会自动路由到 background 执行
- 完全类型安全，提供良好的 IDE 支持
- 替代手动编写 `chrome.runtime.sendMessage` / `onMessage` 样板代码

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

| 值           | 服务商名称     | API 兼容性   | 默认 Base URL                                          | 可用模型（第一个为默认）                  |
| ------------ | -------------- | ------------ | ------------------------------------------------------ | ----------------------------------------- |
| `openai`     | OpenAI         | OpenAI       | `https://api.openai.com/v1`                            | gpt-4o-mini, gpt-4o, gpt-4-turbo, gpt-3.5-turbo, o1-mini, o1-preview |
| `anthropic`  | Anthropic      | Anthropic    | `https://api.anthropic.com`                            | claude-3-5-haiku-latest, claude-3-5-sonnet-latest, claude-3-opus-latest |
| `google`     | Google Gemini  | OpenAI       | `https://generativelanguage.googleapis.com/v1beta/openai` | gemini-2.0-flash, gemini-2.0-flash-lite, gemini-1.5-flash, gemini-1.5-pro |
| `azure`      | Azure OpenAI   | OpenAI       | 用户配置                                               | gpt-4o-mini, gpt-4o, gpt-4-turbo, gpt-35-turbo |
| `deepseek`   | DeepSeek       | OpenAI       | `https://api.deepseek.com/v1`                          | deepseek-chat, deepseek-reasoner |
| `groq`       | Groq           | OpenAI       | `https://api.groq.com/openai/v1`                       | llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768, gemma2-9b-it |
| `mistral`    | Mistral AI     | OpenAI       | `https://api.mistral.ai/v1`                            | mistral-small-latest, mistral-medium-latest, mistral-large-latest, open-mistral-7b |
| `moonshot`   | Moonshot/Kimi  | OpenAI       | `https://api.moonshot.cn/v1`                           | moonshot-v1-8k, moonshot-v1-32k, moonshot-v1-128k |
| `zhipu`      | 智谱AI/GLM     | OpenAI       | `https://open.bigmodel.cn/api/paas/v4`                 | glm-4-flash, glm-4-plus, glm-4-air, glm-4-long |
| `hunyuan`    | 腾讯混元       | OpenAI       | `https://api.hunyuan.cloud.tencent.com/v1`             | hunyuan-lite, hunyuan-standard, hunyuan-pro, hunyuan-turbo |
| `nvidia`     | NVIDIA NIM     | OpenAI       | `https://integrate.api.nvidia.com/v1`                  | meta/llama-3.1-8b-instruct, meta/llama-3.1-70b-instruct, nvidia/llama-3.1-nemotron-70b-instruct |
| `siliconflow`| 硅基流动       | OpenAI       | `https://api.siliconflow.cn/v1`                        | Qwen/Qwen2.5-7B-Instruct, Qwen/Qwen2.5-72B-Instruct, deepseek-ai/DeepSeek-V3, Pro/deepseek-ai/DeepSeek-R1 |
| `ollama`     | Ollama（本地） | OpenAI       | `http://localhost:11434/v1`                            | llama3.2, llama3.1, mistral, qwen2.5, phi3 |
| `custom`     | 自定义         | OpenAI       | 用户配置                                               | gpt-4o-mini |

**辅助函数：**

| 函数                | 参数                 | 返回值       | 描述                     |
| ------------------- | -------------------- | ------------ | ------------------------ |
| `getDefaultModel`   | `provider: AIProvider` | `string`     | 获取默认模型（第一个）   |
| `getProviderModels` | `provider: AIProvider` | `string[]`   | 获取提供商所有可用模型   |
| `getDefaultBaseUrl` | `provider: AIProvider` | `string`     | 获取默认 Base URL        |
| `requiresApiKey`    | `provider: AIProvider` | `boolean`    | 检查是否需要 API Key     |

**行为说明：**

- 大多数提供商兼容 OpenAI API，使用统一的 OpenAI SDK 调用
- `azure` 和 `custom` 需要用户手动配置 Base URL
- `ollama` 不需要 API Key，使用本地服务
- 切换提供商时自动选择第一个模型作为默认值
- 模型选择器支持从预设列表选择，也支持输入自定义模型名称

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

---

### aiClient

AI 客户端封装，提供统一的 AI 分析接口。

#### analyzeComplete

一次性分析书签内容，生成标题、摘要、分类、标签。

**参数（EnhancedAnalyzeInput）：**

| Property       | Type              | Required | Description                                    |
| -------------- | ----------------- | -------- | ---------------------------------------------- |
| pageContent    | `PageContent`     | ✓        | 页面内容对象                                   |
| userCategories | `LocalCategory[]` | -        | 用户已有分类（用于智能匹配）                   |
| existingTags   | `string[]`        | -        | 用户已有标签（避免生成语义相近的重复标签）     |

**行为说明：**

- 传递 `existingTags` 后，AI 会避免生成与已有标签语义相近的标签
- 例如：已有 "前端开发" 标签时，AI 不会生成 "前端"、"Web开发" 等相近标签
- 优先复用已有标签，仅在确实需要新概念时才生成新标签

**用法示例：**

```ts
import { aiClient } from '@/lib/ai/client';
import { bookmarkStorage } from '@/lib/storage';

// 获取已有标签和分类
const [categories, existingTags] = await Promise.all([
  bookmarkStorage.getCategories(),
  bookmarkStorage.getAllTags(),
]);

// AI 分析
const result = await aiClient.analyzeComplete({
  pageContent,
  userCategories: categories,
  existingTags,  // 传递已有标签避免重复
});
```

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
