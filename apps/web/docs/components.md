# HamHome Web - 组件文档

## 目录结构

```
app/components/
├── Header.tsx          # 导航栏组件
├── Footer.tsx          # 页脚组件
├── FeatureShowcase.tsx # 功能展示区 (Tab 切换)
├── index.ts            # 导出入口
└── demos/              # Demo 展示组件
    ├── BookmarkCardDemo.tsx    # 书签卡片演示
    ├── SaveBookmarkDemo.tsx    # 保存书签演示
    ├── BookmarkPanelDemo.tsx   # 书签面板演示
    ├── BookmarkListMngDemo.tsx # 书签管理演示
    ├── AIFeatureDemo.tsx       # AI 功能演示
    └── index.ts
```

---

## Header

导航栏组件，包含 Logo、品牌名称、语言切换、主题切换、下载入口和 GitHub 入口。

### 行为说明

- Logo 使用 `/icon/128.png`，路径会自动加上 `NEXT_PUBLIC_BASE_PATH` 前缀以支持 GitHub Pages 部署
- 右上角包含下载下拉按钮和 GitHub 图标按钮
- 下载按钮点击展开下拉菜单，包含多种安装渠道：
  - Chrome Web Store（待发布）
  - Edge Add-ons（待发布）
  - Firefox Add-ons（待发布）
  - 离线安装包（已发布，链接至 GitHub Releases）
- 自动检测当前浏览器类型，显示"推荐"标签
- 未发布的渠道显示"待发布"标签，点击跳转至 GitHub Releases

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| isDark | boolean | ✓ | - | 当前是否为深色主题 |
| isEn | boolean | ✓ | - | 当前是否为英文模式 |
| onToggleTheme | () => void | ✓ | - | 切换主题回调 |
| onToggleLanguage | () => void | ✓ | - | 切换语言回调 |

### Usage

```tsx
<Header
  isDark={isDark}
  isEn={isEn}
  onToggleTheme={() => setIsDark(!isDark)}
  onToggleLanguage={() => setIsEn(!isEn)}
/>
```

---

## Footer

页脚组件，显示品牌标语。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| isEn | boolean | ✓ | - | 当前是否为英文模式 |

### Usage

```tsx
<Footer isEn={isEn} />
```

---

## FeatureShowcase

功能展示区组件，使用 Tab 切换展示不同功能模块。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| bookmarks | Bookmark[] | ✓ | - | 书签数据列表 |
| categories | Category[] | ✓ | - | 分类数据列表 |
| pageContent | PageContent | ✓ | - | 模拟页面内容 |
| allTags | string[] | ✓ | - | 所有标签列表 |
| isEn | boolean | ✓ | - | 当前是否为英文模式 |

### Usage

```tsx
<FeatureShowcase
  bookmarks={mockBookmarks}
  categories={mockCategories}
  pageContent={mockPageContent}
  allTags={mockAllTags}
  isEn={false}
/>
```

### 包含的 Tab

1. **保存书签** - SaveBookmarkDemo
2. **书签面板** - BookmarkPanelDemo
3. **书签管理** - BookmarkListMngDemo
4. **AI 功能** - AIFeatureDemo

---

## BookmarkCardDemo

书签卡片演示组件，展示单个书签的卡片视图。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| bookmark | Bookmark | ✓ | - | 书签数据 |
| categories | Category[] | ✓ | - | 分类列表 |
| isEn | boolean | ✓ | - | 当前是否为英文模式 |

---

## SaveBookmarkDemo

保存书签演示组件，左侧展示保存书签表单，右侧展示 AI 功能列表。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| pageContent | PageContent | ✓ | - | 模拟页面内容 |
| categories | Category[] | ✓ | - | 分类列表 |
| allTags | string[] | ✓ | - | 标签建议列表 |
| isEn | boolean | ✓ | - | 当前是否为英文模式 |

### 布局

- 左侧: 保存书签表单 (标题、摘要、分类、标签、操作按钮)
- 右侧: AI 功能介绍 (自动生成摘要、智能分类、标签推荐、隐私保护)

### 样式对齐

- 标签 UI 样式与 `@apps/extension/components/common/TagInput` 保持一致
- 使用渐变背景 Badge (violet-500 → indigo-500)，白色文字，带 X 图标删除按钮

---

## BookmarkPanelDemo

书签面板演示组件，模拟插件在页面唤起时的真实场景，与 `@apps/extension/components/bookmarkPanel` UI 保持一致。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| bookmarks | Bookmark[] | ✓ | - | 书签列表 |
| categories | Category[] | ✓ | - | 分类列表 |
| allTags | string[] | ✓ | - | 标签列表 |
| isEn | boolean | ✓ | - | 当前是否为英文模式 |

### 布局结构

- **底层**: 模拟网页内容（带浏览器地址栏、文章骨架）
- **中层**: 半透明模糊遮罩 (bg-black/20 + backdrop-blur)
- **上层**: 左侧滑入的书签面板侧边栏

### 功能

- 自动打开动画（800ms 延迟后滑入）
- 点击遮罩关闭面板
- 头部: 标题、书签数量、快捷操作按钮（LayoutGrid、Settings）
- 搜索框 + 清除按钮 + 标签筛选 + 筛选器按钮
- 分类树视图: 按分类层级展示书签，支持展开/折叠
- 书签项: HoverCard 预览，与 extension BookmarkListItem 样式一致

---

## BookmarkListMngDemo

书签管理演示组件，展示完整的管理视图，包含搜索、筛选、视图切换、批量操作功能。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| bookmarks | Bookmark[] | ✓ | - | 书签列表 |
| categories | Category[] | ✓ | - | 分类列表 |
| allTags | string[] | ✓ | - | 标签列表 |
| isEn | boolean | ✓ | - | 当前是否为英文模式 |

### 功能

- 搜索框
- 标签筛选按钮
- 分类筛选按钮
- 筛选器按钮
- 视图切换 (网格/列表)
- 筛选状态显示
- 批量选择操作

---

## AIFeatureDemo

AI 功能演示组件，直接展示预设分类选择和 AI 生成分类功能。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| isEn | boolean | ✓ | - | 当前是否为英文模式 |

### 布局结构

- 头部标题和描述
- Tab 切换（预设分类 / AI 生成）
- 内容区域（可滚动）

### 功能

- **预设分类 Tab**: 左右并排展示通用型和专业型两套预设分类方案，树形结构预览
- **AI 生成 Tab**: 输入需求描述，模拟 AI 生成个性化分类结构
- 应用按钮（演示用）

### 内部组件

- `PresetCategoryTree`: 预设分类树形展示组件
- `AIGeneratedCategoryTree`: AI 生成分类树形展示组件

### Usage

```tsx
<AIFeatureDemo isEn={false} />
```

---

## 数据类型

详见 `data/mock-bookmarks.ts`:

```ts
interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  categoryId: string;
  tags: string[];
  favicon?: string;
  createdAt: number;
}

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
}

interface PageContent {
  url: string;
  title: string;
  excerpt: string;
  favicon?: string;
}
```
