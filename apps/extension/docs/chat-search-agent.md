# 对话式搜索系统架构文档 (V2)

## 概述

对话式搜索（Conversational Search）是一个基于 AI 的多轮对话书签检索系统，支持自然语言查询、语义检索、上下文理解与智能回答生成。

**V2 新特性：**
- 新的意图类型：`query`、`statistics`、`help`
- 智能查询关键词提炼
- 基于结果分析的智能建议（精炼/整理/发现）
- 统计查询支持（如"昨天收藏了多少"）
- 帮助查询支持（如"快捷键是什么"）

---

## 架构流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户交互层                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    useConversationalSearch Hook                         ││
│  │  - 管理搜索模式（keyword/chat）                                          ││
│  │  - 维护 UI 状态（status, answer, results, suggestions）                  ││
│  │  - 自动检测自然语言查询                                                   ││
│  └───────────────────────────────┬─────────────────────────────────────────┘│
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             编排层 (Orchestration)                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        ChatSearchAgent                                  ││
│  │  ┌───────────────┐    ┌───────────────┐    ┌───────────────────────┐   ││
│  │  │  loadContext  │───▶│  parseQuery   │───▶│   executeRetrieval    │   ││
│  │  │  (分类/标签)   │    │  (QueryPlanner)│    │   (HybridRetriever)  │   ││
│  │  └───────────────┘    └───────────────┘    └───────────┬───────────┘   ││
│  │                                                         │               ││
│  │  ┌───────────────┐    ┌───────────────┐                │               ││
│  │  │  updateState  │◀───│ generateAnswer│◀───────────────┘               ││
│  │  │  (对话状态)    │    │  (AI Writer)  │                                ││
│  │  └───────────────┘    └───────────────┘                                ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              检索层 (Retrieval)                              │
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                        HybridRetriever                               │  │
│   │                      (混合检索编排器)                                  │  │
│   │                                                                      │  │
│   │    ┌──────────────────────┐      ┌──────────────────────┐           │  │
│   │    │   KeywordRetriever   │      │  SemanticRetriever   │           │  │
│   │    │   - 全文索引检索       │      │  - Embedding 向量检索 │           │  │
│   │    │   - 标题/描述匹配      │      │  - Cosine 相似度计算  │           │  │
│   │    │   - 过滤条件应用       │      │  - 最小阈值过滤       │           │  │
│   │    └──────────┬───────────┘      └──────────┬───────────┘           │  │
│   │               │                              │                       │  │
│   │               └──────────┬───────────────────┘                       │  │
│   │                          ▼                                           │  │
│   │               ┌────────────────────┐                                 │  │
│   │               │     结果融合        │                                 │  │
│   │               │  - 加权评分聚合     │                                 │  │
│   │               │  - 时间衰减加权     │                                 │  │
│   │               │  - 过滤条件命中加权 │                                 │  │
│   │               └────────────────────┘                                 │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              存储层 (Storage)                                │
│                                                                             │
│    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    │
│    │  BookmarkStorage │    │   VectorStore    │    │   ConfigStorage  │    │
│    │  (书签数据)       │    │  (Embedding向量) │    │   (AI/用户配置)   │    │
│    └──────────────────┘    └──────────────────┘    └──────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 核心模块详解

### 1. ChatSearchAgent (编排层核心)

**文件**: `lib/search/chat-search-agent.ts`

**职责**: 对话式搜索的核心编排器，负责协调各模块完成完整的搜索流程。根据意图路由到不同的处理器。

**核心方法**:

| 方法 | 描述 |
|------|------|
| `search(userInput, state)` | 主入口，根据意图路由到对应处理器 |
| `handleQueryIntent()` | 处理查询意图（搜索书签） |
| `handleStatisticsIntent()` | 处理统计意图（统计收藏情况） |
| `handleHelpIntent()` | 处理帮助意图（回答功能问题） |
| `continueSearch(state)` | 继续查找更多结果（分页） |
| `applyFilter(filterUpdate, state)` | 应用新的过滤条件并重新搜索 |
| `generateAnswerWithContext()` | 调用 AI 生成自然语言回答（带智能建议） |
| `analyzeResults()` | 分析搜索结果用于生成智能建议 |
| `generateSmartSuggestions()` | 生成智能下一步建议 |

**搜索流程**:

