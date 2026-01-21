# Extension 组件文档

## bookmarkPanel

书签面板相关组件，用于 Content UI 侧边书签浏览。

### BookmarkPanel

书签面板主容器组件，整合头部搜索筛选和分类树列表。

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| bookmarks | `LocalBookmark[]` | ✓ | - | 书签数据列表 |
| categories | `LocalCategory[]` | ✓ | - | 分类数据列表 |
| isOpen | `boolean` | ✓ | - | 面板是否打开 |
| position | `PanelPosition` | ✓ | - | 面板位置（left/right） |
| onClose | `() => void` | ✓ | - | 关闭回调 |
| onOpenBookmark | `(url: string) => void` | - | - | 打开书签回调 |
| onOpenSettings | `() => void` | - | - | 打开设置回调 |

---

### BookmarkHeader

书签面板头部组件，包含搜索框、筛选器和设置入口。

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| searchQuery | `string` | ✓ | - | 搜索关键词 |
| onSearchChange | `(query: string) => void` | ✓ | - | 搜索变更回调 |
| bookmarkCount | `number` | ✓ | - | 总书签数 |
| filteredCount | `number` | ✓ | - | 筛选后书签数 |
| allTags | `string[]` | ✓ | - | 所有可用标签 |
| selectedTags | `string[]` | ✓ | - | 已选标签 |
| onToggleTag | `(tag: string) => void` | ✓ | - | 切换标签选择 |
| onClearTagFilter | `() => void` | ✓ | - | 清除标签筛选 |
| timeRange | `TimeRange` | ✓ | - | 时间范围筛选 |
| onTimeRangeChange | `(range: TimeRange) => void` | ✓ | - | 时间范围变更 |
| onClearTimeFilter | `() => void` | ✓ | - | 清除时间筛选 |
| onOpenSettings | `() => void` | - | - | 打开设置回调 |

---

### CategoryTreeView

分类层级树视图组件，按分类层级展示书签，支持展开/折叠。

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| bookmarks | `LocalBookmark[]` | ✓ | - | 书签数据列表 |
| categories | `LocalCategory[]` | ✓ | - | 分类数据列表 |
| onOpenBookmark | `(url: string) => void` | - | - | 打开书签回调 |
| className | `string` | - | - | 自定义样式类 |

**行为说明：**
- 默认展开所有顶层分类
- 点击分类头部可切换展开/折叠
- 支持多层嵌套分类结构
- 未分类书签单独归类到"未分类"节点

---

### FilterDropdown

筛选类型选择下拉组件，提供标签筛选和时间筛选入口。

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| hasTagFilter | `boolean` | ✓ | - | 是否有标签筛选 |
| hasTimeFilter | `boolean` | ✓ | - | 是否有时间筛选 |
| onSelectFilter | `(type: FilterType) => void` | ✓ | - | 选择筛选类型 |
| onClearTagFilter | `() => void` | - | - | 清除标签筛选 |
| onClearTimeFilter | `() => void` | - | - | 清除时间筛选 |

---

### TagFilterPopover

标签筛选弹窗组件，支持搜索标签和多选。

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| open | `boolean` | ✓ | - | 弹窗是否打开 |
| onOpenChange | `(open: boolean) => void` | ✓ | - | 打开状态变更 |
| allTags | `string[]` | ✓ | - | 所有可用标签 |
| selectedTags | `string[]` | ✓ | - | 已选标签 |
| onToggleTag | `(tag: string) => void` | ✓ | - | 切换标签选择 |
| onConfirm | `() => void` | - | - | 确认回调 |

---

### TimeFilterPopover

时间范围筛选弹窗组件，支持预设时间范围和自定义范围。

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| open | `boolean` | ✓ | - | 弹窗是否打开 |
| onOpenChange | `(open: boolean) => void` | ✓ | - | 打开状态变更 |
| timeRange | `TimeRange` | ✓ | - | 当前时间范围 |
| onTimeRangeChange | `(range: TimeRange) => void` | ✓ | - | 时间范围变更 |

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

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| bookmark | `LocalBookmark` | ✓ | - | 书签数据 |

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

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| bookmark | `LocalBookmark` | ✓ | - | 书签数据 |
| categoryName | `string` | ✓ | - | 分类全路径名称 |
| formattedDate | `string` | ✓ | - | 格式化后的创建日期 |
| isSelected | `boolean` | ✓ | - | 是否被选中 |
| columnSize | `number` | - | `356` | 卡片宽度 |
| onToggleSelect | `() => void` | ✓ | - | 切换选中状态 |
| onEdit | `() => void` | ✓ | - | 编辑回调 |
| onDelete | `() => void` | ✓ | - | 删除回调 |
| t | `TFunction` | ✓ | - | i18n 翻译函数 |

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

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| bookmark | `LocalBookmark` | ✓ | - | 书签数据 |
| categoryName | `string` | ✓ | - | 分类全路径名称 |
| formattedDate | `string` | ✓ | - | 格式化后的创建日期 |
| isSelected | `boolean` | ✓ | - | 是否被选中 |
| onToggleSelect | `() => void` | ✓ | - | 切换选中状态 |
| onOpen | `() => void` | ✓ | - | 打开书签回调 |
| onEdit | `() => void` | ✓ | - | 编辑回调 |
| onDelete | `() => void` | ✓ | - | 删除回调 |
| t | `TFunction` | ✓ | - | i18n 翻译函数 |

**用法示例：**

