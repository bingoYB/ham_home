# HamHome AI 对话式搜索 UI/UX 综合设计方案

## 1. 概述

本方案旨在为 HamHome 的两个核心界面——**管理页 (MainContent)** 和 **侧边栏 (BookmarkPanel)**——引入统一而又适配各自场景的 AI 对话式搜索体验。

核心目标是实现 **“渐进式增强 (Progressive Enhancement)”**：在保持现有高效书签管理体验的基础上，无缝接入 AI 语义检索和问答能力，而不是强行植入一个独立的聊天机器人。

## 2. 核心交互理念

### 2.1 搜索框即入口 (Search Bar as Entry)
不增加额外的聊天窗口入口。复用现有的搜索框，通过模式切换进入 AI 对话状态。
- **默认状态**：关键词匹配（极速、本地）。
- **AI 状态**：自然语言理解、语义检索、总结回答。

### 2.2 列表即上下文 (List as Context)
AI 的回答不是孤立的文本，而是对下方书签列表的“导读”。
- **联动机制**：AI 回答基于检索到的 Top-K 书签生成。
- **所见即所得**：AI 面板下方直接展示对应的书签卡片，用户可直接点击访问。

### 2.3 引用即导航 (Citation as Navigation)
AI 回答中的引用锚点（如 `[1]`）不仅是信源标注，更是导航工具。点击引用，列表自动滚动并高亮对应的书签卡片。

---

## 3. MainContent (宽屏/管理页) 设计

### 3.1 布局结构

MainContent 拥有宽裕的横向空间，采用 **“顶部插入式”** 布局。

```
+-------------------------------------------------------+
|  Sticky Header (筛选栏)                               |
|  [ ✨ AI 搜索框 _______________________________ ]      |
+-------------------------------------------------------+
|  AI Answer Panel (可折叠)                             |
|  +-------------------------------------------------+  |
|  | 🤖 AI 回答区域...                                |  |
|  | [1] 引用锚点                                     |  |
|  |                                                 |  |
|  | (Chips: 建议操作1) (Chips: 建议操作2)            |  |
|  +-------------------------------------------------+  |
+-------------------------------------------------------+
|  Bookmark List (Masonry/Grid)                         |
|                                                       |
|  [书签卡片1]  [书签卡片2]  [书签卡片3]                 |
|  (高亮)                                               |
|                                                       |
+-------------------------------------------------------+
```

### 3.2 交互细节

1.  **入口**：
    -   搜索框左侧/内部增加 ✨ 图标。
    -   点击图标或输入自然语言（如 "How to..."）触发 AI 模式。
    -   输入框边框变为 **靛蓝色 (Indigo)** 渐变，Placeholder 变为 "Ask AI about your bookmarks..."。

2.  **结果展示**：
    -   用户回车后，下方列表立即刷新为 **Top-K 相关书签**（混合检索结果）。
    -   Header 下方展开 `AIAnswerPanel`，流式输出回答。
    -   回答基于下方列表内容生成总结。

3.  **引用联动**：
    -   点击回答中的 `[1]`，页面平滑滚动定位到对应的书签卡片。
    -   卡片触发 `ring-2 ring-primary` 闪烁动画。

---

## 4. BookmarkPanel (窄屏/侧边栏) 设计

### 4.1 布局结构

侧边栏宽度受限（通常 360px），采用 **“挤压式 (Squeeze)”** 布局，优先保证列表可见性。

```
+-----------------------------------+
|  Header                           |
|  [ ✨ 搜索... ]                    |
+-----------------------------------+
|  AI Answer Panel (Max-H: 40%)     |
|  +-----------------------------+  |
|  | 🤖 简明回答...               |  |
|  | [1]                         |  |
|  | <收起按钮>                   |  |
|  +-----------------------------+  |
+-----------------------------------+
|  Bookmark List (Flex-1, Scroll)   |
|                                   |
|  [书签列表项 1]                    |
|  [书签列表项 2]                    |
|  ...                              |
+-----------------------------------+
```

### 4.2 交互细节

1.  **空间管理**：
    -   AI 面板插入到 Header 和 List 之间。
    -   面板高度自适应，但最大不超过容器高度的 40%（约 200px）。
    -   内容超出时面板内部滚动，不影响整体布局。

2.  **轻量化体验**：
    -   **回答精简**：Prompt 设定为“直入主题”，去除寒暄。
    -   **紧凑引用**：使用小型 Badge `[1]`。
    -   **可收起**：提供 Chevron Up 按钮将面板收起为一行摘要，给列表腾出空间。

3.  **实现逻辑**：
    -   使用 Flex 布局：Header (none), AI Panel (none), List (flex-1, min-h-0)。
    -   确保 `min-h-0` 属性存在，防止 Flex 子项溢出。

---

## 5. 通用组件架构

为了统一体验并减少重复代码，需提取以下通用组件。

### 5.1 `SearchInputArea`
封装搜索框与 AI 模式切换逻辑。

```tsx
interface SearchInputAreaProps {
  value: string;
  onChange: (val: string) => void;
  mode: 'keyword' | 'chat';
  onModeChange: (mode: 'keyword' | 'chat') => void;
  isSearching: boolean;
  className?: string;
}
```

### 5.2 `AIAnswerPanel`
核心展示组件，支持响应式/紧凑模式。

```tsx
interface AIAnswerPanelProps {
  /** 是否为紧凑模式 (用于 BookmarkPanel) */
  compact?: boolean;
  /** AI 回答内容 (Markdown) */
  answer: string;
  /** 状态 */
  status: 'thinking' | 'writing' | 'done' | 'error';
  /** 引用源列表 */
  sources: Source[];
  /** 点击引用回调 */
  onSourceClick: (bookmarkId: string) => void;
  /** 关闭/收起回调 */
  onClose: () => void;
  /** 后续建议点击回调 */
  onSuggestionClick: (suggestion: string) => void;
}
```

### 5.3 `useConversationalSearch` (Hook)
封装 AI 对话状态机与检索逻辑。

```tsx
const {
  mode,            // 'keyword' | 'chat'
  toggleMode,
  query,
  setQuery,
  answer,          // AI 回答流
  status,          // AI 状态
  results,         // 混合检索结果 (Bookmarks)
  suggestions,     // 后续建议
  handleSearch     // 触发搜索
} = useConversationalSearch({
  bookmarks,       // 原始数据
  embeddingConfig  // 配置
});
```

## 6. 视觉规范 (UI Kit)

-   **AI 主色调**：Indigo / Violet 渐变。
    -   Light: `text-indigo-600`, `bg-indigo-50`
    -   Dark: `text-indigo-400`, `bg-indigo-950/30`
-   **面板样式**：
    -   背景：`bg-muted/30` (与列表区分，但不过分突兀)。
    -   边框：`border-b border-border/50`。
    -   动画：`animate-in slide-in-from-top-2 fade-in duration-300`。
-   **高亮效果**：
    -   书签卡片高亮：CSS Keyframes `pulse-ring`。

## 7. 实施路线图

1.  **Phase 1: 基础组件开发**
    -   开发 `SearchInputArea` 和 `AIAnswerPanel`。
    -   在 Storybook 或独立页面测试组件交互。

2.  **Phase 2: 逻辑封装**
    -   实现 `useConversationalSearch` Hook，打通 Mock 数据流。

3.  **Phase 3: 页面集成**
    -   **MainContent 集成**：调整 Sticky Header，插入 AI 面板。
    -   **BookmarkPanel 集成**：调整 Flex 布局，适配窄屏交互。

4.  **Phase 4: 真实数据接入**
    -   接入 Embedding 检索服务和 LLM 流式接口。