```
1. loadCategories()           → 加载分类元数据
2. getExistingTags()          → 获取已有标签列表
3. queryPlanner.parse()       → 解析用户输入为结构化请求
4. 根据 intent 路由:
   - query → handleQueryIntent()
   - statistics → handleStatisticsIntent()
   - help → handleHelpIntent()
5. (query 意图) hybridRetriever.search() → 执行混合检索
6. analyzeResults()           → 分析结果特征
7. generateSmartSuggestions() → 生成智能建议
8. generateAnswerWithContext() → AI 生成回答
9. updateState()              → 更新对话状态
```

---

### 2. QueryPlanner (查询解析器)

**文件**: `lib/search/query-planner.ts`

**职责**: 将自然语言输入解析为结构化的 `SearchRequest`，包括意图识别、查询提炼和过滤条件提取。

**解析策略**:

| 策略 | 触发条件 | 描述 |
|------|----------|------|
| AI 解析 | API Key 已配置 | 使用 LLM 进行智能解析 |
| 规则解析 | AI 不可用时 | 基于正则表达式的规则匹配 |

**意图识别 (V2)**:

| Intent | 触发词 | 描述 |
|--------|--------|------|
| `query` | 默认 | 搜索书签 |
| `statistics` | 多少、几个、统计 | 统计收藏情况 |
| `help` | 快捷键、设置、怎么用 | 询问插件功能 |

**查询子类型 (QuerySubtype)**:

| Subtype | 触发条件 | 描述 |
|---------|----------|------|
| `time` | 提到时间约束 | 按时间查询 |
| `category` | 提到分类名称 | 按分类查询 |
| `tag` | 提到标签 | 按标签查询 |
| `semantic` | 默认 | 语义化查询 |
| `compound` | 多个条件组合 | 复合查询 |

**查询关键词提炼**:

从用户输入中移除填充词，提取核心语义关键词：

```
"配眼镜相关的" → "配眼镜"
"我要查询设计素材" → "设计素材"
"帮我找一下 React 教程" → "React 教程"
```

**过滤条件提取**:

| 过滤项 | 提取规则 |
|--------|----------|
| `categoryId` | 仅当明确提到分类名称时设置 |
| `tagsAny` | 仅当明确提到标签名称时设置 |
| `timeRangeDays` | 昨天→1天, 最近/近期→7天, 本月→30天, 今年→365天 |
| `semantic` | 默认 true，仅"精确匹配"时为 false |

---

### 3. HybridRetriever (混合检索器)

**文件**: `lib/search/hybrid-retriever.ts`

**职责**: 融合关键词检索和语义检索，提供更稳定的相关性排序。

**融合算法**:

```typescript
// 默认权重配置
const weights = {
  keyword: 0.4,      // 关键词评分权重
  semantic: 0.6,     // 语义评分权重
  filterBoost: 0.1,  // 过滤条件命中加权
};

// 综合评分计算
combinedScore = keywordScore × 0.4 + semanticScore × 0.6
combinedScore *= (1 + filterBoost)  // 分类/标签命中加权
```

**执行流程**:

```
1. 并行执行 KeywordRetriever 和 SemanticRetriever
2. 合并两路结果到 scoreMap
3. 获取书签详情用于过滤
4. 应用过滤条件
5. 计算综合加权评分
6. 按评分降序排序并截取 topK
```

---

### 4. SemanticRetriever (语义检索器)

**文件**: `lib/search/semantic-retriever.ts`

**职责**: 基于 Embedding 向量的语义相似度检索。

**核心算法**:

```typescript
// Cosine 相似度计算
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  return dotProduct(a, b) / (norm(a) * norm(b));
}
```

**检索流程**:

```
1. 检查 Embedding 服务可用性
2. 生成查询向量 (embeddingClient.embed)
3. 获取当前模型的所有存储向量
4. 过滤排除/限定的书签 ID
5. 逐一计算 Cosine 相似度
6. 过滤最小阈值 (默认 0.3)
7. 按相似度降序排序
8. 返回 topK 结果
```

---

### 5. useConversationalSearch Hook (UI 状态管理)

**文件**: `hooks/useConversationalSearch.ts`

**职责**: 封装 AI 对话状态机与 UI 交互逻辑。

**状态定义**:

| 状态字段 | 类型 | 描述 |
|----------|------|------|
| `mode` | `'keyword' \| 'chat'` | 搜索模式 |
| `status` | `AISearchStatus` | 搜索状态 (idle/thinking/searching/writing/done/error) |
| `query` | `string` | 查询文本 |
| `answer` | `string` | AI 生成的回答 |
| `results` | `Source[]` | 检索结果列表 |
| `suggestions` | `string[]` | 后续建议操作 |
| `isPanelOpen` | `boolean` | AI 面板是否打开 |

**自动模式检测**:

```typescript
function isNaturalLanguageQuery(query: string): boolean {
  // 中文：怎么、如何、什么、哪个... 或以 ？/吗/呢 结尾
  // 英文：how, what, why, where... 或以 ? 结尾
  // 长查询：3+ 个空格分隔的词
}
```

---

## 数据流时序图

```
User              Hook              ChatSearchAgent       QueryPlanner       HybridRetriever
  │                 │                     │                   │                    │
  │  输入查询        │                     │                   │                    │
  ├────────────────▶│                     │                   │                    │
  │                 │                     │                   │                    │
  │                 │  status=thinking    │                   │                    │
  │                 ├────────────────────▶│                   │                    │
  │                 │                     │                   │                    │
  │                 │                     │  parse(input)     │                    │
  │                 │                     ├──────────────────▶│                    │
  │                 │                     │                   │                    │
  │                 │                     │  SearchRequest    │                    │
  │                 │                     │◀──────────────────┤                    │
  │                 │                     │                   │                    │
  │                 │  status=searching   │                   │                    │
  │                 │◀────────────────────┤                   │                    │
  │                 │                     │                   │                    │
  │                 │                     │   search(query, options)               │
  │                 │                     ├─────────────────────────────────────────▶│
  │                 │                     │                   │                    │
  │                 │                     │                   │    ┌──────────────┐│
  │                 │                     │                   │    │ Keyword +    ││
  │                 │                     │                   │    │ Semantic     ││
  │                 │                     │                   │    │ 并行检索      ││
  │                 │                     │                   │    └──────────────┘│
  │                 │                     │                   │                    │
  │                 │                     │   SearchResult    │                    │
  │                 │                     │◀─────────────────────────────────────────┤
  │                 │                     │                   │                    │
  │                 │                     │  generateAnswer() │                    │
  │                 │                     │  (AI Writer)      │                    │
  │                 │                     │                   │                    │
  │                 │  status=writing     │                   │                    │
  │                 │◀────────────────────┤                   │                    │
  │                 │                     │                   │                    │
  │  流式输出回答    │                     │                   │                    │
  │◀────────────────┤                     │                   │                    │
  │                 │                     │                   │                    │
  │                 │  status=done        │                   │                    │
  │◀────────────────┤                     │                   │                    │
  │                 │                     │                   │                    │
```

---

## 核心数据结构

### ConversationIntent (意图类型)

```typescript
// 主意图
type ConversationIntent = 'query' | 'statistics' | 'help';

// 查询子类型
type QuerySubtype = 'time' | 'category' | 'tag' | 'semantic' | 'compound';
```

### ConversationState (对话状态)

```typescript
interface ConversationState {
  intent: ConversationIntent;    // 当前意图: query | statistics | help
  querySubtype?: QuerySubtype;   // 查询子类型
  query: string;                 // 当前主查询
  refinedQuery?: string;         // 提炼后的语义查询关键词
  filters: SearchFilters;        // 筛选条件
  seenBookmarkIds: string[];     // 已展示的结果 ID（用于去重/分页）
  shortMemory: Array<{           // 短期记忆（最近 6 轮）
    role: 'user' | 'assistant';
    text: string;
  }>;
  longMemorySummary?: string;    // 长期记忆摘要（预留）
}
```

### SearchRequest (搜索请求)

```typescript
interface SearchRequest {
  intent: ConversationIntent;
  querySubtype?: QuerySubtype;    // 查询子类型
  query: string;                  // 原始查询
  refinedQuery: string;           // 提炼后的语义关键词
  filters: SearchFilters;
  topK: number;
}
```

### SearchFilters (过滤条件)

```typescript
interface SearchFilters {
  categoryId?: string;      // 分类 ID
  tagsAny?: string[];       // 标签（任一匹配）
  domain?: string;          // 域名过滤
  timeRangeDays?: number;   // 时间范围（天）
  semantic?: boolean;       // 是否启用语义搜索
}
```

### ChatSearchResponse (搜索响应)