```tsx
<BookmarkListItem
  bookmark={bookmark}
  categoryName="技术 > 前端"
  formattedDate="昨天"
  isSelected={selectedIds.has(bookmark.id)}
  onToggleSelect={() => toggleSelect(bookmark.id)}
  onOpen={() => window.open(bookmark.url, '_blank')}
  onEdit={() => setEditingBookmark(bookmark)}
  onDelete={() => handleDelete(bookmark)}
  t={t}
/>
```

---

### EditBookmarkDialog

书签编辑弹窗组件，支持修改书签的 URL、标题、摘要、分类和标签。

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| bookmark | `LocalBookmark` | ✓ | - | 要编辑的书签数据 |
| onSaved | `() => void` | ✓ | - | 保存成功回调 |
| onClose | `() => void` | ✓ | - | 关闭弹窗回调 |

**用法示例：**

```tsx
{editingBookmark && (
  <EditBookmarkDialog
    bookmark={editingBookmark}
    onSaved={() => {
      refreshBookmarks();
      setEditingBookmark(null);
    }}
    onClose={() => setEditingBookmark(null)}
  />
)}
```

**行为说明：**
- 内部使用 `useSavePanel` hook 管理表单状态
- 支持 AI 推荐分类功能
- 自动加载已有标签列表作为建议

---

## Hooks

### useBookmarkSearch

书签搜索筛选 Hook，管理搜索、标签筛选、分类筛选和时间范围筛选状态。

**参数：**

| Param | Type | Description |
|-------|------|-------------|
| bookmarks | `LocalBookmark[]` | 原始书签列表 |
| categories | `LocalCategory[]` | 分类列表（可选） |
| initialState | `Partial<BookmarkSearchState>` | 初始状态（可选） |

**返回值：**

| Property | Type | Description |
|----------|------|-------------|
| searchQuery | `string` | 搜索关键词 |
| selectedTags | `string[]` | 已选标签 |
| selectedCategory | `string` | 已选分类 ID（`'all'` 表示全部） |
| timeRange | `TimeRange` | 时间范围筛选 |
| hasFilters | `boolean` | 是否有任何筛选条件 |
| filteredBookmarks | `LocalBookmark[]` | 筛选后的书签列表 |
| setSearchQuery | `(query: string) => void` | 设置搜索关键词 |
| setSelectedTags | `(tags: string[]) => void` | 设置已选标签 |
| setSelectedCategory | `(category: string) => void` | 设置分类 |
| setTimeRange | `(range: TimeRange) => void` | 设置时间范围 |
| toggleTagSelection | `(tag: string) => void` | 切换标签选择 |
| clearFilters | `() => void` | 清除所有筛选 |
| clearTagFilters | `() => void` | 清除标签筛选 |
| clearTimeFilter | `() => void` | 清除时间筛选 |

**TimeRange 类型：**

```ts
type TimeRangeType = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

interface TimeRange {
  type: TimeRangeType;
  startDate?: number; // 时间戳（custom 类型时使用）
  endDate?: number;   // 时间戳（custom 类型时使用）
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

| Param | Type | Description |
|-------|------|-------------|
| bookmarks | `LocalBookmark[]` | 原始书签列表 |

**返回值：**

| Property | Type | Description |
|----------|------|-------------|
| searchQuery | `string` | 搜索关键词 |
| selectedTags | `string[]` | 已选标签 |
| selectedCategory | `string` | 已选分类 ID（`'all'` 表示全部） |
| hasFilters | `boolean` | 是否有任何筛选条件 |
| filteredBookmarks | `LocalBookmark[]` | 筛选后的书签列表 |
| setSearchQuery | `(query: string) => void` | 设置搜索关键词 |
| setSelectedCategory | `(category: string) => void` | 设置分类 |
| toggleTagSelection | `(tag: string) => void` | 切换标签选择 |
| clearFilters | `() => void` | 清除所有筛选 |
| clearSelectedTags | `() => void` | 清除已选标签 |

**用法示例：**

```tsx
const {
  searchQuery,
  filteredBookmarks,
  setSearchQuery,
  clearFilters,
} = useBookmarkFilter(bookmarks);
```

---

### useBookmarkSelection

书签批量选择逻辑 Hook。

**返回值：**

| Property | Type | Description |
|----------|------|-------------|
| selectedIds | `Set<string>` | 已选书签 ID 集合 |
| toggleSelect | `(id: string) => void` | 切换单个选择 |
| selectAll | `(ids: string[]) => void` | 全选 |
| deselectAll | `() => void` | 取消全选 |
| toggleSelectAll | `(allIds: string[]) => void` | 切换全选/取消全选 |
| removeFromSelection | `(id: string) => void` | 从选择中移除 |

**用法示例：**

```tsx
const { selectedIds, toggleSelect, toggleSelectAll } = useBookmarkSelection();
```

---

### useMasonryLayout

瀑布流布局计算 Hook。

**参数：**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| benchWidth | `number` | `356` | 基准列宽 |
| itemGap | `number` | `16` | 项目间距 |
| maxCol | `number` | `12` | 最大列数 |
| minCol | `number` | `1` | 最小列数 |
| containerPadding | `number` | `48` | 容器内边距 |

**返回值：**

| Property | Type | Description |
|----------|------|-------------|
| containerRef | `RefObject<HTMLDivElement>` | 容器 ref |
| config | `{ cols: number; columnSize: number }` | 计算后的列配置 |

**用法示例：**

```tsx
const { containerRef, config } = useMasonryLayout({ benchWidth: 356 });

<div ref={containerRef}>
  <Masonry columnNum={config.cols} columnSize={config.columnSize} ... />
</div>
```

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
