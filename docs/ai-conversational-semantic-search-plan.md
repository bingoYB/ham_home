# HamHome：Embedding 语义搜索 + AI 对话式搜索方案（不分片版）

## 概述

目标是在 **本地优先**（Chrome Storage + IndexedDB）的前提下，为 HamHome 增加两类能力（并明确：**不做内容分片**）：

- **对话式搜索交互**：用户以自然语言提问/追问，系统可持续维护筛选条件、给出结果卡片与可追溯引用，并支持“基于结果的总结/对比/下一步建议”。
- **Embedding 语义搜索（可配置服务）**：基于用户配置的 Embedding 服务对书签的“摘要信息”（例如 `title/description/tags/url`）向量化，本地存储向量与索引，实现语义检索与混合检索。

> 关键原则：**不把所有内容传给 AI**。对话回答只使用本地召回的 Top-K 结果（title/description 等）；Embedding 只在“入库/更新”时对每条书签做一次（**不分片**）。

---

## 目标与非目标

### 目标（MVP）

- 支持 **对话式检索**：多轮追问、条件收敛（时间/分类/标签/站点/是否含全文）。
- 支持 **语义检索**：基于 Embedding 的 Top-K 相似书签召回（embedding 输入为 title/description/tags/url）。
- 支持 **混合检索**：关键词召回 + 语义召回合并，提供更稳的相关性。
- 支持 **可追溯引用**：回答中所有结论可点击回到书签详情/预览。
- 支持 **隐私域名策略**：命中隐私域名的内容不参与 AI（Embedding/对话回答/重排均遵循）。

### 非目标（先不做）

- 不新增外部“向量数据库服务”（例如独立部署的 Milvus/Qdrant/PGVector）。
- 不追求大规模 ANN（HNSW）在浏览器内的极致性能；先保证功能与可维护性。
- 不做跨设备同步向量（向量体积大，且不一定符合隐私预期）。

---

## 总体架构（推荐）

### 模块分层

- **Storage / Index Layer（本地）**
  - `VectorStore`：保存书签向量（按模型维度/版本）
  - `SearchIndex`：关键词索引（可先用简单倒排，后续升级）
- **Embedding Layer（可配置服务）**
  - `EmbeddingClient`：统一调用 OpenAI-compatible embeddings（含自定义端点、Ollama 等）
  - `EmbeddingJobQueue`：增量生成/重建、失败重试、限流
- **Retrieval Layer（检索编排）**
  - `HybridRetriever`：关键词召回 + 语义召回 + 合并去重 + 评分
  - `Reranker (optional)`：对候选做小规模 LLM 重排（只发短片段）
- **Conversation Orchestrator（对话式搜索）**
  - `ChatSearchAgent`：将用户输入解析为结构化检索请求 + 对结果进行回答/追问建议
  - `ConversationState`：维护 filters、已浏览结果、已确定意图、记忆摘要
- **UI Layer**
  - Chat 面板（输入/消息/建议 chip）
  - 结果列表（可见、可筛选、可点击引用）

### 数据流（一次查询）

1. 用户输入 → `ChatSearchAgent` 解析意图并生成结构化检索请求
2. `HybridRetriever` 本地召回候选（关键词/语义/混合）
3. （可选）`Reranker` 对 Top-N 做重排（只发 title + snippet）
4. `ChatSearchAgent` 基于 Top-K 书签（title/description 等）生成答案（带引用），并输出下一步建议（筛选/追问）

---

## Embedding 语义搜索设计

### Embedding 服务配置（基于“配置的 Embedding 服务”）

新增一份独立配置（不与文本生成模型强绑定），建议字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| provider | string | 是 | `openai/anthropic/.../ollama/custom`（与现有 AIProvider 体系保持一致） |
| baseUrl | string | 视 provider | OpenAI-compatible base url（例如 `https://api.openai.com/v1`） |
| apiKey | string | 视 provider | 云端 provider 需要；ollama 可为空 |
| model | string | 是 | embedding 模型名（例如 `text-embedding-3-small` / `bge-m3` 等） |
| dimensions | number | 否 | 部分 provider 支持指定维度；不支持则由返回值确定 |
| batchSize | number | 否 | 批量 embedding 大小（默认 16/32） |
| enabled | boolean | 是 | 是否启用语义检索 |

约束：

- 仅使用 **embeddings** 接口，不混用 chat/completions。
- 需要可探测 `dimension` 与速率限制（429）并做退避重试。