```typescript
interface ChatSearchResponse {
  answer: string;              // AI 生成的回答（1-5句）
  sources: string[];           // 引用的 bookmarkId 列表
  nextSuggestions: Suggestion[]; // 后续建议（2-4个，可执行操作）
}

interface Suggestion {
  label: string;               // 显示文本
  action: SuggestionActionType; // 操作类型
  payload?: Record<string, unknown>; // 操作参数
}

type SuggestionActionType =
  | 'text'              // 文本建议（点击填入输入框）
  | 'copyAllLinks'      // 复制所有链接
  | 'batchAddTags'      // 批量打标签
  | 'batchMoveCategory' // 批量移动分类
  | 'showMore'          // 显示更多结果
  | 'timeFilter'        // 时间过滤
  | 'domainFilter'      // 域名过滤
  | 'categoryFilter'    // 分类过滤
  | 'semanticOnly'      // 只看语义匹配
  | 'keywordOnly'       // 只看关键词匹配
  | 'findDuplicates';   // 查找重复书签
```

---

## 设计亮点

### 1. 分层解耦架构

```
Hook (UI) → Agent (编排) → Retriever (检索) → Storage (存储)
```

每层职责单一，便于测试和维护。

### 2. 双路检索融合

- **关键词检索**: 精确匹配，召回率稳定
- **语义检索**: 理解语义，发现相关内容
- **加权融合**: 6:4 权重，兼顾精确与相关

### 3. 优雅降级机制

| 组件 | 正常模式 | 降级模式 |
|------|----------|----------|
| QueryPlanner | AI 解析 | 规则解析 |
| SemanticRetriever | Embedding 检索 | 跳过，仅用关键词 |
| Answer Generator | AI 生成回答 | 规则生成简单描述 |

### 4. 多轮对话支持

- **状态合并**: 新请求与历史状态合并过滤条件
- **短期记忆**: 保留最近 6 轮对话用于上下文理解
- **去重机制**: `seenBookmarkIds` 避免重复展示

### 5. 智能建议生成 (V2) - 可执行操作

基于结果分析自动生成三类建议，每个建议包含 `action` 类型，支持直接执行操作：

**精炼 (Refine) - 调整搜索范围：**
| 条件 | 建议 | action |
|------|------|--------|
| 结果 > 20 | "只看最近 30 天" | `timeFilter` |
| 结果 > 20 | "限定 XX 分类" | `categoryFilter` |
| 结果 > 20 | "只看 XX 网站" | `domainFilter` |
| 结果 < 3 | "扩大时间范围" | `text` |
| 无结果 | "使用语义搜索" | `semanticOnly` |

**整理 (Organize) - 批量操作（直接执行）：**
| 条件 | 建议 | action | 行为 |
|------|------|--------|------|
| 同一主题 | "批量打标签" | `batchAddTags` | 全选结果 + 打开标签弹窗 |
| 同一主题 | "批量移动分类" | `batchMoveCategory` | 全选结果 + 打开分类弹窗 |
| 结果 >= 2 | "复制所有链接" | `copyAllLinks` | 复制到剪贴板 + Toast 提示 |

**发现 (Discover) - 查找规律：**
| 条件 | 建议 | action |
|------|------|--------|
| 高相似度 | "查找重复书签" | `findDuplicates` |
| 有更多结果 | "显示更多结果" | `showMore` |

### 6. 多意图支持 (V2)

| 意图 | 处理方式 | 返回内容 |
|------|----------|----------|
| `query` | 混合检索 + AI 回答 | 书签列表 + 回答 + 建议 |
| `statistics` | 按时间统计 | 统计摘要 + 分类/域名分布 |
| `help` | 规则匹配 | 帮助内容 + 相关建议 |

---

## 扩展点

| 扩展方向 | 实现位置 | 说明 |
|----------|----------|------|
| 新增意图类型 | `QueryPlanner` | 在 Schema 和规则解析中添加 |
| 调整融合权重 | `HybridRetriever.DEFAULT_WEIGHTS` | 修改权重配置 |
| 自定义回答风格 | `getAnswerSystemPrompt()` | 修改 AI 系统提示词 |
| 增加过滤条件 | `SearchFilters` 类型 + 各 Retriever | 扩展过滤逻辑 |
| 长期记忆 | `ConversationState.longMemorySummary` | 实现摘要生成与使用 |