### Embedding 输入（不分片）

只对每条书签生成 1 个向量，输入文本建议为“稳定、短、可解释”的摘要拼接：

- `title`
- `description`（如果为空，可使用 `excerpt` / `metadata.description` 兜底）
- `tags`（用空格或逗号拼接）
- `url`（建议仅取域名与路径要点，避免 query 参数噪声）

示例（伪格式）：

```
title: ...
description: ...
tags: React, Server Actions, Best Practices
url: react.dev/...
```

> 说明：不分片会牺牲“长文精确定位”，但实现与成本更轻，适合先把语义检索跑通。

### 向量存储（本地）

建议全部存入 **IndexedDB**（不要放 sync storage）：

**表：`bookmarkEmbeddings`**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| bookmarkId | string | 外键到书签（LocalBookmark.id） |
| modelKey | string | `provider:model:dimensions:version` |
| dim | number | 向量维度 |
| vector | Blob / ArrayBuffer | 建议用 Float32Array 存二进制 |
| checksum | string | embedding 输入文本 hash（title/description/tags/url 组合后的 hash） |
| createdAt / updatedAt | number | 时间戳 |

**索引建议**

- `bookmarkEmbeddings(modelKey)`、`bookmarkEmbeddings(bookmarkId+modelKey)`、`bookmarkEmbeddings(checksum)`

### 相似度检索（MVP）

先实现 **brute-force cosine**：

- 查询时 embedding `query` → 对同模型 `modelKey` 的书签向量逐个计算 cosine → Top-K bookmarks
- 数据量小（几千～1-2 万 bookmarks）可接受；超出后再引入 ANN（HNSW/IVF）

### 混合检索（推荐默认）

最终相关性 \(score\) 由两部分加权：

\[
score = w_{bm25} \cdot score_{keyword} + w_{vec} \cdot score_{cosine}
\]

其中 `score_boost` 可来自：

- 时间衰减（最近更靠前）
- 标签/分类命中加权

---

## 对话式搜索交互设计

### 对话的本质：结构化“检索状态机”

每轮对话都维护一个结构化状态（比“把聊天全文塞回模型”更稳定）：

```ts
type ConversationState = {
  intent: "find" | "summarize" | "compare" | "qa";
  query: string; // 当前主查询
  filters: {
    categoryId?: string | null;
    tagsAny?: string[];
    domain?: string | null;
    timeRangeDays?: number | null;
    includeContent?: boolean; // 是否允许加载全文片段
    semantic?: boolean; // 是否启用语义检索
  };
  seenBookmarkIds: string[]; // 已展示过的结果，用于去重与“继续找”
  shortMemory: { role: "user" | "assistant"; text: string }[]; // 最近 N 轮
  longMemorySummary?: string; // 早期对话压缩摘要
};
```

### 每轮回复的 UI 输出（推荐固定结构）

- **Answer**：1–5 句，尽量短
- **Results**：Top 5–20 条卡片（标题/站点/时间/标签/description snippet）
- **Sources**：引用编号 → (bookmarkId)
- **Next**：2–4 个建议 chip（例如“只看最近 30 天”“限定在××分类”“换成语义检索”“展开第 3 条来源”）

### LLM 的角色（两段式最稳）

1) **Query Planner（结构化解析）**：把用户输入解析成检索请求（JSON），不生成长文本

输出示例（必须可验证/可执行）：

```json
{
  "intent": "find",
  "query": "React Server Actions 最佳实践",
  "filters": { "timeRangeDays": 365, "semantic": true, "includeContent": true },
  "topK": 20
}
```

2) **Answer Writer（RAG 输出）**：基于检索结果（Top-K chunk/snippet）生成回答并标注引用

约束：

- 明确要求“只基于提供的 sources，不要编造”
- 如果 sources 不足，输出“未找到/可能未收藏/建议缩小范围”

---

## 隐私与成本策略

### 隐私域名（强制）

- 命中隐私域名的书签：
  - **不做 embedding**
  - **不将内容发送给 LLM**（对话回答/重排也禁用）
  - 仍可做“本地关键词检索（标题/URL/标签）”

### 成本与性能（建议的预算）

- Embedding 生成在“保存/更新”时异步执行，避免阻塞保存流程
- 允许用户配置：
  - 仅对“可读正文（readerable）”做 embedding
  - 仅对“长度小于阈值”的内容做 embedding
  - 仅对“指定分类/站点”做 embedding（可选）

---

## 目录与模块落地（建议草案）

> 实际路径可根据现有 `apps/extension/lib` 结构调整；此处仅作为实现建议。

```
apps/extension/lib/
  search/
    types.ts
    chat-search-agent.ts        # 对话编排（planner + answer）
    hybrid-retriever.ts         # 混合召回
    keyword-retriever.ts        # 关键词召回（MVP：先复用现有搜索/后续倒排）
    semantic-retriever.ts       # 向量召回（cosine Top-K）
    reranker.ts                 # 可选：LLM 重排
  embedding/
    embedding-client.ts         # OpenAI-compatible embeddings client
    embedding-queue.ts          # 增量任务队列、重试、限流
  storage/
    vector-store.ts             # IndexedDB: bookmarkEmbeddings
```

配置建议：

- `configStorage` 增加 `embeddingConfig`（enabled / provider / baseUrl / apiKey / model / batchSize）
- UI 设置页提供：
  - 开关
  - 连接测试
  - “重建向量索引”按钮（危险操作需确认）

---

## 实施计划（两个大步骤）

### 步骤一：Embedding 语义化搜索（基于配置的 Embedding 服务）

#### 1.1 定义与配置

- 定义 `EmbeddingConfig`（独立于文本生成模型）
- `configStorage` 增加 `embeddingConfig`（enabled/provider/baseUrl/apiKey/model/batchSize…）
- 设置页增加：
  - 启用/禁用
  - 连接测试（调用 embeddings）
  - 重建/清理向量（需二次确认）

#### 1.2 生成向量（不分片）

- 为每条书签生成 1 个 embedding（输入为 `title/description/tags/url` 组合文本）
- 使用 `checksum` 避免重复计算（输入不变则跳过）
- 异步队列化：保存书签后后台生成，失败重试 + 429 退避
- 隐私域名：直接跳过（不出网）

#### 1.3 语义检索与混合检索

- `semantic-retriever`：`queryEmbedding` vs `bookmarkEmbedding` cosine Top-K
- `hybrid-retriever`：关键词召回 + 语义召回合并去重 + 加权排序
- UI：提供“语义搜索开关/混合搜索开关”，并可解释命中原因（相似度/标签/时间加权）

**验收**

- 新增/更新书签后向量覆盖率可见（至少可在设置页展示统计）
- 语义检索能找回“关键词不完全匹配但语义相近”的书签
- 隐私域名书签不会调用 embedding 服务

### 步骤二：AI 交互式对话式搜索

#### 2.1 对话状态机与结构化检索请求（Planner）

- 定义 `ConversationState`（filters/seenBookmarkIds/短记忆/长摘要）
- Planner：将用户输入解析成可执行 JSON（intent/query/filters/topK）
- 约束：Planner 只做“计划”，不写长答案

#### 2.2 检索编排与回答生成（RAG）

- 按 Planner 请求调用 `HybridRetriever` 得到候选 bookmarks
- （可选）Rerank：只发 `title + description snippet` 做小规模重排
- Answer：只基于 Top-K bookmarks 输出回答 + 引用（bookmarkId）
- Next chips：输出 2–4 个可执行的追问/筛选建议

#### 2.3 UI 交互

- 对话区 + 结果区（结果始终可见、可筛选、可点击打开书签）
- 支持“继续找更多 / 限定时间范围 / 限定分类标签 / 切换语义/关键词”

**验收**

- 多轮追问能稳定收敛筛选条件
- 每条回答都带可点击引用（bookmarkId）
- 在不启用 embedding 时可降级为“关键词对话搜索”（仍可用）

---

## 风险与应对

- **模型权重/网络成本**：云端 embedding 成本可观 → 支持 batch、只对正文做、可配置范围、可暂停队列
- **浏览器性能**：cosine brute-force 随数据量上涨 → 先限制 Top-K 与候选池，必要时引入 ANN
- **用户信任**：回答胡编 → 强制引用、未找到就直说、UI 明示“仅基于本地收藏”

---

## 验收清单（最终）

- 搜索：关键词 + 语义 + 混合均可用（语义基于 title/description/tags/url，不分片）
- 对话：多轮条件收敛、引用可点击、建议 chip 可操作
- 配置：Embedding 服务可配置、可测试、可禁用
- 隐私：隐私域名不 embedding、不出网、不参与 RAG
- 数据：向量本地存储，可一键清理/重建

